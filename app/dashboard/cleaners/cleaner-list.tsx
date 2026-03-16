"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Cleaner = {
  id: string;
  name: string;
  telegram_chat_id: string | null;
  notes: string | null;
  is_active: boolean;
  avg_rating: number | null;
  completed_count: number;
  acceptance_rate: number | null;
};

export function CleanerList({ initialCleaners }: { initialCleaners: Cleaner[] }) {
  const router = useRouter();
  const [confirmId, setConfirmId]   = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg]     = useState<string | null>(null);

  async function handleDelete(id: string) {
    setErrorMsg(null);
    setDeletingId(id);
    setConfirmId(null);
    try {
      const res = await fetch(`/api/cleaners/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || "Failed to delete cleaner");
        return;
      }
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  if (initialCleaners.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-[#e3dcd1] bg-[#fbf9f5] p-10 text-center">
        <p className="text-sm text-[#7d7570]">No cleaners yet.</p>
        <Link
          href="/dashboard/cleaners/new"
          className="mt-3 inline-block rounded-full bg-[#3c3732] px-5 py-2 text-sm font-medium text-white hover:bg-[#2d2925]"
        >
          Add your first cleaner
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {errorMsg && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="ml-4 text-red-400 hover:text-red-700">✕</button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-[#e3dcd1] bg-[#fbf9f5] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#e3dcd1] bg-[#fdf6ee]">
              <tr>
                <th className="px-4 py-3 font-medium text-[#4b443e]">Name</th>
                <th className="px-4 py-3 font-medium text-[#4b443e]">Telegram</th>
                <th className="px-4 py-3 font-medium text-[#4b443e]">Rating</th>
                <th className="px-4 py-3 font-medium text-[#4b443e]">Completed</th>
                <th className="px-4 py-3 font-medium text-[#4b443e]">Accept rate</th>
                <th className="px-4 py-3 font-medium text-[#4b443e]">Status</th>
                <th className="px-4 py-3 font-medium text-[#4b443e] max-w-xs">Notes</th>
                <th className="w-32 px-4 py-3 font-medium text-[#4b443e]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {initialCleaners.map((c) => {
                const isConfirming = confirmId === c.id;
                const isDeleting   = deletingId === c.id;
                return (
                  <tr key={c.id} className="border-b border-[#f0ebe3] last:border-0 hover:bg-[#fdf6ee] transition-colors">
                    <td className="px-4 py-3 font-medium text-[#3c3732]">{c.name}</td>
                    <td className="px-4 py-3">
                      {c.telegram_chat_id ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Linked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#f0ebe3] px-2.5 py-0.5 text-xs font-medium text-[#9a9089]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#c5bdb4]" />
                          Not linked
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#615952]">
                      {c.avg_rating != null ? (
                        <span className="font-medium text-amber-700">
                          {c.avg_rating.toFixed(1)} ★
                        </span>
                      ) : (
                        <span className="text-[#9a9089]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#615952]">{c.completed_count}</td>
                    <td className="px-4 py-3 text-[#615952]">
                      {c.acceptance_rate != null ? `${c.acceptance_rate}%` : <span className="text-[#9a9089]">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          c.is_active
                            ? "rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700"
                            : "rounded-full bg-[#f0ebe3] px-2.5 py-0.5 text-xs font-medium text-[#9a9089]"
                        }
                      >
                        {c.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-[#615952]">
                      {c.notes || <span className="text-[#9a9089]">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/dashboard/cleaners/${c.id}/edit`}
                          className="text-xs text-[#615952] hover:underline"
                        >
                          Edit
                        </Link>
                        {isConfirming ? (
                          <span className="flex items-center gap-1.5 text-xs">
                            <span className="text-[#4b443e]">Delete?</span>
                            <button
                              onClick={() => handleDelete(c.id)}
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
                            onClick={() => setConfirmId(c.id)}
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
    </div>
  );
}
