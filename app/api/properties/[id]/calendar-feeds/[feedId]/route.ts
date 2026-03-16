import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";
import { syncCalendarFeed } from "@/lib/calendar-sync";

type Ctx = { params: Promise<{ id: string; feedId: string }> };

async function getOwnedFeed(prisma: Awaited<ReturnType<typeof getPrisma>>, propertyId: string, feedId: string, landlordId: string) {
  return prisma.calendarFeed.findFirst({
    where: { id: feedId, property: { id: propertyId, landlord_id: landlordId } },
    select: { id: true },
  });
}

/** POST — manually trigger a sync for a specific feed. */
export async function POST(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, feedId } = await params;

  const prisma = getPrisma();
  try {
    const feed = await getOwnedFeed(prisma, id, feedId, session.user.id);
    if (!feed) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const result = await syncCalendarFeed(prisma, feedId);
    return NextResponse.json(result);
  } finally {
    await prisma.$disconnect();
  }
}

/** DELETE — remove a calendar feed (does not cancel existing jobs). */
export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, feedId } = await params;

  const prisma = getPrisma();
  try {
    const feed = await getOwnedFeed(prisma, id, feedId, session.user.id);
    if (!feed) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.calendarFeed.delete({ where: { id: feedId } });
    return NextResponse.json({ ok: true });
  } finally {
    await prisma.$disconnect();
  }
}
