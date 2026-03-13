import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";

async function verifyPropertyOwner(propertyId: string, landlordId: string) {
  const prisma = getPrisma();
  const p = await prisma.property.findUnique({ where: { id: propertyId }, select: { landlord_id: true } });
  return p?.landlord_id === landlordId;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; cleanerId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, cleanerId } = await params;
  const prisma = getPrisma();
  try {
    if (!(await verifyPropertyOwner(id, session.user.id)))
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { is_primary } = await request.json() as { is_primary: boolean };

    if (is_primary) {
      await prisma.propertyCleaner.updateMany({
        where: { property_id: id, is_primary: true },
        data: { is_primary: false },
      });
    }

    const updated = await prisma.propertyCleaner.update({
      where: { property_id_cleaner_id: { property_id: id, cleaner_id: cleanerId } },
      data: { is_primary },
      include: { cleaner: { select: { id: true, name: true, telegram_chat_id: true } } },
    });
    return NextResponse.json(updated);
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; cleanerId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, cleanerId } = await params;
  const prisma = getPrisma();
  try {
    if (!(await verifyPropertyOwner(id, session.user.id)))
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.propertyCleaner.delete({
      where: { property_id_cleaner_id: { property_id: id, cleaner_id: cleanerId } },
    });
    return NextResponse.json({ ok: true });
  } finally {
    await prisma.$disconnect();
  }
}
