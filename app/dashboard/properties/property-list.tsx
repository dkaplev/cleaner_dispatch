"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Property = {
  id: string;
  name: string;
  address: string | null;
  cleaning_duration_minutes: number | null;
  cleaning_trigger: string;
  cleaner_count: number;
  feed_count: number;
};

export function PropertyList({ initialProperties }: { initialProperties: Property[] }) {
  const router = useRouter();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setErrorMsg(null);
    setDeletingId(id);
    setConfirmId(null);
    try {
      const res = await fetch(`/api/properties/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || "Failed to delete property");
        return;
      }
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  if (initialProperties.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-[#e3dcd1] bg-[#fbf9f5] p-10 text-center">
        <p className="text-sm text-[#7d7570]">No properties yet.</p>
        <Link
          href="/dashboard/properties/new"
          className="mt-3 inline-block rounded-full bg-[#3c3732] px-5 py-2 text-sm font-medium text-white hover:bg-[#2d2925]"
        >
          Add your first property
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
                <th className="px-4 py-3 font-medium text-[#4b443e]">Address</th>
                <th className="px-4 py-3 font-medium text-[#4b443e]">Duration</th>
                <th className="px-4 py-3 font-medium text-[#4b443e]">Cleaners</th>
                <th className="px-4 py-3 font-medium text-[#4b443e]">Calendars</th>
                <th className="w-32 px-4 py-3 font-medium text-[#4b443e]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {initialProperties.map((p) => {
                const isConfirming = confirmId === p.id;
                const isDeleting   = deletingId === p.id;
                return (
                  <tr key={p.id} className="border-b border-[#f0ebe3] last:border-0 hover:bg-[#fdf6ee] transition-colors">
                    <td className="px-4 py-3 font-medium text-[#3c3732]">{p.name}</td>
                    <td className="px-4 py-3 text-[#615952] max-w-[180px] truncate">
                      {p.address || <span className="text-[#b0a89e] italic">No address</span>}
                    </td>
                    <td className="px-4 py-3 text-[#615952]">
                      {p.cleaning_duration_minutes != null ? `${p.cleaning_duration_minutes} min` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {p.cleaner_count > 0 ? (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                          {p.cleaner_count} assigned
                        </span>
                      ) : (
                        <Link
                          href={`/dashboard/properties/${p.id}/edit`}
                          className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 hover:bg-amber-100"
                        >
                          + Assign cleaner
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {p.feed_count > 0 ? (
                        <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                          {p.feed_count} feed{p.feed_count > 1 ? "s" : ""}
                        </span>
                      ) : (
                        <Link
                          href={`/dashboard/properties/${p.id}/edit`}
                          className="rounded-full bg-[#f0ebe3] px-2.5 py-0.5 text-xs font-medium text-[#9a7a5a] hover:bg-[#e6ddd2]"
                        >
                          + Add calendar
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/dashboard/properties/${p.id}/edit`}
                          className="text-xs text-[#615952] hover:underline"
                        >
                          Edit
                        </Link>
                        {isConfirming ? (
                          <span className="flex items-center gap-1.5 text-xs">
                            <span className="text-[#4b443e]">Delete?</span>
                            <button
                              onClick={() => handleDelete(p.id)}
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
                            onClick={() => setConfirmId(p.id)}
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
