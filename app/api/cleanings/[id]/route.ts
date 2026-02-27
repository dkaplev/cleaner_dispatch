import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";

async function getCleaningAndCheckOwner(
  id: string,
  prisma: Awaited<ReturnType<typeof getPrisma>>,
  landlordId: string
) {
  const cleaning = await prisma.cleaning.findUnique({
    where: { id },
    include: {
      property: { select: { landlord_id: true, name: true } },
      cleaner: { select: { id: true, name: true, telegram_chat_id: true } },
    },
  });
  if (!cleaning || cleaning.property.landlord_id !== landlordId) return null;
  return cleaning;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  let prisma;
  try {
    prisma = getPrisma();
    const existing = await getCleaningAndCheckOwner(id, prisma, session.user.id);
    if (!existing) {
      return NextResponse.json({ error: "Cleaning not found" }, { status: 404 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const scheduled_at =
      body.scheduled_at != null && body.scheduled_at !== ""
        ? new Date(body.scheduled_at as string)
        : existing.scheduled_at;
    const status =
      typeof body.status === "string" && ["scheduled", "completed", "cancelled"].includes(body.status)
        ? body.status
        : existing.status;
    const notes =
      body.notes !== undefined
        ? (typeof body.notes === "string" ? body.notes.trim() || null : null)
        : existing.notes;

    const cleaning = await prisma.cleaning.update({
      where: { id },
      data: {
        scheduled_at: scheduled_at && !Number.isNaN(scheduled_at.getTime()) ? scheduled_at : undefined,
        status,
        notes,
      },
      include: {
        property: { select: { id: true, name: true } },
        cleaner: { select: { id: true, name: true, telegram_chat_id: true } },
      },
    });

    return NextResponse.json(cleaning);
  } catch (error) {
    console.error("Cleaning update error:", error);
    return NextResponse.json({ error: "Failed to update cleaning" }, { status: 500 });
  } finally {
    if (prisma) await prisma.$disconnect();
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  let prisma;
  try {
    prisma = getPrisma();
    const existing = await getCleaningAndCheckOwner(id, prisma, session.user.id);
    if (!existing) {
      return NextResponse.json({ error: "Cleaning not found" }, { status: 404 });
    }
    await prisma.cleaning.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Cleaning delete error:", error);
    return NextResponse.json({ error: "Failed to delete cleaning" }, { status: 500 });
  } finally {
    if (prisma) await prisma.$disconnect();
  }
}
