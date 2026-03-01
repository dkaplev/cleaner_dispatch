"use client";

import { useState } from "react";

export function TelegramTest() {
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookResult, setWebhookResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function handleSetWebhook() {
    setWebhookResult(null);
    setWebhookLoading(true);
    try {
      const res = await fetch("/api/telegram/set-webhook", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setWebhookResult({ ok: true, message: data.message ?? "OK" });
      } else {
        setWebhookResult({ ok: false, message: data.error ?? "Something went wrong." });
      }
    } catch {
      setWebhookResult({ ok: false, message: "Network error." });
    } finally {
      setWebhookLoading(false);
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
      <h3 className="text-sm font-medium text-zinc-800">Telegram</h3>
      <p className="mt-1 text-xs text-zinc-500">
        If cleaners can’t link their Telegram or don’t receive job offers, reconnect below.
      </p>
      <button
        type="button"
        onClick={handleSetWebhook}
        disabled={webhookLoading}
        className="mt-3 rounded-lg bg-zinc-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
      >
        {webhookLoading ? "Connecting…" : "Reconnect Telegram"}
      </button>
      {webhookResult && (
        <p
          className={`mt-2 text-sm ${webhookResult.ok ? "text-emerald-700" : "text-red-700"}`}
          role="status"
        >
          {webhookResult.ok ? "Connection updated." : webhookResult.message}
        </p>
      )}
    </div>
  );
}
