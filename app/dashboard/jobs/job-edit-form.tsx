"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const STATUS_OPTIONS = [
  "new",
  "offered",
  "accepted",
  "in_progress",
  "done_awaiting_review",
  "completed",
  "cancelled",
] as const;

type Cleaner = { id: string; name: string };

type Props = {
  id: string;
  initialWindowStart: string;
  initialWindowEnd: string;
  initialStatus: string;
  initialAssignedCleanerId: string | null;
  cleaners: Cleaner[];
};

export function JobEditForm({
  id,
  initialWindowStart,
  initialWindowEnd,
  initialStatus,
  initialAssignedCleanerId,
  cleaners,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [windowStart, setWindowStart] = useState(initialWindowStart);
  const [windowEnd, setWindowEnd] = useState(initialWindowEnd);
  const [status, setStatus] = useState(initialStatus);
  const [assignedCleanerId, setAssignedCleanerId] = useState(
    initialAssignedCleanerId ?? ""
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const start = new Date(windowStart);
    const end = new Date(windowEnd);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      setError("Window end must be after window start.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          window_start: start.toISOString(),
          window_end: end.toISOString(),
          status,
          assigned_cleaner_id: assignedCleanerId.trim() || null,
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
          htmlFor="window_start"
          className="block text-sm font-medium text-zinc-700"
        >
          Window start *
        </label>
        <input
          id="window_start"
          type="datetime-local"
          required
          value={windowStart}
          onChange={(e) => setWindowStart(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
      </div>
      <div>
        <label
          htmlFor="window_end"
          className="block text-sm font-medium text-zinc-700"
        >
          Window end *
        </label>
        <input
          id="window_end"
          type="datetime-local"
          required
          value={windowEnd}
          onChange={(e) => setWindowEnd(e.target.value)}
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
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label
          htmlFor="assigned_cleaner_id"
          className="block text-sm font-medium text-zinc-700"
        >
          Assigned cleaner
        </label>
        <select
          id="assigned_cleaner_id"
          value={assignedCleanerId}
          onChange={(e) => setAssignedCleanerId(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        >
          <option value="">None</option>
          {cleaners.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
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
