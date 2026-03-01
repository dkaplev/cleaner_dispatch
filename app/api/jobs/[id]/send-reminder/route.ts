import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";

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
 * POST /api/jobs/[id]/send-reminder
 * Sends a reminder message via Telegram to the assigned cleaner (if job is accepted/in_progress and reminder not yet sent).
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: jobId } = await params;

  let prisma;
  try {
    prisma = getPrisma();
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        property: { select: { name: true, landlord_id: true } },
        assigned_cleaner: { select: { id: true, name: true, telegram_chat_id: true } },
      },
    });

    if (!job || job.landlord_id !== session.user.id) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.reminder_sent_at) {
      return NextResponse.json(
        { error: "Reminder already sent for this job" },
        { status: 400 }
      );
    }

    const allowedStatuses = ["accepted", "in_progress"];
    if (!allowedStatuses.includes(job.status)) {
      return NextResponse.json(
        { error: "Reminder can only be sent for accepted or in-progress jobs" },
        { status: 400 }
      );
    }

    if (!job.assigned_cleaner?.telegram_chat_id?.trim()) {
      return NextResponse.json(
        { error: "Assigned cleaner has no Telegram linked" },
        { status: 400 }
      );
    }

    const messageText =
      `⏰ <b>Reminder: cleaning job</b>\n\n` +
      `Property: <b>${escapeTg(job.property.name)}</b>\n` +
      `Window: ${formatJobWindow(job.window_start, job.window_end)}\n\n` +
      `Please complete the cleaning and upload photos when done.`;

    await sendTelegramMessage(
      job.assigned_cleaner.telegram_chat_id,
      messageText
    );

    await prisma.job.update({
      where: { id: jobId },
      data: { reminder_sent_at: new Date() },
    });

    return NextResponse.json({ ok: true, message: "Reminder sent" });
  } catch (error) {
    console.error("[send-reminder] Error:", error);
    return NextResponse.json(
      { error: "Failed to send reminder" },
      { status: 500 }
    );
  } finally {
    if (prisma) await prisma.$disconnect();
  }
}
