"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CalendarBookingEntry } from "@/app/api/calendar/bookings/route";

// ─── palette for up to 8 properties ────────────────────────────────────────
const PALETTE = [
  { bg: "#fff3e3", border: "#c45c0f", text: "#c45c0f" },
  { bg: "#dbeafe", border: "#1d6fa4", text: "#1d6fa4" },
  { bg: "#dcfce7", border: "#15803d", text: "#15803d" },
  { bg: "#f3e8ff", border: "#7c3aed", text: "#7c3aed" },
  { bg: "#fee2e2", border: "#b91c1c", text: "#b91c1c" },
  { bg: "#ccfbf1", border: "#0f766e", text: "#0f766e" },
  { bg: "#fef9c3", border: "#a16207", text: "#a16207" },
  { bg: "#fce7f3", border: "#be185d", text: "#be185d" },
];

function getPalette(idx: number) {
  return PALETTE[idx % PALETTE.length];
}

// ─── date helpers ────────────────────────────────────────────────────────────
function ymd(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function toUTCMidnight(isoStr: string) {
  return new Date(`${isoStr.slice(0, 10)}T00:00:00Z`);
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Build list of all days (as UTC midnight Date objects) for a month grid (Mon-first, padded)
function buildMonthGrid(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(Date.UTC(year, month, 1));
  // getUTCDay: 0=Sun…6=Sat → convert to Mon-first index (0=Mon)
  const startDow = (firstDay.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(Date.UTC(year, month, d)));
  }
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

// ─── booking indicator for a single day cell ────────────────────────────────
interface BookingChip {
  id: string;
  job_id: string | null;
  property_name: string;
  isCheckin: boolean;
  isCheckout: boolean;
  palette: { bg: string; border: string; text: string };
}

function getChipsForDay(
  dateMs: number,
  bookings: CalendarBookingEntry[],
  colorMap: Map<string, number>
): BookingChip[] {
  const chips: BookingChip[] = [];
  for (const b of bookings) {
    const checkin  = toUTCMidnight(b.checkin).getTime();
    const checkout = toUTCMidnight(b.checkout).getTime();
    // Active on this day: checkin <= date < checkout
    if (checkin > dateMs || dateMs >= checkout) continue;
    chips.push({
      id:            b.id,
      job_id:        b.job_id,
      property_name: b.property_name,
      isCheckin:     checkin === dateMs,
      isCheckout:    checkout === dateMs + 86400_000,
      palette:       getPalette(colorMap.get(b.property_id) ?? 0),
    });
  }
  return chips;
}

// ─── main component ──────────────────────────────────────────────────────────
export default function CalendarPage() {
  const today = new Date();
  const [year,  setYear]  = useState(today.getUTCFullYear());
  const [month, setMonth] = useState(today.getUTCMonth());

  const [bookings, setBookings]       = useState<CalendarBookingEntry[]>([]);
  const [loading,  setLoading]        = useState(true);
  const [error,    setError]          = useState<string | null>(null);
  const [filterOpen, setFilterOpen]   = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Collect unique properties from bookings (stable across re-renders)
  const properties = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of bookings) map.set(b.property_id, b.property_name);
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [bookings]);

  const [hiddenPropIds, setHiddenPropIds] = useState<Set<string>>(new Set());

  // Stable color index per property_id
  const colorMap = useMemo<Map<string, number>>(() => {
    const m = new Map<string, number>();
    properties.forEach((p, i) => m.set(p.id, i));
    return m;
  }, [properties]);

  // Fetch bookings for ±1 month around the viewed month to cover spans
  const fetchBookings = useCallback(async (y: number, mo: number) => {
    setLoading(true);
    setError(null);
    try {
      const from = new Date(Date.UTC(y, mo, 1));
      const to   = new Date(Date.UTC(y, mo + 1, 0));
      const res  = await fetch(
        `/api/calendar/bookings?from=${ymd(from)}&to=${ymd(to)}`
      );
      if (!res.ok) throw new Error(await res.text());
      const data: CalendarBookingEntry[] = await res.json();
      setBookings(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBookings(year, month); }, [fetchBookings, year, month]);

  // Close filter dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else              { setMonth(m => m - 1); }
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else               { setMonth(m => m + 1); }
  }
  function goToday() {
    setYear(today.getUTCFullYear());
    setMonth(today.getUTCMonth());
  }

  const grid  = useMemo(() => buildMonthGrid(year, month), [year, month]);
  const todayStr = ymd(today);

  const visibleBookings = useMemo(
    () => bookings.filter(b => !hiddenPropIds.has(b.property_id)),
    [bookings, hiddenPropIds]
  );

  function toggleProp(id: string) {
    setHiddenPropIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* ── Header row ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-[#1a0a00]">Bookings Calendar</h1>

        {/* Property filter */}
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setFilterOpen(o => !o)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#e8d5c0] bg-white text-sm text-[#1a0a00] hover:border-[#c45c0f] transition-colors"
          >
            <span>
              {hiddenPropIds.size === 0
                ? "All properties"
                : `${properties.length - hiddenPropIds.size} / ${properties.length} shown`}
            </span>
            <svg className="w-4 h-4 text-[#7a5c44]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {filterOpen && properties.length > 0 && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl border border-[#e8d5c0] shadow-lg z-20 p-3">
              <div className="flex justify-between mb-2">
                <button
                  onClick={() => setHiddenPropIds(new Set())}
                  className="text-xs text-[#c45c0f] hover:underline"
                >
                  Show all
                </button>
                <button
                  onClick={() => setHiddenPropIds(new Set(properties.map(p => p.id)))}
                  className="text-xs text-[#7a5c44] hover:underline"
                >
                  Hide all
                </button>
              </div>
              {properties.map((p) => {
                const pal     = getPalette(colorMap.get(p.id) ?? 0);
                const visible = !hiddenPropIds.has(p.id);
                return (
                  <label key={p.id} className="flex items-center gap-2 py-1.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={visible}
                      onChange={() => toggleProp(p.id)}
                      className="w-4 h-4 rounded accent-[#c45c0f]"
                    />
                    <span
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{ background: pal.border }}
                    />
                    <span className="text-sm text-[#1a0a00] group-hover:text-[#c45c0f] truncate">
                      {p.name}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Month nav ── */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-2 rounded-lg hover:bg-[#f5ede4] transition-colors text-[#1a0a00]"
          aria-label="Previous month"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold text-[#1a0a00]">
            {MONTH_NAMES[month]} {year}
          </span>
          <button
            onClick={goToday}
            className="px-3 py-1 text-xs rounded-full border border-[#e8d5c0] text-[#7a5c44] hover:border-[#c45c0f] hover:text-[#c45c0f] transition-colors"
          >
            Today
          </button>
        </div>

        <button
          onClick={nextMonth}
          className="p-2 rounded-lg hover:bg-[#f5ede4] transition-colors text-[#1a0a00]"
          aria-label="Next month"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* ── Legend ── */}
      {properties.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-4">
          {properties.map((p) => {
            const pal     = getPalette(colorMap.get(p.id) ?? 0);
            const visible = !hiddenPropIds.has(p.id);
            return (
              <button
                key={p.id}
                onClick={() => toggleProp(p.id)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium transition-all"
                style={{
                  background:   visible ? pal.bg    : "#f5f5f5",
                  borderColor:  visible ? pal.border : "#d1d5db",
                  color:        visible ? pal.text   : "#9ca3af",
                }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: visible ? pal.border : "#9ca3af" }}
                />
                {p.name}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Grid ── */}
      {loading ? (
        <div className="flex items-center justify-center h-64 text-[#7a5c44]">Loading…</div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>
      ) : (
        <div className="rounded-2xl border border-[#e8d5c0] overflow-hidden bg-white">
          {/* Day-of-week header */}
          <div className="grid grid-cols-7 bg-[#fdf6ee] border-b border-[#e8d5c0]">
            {DAY_LABELS.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-[#7a5c44] uppercase tracking-wide">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 divide-x divide-y divide-[#f0e4d4]">
            {grid.map((day, i) => {
              if (!day) {
                return <div key={i} className="bg-[#fdf6ee] min-h-[90px]" />;
              }
              const dayMs   = day.getTime();
              const dayStr  = ymd(day);
              const isToday = dayStr === todayStr;
              const chips   = getChipsForDay(dayMs, visibleBookings, colorMap);

              return (
                <div
                  key={dayStr}
                  className={`min-h-[90px] p-1.5 flex flex-col gap-1 ${
                    isToday ? "bg-[#fff8f2]" : ""
                  }`}
                >
                  {/* Date number */}
                  <span
                    className={`text-xs font-semibold self-start leading-none mb-0.5 ${
                      isToday
                        ? "w-5 h-5 flex items-center justify-center rounded-full bg-[#c45c0f] text-white"
                        : "text-[#7a5c44]"
                    }`}
                  >
                    {day.getUTCDate()}
                  </span>

                  {/* Booking chips */}
                  {chips.map((chip) => (
                    <div key={chip.id + dayStr} className="space-y-0.5">
                      <div
                        className="rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight truncate"
                        style={{
                          background: chip.palette.bg,
                          color:      chip.palette.text,
                          borderLeft: `3px solid ${chip.palette.border}`,
                        }}
                        title={`${chip.property_name}${chip.isCheckin ? " — check-in" : chip.isCheckout ? " — check-out" : ""}`}
                      >
                        {chip.isCheckin  && <span className="mr-0.5">→</span>}
                        {chip.isCheckout && <span className="mr-0.5">←</span>}
                        <span className="truncate">{chip.property_name}</span>
                      </div>
                      {/* Cleaning job indicator on checkout day */}
                      {chip.isCheckout && (
                        chip.job_id ? (
                          <a
                            href={`/dashboard/jobs/${chip.job_id}`}
                            className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 truncate"
                            title="Cleaning job scheduled — click to view"
                          >
                            🧹 Cleaning scheduled
                          </a>
                        ) : (
                          <div
                            className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] text-amber-700 bg-amber-50 truncate"
                            title="No cleaning job yet for this checkout"
                          >
                            ⚠ No cleaning job
                          </div>
                        )
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Tip ── */}
      {!loading && !error && (
        <p className="mt-4 text-xs text-[#a08060] text-center">
          → check-in &nbsp;|&nbsp; ← check-out &nbsp;|&nbsp; Click legend to toggle properties &nbsp;|&nbsp; Updates hourly from your calendar feeds
        </p>
      )}
    </div>
  );
}
