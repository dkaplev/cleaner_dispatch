"use client";

import Link from "next/link";

type Segment = {
  label: string;
  value: number;
  color: string;
  dotClass: string;
  sub: string;
};

function DonutSvg({ segments, total }: { segments: Segment[]; total: number }) {
  const r = 34;
  const cx = 50;
  const cy = 50;
  const sw = 15;
  const C = 2 * Math.PI * r;

  if (total === 0) {
    return (
      <svg viewBox="0 0 100 100" className="w-28 h-28 shrink-0">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e3dcd1" strokeWidth={sw} />
        <text x={cx} y={cy - 3} textAnchor="middle" fill="#9a9089" fontSize="9" fontFamily="inherit">
          no active
        </text>
        <text x={cx} y={cy + 9} textAnchor="middle" fill="#9a9089" fontSize="9" fontFamily="inherit">
          jobs
        </text>
      </svg>
    );
  }

  let cumulative = 0;
  return (
    <svg viewBox="0 0 100 100" className="w-28 h-28 shrink-0">
      {segments.map((seg, i) => {
        if (seg.value === 0) return null;
        const fraction = seg.value / total;
        const start = cumulative;
        cumulative += fraction;
        const arc = fraction * C;
        const offset = C * (1 - start);
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={sw}
            strokeDasharray={`${arc} ${C - arc}`}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        );
      })}
      {/* Centre label */}
      <text
        x={cx}
        y={cy - 2}
        textAnchor="middle"
        fill="#3c3732"
        fontSize="20"
        fontWeight="700"
        fontFamily="inherit"
      >
        {total}
      </text>
      <text
        x={cx}
        y={cy + 11}
        textAnchor="middle"
        fill="#6a625c"
        fontSize="8"
        fontFamily="inherit"
      >
        in progress
      </text>
    </svg>
  );
}

export function JobsOverview({
  waiting,
  active,
  review,
  completed,
}: {
  waiting: number;
  active: number;
  review: number;
  completed: number;
}) {
  const total = waiting + active + review;

  const segments: Segment[] = [
    {
      label: "Waiting",
      value: waiting,
      color: "#9a8068",
      dotClass: "bg-[#9a8068]",
      sub: "new or offered to cleaner",
    },
    {
      label: "Active",
      value: active,
      color: "#5a8a5a",
      dotClass: "bg-[#5a8a5a]",
      sub: "accepted or in progress",
    },
    {
      label: "To review",
      value: review,
      color: "#c49a3c",
      dotClass: "bg-[#c49a3c]",
      sub: "done, awaiting your check",
    },
  ];

  return (
    <div className="rounded-2xl border border-[#e3dcd1] bg-[#fbf9f5] p-6">
      <div className="flex items-center justify-between mb-5">
        <p className="text-xs font-medium tracking-[0.12em] uppercase text-[#6a625c]">
          Job status
        </p>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/cleanings/new"
            className="rounded-full bg-[#1a1510] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#2e2822] transition-colors"
          >
            + New cleaning
          </Link>
          <Link
            href="/dashboard/cleanings"
            className="text-xs text-[#4b443e] underline decoration-[#c5bdb4] hover:text-[#3c3732] transition"
          >
            View all →
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-8">
        <DonutSvg segments={segments} total={total} />

        <div className="flex-1 space-y-3">
          {segments.map((seg) => (
            <div key={seg.label} className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <span
                  className={`mt-1 h-2.5 w-2.5 rounded-full shrink-0 ${seg.dotClass}`}
                />
                <div>
                  <p className="text-sm font-medium text-[#3c3732]">{seg.label}</p>
                  <p className="text-xs text-[#7d7570]">{seg.sub}</p>
                </div>
              </div>
              <span className="text-lg font-semibold text-[#3c3732] tabular-nums">
                {seg.value}
              </span>
            </div>
          ))}

          {completed > 0 && (
            <div className="mt-1 border-t border-[#e3dcd1] pt-3 flex items-center justify-between">
              <p className="text-xs text-[#7d7570]">Completed (all time)</p>
              <p className="text-xs font-semibold text-[#7d7570]">{completed}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
