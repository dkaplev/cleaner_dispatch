"use client";

import { useEffect, useState } from "react";

type CleanerRow = {
  id: string;
  name: string;
  telegram_chat_id: string | null;
};

type Assignment = {
  cleaner_id: string;
  is_primary: boolean;
  priority: number;
  cleaner: CleanerRow;
};

type Props = {
  propertyId: string;
  allCleaners: CleanerRow[];
};

export function PropertyCleaners({ propertyId, allCleaners }: Props) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/properties/${propertyId}/cleaners`);
      if (res.ok) setAssignments(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [propertyId]);

  async function addCleaner(cleanerId: string, isPrimary: boolean) {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/properties/${propertyId}/cleaners`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cleaner_id: cleanerId, is_primary: isPrimary }),
      });
      if (!res.ok) { setError((await res.json()).error || "Failed to add"); return; }
      setAddingId("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function setPrimary(cleanerId: string) {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/properties/${propertyId}/cleaners/${cleanerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_primary: true }),
      });
      if (!res.ok) { setError((await res.json()).error || "Failed"); return; }
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(cleanerId: string) {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/properties/${propertyId}/cleaners/${cleanerId}`, { method: "DELETE" });
      if (!res.ok) { setError((await res.json()).error || "Failed"); return; }
      await load();
    } finally {
      setSaving(false);
    }
  }

  const assignedIds = new Set(assignments.map((a) => a.cleaner_id));
  const available = allCleaners.filter((c) => !assignedIds.has(c.id));
  const hasNoPrimary = assignments.length > 0 && !assignments.some((a) => a.is_primary);
  const isFirstAssignment = assignments.length === 0;
  const hasNoFallback = assignments.length === 1 && assignments[0].is_primary && available.length > 0;
  const primaryName = assignments.find((a) => a.is_primary)?.cleaner.name;

  return (
    <div className="mt-8 border-t border-zinc-200 pt-6">
      <p className="text-sm font-medium text-zinc-700">Cleaners for this property</p>
      <p className="mt-0.5 text-xs text-zinc-500">
        The primary cleaner gets the first offer for every new booking. Fallbacks are tried in order if they decline.
      </p>

      {error && (
        <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {loading ? (
        <p className="mt-3 text-sm text-zinc-400">Loading…</p>
      ) : (
        <div className="mt-3 space-y-2">
          {assignments.length === 0 && (
            <p className="text-sm text-amber-700 bg-amber-50 rounded-md px-3 py-2">
              No cleaners assigned yet. Add one below so the Dispatch button works automatically.
            </p>
          )}
          {hasNoPrimary && (
            <p className="text-sm text-amber-700 bg-amber-50 rounded-md px-3 py-2">
              No primary cleaner set. Set one to enable auto-dispatch.
            </p>
          )}
          {hasNoFallback && (
            <p className="text-sm text-[#7a5c1e] bg-[#fef9ee] border border-[#f5e0a0] rounded-md px-3 py-2">
              💡 <strong>Add a fallback cleaner.</strong> If {primaryName} declines or doesn&apos;t respond, jobs will go unassigned. A fallback ensures auto-dispatch never stalls.
            </p>
          )}
          {assignments.map((a) => (
            <div
              key={a.cleaner_id}
              className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-zinc-900">{a.cleaner.name}</span>
                {a.is_primary ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                    Primary
                  </span>
                ) : (
                  <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs text-zinc-600">
                    Fallback
                  </span>
                )}
                {!a.cleaner.telegram_chat_id && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                    No Telegram
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!a.is_primary && (
                  <button
                    onClick={() => setPrimary(a.cleaner_id)}
                    disabled={saving}
                    className="text-xs text-zinc-600 underline hover:no-underline disabled:opacity-50"
                  >
                    Set primary
                  </button>
                )}
                <button
                  onClick={() => remove(a.cleaner_id)}
                  disabled={saving}
                  className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          {available.length > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <select
                value={addingId}
                onChange={(e) => setAddingId(e.target.value)}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none"
              >
                <option value="">Select cleaner to add…</option>
                {available.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button
                onClick={() => addingId && addCleaner(addingId, isFirstAssignment)}
                disabled={!addingId || saving}
                className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-40"
              >
                {saving ? "Adding…" : isFirstAssignment ? "Add as primary" : "Add as fallback"}
              </button>
            </div>
          )}

          {available.length === 0 && allCleaners.length > 0 && assignments.length > 0 && (
            <p className="mt-2 text-xs text-zinc-500">All your cleaners are assigned to this property.</p>
          )}
          {allCleaners.length === 0 && (
            <p className="mt-2 text-xs text-zinc-500">
              No cleaners in your account yet.{" "}
              <a href="/dashboard/cleaners/new" className="underline">Add a cleaner first.</a>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
