"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Property = {
  id: string;
  name: string;
  cleaning_duration_minutes: number | null;
  instructions_text: string | null;
};

export function PropertyList({ initialProperties }: { initialProperties: Property[] }) {
  const router = useRouter();
  const [properties, setProperties] = useState(initialProperties);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete property “${name}”?`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/properties/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to delete");
        return;
      }
      setProperties((prev) => prev.filter((p) => p.id !== id));
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  if (properties.length === 0) {
    return (
      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-8 text-center text-zinc-500">
        No properties yet. Add one to get started.
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50">
          <tr>
            <th className="px-4 py-3 font-medium text-zinc-700">Name</th>
            <th className="px-4 py-3 font-medium text-zinc-700">Duration</th>
            <th className="px-4 py-3 font-medium text-zinc-700">Instructions</th>
            <th className="px-4 py-3 font-medium text-zinc-700 w-32">Actions</th>
          </tr>
        </thead>
        <tbody>
          {properties.map((p) => (
            <tr key={p.id} className="border-b border-zinc-100 last:border-0">
              <td className="px-4 py-3 font-medium text-zinc-900">{p.name}</td>
              <td className="px-4 py-3 text-zinc-600">
                {p.cleaning_duration_minutes != null ? `${p.cleaning_duration_minutes} min` : "—"}
              </td>
              <td className="px-4 py-3 text-zinc-600 max-w-xs truncate">
                {p.instructions_text || "—"}
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/dashboard/properties/${p.id}/edit`}
                  className="text-zinc-700 underline hover:no-underline mr-3"
                >
                  Edit
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(p.id, p.name)}
                  disabled={deletingId === p.id}
                  className="text-red-600 underline hover:no-underline disabled:opacity-50"
                >
                  {deletingId === p.id ? "…" : "Delete"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
