"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  botUsername: string | undefined;
  landlordLink: string | null;
  isLinked: boolean;
};

export function LandlordTelegramLink({ botUsername, landlordLink, isLinked }: Props) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function copyLink() {
    if (!landlordLink) return;
    try {
      await navigator.clipboard.writeText(landlordLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  if (!botUsername?.trim() || !landlordLink) {
    return (
      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-800">
        <strong>Job updates in Telegram</strong>
        <p className="mt-1">
          Set <code className="rounded bg-amber-100 px-1">TELEGRAM_BOT_USERNAME</code> in your env to enable the link.
          You’ll get instant updates when a cleaner accepts, declines, or completes a job.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
      <h3 className="text-sm font-medium text-zinc-800">Job updates in Telegram</h3>
      {isLinked ? (
        <p className="mt-1 text-sm text-zinc-600">
          ✅ Linked. You receive updates here: job accepted, declined, and when cleaning is completed (so you know the property is ready for the next guest).
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm text-zinc-600">
            Open the link below in Telegram and tap <strong>Start</strong>. You’ll get updates only for important events: job accepted, declined, and cleaning completed — no spam.
          </p>
          <button
            type="button"
            onClick={async () => {
              setRefreshing(true);
              router.refresh();
              setTimeout(() => setRefreshing(false), 500);
            }}
            disabled={refreshing}
            className="mt-2 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            {refreshing ? "Refreshing…" : "Refresh status"}
          </button>
        </>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <a
          href={landlordLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block max-w-full truncate rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-blue-600 underline hover:no-underline"
        >
          {landlordLink}
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
