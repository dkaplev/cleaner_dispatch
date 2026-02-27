import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";

async function getCleanerAndCheckOwner(
  id: string,
  prisma: Awaited<ReturnType<typeof getPrisma>>,
  landlordId: string
) {
  const cleaner = await prisma.cleaner.findUnique({
    where: { id },
  });
  if (!cleaner || cleaner.landlord_id !== landlordId) return null;
  return cleaner;
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
    const existing = await getCleanerAndCheckOwner(id, prisma, session.user.id);
    if (!existing) {
      return NextResponse.json({ error: "Cleaner not found" }, { status: 404 });
    }
    const body = (await request.json()) as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : existing.name;
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    const telegram_chat_id =
      body.telegram_chat_id !== undefined
        ? (typeof body.telegram_chat_id === "string" ? body.telegram_chat_id.trim() || null : null)
        : existing.telegram_chat_id;
    const notes =
      body.notes !== undefined
        ? (typeof body.notes === "string" ? body.notes.trim() || null : null)
        : existing.notes;
    const is_active = typeof body.is_active === "boolean" ? body.is_active : existing.is_active;

    const cleaner = await prisma.cleaner.update({
      where: { id },
      data: {
        name,
        telegram_chat_id,
        notes,
        is_active,
      },
    });
    return NextResponse.json(cleaner);
  } catch (error) {
    console.error("Cleaner update error:", error);
    return NextResponse.json({ error: "Failed to update cleaner" }, { status: 500 });
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
    const existing = await getCleanerAndCheckOwner(id, prisma, session.user.id);
    if (!existing) {
      return NextResponse.json({ error: "Cleaner not found" }, { status: 404 });
    }
    await prisma.cleaner.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Cleaner delete error:", error);
    return NextResponse.json({ error: "Failed to delete cleaner" }, { status: 500 });
  } finally {
    if (prisma) await prisma.$disconnect();
  }
}
