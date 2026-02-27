"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Job = {
  id: string;
  window_start: string;
  window_end: string;
  status: string;
  booking_id: string | null;
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

export function JobList({ initialJobs }: { initialJobs: Job[] }) {
  const router = useRouter();
  const [jobs, setJobs] = useState(initialJobs);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const filteredJobs =
    statusFilter === ""
      ? jobs
      : jobs.filter((j) => j.status === statusFilter);

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
      setJobs((prev) =>
        prev.map((j) =>
          j.id === id
            ? {
                ...j,
                status: "offered",
                offered_to_cleaner_name: data.attempt?.cleaner_name ?? null,
                cleaners_considering: (j.cleaners_considering ?? 0) + 1,
              }
            : j
        )
      );
    } finally {
      setDispatchingId(null);
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
      setJobs((prev) => prev.filter((j) => j.id !== id));
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

  const statuses = Array.from(new Set(jobs.map((j) => j.status))).sort();

  if (jobs.length === 0) {
    return (
      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-8 text-center text-zinc-500">
        No jobs yet. Create a job to get started (e.g. for testing dispatch later).
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {statuses.length > 1 && (
        <div className="flex items-center gap-2">
          <label htmlFor="status-filter" className="text-sm font-medium text-zinc-700">
            Filter by status:
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-900"
          >
            <option value="">All</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50">
            <tr>
              <th className="px-4 py-3 font-medium text-zinc-700">Property</th>
              <th className="px-4 py-3 font-medium text-zinc-700">Window</th>
              <th className="px-4 py-3 font-medium text-zinc-700">Status</th>
              <th className="px-4 py-3 font-medium text-zinc-700">Assigned</th>
              <th className="w-32 px-4 py-3 font-medium text-zinc-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredJobs.map((j) => (
              <tr key={j.id} className="border-b border-zinc-100 last:border-0">
                <td className="px-4 py-3 font-medium text-zinc-900">{j.property.name}</td>
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
                <td className="px-4 py-3 text-zinc-600">
                  {j.assigned_cleaner?.name ??
                    (j.status === "offered" && (j.cleaners_considering ?? 0) > 0
                      ? `${j.cleaners_considering} considering`
                      : j.status === "offered" && j.offered_to_cleaner_name
                        ? `Offered to ${j.offered_to_cleaner_name}`
                        : "—")}
                </td>
                <td className="px-4 py-3">
                  {j.status === "new" && (
                    <button
                      type="button"
                      onClick={() => handleDispatch(j.id)}
                      disabled={dispatchingId === j.id}
                      className="mr-3 text-blue-600 underline hover:no-underline disabled:opacity-50"
                    >
                      {dispatchingId === j.id ? "Sending…" : "Offer to cleaner"}
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
                    onClick={() =>
                      handleDelete(j.id, `${j.property.name} ${j.window_start}`)
                    }
                    disabled={deletingId === j.id}
                    className="text-red-600 underline hover:no-underline disabled:opacity-50"
                  >
                    {deletingId === j.id ? "…" : "Delete"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
