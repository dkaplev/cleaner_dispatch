"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Cleaning = {
  id: string;
  scheduled_at: string;
  status: string;
  notes: string | null;
  property: { id: string; name: string };
  cleaner: { id: string; name: string };
};

export function CleaningList({ initialCleanings }: { initialCleanings: Cleaning[] }) {
  const router = useRouter();
  const [cleanings, setCleanings] = useState(initialCleanings);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string, label: string) {
    if (!confirm(`Delete this assignment (${label})?`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/cleanings/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to delete");
        return;
      }
      setCleanings((prev) => prev.filter((c) => c.id !== id));
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  function formatScheduled(at: string) {
    const d = new Date(at);
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  }

  function statusLabel(s: string) {
    switch (s) {
      case "completed":
        return "Completed";
      case "cancelled":
        return "Cancelled";
      default:
        return "Scheduled";
    }
  }

  if (cleanings.length === 0) {
    return (
      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-8 text-center text-zinc-500">
        No assignments yet. Add one to assign a cleaning to a cleaner.
      </div>
    );
  }

  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50">
          <tr>
            <th className="px-4 py-3 font-medium text-zinc-700">Property</th>
            <th className="px-4 py-3 font-medium text-zinc-700">Cleaner</th>
            <th className="px-4 py-3 font-medium text-zinc-700">Scheduled</th>
            <th className="px-4 py-3 font-medium text-zinc-700">Status</th>
            <th className="w-32 px-4 py-3 font-medium text-zinc-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {cleanings.map((c) => (
            <tr key={c.id} className="border-b border-zinc-100 last:border-0">
              <td className="px-4 py-3 font-medium text-zinc-900">{c.property.name}</td>
              <td className="px-4 py-3 text-zinc-700">{c.cleaner.name}</td>
              <td className="px-4 py-3 text-zinc-600">{formatScheduled(c.scheduled_at)}</td>
              <td className="px-4 py-3">
                <span
                  className={
                    c.status === "completed"
                      ? "text-emerald-600"
                      : c.status === "cancelled"
                        ? "text-zinc-400"
                        : "text-zinc-700 font-medium"
                  }
                >
                  {statusLabel(c.status)}
                </span>
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/dashboard/cleanings/${c.id}/edit`}
                  className="mr-3 text-zinc-700 underline hover:no-underline"
                >
                  Edit
                </Link>
                <button
                  type="button"
                  onClick={() =>
                    handleDelete(c.id, `${c.property.name} → ${c.cleaner.name}`)
                  }
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
