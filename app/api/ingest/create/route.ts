import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";
import { parseBookingText, bookingToWindow } from "@/lib/booking-parser";
import { dispatchJob, offerJobToCleaner } from "@/lib/dispatch";

/**
 * POST /api/ingest/create
 * Body: { text: string, property_id: string, cleaner_id?: string }
 * Parses pasted booking text, computes window from property defaults, creates job and dispatches.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { text?: string; property_id?: string; cleaner_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const property_id = typeof body.property_id === "string" ? body.property_id.trim() : "";
  const cleaner_id = typeof body.cleaner_id === "string" ? body.cleaner_id.trim() || null : null;

  if (!text) {
    return NextResponse.json({ error: "Paste booking text first" }, { status: 400 });
  }
  if (!property_id) {
    return NextResponse.json({ error: "Select a property" }, { status: 400 });
  }

  const prisma = getPrisma();
  try {
    const property = await prisma.property.findFirst({
      where: { id: property_id, landlord_id: session.user.id },
      select: { id: true, checkout_time_default: true, cleaning_duration_minutes: true },
    });
    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const parsed = parseBookingText(text);
    const checkoutTimeDefault =
      property.checkout_time_default != null
        ? `${String(property.checkout_time_default.getUTCHours()).padStart(2, "0")}:${String(property.checkout_time_default.getUTCMinutes()).padStart(2, "0")}`
        : null;
    const duration = property.cleaning_duration_minutes ?? 120;
    const window = bookingToWindow(parsed, checkoutTimeDefault, duration);

    if (!window) {
      return NextResponse.json(
        { error: "Could not find a checkout or check-in date in the pasted text. Add a line like 'Check-out: 16 March 2025' or paste the full booking email." },
        { status: 400 }
      );
    }

    const booking_id = parsed.bookingId || null;

    const job = await prisma.job.create({
      data: {
        landlord_id: session.user.id,
        property_id: property.id,
        window_start: window.window_start,
        window_end: window.window_end,
        booking_id,
        status: "new",
      },
      include: {
        property: { select: { id: true, name: true } },
        assigned_cleaner: { select: { id: true, name: true } },
      },
    });

    if (cleaner_id) {
      const result = await offerJobToCleaner(prisma, job.id, cleaner_id);
      if (!result.success) {
        return NextResponse.json({ ...job, offer_error: result.error }, { status: 201 });
      }
      return NextResponse.json({ ...job, attempt: result.attempt }, { status: 201 });
    }
    const result = await dispatchJob(prisma, job.id);
    if (!result.success) {
      return NextResponse.json({ ...job, offer_error: result.error }, { status: 201 });
    }
    return NextResponse.json({ ...job, attempt: result.attempt }, { status: 201 });
  } catch (e) {
    console.error("[ingest/create] Error:", e);
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
