"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  jobId: string;
  jobStatus: string;
  reminderSentAt: string | null;
};

export function JobActions({ jobId, jobStatus, reminderSentAt }: Props) {
  const router = useRouter();
  const [dispatching, setDispatching] = useState(false);
  const [reminding, setReminding] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<string | null>(null);
  const [reminderResult, setReminderResult] = useState<string | null>(null);

  async function handleDispatch() {
    setDispatching(true);
    setDispatchResult(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/dispatch`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDispatchResult(`Error: ${data.error ?? "Failed to offer job"}`);
        return;
      }
      setDispatchResult(`✅ Offer sent to ${data.attempt?.cleaner_name ?? "cleaner"}.`);
      router.refresh();
    } finally {
      setDispatching(false);
    }
  }

  async function handleSendReminder() {
    setReminding(true);
    setReminderResult(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/send-reminder`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setReminderResult(`Error: ${data.error ?? "Failed to send reminder"}`);
        return;
      }
      setReminderResult("✅ Reminder sent.");
      router.refresh();
    } finally {
      setReminding(false);
    }
  }

  const canDispatch = jobStatus === "new";
  const canRemind =
    (jobStatus === "accepted" || jobStatus === "in_progress") && !reminderSentAt;

  if (!canDispatch && !canRemind) return null;

  return (
    <div className="mt-5 flex flex-col gap-3 border-t border-zinc-100 pt-5">
      {canDispatch && (
        <div>
          <button
            type="button"
            onClick={handleDispatch}
            disabled={dispatching}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {dispatching ? "Sending offer…" : "🚀 Offer to cleaner"}
          </button>
          {dispatchResult && (
            <p
              className={`mt-2 text-sm ${
                dispatchResult.startsWith("Error") ? "text-red-600" : "text-emerald-700"
              }`}
            >
              {dispatchResult}
            </p>
          )}
        </div>
      )}
      {canRemind && (
        <div>
          <button
            type="button"
            onClick={handleSendReminder}
            disabled={reminding}
            className="w-full rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
          >
            {reminding ? "Sending…" : "Send reminder to cleaner"}
          </button>
          {reminderResult && (
            <p className="mt-2 text-sm text-emerald-700">{reminderResult}</p>
          )}
        </div>
      )}
    </div>
  );
}
