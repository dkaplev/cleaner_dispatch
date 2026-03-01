import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import {
  answerTelegramCallback,
  sendTelegramMessage,
  sendTelegramMessageWithUrlButton,
} from "@/lib/telegram";
import { dispatchJob } from "@/lib/dispatch";
import { createUploadToken } from "@/lib/upload-token";
import {
  notifyLandlordJobAccepted,
  notifyLandlordJobDeclined,
} from "@/lib/notify-landlord-telegram";

const PREFIX_CLEANER = "cleaner_";
const PREFIX_LANDLORD = "landlord_";

type TelegramUpdate = {
  update_id?: number;
  message?: {
    message_id: number;
    from?: { id: number; first_name?: string; username?: string };
    chat: { id: number; type: string };
    text?: string;
  };
  callback_query?: {
    id: string;
    from?: { id: number };
    message?: { chat: { id: number }; message_id: number };
    data?: string;
  };
};

/**
 * Telegram webhook: receives updates when users message the bot.
 * Handles /start cleaner_<id> to link a cleaner's Telegram chat_id to their profile.
 * No auth - Telegram servers call this. Register with setWebhook (see docs).
 */
export async function POST(request: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    return NextResponse.json({ error: "Bot not configured" }, { status: 503 });
  }

  let body: TelegramUpdate;
  try {
    body = await request.json();
  } catch (e) {
    console.error("[Telegram webhook] Invalid JSON body:", e);
    return new NextResponse("Bad request", { status: 400 });
  }

  const callbackQuery = body.callback_query;
  const message = body.message;

  console.log("[Telegram webhook] Update received", {
    update_id: body.update_id,
    has_callback_query: !!callbackQuery,
    has_message: !!message,
    callback_data: callbackQuery?.data,
    text: message?.text ?? "(no text)",
  });

  // Handle Accept/Decline inline button press
  if (callbackQuery?.id && callbackQuery?.data) {
    const handled = await handleOfferCallback(callbackQuery);
    return NextResponse.json({ ok: true });
  }

  if (!message?.chat?.id || !message.text) {
    return NextResponse.json({ ok: true });
  }

  const chatId = String(message.chat.id);
  const text = message.text.trim();

  // Handle /done — send upload link(s) for cleaner's active job(s)
  if (text === "/done" || text.toLowerCase() === "/done") {
    const handled = await handleDoneCommand(chatId);
    return NextResponse.json({ ok: true });
  }

  // Handle /start [payload]: landlord_<userId> or cleaner_<cleanerId>
  if (!text.startsWith("/start")) {
    return NextResponse.json({ ok: true });
  }

  const parts = text.split(/\s+/);
  const payload = parts[1];

  if (payload?.startsWith(PREFIX_LANDLORD)) {
    const userId = payload.slice(PREFIX_LANDLORD.length);
    if (!userId) return NextResponse.json({ ok: true });
    let prisma;
    try {
      prisma = getPrisma();
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true },
      });
      if (!user) {
        await sendTelegramMessage(chatId, "This link is invalid or has expired.");
        return NextResponse.json({ ok: true });
      }
      await prisma.user.update({
        where: { id: userId },
        data: { telegram_chat_id: chatId },
      });
      await sendTelegramMessage(
        chatId,
        "✅ You're linked. You'll receive job updates here (accepted, declined, cleaning completed)."
      );
    } catch (e) {
      console.error("[Telegram webhook] Landlord link error:", e);
      try {
        await sendTelegramMessage(chatId, "Something went wrong. Please try again from the dashboard.");
      } catch (_e) {
        // ignore
      }
    } finally {
      if (prisma) await prisma.$disconnect();
    }
    return NextResponse.json({ ok: true });
  }

  if (!payload || !payload.startsWith(PREFIX_CLEANER)) {
    try {
      await sendTelegramMessage(
        chatId,
        "Use the link from your landlord to link your Telegram to Cleaner Dispatch."
      );
    } catch (e) {
      console.error("[Telegram webhook] Failed to send reply:", e);
    }
    return NextResponse.json({ ok: true });
  }

  const cleanerId = payload.slice(PREFIX_CLEANER.length);
  if (!cleanerId) {
    return NextResponse.json({ ok: true });
  }

  console.log("[Telegram webhook] Linking cleaner_id:", cleanerId, "chat_id:", chatId);

  let prisma;
  try {
    prisma = getPrisma();
    const cleaner = await prisma.cleaner.findUnique({
      where: { id: cleanerId },
      select: { id: true, name: true },
    });
    if (!cleaner) {
      console.log("[Telegram webhook] Cleaner not found:", cleanerId);
      try {
        await sendTelegramMessage(chatId, "This link is invalid or has expired.");
      } catch (e) {
        console.error("[Telegram webhook] Failed to send invalid-link reply:", e);
      }
      return NextResponse.json({ ok: true });
    }

    await prisma.cleaner.update({
      where: { id: cleanerId },
      data: { telegram_chat_id: chatId },
    });

    const updated = await prisma.cleaner.findUnique({
      where: { id: cleanerId },
      select: { telegram_chat_id: true },
    });
    if (updated?.telegram_chat_id !== chatId) {
      console.error("[Telegram webhook] Update may not have persisted; read back:", updated?.telegram_chat_id);
    } else {
      console.log("[Telegram webhook] Updated cleaner", cleanerId, "telegram_chat_id =", chatId);
    }

    try {
      await sendTelegramMessage(
        chatId,
        `✅ You're linked as <b>${escapeHtml(cleaner.name)}</b>. You'll receive cleaning assignments here.`
      );
    } catch (e) {
      console.error("[Telegram webhook] Failed to send confirmation to user:", e);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Telegram webhook] Error:", error);
    return NextResponse.json({ ok: true }); // 200 so Telegram doesn't retry forever
  } finally {
    if (prisma) await prisma.$disconnect();
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Handle /done: find cleaner by chat_id, find their active jobs (accepted/in_progress), send upload link(s).
 */
async function handleDoneCommand(chatId: string): Promise<boolean> {
  let prisma;
  try {
    prisma = getPrisma();
    const cleaner = await prisma.cleaner.findFirst({
      where: { telegram_chat_id: chatId },
      select: { id: true, name: true },
    });
    if (!cleaner) {
      await sendTelegramMessage(
        chatId,
        "Your Telegram isn't linked to a cleaner account. Use the link from your landlord to link it."
      );
      return true;
    }

    const jobs = await prisma.job.findMany({
      where: {
        assigned_cleaner_id: cleaner.id,
        status: { in: ["accepted", "in_progress"] },
      },
      select: {
        id: true,
        property: { select: { name: true } },
        window_start: true,
        window_end: true,
      },
      orderBy: { window_start: "asc" },
    });

    if (jobs.length === 0) {
      await sendTelegramMessage(chatId, "You have no active cleaning jobs.");
      return true;
    }

    const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "";
    if (!baseUrl) {
      await sendTelegramMessage(chatId, "Upload link is not configured. Contact your landlord.");
      return true;
    }

    for (const job of jobs) {
      const uploadToken = createUploadToken(job.id, cleaner.id);
      const uploadUrl = `${baseUrl}/job/${job.id}/upload?token=${encodeURIComponent(uploadToken)}`;
      const windowStr = `${new Date(job.window_start).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} – ${new Date(job.window_end).toLocaleTimeString(undefined, { timeStyle: "short" })}`;
      await sendTelegramMessageWithUrlButton(
        chatId,
        `📸 <b>${escapeHtml(job.property.name)}</b> — ${windowStr}\n\nUpload photos and mark the job as done:`,
        "📸 Upload photos",
        uploadUrl
      );
    }
    return true;
  } catch (e) {
    console.error("[Telegram webhook] handleDoneCommand error:", e);
    try {
      await sendTelegramMessage(chatId, "Something went wrong. Please try again or contact your landlord.");
    } catch (_e) {
      // ignore
    }
    return true;
  } finally {
    if (prisma) await prisma.$disconnect();
  }
}

async function handleOfferCallback(callbackQuery: {
  id: string;
  data?: string;
  message?: { chat: { id: number } };
}): Promise<boolean> {
  const data = callbackQuery.data?.trim();
  if (!data) return false;

  const isAccept = data.startsWith("accept:");
  const isDecline = data.startsWith("decline:");
  if (!isAccept && !isDecline) return false;

  const offerToken = (isAccept ? data.slice(7) : data.slice(8)).trim();
  if (!offerToken) return false;

  let prisma;
  try {
    prisma = getPrisma();
    const attempt = await prisma.dispatchAttempt.findUnique({
      where: { offer_token: offerToken },
      include: {
        job: {
          select: {
            id: true,
            status: true,
            landlord_id: true,
            assigned_cleaner_id: true,
            property: { select: { name: true } },
          },
        },
        cleaner: { select: { id: true, name: true, telegram_chat_id: true } },
      },
    });

    if (!attempt) {
      await answerTelegramCallback(callbackQuery.id, {
        text: "This offer has expired or was already answered.",
        show_alert: true,
      });
      return true;
    }
    if (attempt.offer_status !== "sent") {
      await answerTelegramCallback(callbackQuery.id, {
        text: "Already answered.",
        show_alert: false,
      });
      return true;
    }

    const now = new Date();
    const chatId = callbackQuery.message?.chat?.id
      ? String(callbackQuery.message.chat.id)
      : attempt.cleaner.telegram_chat_id;

    if (isAccept) {
      // Reject late accept: job already assigned (another cleaner got it first)
      const jobAlreadyTaken =
        attempt.job.status === "accepted" || attempt.job.assigned_cleaner_id != null;
      if (jobAlreadyTaken) {
        await prisma.dispatchAttempt.update({
          where: { id: attempt.id },
          data: { offer_status: "cancelled", responded_at: now },
        });
        await answerTelegramCallback(callbackQuery.id, {
          text: "This job was already taken by another cleaner.",
          show_alert: true,
        });
        if (chatId) {
          try {
            await sendTelegramMessage(
              chatId,
              "This job was already accepted by someone else. You'll get the next one."
            );
          } catch (e) {
            console.error("[Telegram webhook] Failed to send late-accept message:", e);
          }
        }
        return true;
      }

      // Get other cleaners who still have a pending offer (we'll notify them after assigning)
      const othersWithPendingOffer = await prisma.dispatchAttempt.findMany({
        where: {
          job_id: attempt.job_id,
          id: { not: attempt.id },
          offer_status: "sent",
        },
        select: { cleaner: { select: { telegram_chat_id: true } } },
      });
      const otherChatIds = othersWithPendingOffer
        .map((a) => a.cleaner.telegram_chat_id)
        .filter((id): id is string => !!id?.trim());

      // Lock job: assign cleaner, status accepted; mark other attempts cancelled
      await prisma.$transaction([
        prisma.job.update({
          where: { id: attempt.job_id },
          data: {
            status: "accepted",
            assigned_cleaner_id: attempt.cleaner_id,
          },
        }),
        prisma.dispatchAttempt.update({
          where: { id: attempt.id },
          data: { offer_status: "accepted", responded_at: now },
        }),
        prisma.dispatchAttempt.updateMany({
          where: {
            job_id: attempt.job_id,
            id: { not: attempt.id },
            offer_status: "sent",
          },
          data: { offer_status: "cancelled", responded_at: now },
        }),
      ]);

      await answerTelegramCallback(callbackQuery.id, { text: "Job accepted!" });
      if (chatId) {
        try {
          await sendTelegramMessage(
            chatId,
            `✅ You accepted the job. We'll send a reminder before the cleaning window.`
          );
          const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "";
          if (baseUrl) {
            const uploadToken = createUploadToken(attempt.job.id, attempt.cleaner_id);
            const uploadUrl = `${baseUrl}/job/${attempt.job.id}/upload?token=${encodeURIComponent(uploadToken)}`;
            await sendTelegramMessageWithUrlButton(
              chatId,
              "When you're done, upload photos and mark the job as done:",
              "📸 Upload photos",
              uploadUrl
            );
          }
        } catch (e) {
          console.error("[Telegram webhook] Failed to send accept confirmation:", e);
        }
      }

      // Notify other cleaners who were still considering: job was taken by someone else
      for (const otherChatId of otherChatIds) {
        try {
          await sendTelegramMessage(
            otherChatId,
            "This order was accepted by another cleaner. You'll get the next one."
          );
        } catch (e) {
          console.error("[Telegram webhook] Failed to notify other cleaner:", e);
        }
      }

      // Notify landlord via Telegram so they feel in control
      try {
        const landlord = await prisma.user.findUnique({
          where: { id: attempt.job.landlord_id },
          select: { telegram_chat_id: true },
        });
        if (landlord?.telegram_chat_id) {
          await notifyLandlordJobAccepted(
            landlord.telegram_chat_id,
            attempt.job.property.name,
            attempt.cleaner.name,
            attempt.job.id
          );
        }
      } catch (e) {
        console.error("[Telegram webhook] Failed to notify landlord (accept):", e);
      }
    } else {
      await prisma.dispatchAttempt.update({
        where: { id: attempt.id },
        data: { offer_status: "declined", responded_at: now },
      });
      await answerTelegramCallback(callbackQuery.id, { text: "Declined." });
      if (chatId) {
        try {
          await sendTelegramMessage(chatId, "OK, we'll offer this job to someone else.");
        } catch (e) {
          console.error("[Telegram webhook] Failed to send decline confirmation:", e);
        }
      }

      // Try to offer the job to the next eligible cleaner (fallback routing)
      let nextCleanerName: string | undefined;
      try {
        const result = await dispatchJob(prisma, attempt.job.id);
        if (result.success) nextCleanerName = result.attempt.cleaner_name;
        else console.warn("[Telegram webhook] No fallback cleaner available:", result.error);
      } catch (e) {
        console.error("[Telegram webhook] Failed to dispatch to fallback cleaner:", e);
      }

      // Notify landlord via Telegram
      try {
        const landlord = await prisma.user.findUnique({
          where: { id: attempt.job.landlord_id },
          select: { telegram_chat_id: true },
        });
        if (landlord?.telegram_chat_id) {
          await notifyLandlordJobDeclined(
            landlord.telegram_chat_id,
            attempt.job.property.name,
            attempt.cleaner.name,
            attempt.job.id,
            nextCleanerName
          );
        }
      } catch (e) {
        console.error("[Telegram webhook] Failed to notify landlord (decline):", e);
      }
    }
    return true;
  } catch (error) {
    console.error("[Telegram webhook] handleOfferCallback error:", error);
    try {
      await answerTelegramCallback(callbackQuery.id, {
        text: "Something went wrong. Please try again or contact your landlord.",
        show_alert: true,
      });
    } catch (_e) {
      // ignore
    }
    return true;
  } finally {
    if (prisma) await prisma.$disconnect();
  }
}
