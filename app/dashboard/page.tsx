import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getPrisma } from "@/lib/prisma";
import { DashboardHeader } from "./dashboard-header";
import { SetupChecklist } from "./setup-checklist";
import { JobsOverview } from "./jobs-overview";
import { FeedbackWidget } from "./feedback-widget";
import { CalendarView } from "./calendar/page";

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  href,
}: {
  label: string;
  value: number | string;
  sub?: string;
  href?: string;
}) {
  const inner = (
    <div className="flex h-full min-h-[104px] flex-col justify-between rounded-2xl border border-[#e3dcd1] bg-[#fbf9f5] p-5">
      <p className="text-xs font-medium tracking-[0.12em] uppercase text-[#6a625c]">{label}</p>
      <div>
        <p className="text-3xl font-semibold tracking-tight text-[#3c3732]">{value}</p>
        <p className="mt-1 text-xs text-[#7d7570]">{sub ?? "\u00A0"}</p>
      </div>
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block h-full transition hover:scale-[1.01]">
        {inner}
      </Link>
    );
  }
  return inner;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // ── Data fetching ────────────────────────────────────────────────────────
  let telegramChatId: string | null = null;
  let hasProperty = false;
  let hasCleaner = false;
  let hasPropertyCleaner = false;

  let propertyCount = 0;
  let cleanerCount = 0;
  let jobsPending = 0;    // new + offered
  let jobsActive = 0;     // accepted + in_progress
  let jobsReview = 0;     // done_awaiting_review
  let jobsCompleted = 0;  // completed (last 30 days)

  type AttentionJob = {
    id: string;
    property_name: string;
    window_start: string;
    status: string;
  };
  let attentionJobs: AttentionJob[] = [];

  const botUsername = process.env.TELEGRAM_BOT_USERNAME?.trim();

  try {
    const prisma = getPrisma();

    const [user, propFirst, cleanFirst, jobGroups] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { telegram_chat_id: true },
      }),
      prisma.property.findFirst({
        where: { landlord_id: session.user.id },
        select: { id: true },
      }),
      prisma.cleaner.findFirst({
        where: { landlord_id: session.user.id },
        select: { id: true },
      }),
      prisma.job.groupBy({
        by: ["status"],
        where: { landlord_id: session.user.id },
        _count: { status: true },
      }),
    ]);

    telegramChatId = user?.telegram_chat_id ?? null;
    hasProperty = !!propFirst;
    hasCleaner = !!cleanFirst;

    if (propFirst?.id) {
      const pc = await prisma.propertyCleaner.findFirst({
        where: { property_id: propFirst.id },
        select: { cleaner_id: true },
      });
      hasPropertyCleaner = !!pc;
    }

    const [pCount, cCount] = await Promise.all([
      prisma.property.count({ where: { landlord_id: session.user.id } }),
      prisma.cleaner.count({ where: { landlord_id: session.user.id } }),
    ]);
    propertyCount = pCount;
    cleanerCount = cCount;

    for (const g of jobGroups) {
      const n = g._count.status;
      if (g.status === "new" || g.status === "offered") jobsPending += n;
      else if (g.status === "accepted" || g.status === "in_progress") jobsActive += n;
      else if (g.status === "done_awaiting_review") jobsReview += n;
      else if (g.status === "completed") jobsCompleted += n;
    }

    // Jobs needing landlord attention — only future / today's jobs
    const todayMidnight = new Date();
    todayMidnight.setUTCHours(0, 0, 0, 0);
    const urgentJobs = await prisma.job.findMany({
      where: {
        landlord_id: session.user.id,
        status: { in: ["new", "done_awaiting_review"] },
        window_start: { gte: todayMidnight },
      },
      orderBy: { window_start: "asc" },
      take: 5,
      select: {
        id: true,
        status: true,
        window_start: true,
        property: { select: { name: true } },
      },
    });
    attentionJobs = urgentJobs.map((j) => ({
      id: j.id,
      property_name: j.property.name,
      window_start: j.window_start.toISOString(),
      status: j.status,
    }));

    await prisma.$disconnect();
  } catch {
    // fall through with zero counts
  }

  const landlordLink =
    botUsername && session.user.id
      ? `https://t.me/${botUsername.replace(/^@/, "")}?start=landlord_${session.user.id}`
      : null;

  return (
    <div className="min-h-screen bg-[#f8f6f2] text-[#3f3a35]">
      <DashboardHeader userEmail={session.user.email ?? ""} />

      <main className="mx-auto w-full max-w-5xl px-6 pb-16 pt-8 space-y-8">

        {/* ── Setup checklist (only if incomplete) ── */}
        <SetupChecklist
          items={[
            { label: "Add your first property", done: hasProperty, href: "/onboarding", cta: "Add property" },
            { label: "Add a cleaner", done: hasCleaner, href: "/onboarding", cta: "Add cleaner" },
            { label: "Assign cleaner to property", done: hasPropertyCleaner, href: "/onboarding", cta: "Assign" },
            { label: "Link your Telegram for notifications", done: !!telegramChatId, href: "/onboarding", cta: "Link Telegram" },
            // Email forwarding hidden — calendar sync is now the primary ingestion method
          ]}
        />

        {/* ── Overview: Properties + Cleaners ── */}
        <section>
          <p className="mb-3 text-xs font-medium tracking-[0.13em] uppercase text-[#6a625c]">Overview</p>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Properties"
              value={propertyCount}
              sub={propertyCount === 1 ? "1 property" : `${propertyCount} properties`}
              href="/dashboard/properties"
            />
            <StatCard
              label="Cleaners"
              value={cleanerCount}
              sub={cleanerCount === 1 ? "1 cleaner" : `${cleanerCount} cleaners`}
              href="/dashboard/cleaners"
            />
          </div>
        </section>

        {/* ── Job status chart ── */}
        <JobsOverview
          waiting={jobsPending}
          active={jobsActive}
          review={jobsReview}
          completed={jobsCompleted}
        />

        {/* ── Needs attention (future jobs only) ── */}
        {attentionJobs.length > 0 && (
          <section>
            <p className="mb-3 text-xs font-medium tracking-[0.13em] uppercase text-[#6a625c]">Needs attention</p>
            <div className="rounded-2xl border border-[#e3dcd1] bg-[#fbf9f5] divide-y divide-[#f0ebe3] overflow-hidden">
              {attentionJobs.map((j) => {
                const isReview = j.status === "done_awaiting_review";
                const date = new Date(j.window_start).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
                return (
                  <Link
                    key={j.id}
                    href={isReview ? `/dashboard/jobs/${j.id}` : `/dashboard/cleanings`}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-[#f5f0e8] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`h-2 w-2 rounded-full flex-shrink-0 ${isReview ? "bg-violet-500" : "bg-amber-500"}`} />
                      <div>
                        <p className="text-sm font-medium text-[#3c3732]">{j.property_name}</p>
                        <p className="text-xs text-[#9a9089]">{date}</p>
                      </div>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${isReview ? "bg-violet-50 text-violet-700" : "bg-amber-50 text-amber-700"}`}>
                      {isReview ? "Review cleaning" : "Not dispatched"}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Bookings Calendar ── */}
        <section>
          <p className="mb-3 text-xs font-medium tracking-[0.13em] uppercase text-[#6a625c]">Bookings Calendar</p>
          <div className="rounded-2xl border border-[#e3dcd1] bg-white overflow-hidden shadow-sm">
            <CalendarView embedded={true} />
          </div>
        </section>

        {/* ── Telegram link (only if not yet linked) ── */}
        {!telegramChatId && landlordLink && (
          <section className="rounded-2xl border border-[#e3dcd1] bg-[#fbf9f5] p-6">
            <p className="text-xs font-medium tracking-[0.13em] uppercase text-[#6a625c]">Telegram</p>
            <p className="mt-2 text-sm text-[#5d554f]">
              Link your Telegram account to receive instant booking alerts and job updates.
            </p>
            <a
              href={landlordLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#2AABEE] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#1d96d6]"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.17 13.238l-2.965-.924c-.644-.204-.657-.644.136-.953l11.57-4.461c.537-.194 1.006.131.983.321z"/></svg>
              Link Telegram
            </a>
          </section>
        )}

        {telegramChatId && (
          <p className="text-center text-xs text-[#9a9089]">
            ✓ Telegram linked — you&apos;ll receive booking alerts and job updates.
            {" "}<Link href="/onboarding" className="underline decoration-[#c5bdb4] hover:text-[#4a443e]">Setup guide</Link>
          </p>
        )}

        {/* ── Feedback ── */}
        <FeedbackWidget />

      </main>
    </div>
  );
}
