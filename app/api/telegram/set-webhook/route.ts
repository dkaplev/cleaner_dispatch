import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * POST /api/telegram/set-webhook
 * Registers the Telegram webhook URL with Telegram so that "Link Telegram" and Accept/Decline work.
 * Uses NEXTAUTH_URL and TELEGRAM_BOT_TOKEN from env. Auth required (landlord only).
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, "");

  if (!token) {
    return NextResponse.json(
      { error: "TELEGRAM_BOT_TOKEN is not set" },
      { status: 503 }
    );
  }
  if (!baseUrl || !baseUrl.startsWith("https://")) {
    return NextResponse.json(
      { error: "NEXTAUTH_URL must be a valid HTTPS URL (e.g. https://your-app.vercel.app)" },
      { status: 503 }
    );
  }

  const webhookUrl = `${baseUrl}/api/telegram/webhook`;

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}`
    );
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      description?: string;
      result?: boolean;
    };

    if (!res.ok) {
      return NextResponse.json(
        { error: data.description ?? `Telegram API error ${res.status}` },
        { status: 502 }
      );
    }
    if (!data.ok) {
      return NextResponse.json(
        { error: data.description ?? "Telegram returned not ok" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Webhook registered.",
      webhook_url: webhookUrl,
    });
  } catch (e) {
    console.error("[set-webhook] Error:", e);
    return NextResponse.json(
      { error: "Failed to call Telegram API" },
      { status: 500 }
    );
  }
}
