"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props =
  | { action: "create" }
  | {
      action: "edit";
      id: string;
      initialName: string;
      initialTelegramChatId: string;
      initialNotes: string;
      initialIsActive: boolean;
    };

export function CleanerForm(props: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isEdit = props.action === "edit";
  const [name, setName] = useState(isEdit ? props.initialName : "");
  const [telegramChatId, setTelegramChatId] = useState(
    isEdit ? props.initialTelegramChatId : ""
  );
  const [notes, setNotes] = useState(isEdit ? props.initialNotes : "");
  const [isActive, setIsActive] = useState(isEdit ? props.initialIsActive : true);
  const [linkCopied, setLinkCopied] = useState(false);

  const initialTelegram = isEdit && props.action === "edit" ? props.initialTelegramChatId : "";
  useEffect(() => {
    if (isEdit) setTelegramChatId(initialTelegram);
  }, [isEdit, initialTelegram]);

  async function copyBotLink() {
    try {
      await navigator.clipboard.writeText("https://t.me/userinfobot");
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      setLinkCopied(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        telegram_chat_id: telegramChatId.trim() || null,
        notes: notes.trim() || null,
        is_active: isActive,
      };

      const url = isEdit ? `/api/cleaners/${props.id}` : "/api/cleaners";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }
      if (isEdit) {
        router.push("/dashboard/cleaners");
      } else if (data?.id) {
        router.push(`/dashboard/cleaners/${data.id}/edit`);
      } else {
        router.push("/dashboard/cleaners");
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
    >
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-zinc-700">
          Name *
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
      </div>

      {/* Telegram — context-aware based on whether already linked */}
      {telegramChatId ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-sm font-medium text-emerald-800">&#10003; Telegram linked</p>
          <p className="mt-0.5 text-xs text-emerald-700">
            This cleaner will receive job offers via Telegram automatically.
            To re-link a different account, use the share link in the &quot;Link Telegram&quot; section above.
          </p>
          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-emerald-700 hover:underline">
              Edit chat ID manually
            </summary>
            <input
              id="telegram_chat_id"
              type="text"
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
              className="mt-1.5 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
          </details>
        </div>
      ) : (
        <div>
          <label htmlFor="telegram_chat_id" className="block text-sm font-medium text-zinc-700">
            Telegram chat ID{" "}
            <span className="font-normal text-zinc-400">(manual fallback)</span>
          </label>
          <p className="mt-0.5 text-xs text-zinc-500">
            The <strong>preferred method</strong> is the one-click share link in the &quot;Link Telegram&quot;
            section above — the cleaner just taps Start and they are connected automatically.
            Use this field only if the share link is not working.
          </p>
          <details className="mt-1.5 rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2">
            <summary className="cursor-pointer text-sm font-medium text-zinc-700 hover:text-zinc-900">
              How to get the chat ID manually
            </summary>
            <ol className="mt-2 list-inside list-decimal space-y-1 text-xs text-zinc-600">
              <li>Send the cleaner the link to <code className="rounded bg-zinc-100 px-1">@userinfobot</code> on Telegram.</li>
              <li>They send the bot any message.</li>
              <li>The bot replies with their numeric <strong>Id</strong> — they send it to you to paste here.</li>
            </ol>
            <button
              type="button"
              onClick={copyBotLink}
              className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-zinc-700 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
            >
              {linkCopied ? "Copied!" : "Copy @userinfobot link"}
            </button>
          </details>
          <input
            id="telegram_chat_id"
            type="text"
            placeholder="Cleaner's Telegram ID, e.g. 123456789"
            value={telegramChatId}
            onChange={(e) => setTelegramChatId(e.target.value)}
            className="mt-1.5 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
        </div>
      )}

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-zinc-700">
          Notes
        </label>
        <textarea
          id="notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="is_active"
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500"
        />
        <label htmlFor="is_active" className="text-sm font-medium text-zinc-700">
          Active (available for assignments)
        </label>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading ? "Saving…" : isEdit ? "Save changes" : "Add cleaner"}
        </button>
        <Link
          href="/dashboard/cleaners"
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
