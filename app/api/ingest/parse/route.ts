import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { parseBookingText } from "@/lib/booking-parser";

/**
 * POST /api/ingest/parse
 * Body: { text: string }
 * Returns parsed booking (checkout date, time, property hint, booking ID) for preview.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const text = typeof body.text === "string" ? body.text : "";
  const parsed = parseBookingText(text);
  return NextResponse.json({
    parsed: {
      checkoutDate: parsed.checkoutDate?.toISOString() ?? null,
      checkinDate: parsed.checkinDate?.toISOString() ?? null,
      checkoutTime: parsed.checkoutTime,
      propertyHint: parsed.propertyHint,
      bookingId: parsed.bookingId,
    },
  });
}
