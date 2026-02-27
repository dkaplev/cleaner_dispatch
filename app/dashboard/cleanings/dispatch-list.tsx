"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type CleaningRow = {
  type: "cleaning";
  id: string;
  scheduled_at: string;
  status: string;
  notes: string | null;
  property: { id: string; name: string };
  cleaner: { id: string; name: string };
};

type JobRow = {
  type: "job";
  id: string;
  window_start: string;
  window_end: string;
  status: string;
  property: { id: string; name: string };
  assigned_cleaner: { id: string; name: string } | null;
};

type DispatchRow = CleaningRow | JobRow;

function isCleaning(row: DispatchRow): row is CleaningRow {
  return row.type === "cleaning";
}

function sortKey(row: DispatchRow): string {
  if (isCleaning(row)) return row.scheduled_at;
  return row.window_start;
}

export function DispatchList({
  cleanings,
  jobs,
}: {
  cleanings: CleaningRow[];
  jobs: JobRow[];
}) {
  const router = useRouter();
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const rows: DispatchRow[] = [
    ...cleanings.map((c) => ({ ...c, type: "cleaning" as const })),
    ...jobs.map((j) => ({ ...j, type: "job" as const })),
  ].sort((a, b) => sortKey(a).localeCompare(sortKey(b)));

  async function deleteCleaning(id: string, label: string) {
    if (!confirm(`Delete this assignment (${label})?`)) return;
    const key = `cleaning-${id}`;
    setDeletingKey(key);
    try {
      const res = await fetch(`/api/cleanings/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to delete");
        return;
      }
      router.refresh();
    } finally {
      setDeletingKey(null);
    }
  }

  async function deleteJob(id: string, label: string) {
    if (!confirm(`Delete this job (${label})?`)) return;
    const key = `job-${id}`;
    setDeletingKey(key);
    try {
      const res = await fetch(`/api/jobs/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to delete");
        return;
      }
      router.refresh();
    } finally {
      setDeletingKey(null);
    }
  }

  function formatDate(at: string) {
    return new Date(at).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  function formatWindow(start: string, end: string) {
    const s = new Date(start);
    const e = new Date(end);
    return `${s.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    })} – ${e.toLocaleTimeString(undefined, { timeStyle: "short" })}`;
  }

  function cleaningStatusLabel(s: string) {
    switch (s) {
      case "completed":
        return "Completed";
      case "cancelled":
        return "Cancelled";
      default:
        return "Scheduled";
    }
  }

  function jobStatusLabel(s: string) {
    const labels: Record<string, string> = {
      new: "Find cleaner",
      offered: "Offered",
      accepted: "Accepted",
      in_progress: "In progress",
      done_awaiting_review: "Awaiting review",
      completed: "Completed",
      cancelled: "Cancelled",
    };
    return labels[s] ?? s;
  }

  if (rows.length === 0) {
    return (
      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-8 text-center text-zinc-500">
        No assignments or jobs yet. Use the button above to assign to a cleaner or create a job to find someone later.
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
            <th className="w-36 px-4 py-3 font-medium text-zinc-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            if (isCleaning(row)) {
              const key = `cleaning-${row.id}`;
              const deleting = deletingKey === key;
              return (
                <tr key={key} className="border-b border-zinc-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-zinc-900">{row.property.name}</td>
                  <td className="px-4 py-3 text-zinc-700">{row.cleaner.name}</td>
                  <td className="px-4 py-3 text-zinc-600">{formatDate(row.scheduled_at)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        row.status === "completed"
                          ? "text-emerald-600"
                          : row.status === "cancelled"
                            ? "text-zinc-400"
                            : "text-zinc-700 font-medium"
                      }
                    >
                      {cleaningStatusLabel(row.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/cleanings/${row.id}/edit`}
                      className="mr-3 text-zinc-700 underline hover:no-underline"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() =>
                        deleteCleaning(row.id, `${row.property.name} → ${row.cleaner.name}`)
                      }
                      disabled={deleting}
                      className="text-red-600 underline hover:no-underline disabled:opacity-50"
                    >
                      {deleting ? "…" : "Delete"}
                    </button>
                  </td>
                </tr>
              );
            }
            const key = `job-${row.id}`;
            const deleting = deletingKey === key;
            return (
              <tr key={key} className="border-b border-zinc-100 last:border-0">
                <td className="px-4 py-3 font-medium text-zinc-900">{row.property.name}</td>
                <td className="px-4 py-3 text-zinc-600">
                  {row.assigned_cleaner?.name ?? "—"}
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {formatWindow(row.window_start, row.window_end)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      row.status === "completed"
                        ? "text-emerald-600"
                        : row.status === "cancelled"
                          ? "text-zinc-400"
                          : row.status === "new"
                            ? "text-blue-600 font-medium"
                            : "text-zinc-700"
                    }
                  >
                    {jobStatusLabel(row.status)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/jobs/${row.id}/edit`}
                    className="mr-3 text-zinc-700 underline hover:no-underline"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => deleteJob(row.id, row.property.name)}
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
