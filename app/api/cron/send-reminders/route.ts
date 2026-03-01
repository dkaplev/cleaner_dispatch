import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";

/** On Vercel Hobby, crons can only run daily. We send reminders for jobs starting in the next 24 hours. */
const REMINDER_HOURS_AHEAD = 24;

function formatJobWindow(start: Date, end: Date): string {
  return `${start.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} – ${end.toLocaleTimeString(undefined, { timeStyle: "short" })}`;
}

function escapeTg(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Cron: send reminders to assigned cleaners for jobs starting in the next 24 hours.
 * Vercel Hobby allows only daily cron; this runs once per day (e.g. 0 8 * * *).
 * Requires CRON_SECRET: Authorization: Bearer <CRON_SECRET> or ?secret=<CRON_SECRET>.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 503 }
    );
  }
  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const querySecret = new URL(request.url).searchParams.get("secret");
  if (bearer !== cronSecret && querySecret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const cutoff = new Date(now.getTime() + REMINDER_HOURS_AHEAD * 60 * 60 * 1000);

  const prisma = getPrisma();
  try {
    const jobs = await prisma.job.findMany({
      where: {
        status: { in: ["accepted", "in_progress"] },
        reminder_sent_at: null,
        window_start: { gt: now, lte: cutoff },
        assigned_cleaner_id: { not: null },
      },
      include: {
        property: { select: { name: true } },
        assigned_cleaner: { select: { id: true, telegram_chat_id: true } },
      },
    });

    let sent = 0;
    for (const job of jobs) {
      const chatId = job.assigned_cleaner?.telegram_chat_id?.trim();
      if (!chatId) continue;
      try {
        const messageText =
          `⏰ <b>Reminder: cleaning job coming up</b>\n\n` +
          `Property: <b>${escapeTg(job.property.name)}</b>\n` +
          `Window: ${formatJobWindow(job.window_start, job.window_end)}\n\n` +
          `Please complete the cleaning and upload photos when done.`;
        await sendTelegramMessage(chatId, messageText);
        await prisma.job.update({
          where: { id: job.id },
          data: { reminder_sent_at: new Date() },
        });
        sent += 1;
      } catch (e) {
        console.error("[cron send-reminders] Failed to send for job", job.id, e);
      }
    }

    return NextResponse.json({
      ok: true,
      reminders_sent: sent,
      jobs_checked: jobs.length,
    });
  } catch (error) {
    console.error("[cron send-reminders] Error:", error);
    return NextResponse.json(
      { error: "Failed to process reminders" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
