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
};

export function CleanerList({ initialCleaners }: { initialCleaners: Cleaner[] }) {
  const router = useRouter();
  const [cleaners, setCleaners] = useState(initialCleaners);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete cleaner “${name}”?`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/cleaners/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to delete");
        return;
      }
      setCleaners((prev) => prev.filter((c) => c.id !== id));
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  if (cleaners.length === 0) {
    return (
      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-8 text-center text-zinc-500">
        No cleaners yet. Add one to get started.
      </div>
    );
  }

  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50">
          <tr>
            <th className="px-4 py-3 font-medium text-zinc-700">Name</th>
            <th className="px-4 py-3 font-medium text-zinc-700">Telegram</th>
            <th className="px-4 py-3 font-medium text-zinc-700">Status</th>
            <th className="px-4 py-3 font-medium text-zinc-700 max-w-xs">Notes</th>
            <th className="w-32 px-4 py-3 font-medium text-zinc-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {cleaners.map((c) => (
            <tr key={c.id} className="border-b border-zinc-100 last:border-0">
              <td className="px-4 py-3 font-medium text-zinc-900">{c.name}</td>
              <td className="px-4 py-3 text-zinc-600">
                {c.telegram_chat_id || "—"}
              </td>
              <td className="px-4 py-3">
                <span
                  className={
                    c.is_active
                      ? "text-emerald-600 font-medium"
                      : "text-zinc-400"
                  }
                >
                  {c.is_active ? "Active" : "Inactive"}
                </span>
              </td>
              <td className="max-w-xs truncate px-4 py-3 text-zinc-600">
                {c.notes || "—"}
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/dashboard/cleaners/${c.id}/edit`}
                  className="mr-3 text-zinc-700 underline hover:no-underline"
                >
                  Edit
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(c.id, c.name)}
                  disabled={deletingId === c.id}
                  className="text-red-600 underline hover:no-underline disabled:opacity-50"
                >
                  {deletingId === c.id ? "…" : "Delete"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
