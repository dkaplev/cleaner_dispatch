import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";

export type CalendarBookingEntry = {
  id: string;
  uid: string;
  checkin: string;   // ISO date string (UTC midnight)
  checkout: string;  // ISO date string (UTC midnight) — exclusive (checkout day)
  property_id: string;
  property_name: string;
  source: string;
  feed_label: string | null;
};

/**
 * GET /api/calendar/bookings?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Returns all active CalendarBookings for the authenticated landlord
 * whose stay overlaps the requested date range.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const fromStr = searchParams.get("from");
  const toStr   = searchParams.get("to");
  if (!fromStr || !toStr) {
    return NextResponse.json({ error: "from and to query params required (YYYY-MM-DD)" }, { status: 400 });
  }

  const from = new Date(`${fromStr}T00:00:00Z`);
  const to   = new Date(`${toStr}T23:59:59Z`);
  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }

  const prisma = getPrisma();
  try {
    const bookings = await prisma.calendarBooking.findMany({
      where: {
        status: "active",
        checkin:  { lte: to },
        checkout: { gte: from },
        feed: { property: { landlord_id: session.user.id } },
      },
      select: {
        id: true,
        uid: true,
        checkin: true,
        checkout: true,
        feed: {
          select: {
            source: true,
            label: true,
            property: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { checkin: "asc" },
    });

    const result: CalendarBookingEntry[] = bookings.map((b) => ({
      id:            b.id,
      uid:           b.uid,
      checkin:       b.checkin.toISOString(),
      checkout:      b.checkout.toISOString(),
      property_id:   b.feed.property.id,
      property_name: b.feed.property.name,
      source:        b.feed.source,
      feed_label:    b.feed.label,
    }));

    return NextResponse.json(result);
  } finally {
    await prisma.$disconnect();
  }
}
