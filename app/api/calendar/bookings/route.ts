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
  job_id: string | null;  // set if a cleaning job was created for this booking
};

/** A Job that is NOT linked to a CalendarBooking (manually created, or sync pending). */
export type DirectJobEntry = {
  id: string;
  property_id: string;
  property_name: string;
  window_start: string;  // ISO datetime
  window_end: string;    // ISO datetime
  status: string;
};

/**
 * GET /api/calendar/bookings?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Returns:
 *   bookings — CalendarBookings overlapping the range (from iCal sync)
 *   direct_jobs — Jobs NOT linked to any CalendarBooking, within the range
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
    // ── 1. Calendar-synced bookings ────────────────────────────────────────────
    const bookings = await prisma.calendarBooking.findMany({
      where: {
        status:   "active",
        checkin:  { lte: to },
        checkout: { gte: from },
        feed: { property: { landlord_id: session.user.id } },
      },
      select: {
        id: true, uid: true, checkin: true, checkout: true, job_id: true,
        feed: {
          select: {
            source: true, label: true,
            property: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { checkin: "asc" },
    });

    const calBookingJobIds = new Set(
      bookings.map((b) => b.job_id).filter((id): id is string => !!id)
    );

    const bookingResult: CalendarBookingEntry[] = bookings.map((b) => ({
      id:            b.id,
      uid:           b.uid,
      checkin:       b.checkin.toISOString(),
      checkout:      b.checkout.toISOString(),
      property_id:   b.feed.property.id,
      property_name: b.feed.property.name,
      source:        b.feed.source,
      feed_label:    b.feed.label,
      job_id:        b.job_id,
    }));

    // ── 2. Direct (manually-created or sync-pending) jobs ─────────────────────
    const directJobs = await prisma.job.findMany({
      where: {
        landlord_id:  session.user.id,
        status:       { notIn: ["cancelled"] },
        window_start: { lte: to },
        window_end:   { gte: from },
        // Exclude jobs already represented by a CalendarBooking
        ...(calBookingJobIds.size > 0
          ? { id: { notIn: Array.from(calBookingJobIds) } }
          : {}),
      },
      select: {
        id: true, status: true, window_start: true, window_end: true,
        property: { select: { id: true, name: true } },
      },
      orderBy: { window_start: "asc" },
    });

    const directResult: DirectJobEntry[] = directJobs.map((j) => ({
      id:            j.id,
      property_id:   j.property.id,
      property_name: j.property.name,
      window_start:  j.window_start.toISOString(),
      window_end:    j.window_end.toISOString(),
      status:        j.status,
    }));

    return NextResponse.json({ bookings: bookingResult, direct_jobs: directResult });
  } finally {
    await prisma.$disconnect();
  }
}
