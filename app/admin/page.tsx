import { requireAdmin } from "@/lib/admin-auth";
import { getPrisma } from "@/lib/prisma";
import Link from "next/link";

function MetricCard({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex min-h-[96px] flex-col justify-between rounded-2xl border p-5 ${
        accent
          ? "border-[#4b443e] bg-[#4b443e] text-white"
          : "border-[#ddd6cb] bg-white"
      }`}
    >
      <p className={`text-xs font-medium uppercase tracking-[0.12em] ${accent ? "text-[#c5bdb4]" : "text-[#6a625c]"}`}>
        {label}
      </p>
      <div>
        <p className={`text-3xl font-bold tracking-tight ${accent ? "text-white" : "text-[#3c3732]"}`}>
          {value}
        </p>
        {sub && <p className={`mt-0.5 text-xs ${accent ? "text-[#c5bdb4]" : "text-[#7d7570]"}`}>{sub}</p>}
      </div>
    </div>
  );
}

function MiniBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-xs text-[#5d554f]">{label}</span>
      <div className="flex-1 overflow-hidden rounded-full bg-[#ede8e1] h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-6 text-right text-xs font-semibold text-[#3c3732]">{value}</span>
    </div>
  );
}

export default async function AdminOverviewPage() {
  await requireAdmin();

  const prisma = getPrisma();
  try {
    const now = new Date();
    const d7  = new Date(now.getTime() - 7  * 86400_000);
    const d30 = new Date(now.getTime() - 30 * 86400_000);

    const [
      totalUsers,
      newUsersWeek,
      newUsersMonth,
      totalProperties,
      totalCleaners,
      cleanersWithTelegram,
      usersWithTelegram,
      usersWithIngestToken,
      jobGroups,
      jobsWeek,
      jobsMonth,
      feedbackCounts,
      recentUsers,
      referredUsers,
      topReferrers,
    ] = await Promise.all([
      prisma.user.count({ where: { role: "landlord" } }),
      prisma.user.count({ where: { role: "landlord", created_at: { gte: d7 } } }),
      prisma.user.count({ where: { role: "landlord", created_at: { gte: d30 } } }),
      prisma.property.count(),
      prisma.cleaner.count(),
      prisma.cleaner.count({ where: { telegram_chat_id: { not: null } } }),
      prisma.user.count({ where: { role: "landlord", telegram_chat_id: { not: null } } }),
      prisma.user.count({ where: { role: "landlord", ingest_token: { not: null } } }),
      prisma.job.groupBy({ by: ["status"], _count: { status: true } }),
      prisma.job.count({ where: { created_at: { gte: d7 } } }),
      prisma.job.count({ where: { created_at: { gte: d30 } } }),
      prisma.feedback.groupBy({ by: ["status"], _count: { status: true } }),
      prisma.user.findMany({
        where: { role: "landlord", created_at: { gte: d7 } },
        select: { created_at: true },
        orderBy: { created_at: "asc" },
      }),
      // Referral stats
      prisma.user.count({ where: { referred_by_cleaner_id: { not: null } } }),
      prisma.user.groupBy({
        by: ["referred_by_cleaner_id"],
        where: { referred_by_cleaner_id: { not: null } },
        _count: { referred_by_cleaner_id: true },
        orderBy: { _count: { referred_by_cleaner_id: "desc" } },
        take: 5,
      }),
    ]);

    // Fetch cleaner names for top referrers
    const referrerIds = topReferrers
      .map((r) => r.referred_by_cleaner_id)
      .filter((id): id is string => !!id);
    const referrerCleaners = referrerIds.length
      ? await prisma.cleaner.findMany({
          where: { id: { in: referrerIds } },
          select: { id: true, name: true },
        })
      : [];
    const cleanerNameMap: Record<string, string> = {};
    for (const c of referrerCleaners) cleanerNameMap[c.id] = c.name;

    const jobCountByStatus: Record<string, number> = {};
    for (const g of jobGroups) jobCountByStatus[g.status] = g._count.status;
    const totalJobs = Object.values(jobCountByStatus).reduce((a, b) => a + b, 0);

    const feedbackByStatus: Record<string, number> = {};
    for (const g of feedbackCounts) feedbackByStatus[g.status] = g._count.status;
    const newFeedback = feedbackByStatus["new"] ?? 0;

    // Signup trend: bucket by day
    const dayLabels: string[] = [];
    const dayMap: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400_000);
      const key = d.toISOString().slice(0, 10);
      dayLabels.push(key.slice(5)); // MM-DD
      dayMap[key] = 0;
    }
    for (const u of recentUsers) {
      const key = u.created_at.toISOString().slice(0, 10);
      if (dayMap[key] !== undefined) dayMap[key]++;
    }
    const trendData = dayLabels.map((d) => ({ label: d, count: dayMap[`2026-${d}`] ?? dayMap[Object.keys(dayMap).find((k) => k.endsWith(d)) ?? ""] ?? 0 }));
    // simpler approach
    const trendDays = Object.keys(dayMap).map((k) => ({ label: k.slice(5), count: dayMap[k] }));
    const trendMax = Math.max(...trendDays.map((d) => d.count), 1);

    const telegramLandlordRate = totalUsers > 0 ? Math.round((usersWithTelegram / totalUsers) * 100) : 0;
    const cleanerTelegramRate  = totalCleaners > 0 ? Math.round((cleanersWithTelegram / totalCleaners) * 100) : 0;

    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-[#3c3732]">Overview</h1>
          <p className="mt-1 text-sm text-[#7d7570]">
            Live snapshot — all data is real-time.
          </p>
        </div>

        {/* ── Top stat cards ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <MetricCard label="Landlords" value={totalUsers} sub={`+${newUsersWeek} this week`} accent />
          <MetricCard label="Properties" value={totalProperties} />
          <MetricCard label="Cleaners" value={totalCleaners} sub={`${cleanersWithTelegram} Telegram linked`} />
          <MetricCard label="Total jobs" value={totalJobs} sub={`${jobsWeek} this week`} />
          <MetricCard label="New feedback" value={newFeedback} sub="awaiting review" />
        </div>

        {/* ── Two column section ── */}
        <div className="grid gap-4 lg:grid-cols-2">

          {/* Signup trend */}
          <div className="rounded-2xl border border-[#ddd6cb] bg-white p-6">
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.12em] text-[#6a625c]">
              Signups — last 7 days
            </p>
            <div className="flex items-end gap-1.5 h-20">
              {trendDays.map((d) => {
                const h = trendMax > 0 ? Math.max(4, Math.round((d.count / trendMax) * 80)) : 4;
                return (
                  <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-[9px] text-[#9a9089]">{d.count || ""}</span>
                    <div
                      className="w-full rounded-t bg-[#4b443e]"
                      style={{ height: `${h}px` }}
                    />
                    <span className="text-[9px] text-[#9a9089]">{d.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex gap-6 text-xs text-[#5d554f]">
              <span>+{newUsersWeek} this week</span>
              <span>+{newUsersMonth} this month</span>
            </div>
          </div>

          {/* Job pipeline */}
          <div className="rounded-2xl border border-[#ddd6cb] bg-white p-6">
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.12em] text-[#6a625c]">
              Job pipeline
            </p>
            <div className="space-y-3">
              {[
                { label: "New",              key: "new",                  color: "bg-[#ddd6cb]" },
                { label: "Offered",          key: "offered",              color: "bg-[#9a8068]" },
                { label: "Accepted",         key: "accepted",             color: "bg-[#6b9e6b]" },
                { label: "In progress",      key: "in_progress",          color: "bg-[#5a8a5a]" },
                { label: "Done / review",    key: "done_awaiting_review", color: "bg-[#c49a3c]" },
                { label: "Completed",        key: "completed",            color: "bg-[#4b443e]" },
                { label: "Cancelled",        key: "cancelled",            color: "bg-[#e3dcd1]" },
              ].map((row) => (
                <MiniBar
                  key={row.key}
                  label={row.label}
                  value={jobCountByStatus[row.key] ?? 0}
                  max={totalJobs}
                  color={row.color}
                />
              ))}
            </div>
            <div className="mt-4 flex gap-6 text-xs text-[#5d554f]">
              <span>{jobsWeek} jobs this week</span>
              <span>{jobsMonth} this month</span>
            </div>
          </div>
        </div>

        {/* ── Adoption rates ── */}
        <div className="rounded-2xl border border-[#ddd6cb] bg-white p-6">
          <p className="mb-5 text-xs font-medium uppercase tracking-[0.12em] text-[#6a625c]">
            Feature adoption
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Landlord Telegram",    value: usersWithTelegram,  total: totalUsers,    pct: telegramLandlordRate },
              { label: "Cleaner Telegram",     value: cleanersWithTelegram, total: totalCleaners, pct: cleanerTelegramRate },
              { label: "Email ingest token",   value: usersWithIngestToken, total: totalUsers,   pct: totalUsers > 0 ? Math.round((usersWithIngestToken / totalUsers) * 100) : 0 },
              { label: "Jobs created",         value: totalUsers > 0 ? (totalJobs > 0 ? totalUsers : 0) : 0, total: totalUsers, pct: totalUsers > 0 ? Math.min(100, Math.round((Math.min(totalJobs, totalUsers) / totalUsers) * 100)) : 0 },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-end justify-between">
                  <p className="text-xs text-[#5d554f]">{item.label}</p>
                  <p className="text-lg font-bold text-[#3c3732]">{item.pct}%</p>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#ede8e1]">
                  <div className="h-2 rounded-full bg-[#4b443e]" style={{ width: `${item.pct}%` }} />
                </div>
                <p className="mt-1 text-[10px] text-[#9a9089]">{item.value} of {item.total}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Referral flywheel ── */}
        <div className="rounded-2xl border border-[#ddd6cb] bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#6a625c]">
                Cleaner referral flywheel
              </p>
              <p className="mt-0.5 text-sm text-[#7d7570]">
                Landlords who signed up via a cleaner&apos;s referral link
              </p>
            </div>
            <div className="rounded-xl border border-[#ddd6cb] px-4 py-2 text-center">
              <p className="text-2xl font-bold text-[#3c3732]">{referredUsers}</p>
              <p className="text-[10px] text-[#9a9089]">referral signups</p>
            </div>
          </div>

          {topReferrers.length > 0 ? (
            <div className="mt-4 space-y-2">
              <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9a9089]">Top referrers</p>
              {topReferrers.map((r) => {
                const cid   = r.referred_by_cleaner_id ?? "";
                const count = r._count.referred_by_cleaner_id;
                const name  = cleanerNameMap[cid] ?? cid.slice(0, 8) + "…";
                return (
                  <div key={cid} className="flex items-center justify-between rounded-xl border border-[#ede8e1] bg-[#faf7f4] px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1a1510] text-[11px] font-bold text-white">
                        {name.charAt(0).toUpperCase()}
                      </span>
                      <span className="text-sm font-medium text-[#3c3732]">{name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-[#fff3e3] px-2.5 py-0.5 text-xs font-semibold text-[#c45c0f]">
                        {count} landlord{count !== 1 ? "s" : ""}
                      </span>
                      <span className="text-xs text-[#9a9089]">≈ €{count * 20} earned</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 text-sm text-[#9a9089]">No referral signups yet. Cleaners receive their referral invite after their 3rd accepted job.</p>
          )}
        </div>

        {/* ── Quick links ── */}
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { href: "/admin/landlords", label: "View all landlords →", sub: `${totalUsers} registered` },
            { href: "/admin/feedback",  label: "Review feedback →",    sub: `${newFeedback} unread` },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-2xl border border-[#ddd6cb] bg-white px-5 py-4 transition hover:bg-[#f5f1ea]"
            >
              <p className="text-sm font-semibold text-[#3c3732]">{l.label}</p>
              <p className="text-xs text-[#7d7570]">{l.sub}</p>
            </Link>
          ))}
        </div>
      </div>
    );
  } finally {
    await prisma.$disconnect();
  }
}
