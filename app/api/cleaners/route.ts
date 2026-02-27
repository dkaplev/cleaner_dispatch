import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let prisma;
  try {
    prisma = getPrisma();
    const cleaners = await prisma.cleaner.findMany({
      where: { landlord_id: session.user.id },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(cleaners);
  } catch (error) {
    console.error("Cleaners list error:", error);
    return NextResponse.json({ error: "Failed to list cleaners" }, { status: 500 });
  } finally {
    if (prisma) await prisma.$disconnect();
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let prisma;
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    const telegram_chat_id =
      typeof body.telegram_chat_id === "string" ? body.telegram_chat_id.trim() || null : null;
    const notes = typeof body.notes === "string" ? body.notes.trim() || null : null;
    const is_active = typeof body.is_active === "boolean" ? body.is_active : true;

    prisma = getPrisma();
    const cleaner = await prisma.cleaner.create({
      data: {
        landlord_id: session.user.id,
        name,
        telegram_chat_id,
        notes,
        is_active,
      },
    });
    return NextResponse.json(cleaner);
  } catch (error) {
    console.error("Cleaner create error:", error);
    return NextResponse.json({ error: "Failed to create cleaner" }, { status: 500 });
  } finally {
    if (prisma) await prisma.$disconnect();
  }
}
