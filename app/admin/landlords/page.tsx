import { requireAdmin } from "@/lib/admin-auth";
import { getPrisma } from "@/lib/prisma";
import Link from "next/link";

function SetupBadge({ score }: { score: number }) {
  const color =
    score === 100 ? "bg-[#d1ead1] text-[#2d6b2d]"
    : score >= 75  ? "bg-[#fef3cd] text-[#7a5800]"
    : score >= 50  ? "bg-[#ffe5cc] text-[#7a3500]"
    : "bg-[#fde0e0] text-[#7a1a1a]";
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${color}`}>
      {score}%
    </span>
  );
}

export default async function AdminLandlordsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>;
}) {
  await requireAdmin();
  const { q, sort = "signup" } = await searchParams;

  const prisma = getPrisma();
  try {
    const d30 = new Date(Date.now() - 30 * 86400_000);

    // Fetch all landlords with aggregated relations in one go
    const landlords = await prisma.user.findMany({
      where: {
        role: "landlord",
        ...(q ? { email: { contains: q, mode: "insensitive" } } : {}),
      },
      orderBy: sort === "email" ? { email: "asc" } : { created_at: "desc" },
      select: {
        id: true,
        email: true,
        telegram_chat_id: true,
        ingest_token: true,
        created_at: true,
        _count: {
          select: {
            properties: true,
            cleaners: true,
            jobs: true,
          },
        },
      },
    });

    // Get per-landlord: jobs last 30 days, last job date, PropertyCleaner count
    const landlordIds = landlords.map((l) => l.id);

    const [jobsRecent, lastJobs, propertyCleanerCounts] = await Promise.all([
      // Jobs per landlord last 30 days
      prisma.job.groupBy({
        by: ["landlord_id"],
        where: { landlord_id: { in: landlordIds }, created_at: { gte: d30 } },
        _count: { id: true },
      }),
      // Latest job per landlord
      prisma.job.findMany({
        where: { landlord_id: { in: landlordIds } },
        orderBy: { created_at: "desc" },
        distinct: ["landlord_id"],
        select: { landlord_id: true, created_at: true },
      }),
      // PropertyCleaner count per landlord (via properties)
      prisma.propertyCleaner.groupBy({
        by: ["property_id"],
        where: { property: { landlord_id: { in: landlordIds } } },
        _count: { id: true },
      }).then(async (rows) => {
        // resolve property_id → landlord_id
        const propIds = rows.map((r) => r.property_id);
        const props = await prisma.property.findMany({
          where: { id: { in: propIds } },
          select: { id: true, landlord_id: true },
        });
        const map: Record<string, number> = {};
        for (const row of rows) {
          const prop = props.find((p) => p.id === row.property_id);
          if (prop) map[prop.landlord_id] = (map[prop.landlord_id] ?? 0) + row._count.id;
        }
        return map;
      }),
    ]);

    const jobsRecentMap: Record<string, number> = {};
    for (const g of jobsRecent) jobsRecentMap[g.landlord_id] = g._count.id;

    const lastJobMap: Record<string, Date> = {};
    for (const j of lastJobs) lastJobMap[j.landlord_id] = j.created_at;

    // Build enriched rows
    const rows = landlords.map((l) => {
      const hasProp     = l._count.properties > 0;
      const hasCleaner  = l._count.cleaners > 0;
      const hasAssign   = (propertyCleanerCounts[l.id] ?? 0) > 0;
      const hasTelegram = !!l.telegram_chat_id;
      const setupScore  =
        (hasProp ? 25 : 0) + (hasCleaner ? 25 : 0) + (hasAssign ? 25 : 0) + (hasTelegram ? 25 : 0);

      return {
        ...l,
        jobsRecent: jobsRecentMap[l.id] ?? 0,
        lastJobAt: lastJobMap[l.id] ?? null,
        hasAssign,
        setupScore,
      };
    });

    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#3c3732]">Landlords</h1>
            <p className="mt-0.5 text-sm text-[#7d7570]">{rows.length} registered</p>
          </div>
          <form method="GET" className="flex gap-2">
            <input
              name="q"
              defaultValue={q}
              placeholder="Search by email…"
              className="rounded-xl border border-[#ddd6cb] bg-white px-4 py-2 text-sm text-[#3c3732] placeholder:text-[#b0a89f] focus:border-[#9a9089] focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-xl border border-[#ddd6cb] bg-white px-4 py-2 text-sm font-medium text-[#4b443e] hover:bg-[#f1ece4] transition"
            >
              Search
            </button>
          </form>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[#ddd6cb] bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#ddd6cb] text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6a625c]">
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Signed up</th>
                <th className="px-3 py-3 text-right">Props</th>
                <th className="px-3 py-3 text-right">Cleaners</th>
                <th className="px-3 py-3 text-right">Jobs</th>
                <th className="px-3 py-3 text-right">30d</th>
                <th className="px-3 py-3">Telegram</th>
                <th className="px-3 py-3">Fwd</th>
                <th className="px-3 py-3">Setup</th>
                <th className="px-3 py-3">Last job</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0ebe3]">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-sm text-[#9a9089]">
                    No landlords found.
                  </td>
                </tr>
              )}
              {rows.map((l) => (
                <tr key={l.id} className="hover:bg-[#faf7f3] transition-colors">
                  <td className="max-w-[200px] truncate px-4 py-3 font-medium text-[#3c3732]">
                    {l.email}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#7d7570]">
                    {l.created_at.toLocaleDateString()}
                  </td>
                  <td className="px-3 py-3 text-right text-[#3c3732]">{l._count.properties}</td>
                  <td className="px-3 py-3 text-right text-[#3c3732]">{l._count.cleaners}</td>
                  <td className="px-3 py-3 text-right text-[#3c3732]">{l._count.jobs}</td>
                  <td className="px-3 py-3 text-right text-[#3c3732]">{l.jobsRecent || "—"}</td>
                  <td className="px-3 py-3">
                    {l.telegram_chat_id
                      ? <span className="text-[#2d6b2d] text-xs">✓</span>
                      : <span className="text-[#9a9089] text-xs">—</span>
                    }
                  </td>
                  <td className="px-3 py-3">
                    {l.ingest_token
                      ? <span className="text-[#2d6b2d] text-xs">✓</span>
                      : <span className="text-[#9a9089] text-xs">—</span>
                    }
                  </td>
                  <td className="px-3 py-3">
                    <SetupBadge score={l.setupScore} />
                  </td>
                  <td className="px-3 py-3 text-xs text-[#7d7570]">
                    {l.lastJobAt ? l.lastJobAt.toLocaleDateString() : "—"}
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      href={`/admin/landlords/${l.id}`}
                      className="rounded-lg border border-[#ddd6cb] bg-[#f8f4ef] px-2.5 py-1 text-xs font-medium text-[#4b443e] hover:bg-[#ede8e1] transition"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Setup score legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-[#7d7570]">
          <span className="font-medium">Setup score:</span>
          {[
            { label: "+25% Add property",          color: "" },
            { label: "+25% Add cleaner",            color: "" },
            { label: "+25% Assign cleaner to property", color: "" },
            { label: "+25% Link Telegram",          color: "" },
          ].map((i) => (
            <span key={i.label} className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-[#4b443e]" /> {i.label}
            </span>
          ))}
        </div>
      </div>
    );
  } finally {
    await prisma.$disconnect();
  }
}
