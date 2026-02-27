"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const FIND_NEW_CLEANER_VALUE = "__find_new__";

type Property = { id: string; name: string; cleaning_duration_minutes?: number | null };
type Cleaner = { id: string; name: string };

type Props = {
  properties: Property[];
  cleaners: Cleaner[];
};

export function CleaningForm({ properties, cleaners }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [propertyId, setPropertyId] = useState("");
  const [cleanerId, setCleanerId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");

  const selectedProperty = properties.find((p) => p.id === propertyId);
  const durationMinutes = selectedProperty?.cleaning_duration_minutes ?? 120;

  async function handleAssignToCleaner(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!propertyId || !cleanerId || cleanerId === FIND_NEW_CLEANER_VALUE) return;
    if (!scheduledAt) {
      setError("Please set the date and time.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/cleanings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_id: propertyId,
          cleaner_id: cleanerId,
          scheduled_at: new Date(scheduledAt).toISOString(),
          notes: notes.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }
      router.push("/dashboard/cleanings");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleFindNewCleaner(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!propertyId) {
      setError("Please select a property.");
      return;
    }
    if (!scheduledAt) {
      setError("Please set the date and time.");
      return;
    }
    const start = new Date(scheduledAt);
    if (Number.isNaN(start.getTime())) {
      setError("Please set a valid date and time.");
      return;
    }
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    setLoading(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_id: propertyId,
          window_start: start.toISOString(),
          window_end: end.toISOString(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }
      router.push("/dashboard/cleanings");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  // No properties at all
  if (properties.length === 0) {
    return (
      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Add at least one property first.
        <Link href="/dashboard/properties/new" className="ml-1 font-medium underline hover:no-underline">
          Add property
        </Link>
        <span className="mx-1">or</span>
        <Link href="/dashboard" className="font-medium underline hover:no-underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  // Has properties but no cleaners: show "add cleaner" or "find new cleaner"
  if (cleaners.length === 0) {
    return (
      <form
        onSubmit={handleFindNewCleaner}
        className="mt-6 space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
      >
        <p className="text-sm text-zinc-600">
          You don’t have any cleaners in your roster yet. Add one, or create a job and find someone later.
        </p>
        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        <div>
          <label htmlFor="property_id" className="block text-sm font-medium text-zinc-700">
            Property *
          </label>
          <select
            id="property_id"
            required
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          >
            <option value="">Select property</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="scheduled_at" className="block text-sm font-medium text-zinc-700">
            Date & time *
          </label>
          <input
            id="scheduled_at"
            type="datetime-local"
            required
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
        </div>
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-zinc-700">
            Notes
          </label>
          <textarea
            id="notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/cleaners/new"
            className="inline-flex items-center rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Add a cleaner to my roster
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {loading ? "Creating…" : "Find new cleaner"}
          </button>
          <Link
            href="/dashboard/cleanings"
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    );
  }

  // Has properties and cleaners: dropdown = cleaners + "Find new cleaner"
  const isFindNew = cleanerId === FIND_NEW_CLEANER_VALUE;
  const canAssignDirect = !isFindNew && cleanerId && propertyId && scheduledAt;

  return (
    <form
      onSubmit={isFindNew ? handleFindNewCleaner : handleAssignToCleaner}
      className="mt-6 space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
    >
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      <div>
        <label htmlFor="property_id" className="block text-sm font-medium text-zinc-700">
          Property *
        </label>
        <select
          id="property_id"
          required
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        >
          <option value="">Select property</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="cleaner_id" className="block text-sm font-medium text-zinc-700">
          Assign to
        </label>
        <select
          id="cleaner_id"
          required
          value={cleanerId}
          onChange={(e) => setCleanerId(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        >
          <option value="">Select who will clean</option>
          {cleaners.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
          <option value={FIND_NEW_CLEANER_VALUE}>Find new cleaner</option>
        </select>
      </div>
      <div>
        <label htmlFor="scheduled_at" className="block text-sm font-medium text-zinc-700">
          Date & time *
        </label>
        <input
          id="scheduled_at"
          type="datetime-local"
          required
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
      </div>
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-zinc-700">
          Notes
        </label>
        <textarea
          id="notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
      </div>
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading
            ? "Creating…"
            : isFindNew
              ? "Create job (find cleaner later)"
              : "Assign cleaning"}
        </button>
        <Link
          href="/dashboard/cleanings"
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
