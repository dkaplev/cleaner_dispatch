import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { parseBookingText, bookingToWindow } from "@/lib/booking-parser";
import { dispatchJob } from "@/lib/dispatch";

/**
 * POST /api/ingest/email
 * Webhook for inbound email (Resend, Mailgun, Postmark). Forwards booking confirmations
 * to create jobs. Requires INGEST_WEBHOOK_SECRET and INGEST_LANDLORD_ID (and optionally
 * INGEST_DEFAULT_PROPERTY_ID) in env.
 *
 * Body (JSON): Resend uses { type, data: { subject, text, html, from, to } }.
 *              Postmark/Mailgun may use { subject, text, html } or similar.
 * Auth: Header Authorization: Bearer <INGEST_WEBHOOK_SECRET> or ?secret=<INGEST_WEBHOOK_SECRET>
 */
export async function POST(request: Request) {
  const secret =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ||
    new URL(request.url).searchParams.get("secret")?.trim();
  const expected = process.env.INGEST_WEBHOOK_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const landlordId = process.env.INGEST_LANDLORD_ID?.trim();
  if (!landlordId) {
    return NextResponse.json(
      { error: "INGEST_LANDLORD_ID not configured" },
      { status: 500 }
    );
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

  const data = body && typeof body === "object" && "data" in body && body.data && typeof body.data === "object"
    ? (body.data as Record<string, unknown>)
    : (body as Record<string, unknown>);

  const subject = typeof data.subject === "string" ? data.subject : "";
  const text =
    typeof data.text === "string"
      ? data.text
      : typeof data["body-plain"] === "string"
        ? data["body-plain"]
        : "";
  const html =
    typeof data.html === "string"
      ? data.html
      : typeof data["body-html"] === "string"
        ? data["body-html"]
        : "";
  const combined = [subject, text || html].filter(Boolean).join("\n");

  if (!combined.trim()) {
    return NextResponse.json({ error: "No subject or body" }, { status: 400 });
  }

  const parsed = parseBookingText(combined);
  const prisma = getPrisma();

  try {
    const defaultPropertyId = process.env.INGEST_DEFAULT_PROPERTY_ID?.trim();
    const property = defaultPropertyId
      ? await prisma.property.findFirst({
          where: { id: defaultPropertyId, landlord_id: landlordId },
          select: { id: true, checkout_time_default: true, cleaning_duration_minutes: true },
        })
      : await prisma.property.findFirst({
          where: { landlord_id: landlordId },
          select: { id: true, checkout_time_default: true, cleaning_duration_minutes: true },
          orderBy: { created_at: "asc" },
        });

    if (!property) {
      return NextResponse.json(
        { error: "No property found for ingest landlord. Add a property or set INGEST_DEFAULT_PROPERTY_ID." },
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
      return NextResponse.json(
        { error: "Could not find checkout/check-in date in email body." },
        { status: 400 }
      );
    }

    const job = await prisma.job.create({
      data: {
        landlord_id: landlordId,
        property_id: property.id,
        window_start: window.window_start,
        window_end: window.window_end,
        booking_id: parsed.bookingId || null,
        status: "new",
      },
      include: {
        property: { select: { name: true } },
      },
    });

    const result = await dispatchJob(prisma, job.id);
    return NextResponse.json({
      ok: true,
      job_id: job.id,
      window_start: job.window_start.toISOString(),
      property: job.property.name,
      dispatch: result.success ? "offered" : result.error,
    });
  } catch (e) {
    console.error("[ingest/email] Error:", e);
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
