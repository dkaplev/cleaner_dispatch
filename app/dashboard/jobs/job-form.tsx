"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Property = { id: string; name: string };

type Props = {
  properties: Property[];
};

export function JobForm({ properties }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [propertyId, setPropertyId] = useState("");
  const [windowStart, setWindowStart] = useState("");
  const [windowEnd, setWindowEnd] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!propertyId) {
      setError("Please select a property.");
      return;
    }
    if (!windowStart || !windowEnd) {
      setError("Please set the time window (start and end).");
      return;
    }
    const start = new Date(windowStart);
    const end = new Date(windowEnd);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      setError("Window end must be after window start.");
      return;
    }
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

  if (properties.length === 0) {
    return (
      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Add at least one property before creating jobs.
        <Link href="/dashboard" className="ml-1 font-medium underline hover:no-underline">
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
        <p
          className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          {error}
        </p>
      )}
      <div>
        <label
          htmlFor="property_id"
          className="block text-sm font-medium text-zinc-700"
        >
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
        <label
          htmlFor="window_start"
          className="block text-sm font-medium text-zinc-700"
        >
          Window start *
        </label>
        <input
          id="window_start"
          type="datetime-local"
          required
          value={windowStart}
          onChange={(e) => setWindowStart(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
      </div>
      <div>
        <label
          htmlFor="window_end"
          className="block text-sm font-medium text-zinc-700"
        >
          Window end *
        </label>
        <input
          id="window_end"
          type="datetime-local"
          required
          value={windowEnd}
          onChange={(e) => setWindowEnd(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
      </div>
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create job"}
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
