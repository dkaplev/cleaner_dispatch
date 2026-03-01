"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type JobRow = {
  id: string;
  window_start: string;
  window_end: string;
  status: string;
  reminder_sent_at: string | null;
  property: { id: string; name: string };
  assigned_cleaner: { id: string; name: string } | null;
  offered_to_cleaner_name: string | null;
  cleaners_considering: number;
};

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  offered: "Offered",
  accepted: "Accepted",
  in_progress: "In progress",
  done_awaiting_review: "Done (awaiting review)",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function DispatchList({ jobs }: { jobs: JobRow[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);
  const [remindingId, setRemindingId] = useState<string | null>(null);

  async function handleDispatch(id: string) {
    setDispatchingId(id);
    try {
      const res = await fetch(`/api/jobs/${id}/dispatch`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Failed to offer job");
        return;
      }
      router.refresh();
    } finally {
      setDispatchingId(null);
    }
  }

  async function handleSendReminder(id: string) {
    setRemindingId(id);
    try {
      const res = await fetch(`/api/jobs/${id}/send-reminder`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Failed to send reminder");
        return;
      }
      router.refresh();
    } finally {
      setRemindingId(null);
    }
  }

  async function handleDelete(id: string, label: string) {
    if (!confirm(`Delete this job (${label})?`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/jobs/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to delete");
        return;
      }
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  function formatWindow(start: string, end: string) {
    const s = new Date(start);
    const e = new Date(end);
    return `${s.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    })} – ${e.toLocaleTimeString(undefined, { timeStyle: "short" })}`;
  }

  function statusLabel(s: string, considering?: number) {
    const base = STATUS_LABELS[s] ?? s;
    if (s === "offered" && considering !== undefined && considering > 0) {
      return `${base} (${considering} considering)`;
    }
    return base;
  }

  if (jobs.length === 0) {
    return (
      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-8 text-center text-zinc-500">
        No jobs yet. Click &quot;Assign job&quot; to create one and send an offer (with Accept/Decline) to a cleaner.
      </div>
    );
  }

  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50">
          <tr>
            <th className="px-4 py-3 font-medium text-zinc-700">Property</th>
            <th className="px-4 py-3 font-medium text-zinc-700">Assignee</th>
            <th className="px-4 py-3 font-medium text-zinc-700">Date & time</th>
            <th className="px-4 py-3 font-medium text-zinc-700">Status</th>
            <th className="w-48 px-4 py-3 font-medium text-zinc-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((j) => {
            const deleting = deletingId === j.id;
            const dispatching = dispatchingId === j.id;
            const reminding = remindingId === j.id;
            const assigneeDisplay = j.assigned_cleaner?.name ?? (j.status === "offered" && j.offered_to_cleaner_name ? `Offered to ${j.offered_to_cleaner_name}` : "—");
            return (
              <tr key={j.id} className="border-b border-zinc-100 last:border-0">
                <td className="px-4 py-3 font-medium text-zinc-900">{j.property.name}</td>
                <td className="px-4 py-3 text-zinc-600">{assigneeDisplay}</td>
                <td className="px-4 py-3 text-zinc-600">
                  {formatWindow(j.window_start, j.window_end)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      j.status === "completed"
                        ? "text-emerald-600"
                        : j.status === "cancelled"
                          ? "text-zinc-400"
                          : j.status === "new"
                            ? "text-blue-600 font-medium"
                            : "text-zinc-700"
                    }
                  >
                    {statusLabel(j.status, j.cleaners_considering)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {j.status === "new" && (
                    <button
                      type="button"
                      onClick={() => handleDispatch(j.id)}
                      disabled={dispatching}
                      className="mr-3 text-blue-600 underline hover:no-underline disabled:opacity-50"
                    >
                      {dispatching ? "Sending…" : "Offer to cleaner"}
                    </button>
                  )}
                  {(j.status === "accepted" || j.status === "in_progress") &&
                    !j.reminder_sent_at && (
                      <button
                        type="button"
                        onClick={() => handleSendReminder(j.id)}
                        disabled={reminding}
                        className="mr-3 text-amber-600 underline hover:no-underline disabled:opacity-50"
                      >
                        {reminding ? "Sending…" : "Send reminder"}
                      </button>
                    )}
                  <Link
                    href={`/dashboard/jobs/${j.id}/edit`}
                    className="mr-3 text-zinc-700 underline hover:no-underline"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(j.id, `${j.property.name} ${j.window_start}`)}
                    disabled={deleting}
                    className="text-red-600 underline hover:no-underline disabled:opacity-50"
                  >
                    {deleting ? "…" : "Delete"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
