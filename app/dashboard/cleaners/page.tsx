import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import Link from "next/link";
import { DashboardHeader } from "../dashboard-header";
import { CleanerList } from "./cleaner-list";

export default async function CleanersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  type CleanerRow = {
    id: string;
    name: string;
    telegram_chat_id: string | null;
    notes: string | null;
    is_active: boolean;
  };
  let cleaners: (CleanerRow & {
    avg_rating: number | null;
    completed_count: number;
    acceptance_rate: number | null;
  })[] = [];
  let prisma;
  try {
    prisma = getPrisma();
    const landlordId = session.user.id;
    const landlordJobIds = await prisma.job
      .findMany({ where: { landlord_id: landlordId }, select: { id: true } })
      .then((r) => r.map((j) => j.id));

    const [cleanersList, reviewStats, completedCounts, attemptStats] = await Promise.all([
      prisma.cleaner.findMany({
        where: { landlord_id: landlordId },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          telegram_chat_id: true,
          notes: true,
          is_active: true,
        },
      }),
      landlordJobIds.length > 0
        ? prisma.review.groupBy({
            by: ["cleaner_id"],
            _avg: { rating_1_5: true },
            _count: true,
            where: { job_id: { in: landlordJobIds } },
          })
        : [],
      prisma.job.groupBy({
        by: ["assigned_cleaner_id"],
        where: {
          landlord_id: landlordId,
          status: "completed",
          assigned_cleaner_id: { not: null },
        },
        _count: true,
      }),
      landlordJobIds.length > 0
        ? prisma.dispatchAttempt.groupBy({
            by: ["cleaner_id"],
            _count: true,
            where: {
              job_id: { in: landlordJobIds },
              offer_status: { in: ["sent", "accepted", "declined", "timeout"] },
            },
          })
        : [],
    ]);
    const acceptedCounts =
      landlordJobIds.length > 0
        ? await prisma.dispatchAttempt.groupBy({
            by: ["cleaner_id"],
            _count: true,
            where: {
              job_id: { in: landlordJobIds },
              offer_status: "accepted",
            },
          })
        : [];
    const acceptedMap = new Map(acceptedCounts.map((a) => [a.cleaner_id, a._count]));
    const attemptMap = new Map(attemptStats.map((a) => [a.cleaner_id, a._count]));
    const reviewMap = new Map(
      reviewStats.map((r) => [r.cleaner_id, r._avg.rating_1_5 ?? null])
    );
    const completedMap = new Map(
      completedCounts.map((c) => [c.assigned_cleaner_id!, c._count])
    );
    cleaners = cleanersList.map((c) => {
      const attempts = attemptMap.get(c.id) ?? 0;
      const accepted = acceptedMap.get(c.id) ?? 0;
      return {
        ...c,
        avg_rating: reviewMap.get(c.id) ?? null,
        completed_count: completedMap.get(c.id) ?? 0,
        acceptance_rate: attempts > 0 ? Math.round((accepted / attempts) * 100) : null,
      };
    });
  } finally {
    if (prisma) await prisma.$disconnect();
  }

  return (
    <div className="min-h-screen bg-[#f8f6f2]">
      <DashboardHeader userEmail={session.user.email ?? ""} />
      <main className="mx-auto max-w-5xl px-6 pb-16 pt-8">
        <div className="flex items-center justify-between pb-4">
          <div>
            <h1 className="text-xl font-bold text-[#3c3732]">Cleaners</h1>
            <p className="mt-0.5 text-sm text-[#7d7570]">
              Manage your cleaning team. Share Telegram links so they receive job offers.
            </p>
          </div>
          <Link
            href="/dashboard/cleaners/new"
            className="rounded-full bg-[#3c3732] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#2d2925] transition-colors"
          >
            + Add cleaner
          </Link>
        </div>
        <CleanerList initialCleaners={cleaners} />
        <p className="mt-6 text-sm">
          <Link href="/dashboard" className="text-[#7d7570] hover:text-[#3c3732] hover:underline">
            ← Dashboard
          </Link>
        </p>
      </main>
    </div>
  );
}
