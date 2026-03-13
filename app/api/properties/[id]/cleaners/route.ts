import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";

async function verifyPropertyOwner(propertyId: string, landlordId: string) {
  const prisma = getPrisma();
  const p = await prisma.property.findUnique({ where: { id: propertyId }, select: { landlord_id: true } });
  return p?.landlord_id === landlordId;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const prisma = getPrisma();
  try {
    if (!(await verifyPropertyOwner(id, session.user.id)))
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const assignments = await prisma.propertyCleaner.findMany({
      where: { property_id: id },
      include: { cleaner: { select: { id: true, name: true, telegram_chat_id: true } } },
      orderBy: [{ is_primary: "desc" }, { priority: "asc" }],
    });
    return NextResponse.json(assignments);
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const prisma = getPrisma();
  try {
    if (!(await verifyPropertyOwner(id, session.user.id)))
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json() as { cleaner_id: string; is_primary?: boolean };
    const { cleaner_id, is_primary = false } = body;
    if (!cleaner_id) return NextResponse.json({ error: "cleaner_id required" }, { status: 400 });

    // Verify the cleaner belongs to this landlord
    const cleaner = await prisma.cleaner.findFirst({
      where: { id: cleaner_id, landlord_id: session.user.id },
    });
    if (!cleaner) return NextResponse.json({ error: "Cleaner not found" }, { status: 404 });

    // If setting as primary, demote existing primary
    if (is_primary) {
      await prisma.propertyCleaner.updateMany({
        where: { property_id: id, is_primary: true },
        data: { is_primary: false },
      });
    }

    const count = await prisma.propertyCleaner.count({ where: { property_id: id } });

    const assignment = await prisma.propertyCleaner.upsert({
      where: { property_id_cleaner_id: { property_id: id, cleaner_id } },
      update: { is_primary },
      create: { property_id: id, cleaner_id, is_primary, priority: count },
      include: { cleaner: { select: { id: true, name: true, telegram_chat_id: true } } },
    });
    return NextResponse.json(assignment);
  } finally {
    await prisma.$disconnect();
  }
}
