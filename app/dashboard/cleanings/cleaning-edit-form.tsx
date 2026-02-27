"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  id: string;
  initialScheduledAt: string;
  initialStatus: string;
  initialNotes: string;
};

export function CleaningEditForm({
  id,
  initialScheduledAt,
  initialStatus,
  initialNotes,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [scheduledAt, setScheduledAt] = useState(initialScheduledAt);
  const [status, setStatus] = useState(initialStatus);
  const [notes, setNotes] = useState(initialNotes);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!scheduledAt) {
      setError("Please set the scheduled date and time.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/cleanings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduled_at: new Date(scheduledAt).toISOString(),
          status,
          notes: notes.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }
      router.push("/dashboard/cleanings");
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
        <p
          className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          {error}
        </p>
      )}
      <div>
        <label
          htmlFor="scheduled_at"
          className="block text-sm font-medium text-zinc-700"
        >
          Date & time *
        </label>
        <input
          id="scheduled_at"
          type="datetime-local"
          required
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
      </div>
      <div>
        <label htmlFor="status" className="block text-sm font-medium text-zinc-700">
          Status
        </label>
        <select
          id="status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        >
          <option value="scheduled">Scheduled</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-zinc-700">
          Notes
        </label>
        <textarea
          id="notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
      </div>
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading ? "Saving…" : "Save changes"}
        </button>
        <Link
          href="/dashboard/cleanings"
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
