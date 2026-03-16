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

type Tab = "all" | "pending" | "active" | "review" | "done";

const TABS: { id: Tab; label: string; statuses: string[] }[] = [
  { id: "all",     label: "All",          statuses: [] },
  { id: "pending", label: "Pending",      statuses: ["new", "offered"] },
  { id: "active",  label: "Active",       statuses: ["accepted", "in_progress"] },
  { id: "review",  label: "Review",       statuses: ["done_awaiting_review"] },
  { id: "done",    label: "Done",         statuses: ["completed", "cancelled"] },
];

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  offered: "Offered",
  accepted: "Accepted",
  in_progress: "In progress",
  done_awaiting_review: "Done — review",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_CHIP: Record<string, string> = {
  new:                  "bg-blue-50 text-blue-700",
  offered:              "bg-indigo-50 text-indigo-700",
  accepted:             "bg-amber-50 text-amber-700",
  in_progress:          "bg-amber-50 text-amber-700",
  done_awaiting_review: "bg-violet-50 text-violet-700",
  completed:            "bg-emerald-50 text-emerald-700",
  cancelled:            "bg-[#f0ebe3] text-[#9a9089]",
};

function formatWindow(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  return (
    s.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) +
    " – " +
    e.toLocaleTimeString(undefined, { timeStyle: "short" })
  );
}

export function DispatchList({ jobs }: { jobs: JobRow[] }) {
  const router = useRouter();
  const [tab, setTab]                   = useState<Tab>("all");
  const [confirmId, setConfirmId]       = useState<string | null>(null);
  const [deletingId, setDeletingId]     = useState<string | null>(null);
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);
  const [remindingId, setRemindingId]   = useState<string | null>(null);
  const [errorMsg, setErrorMsg]         = useState<string | null>(null);

  const activeTab = TABS.find((t) => t.id === tab)!;
  const visible   =
    activeTab.statuses.length === 0
      ? jobs
      : jobs.filter((j) => activeTab.statuses.includes(j.status));

  // Badge counts for tabs
  const counts: Record<Tab, number> = {
    all:     jobs.length,
    pending: jobs.filter((j) => ["new", "offered"].includes(j.status)).length,
    active:  jobs.filter((j) => ["accepted", "in_progress"].includes(j.status)).length,
    review:  jobs.filter((j) => j.status === "done_awaiting_review").length,
    done:    jobs.filter((j) => ["completed", "cancelled"].includes(j.status)).length,
  };

  async function handleDispatch(id: string) {
    setErrorMsg(null);
    setDispatchingId(id);
    try {
      const res  = await fetch(`/api/jobs/${id}/dispatch`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErrorMsg(data.error || "Failed to dispatch job"); return; }
      router.refresh();
    } finally { setDispatchingId(null); }
  }

  async function handleSendReminder(id: string) {
    setErrorMsg(null);
    setRemindingId(id);
    try {
      const res  = await fetch(`/api/jobs/${id}/send-reminder`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErrorMsg(data.error || "Failed to send reminder"); return; }
      router.refresh();
    } finally { setRemindingId(null); }
  }

  async function handleDelete(id: string) {
    setErrorMsg(null);
    setDeletingId(id);
    setConfirmId(null);
    try {
      const res  = await fetch(`/api/jobs/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || "Failed to delete job");
        return;
      }
      router.refresh();
    } finally { setDeletingId(null); }
  }

  if (jobs.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-[#e3dcd1] bg-[#fbf9f5] p-10 text-center">
        <p className="text-sm text-[#7d7570]">No cleaning jobs yet.</p>
        <p className="mt-1 text-xs text-[#9a9089]">
          Add calendar feeds to properties and jobs will appear automatically, or create one manually.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {/* Inline error */}
      {errorMsg && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="ml-4 text-red-400 hover:text-red-700">✕</button>
        </div>
      )}

      {/* Status tabs */}
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              tab === t.id
                ? "bg-[#3c3732] text-white"
                : "bg-[#f0ebe3] text-[#4b443e] hover:bg-[#e6ddd2]"
            }`}
          >
            {t.label}
            {counts[t.id] > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  tab === t.id ? "bg-white/20 text-white" : "bg-[#d8d0c4] text-[#4b443e]"
                }`}
              >
                {counts[t.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      {visible.length === 0 ? (
        <div className="rounded-2xl border border-[#e3dcd1] bg-[#fbf9f5] p-8 text-center text-sm text-[#9a9089]">
          No jobs in this category.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#e3dcd1] bg-[#fbf9f5] shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#e3dcd1] bg-[#fdf6ee]">
                <tr>
                  <th className="px-4 py-3 font-medium text-[#4b443e]">Property</th>
                  <th className="px-4 py-3 font-medium text-[#4b443e]">Cleaner</th>
                  <th className="px-4 py-3 font-medium text-[#4b443e]">Cleaning window</th>
                  <th className="px-4 py-3 font-medium text-[#4b443e]">Status</th>
                  <th className="w-56 px-4 py-3 font-medium text-[#4b443e]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((j) => {
                  const isConfirming = confirmId === j.id;
                  const isDeleting   = deletingId === j.id;
                  const isDispatching = dispatchingId === j.id;
                  const isReminding  = remindingId === j.id;
                  const assigneeDisplay =
                    j.assigned_cleaner?.name ??
                    (j.status === "offered" && j.offered_to_cleaner_name
                      ? `Offered to ${j.offered_to_cleaner_name}`
                      : "—");

                  return (
                    <tr
                      key={j.id}
                      className="border-b border-[#f0ebe3] last:border-0 hover:bg-[#fdf6ee] transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-[#3c3732]">
                        {j.property.name}
                      </td>
                      <td className="px-4 py-3 text-[#615952]">{assigneeDisplay}</td>
                      <td className="px-4 py-3 text-[#615952] text-xs">
                        {formatWindow(j.window_start, j.window_end)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CHIP[j.status] ?? "bg-[#f0ebe3] text-[#615952]"}`}>
                          {STATUS_LABELS[j.status] ?? j.status}
                          {j.status === "offered" && j.cleaners_considering > 0
                            ? ` (${j.cleaners_considering})`
                            : ""}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          {/* Primary actions */}
                          {j.status === "new" && (
                            <button
                              type="button"
                              onClick={() => handleDispatch(j.id)}
                              disabled={isDispatching}
                              className="text-xs font-medium text-[#c45c0f] hover:underline disabled:opacity-50"
                            >
                              {isDispatching ? "Sending…" : "Dispatch"}
                            </button>
                          )}
                          {(j.status === "accepted" || j.status === "in_progress") && !j.reminder_sent_at && (
                            <button
                              type="button"
                              onClick={() => handleSendReminder(j.id)}
                              disabled={isReminding}
                              className="text-xs font-medium text-amber-700 hover:underline disabled:opacity-50"
                            >
                              {isReminding ? "Sending…" : "Remind"}
                            </button>
                          )}
                          {j.status === "done_awaiting_review" && (
                            <Link
                              href={`/dashboard/jobs/${j.id}`}
                              className="text-xs font-medium text-violet-700 hover:underline"
                            >
                              Review →
                            </Link>
                          )}

                          {/* View / Edit */}
                          <Link
                            href={`/dashboard/jobs/${j.id}`}
                            className="text-xs text-[#615952] hover:underline"
                          >
                            View
                          </Link>
                          <Link
                            href={`/dashboard/cleanings/${j.id}/edit`}
                            className="text-xs text-[#615952] hover:underline"
                          >
                            Edit
                          </Link>

                          {/* Delete with inline confirm */}
                          {isConfirming ? (
                            <span className="flex items-center gap-1.5 text-xs">
                              <span className="text-[#4b443e]">Delete?</span>
                              <button
                                onClick={() => handleDelete(j.id)}
                                disabled={isDeleting}
                                className="font-semibold text-red-600 hover:underline"
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setConfirmId(null)}
                                className="text-[#9a9089] hover:underline"
                              >
                                No
                              </button>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmId(j.id)}
                              disabled={isDeleting}
                              className="text-xs text-red-600 hover:underline disabled:opacity-50"
                            >
                              {isDeleting ? "…" : "Delete"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
