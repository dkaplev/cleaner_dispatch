import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { sendTelegramMessage } from "@/lib/telegram";

/**
 * Send a test message to a Telegram chat.
 * Used to verify TELEGRAM_BOT_TOKEN and that the bot can reach the chat.
 * Requires auth (landlord only).
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.TELEGRAM_BOT_TOKEN?.trim()) {
    return NextResponse.json(
      { error: "Telegram bot not configured. Set TELEGRAM_BOT_TOKEN in .env." },
      { status: 503 }
    );
  }

  let body: { chat_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON. Send { \"chat_id\": \"your_chat_id\" }." },
      { status: 400 }
    );
  }

  const chatId = typeof body.chat_id === "string" ? body.chat_id.trim() : "";
  if (!chatId) {
    return NextResponse.json(
      { error: "chat_id is required." },
      { status: 400 }
    );
  }

  const message = `🧪 <b>Cleaner Dispatch</b> test message\n\nIf you see this, Telegram is working. Sent at ${new Date().toISOString()}`;

  try {
    await sendTelegramMessage(chatId, message);
    return NextResponse.json({ ok: true, message: "Test message sent." });
  } catch (err) {
    console.error("Telegram test send failed:", err);
    return NextResponse.json(
      { error: "Failed to send. Check chat_id and that the user has started the bot." },
      { status: 502 }
    );
  }
}
