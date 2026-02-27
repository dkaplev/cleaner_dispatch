"use client";

import { useState } from "react";

type Props = {
  botUsername: string | undefined;
  cleanerId: string | null;
  currentChatId: string | null;
};

export function CleanerTelegramLink({ botUsername, cleanerId, currentChatId }: Props) {
  const [copied, setCopied] = useState(false);

  const link =
    botUsername?.trim() && cleanerId
      ? `https://t.me/${botUsername.replace(/^@/, "")}?start=cleaner_${cleanerId}`
      : null;

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  // Create flow: no cleaner yet — explain that the link will appear after save
  if (cleanerId === null) {
    return (
      <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
        <h3 className="text-sm font-medium text-zinc-800">Link Telegram (easy way)</h3>
        <p className="mt-1 text-sm text-zinc-600">
          After you save this cleaner, you’ll be taken to their profile where you can copy a one-click link to send to
          them. When they open it and tap <strong>Start</strong> in Telegram, their account will be linked automatically.
        </p>
      </div>
    );
  }

  if (!link) {
    return (
      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-800">
        <strong>Link Telegram</strong>
        <p className="mt-1">
          Set <code className="rounded bg-amber-100 px-1">TELEGRAM_BOT_USERNAME</code> in your{" "}
          <code className="rounded bg-amber-100 px-1">.env</code> (your bot’s username, e.g.{" "}
          <code className="rounded bg-amber-100 px-1">MyCleanerDispatchBot</code>) to show the one-click link here.
          Until then, you can still paste the cleaner’s chat ID manually in the form below.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
      <h3 className="text-sm font-medium text-zinc-800">Link Telegram (easy way)</h3>
      {currentChatId ? (
        <p className="mt-1 text-sm text-zinc-600">
          ✅ Linked (chat ID: <code className="rounded bg-zinc-200 px-1">{currentChatId}</code>).
          You can send a new link to re-link a different Telegram account.
        </p>
      ) : (
        <p className="mt-1 text-sm text-zinc-600">
          Not linked yet. Send the link below to your cleaner. When they open it and tap <strong>Start</strong>, their
          Telegram will be linked automatically.
        </p>
      )}
      <details className="mt-2 text-xs text-zinc-500">
        <summary className="cursor-pointer hover:text-zinc-700">If nothing happens when they tap Start</summary>
        <p className="mt-1 rounded bg-zinc-100 p-2 text-zinc-600">
          Telegram must be able to call your app’s webhook. If you’re on <strong>localhost</strong>, it can’t — use{" "}
          <strong>ngrok</strong> (e.g. <code>ngrok http 3000</code>), then set the webhook once with the ngrok HTTPS URL +{" "}
          <code>/api/telegram/webhook</code>. Check your server terminal for <code>[Telegram webhook]</code> logs when they tap Start.
        </p>
      </details>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block truncate max-w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-blue-600 underline hover:no-underline"
        >
          {link}
        </a>
        <button
          type="button"
          onClick={copyLink}
          className="rounded-lg bg-zinc-800 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          {copied ? "Copied!" : "Copy link"}
        </button>
      </div>
    </div>
  );
}
