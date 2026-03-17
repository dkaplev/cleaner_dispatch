"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { CalendarBookingEntry, DirectJobEntry } from "@/app/api/calendar/bookings/route";

// ─── palette for up to 8 properties ────────────────────────────────────────
const PALETTE = [
  { bg: "#fff3e3", border: "#c45c0f", text: "#7a3800" },
  { bg: "#dbeafe", border: "#1d6fa4", text: "#0f4d7a" },
  { bg: "#dcfce7", border: "#15803d", text: "#0d5c2c" },
  { bg: "#f3e8ff", border: "#7c3aed", text: "#5b21b6" },
  { bg: "#fee2e2", border: "#b91c1c", text: "#7f1d1d" },
  { bg: "#ccfbf1", border: "#0f766e", text: "#0a4f4a" },
  { bg: "#fef9c3", border: "#a16207", text: "#713f12" },
  { bg: "#fce7f3", border: "#be185d", text: "#831843" },
];

function getPalette(idx: number) { return PALETTE[idx % PALETTE.length]; }

// ─── date helpers ────────────────────────────────────────────────────────────
function ymd(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
function toUTCMidnight(isoStr: string) {
  return new Date(`${isoStr.slice(0, 10)}T00:00:00Z`);
}

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_LABELS       = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const DAY_LABELS_SHORT = ["M",  "T",  "W",  "T",  "F",  "S",  "S"];

function buildMonthGrid(year: number, month: number): (Date | null)[] {
  const firstDay     = new Date(Date.UTC(year, month, 1));
  const startDow     = (firstDay.getUTCDay() + 6) % 7;
  const daysInMonth  = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(Date.UTC(year, month, d)));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

interface BookingChip {
  id: string;
  job_id: string | null;
  property_name: string;
  isCheckin: boolean;
  isCheckout: boolean;
  palette: typeof PALETTE[number];
}

function getChipsForDay(
  dateMs: number,
  bookings: CalendarBookingEntry[],
  colorMap: Map<string, number>
): BookingChip[] {
  return bookings
    .filter((b) => {
      const ci = toUTCMidnight(b.checkin).getTime();
      const co = toUTCMidnight(b.checkout).getTime();
      return ci <= dateMs && dateMs < co;
    })
    .map((b) => {
      const ci = toUTCMidnight(b.checkin).getTime();
      const co = toUTCMidnight(b.checkout).getTime();
      return {
        id:            b.id,
        job_id:        b.job_id,
        property_name: b.property_name,
        isCheckin:     ci === dateMs,
        isCheckout:    co === dateMs + 86400_000,
        palette:       getPalette(colorMap.get(b.property_id) ?? 0),
      };
    });
}

function getDirectJobsForDay(
  dayStr: string,
  directJobs: DirectJobEntry[],
  colorMap: Map<string, number>
) {
  return directJobs.filter((j) => j.window_start.slice(0, 10) === dayStr);
}

const STATUS_LABEL: Record<string, string> = {
  new:                 "Not dispatched",
  offered:             "Offer sent",
  accepted:            "Accepted",
  in_progress:         "In progress",
  done_awaiting_review:"Done — review",
  completed:           "Completed",
};
const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  new:                  { bg: "#f5f0e8", text: "#6a625c" },
  offered:              { bg: "#fef3e3", text: "#7a5c1e" },
  accepted:             { bg: "#e8f5e8", text: "#1a5c1a" },
  in_progress:          { bg: "#d0ead0", text: "#145c14" },
  done_awaiting_review: { bg: "#f0ebff", text: "#5b21b6" },
  completed:            { bg: "#e8f0fb", text: "#1a3a7a" },
};

// ─── main component ──────────────────────────────────────────────────────────
/**
 * CalendarView — embeddable calendar.
 * Pass `embedded={true}` to suppress the standalone page chrome
 * (back link, min-h-screen wrapper).
 */
export function CalendarView({ embedded = false }: { embedded?: boolean }) {
  const today = new Date();
  const [year,  setYear]  = useState(today.getUTCFullYear());
  const [month, setMonth] = useState(today.getUTCMonth());

  const [bookings,    setBookings]    = useState<CalendarBookingEntry[]>([]);
  const [directJobs,  setDirectJobs]  = useState<DirectJobEntry[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [filterOpen,  setFilterOpen]  = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const properties = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of bookings)    map.set(b.property_id, b.property_name);
    for (const j of directJobs)  map.set(j.property_id, j.property_name);
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [bookings, directJobs]);

  const [hiddenPropIds, setHiddenPropIds] = useState<Set<string>>(new Set());

  const colorMap = useMemo<Map<string, number>>(() => {
    const m = new Map<string, number>();
    properties.forEach((p, i) => m.set(p.id, i));
    return m;
  }, [properties]);

  const fetchBookings = useCallback(async (y: number, mo: number) => {
    setLoading(true);
    setError(null);
    try {
      const from = new Date(Date.UTC(y, mo, 1));
      const to   = new Date(Date.UTC(y, mo + 1, 0));
      const res  = await fetch(`/api/calendar/bookings?from=${ymd(from)}&to=${ymd(to)}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      // Handle both old (array) and new ({bookings, direct_jobs}) shape
      if (Array.isArray(data)) {
        setBookings(data);
        setDirectJobs([]);
      } else {
        setBookings(data.bookings ?? []);
        setDirectJobs(data.direct_jobs ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBookings(year, month); }, [fetchBookings, year, month]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node))
        setFilterOpen(false);
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
  function toggleProp(id: string) {
    setHiddenPropIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const grid     = useMemo(() => buildMonthGrid(year, month), [year, month]);
  const todayStr = ymd(today);

  const visibleBookings  = useMemo(() => bookings.filter(b  => !hiddenPropIds.has(b.property_id)),  [bookings,    hiddenPropIds]);
  const visibleDirect    = useMemo(() => directJobs.filter(j => !hiddenPropIds.has(j.property_id)), [directJobs,  hiddenPropIds]);

  const totalItems = bookings.length + directJobs.length;

  return (
    <div className={embedded ? "" : "min-h-screen bg-[#f7f3ec]"}>
      <div className={embedded ? "" : "max-w-5xl mx-auto px-4 py-8"}>

        {/* ── Back link (standalone page only) ── */}
        {!embedded && (
          <div className="mb-5">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-sm text-[#6a625c] hover:text-[#1a1510] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Dashboard
            </Link>
          </div>
        )}

        {/* ── Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1a1510]">Bookings Calendar</h1>
            <p className="mt-0.5 text-sm text-[#6a625c]">
              {totalItems > 0
                ? `${bookings.length} synced booking${bookings.length !== 1 ? "s" : ""}, ${directJobs.length} cleaning job${directJobs.length !== 1 ? "s" : ""}`
                : "No bookings or jobs yet — add a calendar feed to properties"}
            </p>
          </div>

          {/* Property filter */}
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setFilterOpen(o => !o)}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#e3dcd1] bg-white text-sm font-medium text-[#3c3732] hover:bg-[#f5f0e8] transition-colors shadow-sm"
            >
              {hiddenPropIds.size === 0
                ? "All properties"
                : `${properties.length - hiddenPropIds.size} / ${properties.length} shown`}
              <svg className="w-4 h-4 text-[#9a9089]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {filterOpen && properties.length > 0 && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-[#e3dcd1] shadow-lg z-20 p-3">
                <div className="flex justify-between mb-2 pb-2 border-b border-[#f0ebe3]">
                  <button onClick={() => setHiddenPropIds(new Set())} className="text-xs text-[#c45c0f] hover:underline">Show all</button>
                  <button onClick={() => setHiddenPropIds(new Set(properties.map(p => p.id)))} className="text-xs text-[#9a9089] hover:underline">Hide all</button>
                </div>
                {properties.map((p) => {
                  const pal     = getPalette(colorMap.get(p.id) ?? 0);
                  const visible = !hiddenPropIds.has(p.id);
                  return (
                    <label key={p.id} className="flex items-center gap-2 py-1.5 cursor-pointer">
                      <input type="checkbox" checked={visible} onChange={() => toggleProp(p.id)} className="w-4 h-4 rounded accent-[#c45c0f]" />
                      <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: pal.border }} />
                      <span className="text-sm text-[#3c3732] truncate">{p.name}</span>
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
            className="w-9 h-9 flex items-center justify-center rounded-full border border-[#e3dcd1] bg-white text-[#3c3732] hover:bg-[#f5f0e8] transition-colors shadow-sm"
            aria-label="Previous month"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold text-[#1a1510]">{MONTH_NAMES[month]} {year}</span>
            <button
              onClick={goToday}
              className="px-3 py-1 text-xs rounded-full border border-[#e3dcd1] bg-white text-[#6a625c] hover:border-[#c45c0f] hover:text-[#c45c0f] transition-colors shadow-sm"
            >
              Today
            </button>
          </div>

          <button
            onClick={nextMonth}
            className="w-9 h-9 flex items-center justify-center rounded-full border border-[#e3dcd1] bg-white text-[#3c3732] hover:bg-[#f5f0e8] transition-colors shadow-sm"
            aria-label="Next month"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* ── Property legend ── */}
        {properties.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {properties.map((p) => {
              const pal     = getPalette(colorMap.get(p.id) ?? 0);
              const visible = !hiddenPropIds.has(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => toggleProp(p.id)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium transition-all"
                  style={{
                    background:  visible ? pal.bg     : "#f0ebe3",
                    borderColor: visible ? pal.border  : "#d6cfc6",
                    color:       visible ? pal.text    : "#9a9089",
                  }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: visible ? pal.border : "#b0a89f" }} />
                  {p.name}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Calendar grid ── */}
        {loading ? (
          <div className="flex items-center justify-center h-64 rounded-2xl border border-[#e3dcd1] bg-white">
            <div className="flex items-center gap-2 text-[#9a9089] text-sm">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round"/>
              </svg>
              Loading…
            </div>
          </div>
        ) : error ? (
          <div className="p-5 rounded-2xl border border-red-100 bg-red-50 text-sm text-red-700">{error}</div>
        ) : (
          <div className="rounded-2xl border border-[#e3dcd1] overflow-hidden shadow-sm">
            {/* Day-of-week header */}
            <div className="grid grid-cols-7 bg-[#f5f0e8] border-b border-[#e3dcd1]">
              {DAY_LABELS.map((d, i) => (
                <div key={d} className="py-2.5 text-center text-xs font-semibold text-[#6a625c] uppercase tracking-wider">
                  <span className="hidden sm:inline">{d}</span>
                  <span className="sm:hidden">{DAY_LABELS_SHORT[i]}</span>
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 bg-white divide-x divide-y divide-[#ede8e1]">
              {grid.map((day, i) => {
                if (!day) {
                  return <div key={i} className="bg-[#faf7f4] min-h-[60px] sm:min-h-[100px]" />;
                }
                const dayMs   = day.getTime();
                const dayStr  = ymd(day);
                const isToday = dayStr === todayStr;
                const chips   = getChipsForDay(dayMs, visibleBookings, colorMap);
                const djobs   = getDirectJobsForDay(dayStr, visibleDirect, colorMap);

                return (
                  <div
                    key={dayStr}
                    className={`min-h-[60px] sm:min-h-[100px] p-1 sm:p-1.5 flex flex-col gap-0.5 sm:gap-1 ${
                      isToday ? "bg-[#fff8f2]" : "bg-white"
                    }`}
                  >
                    {/* Date number */}
                    <span
                      className={`text-[11px] sm:text-xs font-semibold self-start leading-none mb-0.5 ${
                        isToday
                          ? "w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full bg-[#c45c0f] text-white text-[10px] sm:text-[11px]"
                          : "text-[#6a625c]"
                      }`}
                    >
                      {day.getUTCDate()}
                    </span>

                    {/* Booking chips (from iCal sync) */}
                    {chips.map((chip) => (
                      <div key={chip.id + dayStr} className="space-y-0.5">
                        {/* Mobile: compact bar with just arrow icon */}
                        <div
                          className="rounded sm:hidden py-0.5 text-[10px] font-bold leading-none flex items-center justify-center"
                          style={{
                            background:  chip.palette.bg,
                            color:       chip.palette.text,
                            borderLeft:  `3px solid ${chip.palette.border}`,
                            minHeight: "14px",
                          }}
                          title={`${chip.property_name}${chip.isCheckin ? " — check-in" : chip.isCheckout ? " — check-out" : ""}`}
                        >
                          {chip.isCheckin  ? "→" : chip.isCheckout ? "←" : <span className="block w-1 h-1 rounded-full" style={{ background: chip.palette.border }} />}
                        </div>
                        {/* Desktop: chip with full property name */}
                        <div
                          className="hidden sm:block rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight truncate"
                          style={{
                            background:  chip.palette.bg,
                            color:       chip.palette.text,
                            borderLeft:  `3px solid ${chip.palette.border}`,
                          }}
                          title={`${chip.property_name}${chip.isCheckin ? " — check-in" : chip.isCheckout ? " — check-out" : ""}`}
                        >
                          {chip.isCheckin  && <span className="mr-0.5 opacity-70">→</span>}
                          {chip.isCheckout && <span className="mr-0.5 opacity-70">←</span>}
                          <span>{chip.property_name}</span>
                        </div>

                        {/* Cleaning job indicator on checkout day */}
                        {chip.isCheckout && (
                          chip.job_id ? (
                            <a
                              href={`/dashboard/jobs/${chip.job_id}`}
                              className="flex items-center gap-0.5 rounded px-1 sm:px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 truncate transition-colors"
                              title="Cleaning job — click to view"
                            >
                              🧹<span className="hidden sm:inline ml-0.5">Cleaning</span>
                            </a>
                          ) : (
                            <div
                              className="flex items-center gap-0.5 rounded px-1 sm:px-1.5 py-0.5 text-[10px] text-amber-700 bg-amber-50 truncate"
                              title="No cleaning job yet for this checkout"
                            >
                              ⚠<span className="hidden sm:inline ml-0.5">No job</span>
                            </div>
                          )
                        )}
                      </div>
                    ))}

                    {/* Direct / manual cleaning jobs */}
                    {djobs.map((job) => {
                      const pal = getPalette(colorMap.get(job.property_id) ?? 0);
                      const sc  = STATUS_COLOR[job.status] ?? { bg: "#f5f0e8", text: "#6a625c" };
                      const lbl = STATUS_LABEL[job.status] ?? job.status;
                      const time = new Date(job.window_start).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
                      return (
                        <a
                          key={job.id}
                          href={`/dashboard/jobs/${job.id}`}
                          className="rounded px-1 sm:px-1.5 py-0.5 text-[10px] font-medium leading-tight truncate block hover:opacity-80 transition-opacity"
                          style={{ background: pal.bg, color: pal.text, borderLeft: `3px solid ${pal.border}` }}
                          title={`${job.property_name} — Cleaning ${time} — ${lbl}`}
                        >
                          🧹<span className="hidden sm:inline ml-0.5">{job.property_name}</span>
                          <span
                            className="hidden sm:inline ml-1 rounded-sm px-1 text-[9px]"
                            style={{ background: sc.bg, color: sc.text }}
                          >
                            {lbl}
                          </span>
                        </a>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Legend / tip ── */}
        {!loading && !error && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-xs text-[#9a9089]">
            <span>→ check-in</span>
            <span className="hidden sm:inline text-[#d6cfc6]">|</span>
            <span>← check-out</span>
            <span className="hidden sm:inline text-[#d6cfc6]">|</span>
            <span>🧹 cleaning job (tap to view)</span>
            <span className="hidden sm:inline text-[#d6cfc6]">|</span>
            <span>Click legend to toggle properties</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── standalone page wrapper ─────────────────────────────────────────────────
export default function CalendarPage() {
  return (
    <div className="min-h-screen bg-[#f7f3ec]">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <CalendarView embedded={false} />
      </div>
    </div>
  );
}
