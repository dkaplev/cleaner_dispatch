"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** Value when landlord leaves cleaner choice to the system (fallback logic). */
const SYSTEM_CHOOSE_CLEANER = "";

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!propertyId || !scheduledAt) {
      setError("Please select property and date & time.");
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
      const body: { property_id: string; window_start: string; window_end: string; cleaner_id?: string } = {
        property_id: propertyId,
        window_start: start.toISOString(),
        window_end: end.toISOString(),
      };
      if (cleanerId && cleanerId !== SYSTEM_CHOOSE_CLEANER) {
        body.cleaner_id = cleanerId;
      }
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 201) {
        setError(data.error || "Something went wrong");
        return;
      }
      if (data.offer_error) {
        setError(`Job created, but offer failed: ${data.offer_error}. Go to Dispatch and click "Offer to cleaner" to retry.`);
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

  return (
    <form
      onSubmit={handleSubmit}
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
          value={cleanerId}
          onChange={(e) => setCleanerId(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        >
          <option value={SYSTEM_CHOOSE_CLEANER}>Let system choose (primary / fallback)</option>
          {cleaners.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {cleaners.length === 0 && (
          <p className="mt-1 text-xs text-zinc-500">
            <Link href="/dashboard/cleaners/new" className="underline hover:no-underline">Add cleaners</Link> to assign to someone specific.
          </p>
        )}
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
          {loading ? "Creating & sending offer…" : "Create & send offer"}
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
