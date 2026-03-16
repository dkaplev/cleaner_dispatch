import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";
import { syncCalendarFeed } from "@/lib/calendar-sync";

/** GET — list calendar feeds for a property (URL is masked for security). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const prisma = getPrisma();
  try {
    const property = await prisma.property.findFirst({
      where: { id, landlord_id: session.user.id },
      select: { id: true },
    });
    if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const feeds = await prisma.calendarFeed.findMany({
      where: { property_id: id },
      orderBy: { created_at: "asc" },
      select: {
        id: true,
        source: true,
        label: true,
        last_synced_at: true,
        sync_error: true,
        created_at: true,
        // URL intentionally omitted — treat as write-only secret
        _count: { select: { bookings: true } },
      },
    });

    // Include active booking count per feed
    const activeCounts = await prisma.calendarBooking.groupBy({
      by: ["feed_id"],
      where: { feed_id: { in: feeds.map((f) => f.id) }, status: "active" },
      _count: { id: true },
    });
    const activeMap = Object.fromEntries(activeCounts.map((r) => [r.feed_id, r._count.id]));

    return NextResponse.json(
      feeds.map((f) => ({ ...f, active_bookings: activeMap[f.id] ?? 0 }))
    );
  } finally {
    await prisma.$disconnect();
  }
}

/** POST — add a new calendar feed and run initial sync. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const body = await req.json() as { url?: string; source?: string; label?: string };
  const url    = typeof body.url    === "string" ? body.url.trim()    : "";
  const source = typeof body.source === "string" ? body.source.trim() : "other";
  const label  = typeof body.label  === "string" ? body.label.trim()  : null;

  if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 });
  if (!url.startsWith("http")) return NextResponse.json({ error: "Invalid URL" }, { status: 400 });

  const prisma = getPrisma();
  try {
    const property = await prisma.property.findFirst({
      where: { id, landlord_id: session.user.id },
      select: { id: true },
    });
    if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const feed = await prisma.calendarFeed.create({
      data: { property_id: id, url, source, label: label || null },
      select: { id: true },
    });

    // Run initial sync (non-blocking errors are stored in sync_error field)
    let syncResult;
    try {
      syncResult = await syncCalendarFeed(prisma, feed.id);
    } catch (e) {
      syncResult = { error: String(e), created: 0, updated: 0, cancelled: 0, skipped: 0 };
    }

    return NextResponse.json({ ok: true, id: feed.id, sync: syncResult }, { status: 201 });
  } finally {
    await prisma.$disconnect();
  }
}
