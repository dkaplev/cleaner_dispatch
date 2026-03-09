import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { parseBookingText, bookingToWindow } from "@/lib/booking-parser";
import { notifyLandlordNewIngestedBooking } from "@/lib/notify-landlord-telegram";

/**
 * POST /api/ingest/email
 * Webhook called by n8n (or any HTTP client) when a booking confirmation email arrives.
 * Parses the email, creates a job (status "new"), and notifies the landlord via Telegram.
 *
 * Landlord resolution (first match wins):
 *   1. INGEST_LANDLORD_ID env var — hard override, single-tenant / testing
 *   2. landlord_email field in request body — looks up user by email; use this for
 *      multi-landlord setups where n8n passes the original email recipient
 *
 * Required env: INGEST_WEBHOOK_SECRET
 * Optional env: INGEST_LANDLORD_ID, INGEST_DEFAULT_PROPERTY_ID
 *
 * Auth: Authorization: Bearer <INGEST_WEBHOOK_SECRET> or ?secret=<INGEST_WEBHOOK_SECRET>
 */
export async function POST(request: Request) {
  const secret =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ||
    new URL(request.url).searchParams.get("secret")?.trim();
  const expected = process.env.INGEST_WEBHOOK_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  const contentType = request.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      body = await request.json();
    } else if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
      const form = await request.formData();
      body = Object.fromEntries(
        ["subject", "text", "html", "from", "to", "body-plain", "body-html"].map((k) => [k, form.get(k) ?? ""])
      );
    } else {
      return NextResponse.json({ error: "Unsupported content-type" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const data =
    body && typeof body === "object" && "data" in body && body.data && typeof body.data === "object"
      ? (body.data as Record<string, unknown>)
      : (body as Record<string, unknown>);

  // Normalise fields across providers:
  //   Postmark:  Subject, TextBody, HtmlBody
  //   Mailgun:   subject, body-plain, body-html
  //   Generic:   subject, text, html
  function str(key: string): string {
    return typeof data[key] === "string" ? (data[key] as string) : "";
  }

  const subject = str("Subject") || str("subject");
  const rawText       = str("TextBody") || str("text") || str("body-plain");
  const rawTextAsHtml = str("textAsHtml");
  const rawHtml       = str("HtmlBody") || str("html") || str("body-html");

  // Build an ordered list of body sources to try (skip empty ones).
  const bodyCandidates = [rawText, rawTextAsHtml, rawHtml].filter(Boolean);

  if (!subject && bodyCandidates.length === 0) {
    return NextResponse.json({ error: "No subject or body" }, { status: 400 });
  }

  // Try each source in order; stop at the first that yields a checkout date.
  // Fall back to the richest partial result (has check-in or booking ID) if none have checkout.
  let parsed = parseBookingText([subject, bodyCandidates[0] ?? ""].filter(Boolean).join("\n"));
  for (const body of bodyCandidates.slice(1)) {
    if (parsed.checkoutDate) break;
    const candidate = parseBookingText([subject, body].filter(Boolean).join("\n"));
    // Prefer a candidate that has a checkout date, or more fields filled than current best
    const currentScore = (parsed.checkoutDate ? 4 : 0) + (parsed.checkinDate ? 2 : 0) + (parsed.bookingId ? 1 : 0);
    const candidateScore = (candidate.checkoutDate ? 4 : 0) + (candidate.checkinDate ? 2 : 0) + (candidate.bookingId ? 1 : 0);
    if (candidateScore > currentScore) parsed = candidate;
  }
  const prisma = getPrisma();

  // Resolve landlord — first match wins:
  //   1. INGEST_LANDLORD_ID env var  (hard override / single-tenant testing)
  //   2. ingest_token from body      (primary: n8n extracts the +tag from the "to" address)
  //      e.g. n8n body field: "ingest_token": "{{ $json.to.value[0].address.match(/\+([^@]+)/)?.[1] }}"
  //   3. landlord_email from body    (fallback: look up by signup email)
  let landlordId: string | null = process.env.INGEST_LANDLORD_ID?.trim() || null;

  if (!landlordId) {
    const token = str("ingest_token").trim();
    if (token) {
      const found = await prisma.user.findUnique({
        where: { ingest_token: token },
        select: { id: true },
      });
      landlordId = found?.id ?? null;
    }
  }

  if (!landlordId) {
    const bodyEmail = str("landlord_email").toLowerCase().trim();
    if (bodyEmail) {
      const found = await prisma.user.findFirst({
        where: { email: { equals: bodyEmail, mode: "insensitive" } },
        select: { id: true },
      });
      landlordId = found?.id ?? null;
    }
  }

  if (!landlordId) {
    return NextResponse.json(
      { error: "Cannot identify landlord. Include ingest_token (from email +tag) or landlord_email in the request body." },
      { status: 400 }
    );
  }

  try {
    // Resolve property: INGEST_DEFAULT_PROPERTY_ID > channel-name match > first property of landlord
    const defaultPropertyId = process.env.INGEST_DEFAULT_PROPERTY_ID?.trim();
    let property: {
      id: string;
      name: string;
      checkout_time_default: Date | null;
      cleaning_duration_minutes: number | null;
    } | null = null;

    let propertyAutoFallback = false;

    if (defaultPropertyId) {
      property = await prisma.property.findFirst({
        where: { id: defaultPropertyId, landlord_id: landlordId },
        select: { id: true, name: true, checkout_time_default: true, cleaning_duration_minutes: true },
      });
    } else if (parsed.propertyName) {
      // Try to match by channel name fields (exact, case-insensitive)
      const want = parsed.propertyName.trim().toLowerCase();
      const allProperties = await prisma.property.findMany({
        where: { landlord_id: landlordId },
        select: {
          id: true, name: true, checkout_time_default: true, cleaning_duration_minutes: true,
          name_booking_com: true, name_airbnb: true, name_vrbo: true,
        },
      });
      const matched = allProperties.find(
        (p) =>
          p.name.toLowerCase() === want ||
          p.name_booking_com?.toLowerCase() === want ||
          p.name_airbnb?.toLowerCase() === want ||
          p.name_vrbo?.toLowerCase() === want
      );
      if (!matched && allProperties[0]) {
        propertyAutoFallback = true;
      }
      property = matched ?? allProperties[0] ?? null;
    } else {
      property = await prisma.property.findFirst({
        where: { landlord_id: landlordId },
        select: { id: true, name: true, checkout_time_default: true, cleaning_duration_minutes: true },
        orderBy: { created_at: "asc" },
      });
    }

    if (!property) {
      return NextResponse.json(
        { error: "No property found. Add a property or set INGEST_DEFAULT_PROPERTY_ID." },
        { status: 400 }
      );
    }

    const checkoutTimeDefault =
      property.checkout_time_default != null
        ? `${String(property.checkout_time_default.getUTCHours()).padStart(2, "0")}:${String(property.checkout_time_default.getUTCMinutes()).padStart(2, "0")}`
        : null;
    const duration = property.cleaning_duration_minutes ?? 120;
    const window = bookingToWindow(parsed, checkoutTimeDefault, duration);

    if (!window) {
      return NextResponse.json({ error: "Could not find checkout/check-in date in email body." }, { status: 400 });
    }

    // Create job (status "new", no dispatch — landlord confirms via Telegram)
    const job = await prisma.job.create({
      data: {
        landlord_id: landlordId,
        property_id: property.id,
        window_start: window.window_start,
        window_end: window.window_end,
        booking_id: parsed.bookingId || null,
        status: "new",
      },
    });

    // Resolve cleaner order (primary → fallbacks) for the notification preview
    const propertyCleaner = await prisma.propertyCleaner.findMany({
      where: { property_id: property.id },
      include: { cleaner: { select: { name: true } } },
      orderBy: [{ is_primary: "desc" }, { priority: "asc" }],
    });
    const cleanerNames = propertyCleaner.map((pc) => pc.cleaner.name);
    const primaryCleanerName = cleanerNames[0] ?? null;
    const fallbackCleanerNames = cleanerNames.slice(1);

    // Notify landlord via Telegram (no-op if Telegram not configured)
    const landlord = await prisma.user.findUnique({
      where: { id: landlordId },
      select: { telegram_chat_id: true },
    });
    if (landlord?.telegram_chat_id) {
      try {
        await notifyLandlordNewIngestedBooking(landlord.telegram_chat_id, {
          jobId: job.id,
          propertyName: property.name,
          windowStart: window.window_start,
          windowEnd: window.window_end,
          bookingRef: parsed.bookingId,
          channelPropertyName: parsed.propertyName,
          primaryCleanerName,
          fallbackCleanerNames,
          propertyAutoFallback,
        });
      } catch (e) {
        console.error("[ingest/email] Telegram notify failed (non-fatal):", e);
      }
    }

    return NextResponse.json({
      ok: true,
      job_id: job.id,
      window_start: job.window_start.toISOString(),
      property: property.name,
      status: "awaiting_landlord_dispatch",
    });
  } catch (e) {
    console.error("[ingest/email] Error:", e);
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
