"use client";

import { useState } from "react";

export function TelegramTest() {
  const [chatId, setChatId] = useState("");
  const [loading, setLoading] = useState(false);
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [webhookResult, setWebhookResult] = useState<{ ok: boolean; message: string; url?: string } | null>(null);

  async function handleSetWebhook() {
    setWebhookResult(null);
    setWebhookLoading(true);
    try {
      const res = await fetch("/api/telegram/set-webhook", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setWebhookResult({
          ok: true,
          message: data.message ?? "Webhook set.",
          url: data.webhook_url,
        });
      } else {
        setWebhookResult({
          ok: false,
          message: data.error ?? "Failed to set webhook.",
        });
      }
    } catch {
      setWebhookResult({ ok: false, message: "Network error." });
    } finally {
      setWebhookLoading(false);
    }
  }

  async function handleSend() {
    const id = chatId.trim();
    if (!id) {
      setResult({ ok: false, message: "Enter a chat ID." });
      return;
    }
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch("/api/telegram/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: id }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setResult({ ok: true, message: data.message ?? "Sent." });
      } else {
        setResult({ ok: false, message: data.error ?? "Request failed." });
      }
    } catch {
      setResult({ ok: false, message: "Network error." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
      <h3 className="text-sm font-medium text-zinc-800">Telegram</h3>

      <div className="mt-3">
        <p className="text-xs font-medium text-zinc-700">1. Set webhook (for Link Telegram + Accept/Decline)</p>
        <p className="mt-0.5 text-xs text-zinc-500">
          Register your app URL with Telegram so cleaners can link their account and receive job offers. Do this once after deploy (and if you change domain).
        </p>
        <button
          type="button"
          onClick={handleSetWebhook}
          disabled={webhookLoading}
          className="mt-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {webhookLoading ? "Setting…" : "Set webhook now"}
        </button>
        {webhookResult && (
          <p
            className={`mt-2 text-sm ${webhookResult.ok ? "text-emerald-700" : "text-red-700"}`}
            role="status"
          >
            {webhookResult.message}
            {webhookResult.url && (
              <span className="block mt-1 text-xs text-zinc-500 break-all">{webhookResult.url}</span>
            )}
          </p>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-zinc-200">
        <p className="text-xs font-medium text-zinc-700">2. Test message</p>
        <p className="mt-0.5 text-xs text-zinc-500">
          Get your chat ID by messaging your bot with /start, then open{" "}
          <code className="rounded bg-zinc-200 px-1">https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code> and read{" "}
          <code className="rounded bg-zinc-200 px-1">chat.id</code>.
        </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="Chat ID (e.g. 123456789)"
          value={chatId}
          onChange={(e) => setChatId(e.target.value)}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={loading}
          className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {loading ? "Sending…" : "Send test message"}
        </button>
      </div>
        {result && (
          <p
            className={`mt-2 text-sm ${result.ok ? "text-emerald-700" : "text-red-700"}`}
            role="status"
          >
            {result.message}
          </p>
        )}
      </div>
    </div>
  );
}
