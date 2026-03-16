"use client";

import { useEffect, useState } from "react";

// ── Platform catalogue ─────────────────────────────────────────────────────────
export const PLATFORMS = [
  { value: "airbnb",       label: "Airbnb",                  hint: "Properties → Availability → Export calendar (.ics link)" },
  { value: "booking_com",  label: "Booking.com",             hint: "Extranet → Calendar → Export → Copy iCal link" },
  { value: "vrbo",         label: "Vrbo / HomeAway",         hint: "Dashboard → Calendar → Export calendar → iCal URL" },
  { value: "expedia",      label: "Expedia",                 hint: "Partner Central → Calendar → iCal export link" },
  { value: "tripadvisor",  label: "Tripadvisor / FlipKey",   hint: "Owner dashboard → Calendar → Export / iCal sync" },
  { value: "hometogo",     label: "HomeToGo",                hint: "Dashboard → Calendar → iCal export" },
  { value: "holidu",       label: "Holidu",                  hint: "Partner dashboard → Availability → Export iCal" },
  { value: "plum_guide",   label: "Plum Guide",              hint: "Host dashboard → Calendar → Sync / export link" },
  { value: "direct",       label: "Google / Apple Calendar", hint: "Share calendar → Get shareable link (public .ics URL)" },
  { value: "other",        label: "Other platform",          hint: "Any iCal (.ics) URL" },
] as const;

type PlatformValue = typeof PLATFORMS[number]["value"];

const PLATFORM_LABEL: Record<string, string> = Object.fromEntries(PLATFORMS.map((p) => [p.value, p.label]));

type Feed = {
  id: string;
  source: string;
  label: string | null;
  last_synced_at: string | null;
  sync_error: string | null;
  active_bookings: number;
};

type SyncResult = { created: number; updated: number; cancelled: number; error?: string };

export function CalendarFeeds({ propertyId }: { propertyId: string }) {
  const [feeds, setFeeds]       = useState<Feed[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);

  // form state
  const [url, setUrl]     = useState("");
  const [source, setSource] = useState<PlatformValue>("airbnb");
  const [label, setLabel] = useState("");
  const [saving, setSaving]   = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveResult, setSaveResult] = useState<SyncResult | null>(null);

  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadFeeds() {
    setLoading(true);
    try {
      const res = await fetch(`/api/properties/${propertyId}/calendar-feeds`);
      if (res.ok) setFeeds(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadFeeds(); }, [propertyId]);

  const selectedPlatform = PLATFORMS.find((p) => p.value === source)!;

  async function addFeed(e: React.FormEvent) {
    e.preventDefault();
    setSaveError("");
    setSaveResult(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/properties/${propertyId}/calendar-feeds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, source, label: label || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setSaveError(data.error || "Failed to add feed"); return; }
      setSaveResult(data.sync as SyncResult);
      setUrl(""); setLabel(""); setSource("airbnb"); setShowForm(false);
      await loadFeeds();
    } finally {
      setSaving(false);
    }
  }

  async function syncFeed(feedId: string) {
    setSyncingId(feedId);
    try {
      const res = await fetch(`/api/properties/${propertyId}/calendar-feeds/${feedId}`, { method: "POST" });
      if (res.ok) await loadFeeds();
    } finally {
      setSyncingId(null);
    }
  }

  async function deleteFeed(feedId: string) {
    if (!confirm("Remove this calendar feed? Existing cleaning jobs will not be affected.")) return;
    setDeletingId(feedId);
    try {
      await fetch(`/api/properties/${propertyId}/calendar-feeds/${feedId}`, { method: "DELETE" });
      await loadFeeds();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mt-8 rounded-2xl border border-[#e5dfd4] bg-[#fdfcf9] p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-[#3c3732]">Calendar feeds</h3>
          <p className="mt-0.5 text-xs text-[#7d7570]">
            Connect booking platform calendars to auto-create cleaning jobs.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setSaveResult(null); }}
            className="shrink-0 rounded-full bg-[#c45c0f] px-4 py-2 text-xs font-medium text-white hover:bg-[#a34c0c] transition"
          >
            + Add calendar
          </button>
        )}
      </div>

      {/* Success banner after adding */}
      {saveResult && !showForm && (
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          ✓ Calendar connected.
          {saveResult.error
            ? ` Initial sync had an error: ${saveResult.error}`
            : ` Initial sync: ${saveResult.created} new booking${saveResult.created !== 1 ? "s" : ""} found.`}
        </div>
      )}

      {/* Add feed form */}
      {showForm && (
        <form onSubmit={addFeed} className="mt-5 space-y-4 rounded-xl border border-[#e5dfd4] bg-white p-5">
          <div>
            <label className="block text-xs font-medium text-[#4a443e]">Platform *</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as PlatformValue)}
              className="mt-1.5 block w-full rounded-xl border border-[#ddd6cb] bg-[#fdfcf9] px-4 py-2.5 text-sm text-[#3f3a35] focus:border-[#9a9089] focus:outline-none"
            >
              {PLATFORMS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            <p className="mt-1.5 text-[11px] text-[#7d7570]">
              <span className="font-medium">How to find the link:</span> {selectedPlatform.hint}
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#4a443e]">iCal URL *</label>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.airbnb.com/calendar/ical/..."
              className="mt-1.5 block w-full rounded-xl border border-[#ddd6cb] bg-[#fdfcf9] px-4 py-2.5 text-sm text-[#3f3a35] placeholder:text-[#b0a89f] focus:border-[#9a9089] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#4a443e]">
              Label <span className="text-[#9a9089]">(optional)</span>
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={`My ${selectedPlatform.label} calendar`}
              maxLength={80}
              className="mt-1.5 block w-full rounded-xl border border-[#ddd6cb] bg-[#fdfcf9] px-4 py-2.5 text-sm text-[#3f3a35] placeholder:text-[#b0a89f] focus:border-[#9a9089] focus:outline-none"
            />
          </div>

          {saveError && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{saveError}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-[#c45c0f] px-5 py-2 text-sm font-medium text-white hover:bg-[#a34c0c] disabled:opacity-40 transition"
            >
              {saving ? "Connecting…" : "Connect & sync →"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setSaveError(""); }}
              className="rounded-full border border-[#ddd6cb] px-5 py-2 text-sm font-medium text-[#4a443e] hover:bg-[#f5f1ea] transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Feed list */}
      {loading ? (
        <p className="mt-4 text-xs text-[#9a9089]">Loading…</p>
      ) : feeds.length === 0 && !showForm ? (
        <p className="mt-4 rounded-xl border border-[#e5dfd4] bg-white px-4 py-5 text-center text-xs text-[#9a9089]">
          No calendar feeds yet. Add one to start syncing bookings automatically.
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          {feeds.map((feed) => (
            <div
              key={feed.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-[#e5dfd4] bg-white px-4 py-3"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-[#3c3732]">
                    {feed.label || PLATFORM_LABEL[feed.source] || feed.source}
                  </span>
                  <span className="rounded-full bg-[#f5f1ea] px-2 py-0.5 text-[10px] text-[#5a524c]">
                    {PLATFORM_LABEL[feed.source] ?? feed.source}
                  </span>
                  <span className="rounded-full bg-[#edf5ed] px-2 py-0.5 text-[10px] text-[#2d6b2d]">
                    {feed.active_bookings} active booking{feed.active_bookings !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-3">
                  {feed.sync_error ? (
                    <p className="text-[11px] text-red-600">⚠ Sync error: {feed.sync_error}</p>
                  ) : feed.last_synced_at ? (
                    <p className="text-[11px] text-[#9a9089]">
                      Last synced: {new Date(feed.last_synced_at).toLocaleString()}
                    </p>
                  ) : (
                    <p className="text-[11px] text-[#9a9089]">Not yet synced</p>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  onClick={() => syncFeed(feed.id)}
                  disabled={syncingId === feed.id}
                  className="rounded-lg border border-[#ddd6cb] bg-[#f8f4ef] px-2.5 py-1 text-[11px] font-medium text-[#4b443e] hover:bg-[#ede8e1] disabled:opacity-40 transition"
                  title="Sync now"
                >
                  {syncingId === feed.id ? "Syncing…" : "↻ Sync"}
                </button>
                <button
                  onClick={() => deleteFeed(feed.id)}
                  disabled={deletingId === feed.id}
                  className="rounded-lg border border-[#f0c4c4] bg-[#fdf5f5] px-2.5 py-1 text-[11px] font-medium text-[#a34040] hover:bg-[#fde8e8] disabled:opacity-40 transition"
                  title="Remove feed"
                >
                  {deletingId === feed.id ? "…" : "✕"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-[11px] text-[#9a9089]">
        Calendars are synced automatically every hour. Use ↻ Sync to update immediately.
      </p>
    </div>
  );
}
