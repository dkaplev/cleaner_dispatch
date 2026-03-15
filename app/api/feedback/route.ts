import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";

const CATEGORIES = ["general", "bug", "feature", "testimonial"] as const;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as { category?: string; message?: string };
  const category = CATEGORIES.includes(body.category as typeof CATEGORIES[number])
    ? body.category!
    : "general";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message || message.length < 5) {
    return NextResponse.json({ error: "Message is too short" }, { status: 400 });
  }
  if (message.length > 2000) {
    return NextResponse.json({ error: "Message is too long (max 2000 characters)" }, { status: 400 });
  }

  const prisma = getPrisma();
  try {
    const feedback = await prisma.feedback.create({
      data: { user_id: session.user.id, category, message },
      select: { id: true },
    });

    // Notify admin via Telegram if configured
    const adminChatId = process.env.ADMIN_TELEGRAM_CHAT_ID?.trim();
    if (adminChatId) {
      const labelMap: Record<string, string> = {
        general: "💬 General",
        bug: "🐛 Bug report",
        feature: "💡 Feature request",
        testimonial: "⭐ Testimonial",
      };
      const label = labelMap[category] ?? category;
      try {
        // Telegram hard limit is 4096 chars; our max message is 2000, so no truncation needed
      await sendTelegramMessage(
          adminChatId,
          `${label} from <b>${session.user.email}</b>\n\n${message}`
        );
      } catch (e) {
        console.error("[feedback] Admin Telegram notify failed:", e);
      }
    }

    return NextResponse.json({ ok: true, id: feedback.id });
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const prisma = getPrisma();
  try {
    const items = await prisma.feedback.findMany({
      where: { user_id: session.user.id },
      orderBy: { created_at: "desc" },
      select: { id: true, category: true, message: true, created_at: true },
      take: 10,
    });
    return NextResponse.json(items);
  } finally {
    await prisma.$disconnect();
  }
}
