import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getPrisma } from "@/lib/prisma";
import { DashboardHeader } from "./dashboard-header";
import { SetupChecklist } from "./setup-checklist";

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
    <div className="rounded-2xl border border-[#e3dcd1] bg-[#fbf9f5] p-5">
      <p className="text-xs font-medium tracking-[0.12em] uppercase text-[#6a625c]">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-[#3c3732]">{value}</p>
      {sub && <p className="mt-1 text-xs text-[#7d7570]">{sub}</p>}
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block transition hover:scale-[1.01]">
        {inner}
      </Link>
    );
  }
  return inner;
}

// ── Nav card ──────────────────────────────────────────────────────────────────

function NavCard({
  title,
  description,
  href,
  badge,
}: {
  title: string;
  description: string;
  href: string;
  badge?: string | number;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col justify-between rounded-2xl border border-[#e3dcd1] bg-[#fbf9f5] p-6 transition hover:bg-[#f5f0e8] hover:border-[#d8d0c4]"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-base font-semibold text-[#3c3732]">{title}</p>
        {badge !== undefined && badge !== "" && (
          <span className="rounded-full bg-[#ece5dc] px-2.5 py-0.5 text-xs font-semibold text-[#4b443e]">
            {badge}
          </span>
        )}
      </div>
      <p className="mt-2 text-sm leading-6 text-[#615952]">{description}</p>
      <p className="mt-4 text-xs font-medium text-[#4b443e] transition group-hover:underline">
        Open →
      </p>
    </Link>
  );
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
            { label: "Set up email forwarding (auto job creation)", done: false, href: "/dashboard/integrations", cta: "Set up", optional: true },
          ]}
        />

        {/* ── Stats row ── */}
        <section>
          <p className="mb-3 text-xs font-medium tracking-[0.13em] uppercase text-[#6a625c]">Overview</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard label="Properties" value={propertyCount} href="/dashboard/properties" />
            <StatCard label="Cleaners" value={cleanerCount} href="/dashboard/cleaners" />
            <StatCard
              label="Waiting"
              value={jobsPending}
              sub="new or offered"
              href="/dashboard/jobs"
            />
            <StatCard
              label="Active"
              value={jobsActive}
              sub="accepted or in progress"
              href="/dashboard/jobs"
            />
            <StatCard
              label="To review"
              value={jobsReview}
              sub="awaiting your check"
              href="/dashboard/jobs"
            />
          </div>
        </section>

        {/* ── Nav cards ── */}
        <section>
          <p className="mb-3 text-xs font-medium tracking-[0.13em] uppercase text-[#6a625c]">Manage</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <NavCard
              title="Jobs"
              description="Review all cleaning jobs, check statuses, and dispatch manually when needed."
              href="/dashboard/jobs"
              badge={jobsPending + jobsActive + jobsReview > 0 ? jobsPending + jobsActive + jobsReview : undefined}
            />
            <NavCard
              title="Import booking"
              description="Paste a booking confirmation email to create a cleaning job in seconds."
              href="/dashboard/cleanings/import"
            />
            <NavCard
              title="New cleaning"
              description="Manually create a cleaning window without a booking confirmation."
              href="/dashboard/cleanings/new"
            />
            <NavCard
              title="Properties"
              description="Add properties, set checkout times, cleaning durations, and assign cleaners."
              href="/dashboard/properties"
              badge={propertyCount}
            />
            <NavCard
              title="Cleaners"
              description="Manage your cleaner team. Share Telegram links so they receive job offers."
              href="/dashboard/cleaners"
              badge={cleanerCount}
            />
            <NavCard
              title="Email forwarding"
              description="Set up Gmail filter + n8n workflow to auto-create jobs from booking emails."
              href="/dashboard/integrations"
            />
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

      </main>
    </div>
  );
}
