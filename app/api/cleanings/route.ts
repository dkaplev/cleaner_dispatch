import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let prisma;
  try {
    prisma = getPrisma();
    const cleanings = await prisma.cleaning.findMany({
      where: { property: { landlord_id: session.user.id } },
      include: {
        property: { select: { id: true, name: true } },
        cleaner: { select: { id: true, name: true, telegram_chat_id: true } },
      },
      orderBy: { scheduled_at: "asc" },
    });
    return NextResponse.json(cleanings);
  } catch (error) {
    console.error("Cleanings list error:", error);
    return NextResponse.json({ error: "Failed to list cleanings" }, { status: 500 });
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
    const property_id = typeof body.property_id === "string" ? body.property_id.trim() : "";
    const cleaner_id = typeof body.cleaner_id === "string" ? body.cleaner_id.trim() : "";
    const scheduled_at =
      body.scheduled_at != null && body.scheduled_at !== ""
        ? new Date(body.scheduled_at as string)
        : null;
    const notes = typeof body.notes === "string" ? body.notes.trim() || null : null;

    if (!property_id || !cleaner_id) {
      return NextResponse.json(
        { error: "Property and cleaner are required" },
        { status: 400 }
      );
    }
    if (!scheduled_at || Number.isNaN(scheduled_at.getTime())) {
      return NextResponse.json(
        { error: "Valid scheduled date and time are required" },
        { status: 400 }
      );
    }

    prisma = getPrisma();
    const [property, cleaner] = await Promise.all([
      prisma.property.findFirst({
        where: { id: property_id, landlord_id: session.user.id },
      }),
      prisma.cleaner.findFirst({
        where: { id: cleaner_id, landlord_id: session.user.id },
      }),
    ]);
    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }
    if (!cleaner) {
      return NextResponse.json({ error: "Cleaner not found" }, { status: 404 });
    }

    const cleaning = await prisma.cleaning.create({
      data: {
        property_id,
        cleaner_id,
        scheduled_at,
        notes,
      },
      include: {
        property: { select: { id: true, name: true } },
        cleaner: { select: { id: true, name: true, telegram_chat_id: true } },
      },
    });

    if (cleaning.cleaner.telegram_chat_id) {
      try {
        const dateStr = scheduled_at.toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        });
        const msg = [
          `🧹 <b>New cleaning assigned</b>`,
          ``,
          `Property: ${cleaning.property.name}`,
          `When: ${dateStr}`,
          cleaning.notes ? `Notes: ${cleaning.notes}` : null,
        ]
          .filter(Boolean)
          .join("\n");
        await sendTelegramMessage(cleaning.cleaner.telegram_chat_id, msg);
      } catch (err) {
        console.error("Telegram notification failed:", err);
      }
    }

    return NextResponse.json(cleaning);
  } catch (error) {
    console.error("Cleaning create error:", error);
    return NextResponse.json({ error: "Failed to create cleaning" }, { status: 500 });
  } finally {
    if (prisma) await prisma.$disconnect();
  }
}
