"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const SYSTEM_CHOOSE = "";

type Property = { id: string; name: string };
type Cleaner = { id: string; name: string };

type Props = {
  properties: Property[];
  cleaners: Cleaner[];
};

type ParsedPreview = {
  checkoutDate: string | null;
  checkinDate: string | null;
  checkoutTime: { hours: number; minutes: number } | null;
  propertyHint: string | null;
  bookingId: string | null;
};

export function ImportBookingForm({ properties, cleaners }: Props) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [cleanerId, setCleanerId] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<ParsedPreview | null>(null);

  async function handleParse() {
    if (!text.trim()) {
      setPreview(null);
      return;
    }
    setParsing(true);
    setError("");
    try {
      const res = await fetch("/api/ingest/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPreview(null);
        setError(data.error || "Parse failed");
        return;
      }
      setPreview(data.parsed ?? null);
    } finally {
      setParsing(false);
    }
  }

  async function handleCreate() {
    setError("");
    if (!text.trim()) {
      setError("Paste booking text first.");
      return;
    }
    if (!propertyId) {
      setError("Select a property.");
      return;
    }
    setLoading(true);
    try {
      const body: { text: string; property_id: string; cleaner_id?: string } = {
        text: text.trim(),
        property_id: propertyId,
      };
      if (cleanerId && cleanerId !== SYSTEM_CHOOSE) body.cleaner_id = cleanerId;
      const res = await fetch("/api/ingest/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to create job");
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

  const formatDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : null;

  if (properties.length === 0) {
    return (
      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Add at least one property first.
        <Link href="/dashboard/properties/new" className="ml-1 font-medium underline hover:no-underline">
          Add property
        </Link>
        <span className="mx-1">or</span>
        <Link href="/dashboard/cleanings" className="font-medium underline hover:no-underline">
          Back to Dispatch
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4 rounded-xl border border-zinc-200 bg-white p-6">
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <div>
        <label htmlFor="pasted_text" className="block text-sm font-medium text-zinc-700">
          Paste booking confirmation or email *
        </label>
        <textarea
          id="pasted_text"
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste the full text of a booking email (e.g. from Airbnb, Booking.com). We look for check-in/check-out dates and optional reservation ID."
          className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={handleParse}
            disabled={parsing || !text.trim()}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            {parsing ? "Parsing…" : "Preview"}
          </button>
        </div>
      </div>

      {preview && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <p className="font-medium">Detected</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            {preview.checkoutDate && (
              <li>Check-out: {formatDate(preview.checkoutDate)}</li>
            )}
            {preview.checkinDate && !preview.checkoutDate && (
              <li>Check-in: {formatDate(preview.checkinDate)}</li>
            )}
            {preview.checkoutTime && (
              <li>Time: {String(preview.checkoutTime.hours).padStart(2, "0")}:{String(preview.checkoutTime.minutes).padStart(2, "0")}</li>
            )}
            {preview.propertyHint && <li>Property hint: {preview.propertyHint}</li>}
            {preview.bookingId && <li>Reservation ID: {preview.bookingId}</li>}
          </ul>
          {!preview.checkoutDate && !preview.checkinDate && (
            <p className="mt-2 text-amber-700">No date found — add a line like &quot;Check-out: 16 March 2025&quot; or paste the full email.</p>
          )}
        </div>
      )}

      <div>
        <label htmlFor="property_id" className="block text-sm font-medium text-zinc-700">
          Property *
        </label>
        <select
          id="property_id"
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        >
          <option value="">Select property</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {cleaners.length > 0 && (
        <div>
          <label htmlFor="cleaner_id" className="block text-sm font-medium text-zinc-700">
            Cleaner (optional)
          </label>
          <select
            id="cleaner_id"
            value={cleanerId}
            onChange={(e) => setCleanerId(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          >
            <option value={SYSTEM_CHOOSE}>Let system choose (primary/fallback)</option>
            {cleaners.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={handleCreate}
          disabled={loading || !propertyId || !text.trim()}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create job & send offer"}
        </button>
        <Link
          href="/dashboard/cleanings"
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Cancel
        </Link>
      </div>
    </div>
  );
}
