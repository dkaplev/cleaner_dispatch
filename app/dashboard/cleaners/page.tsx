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
    <div className="min-h-screen bg-zinc-50 p-6">
      <DashboardHeader userEmail={session.user.email ?? ""} />
      <main className="mt-8">
        <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
          <h2 className="text-lg font-semibold text-zinc-900">Cleaners</h2>
          <Link
            href="/dashboard/cleaners/new"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Add cleaner
          </Link>
        </div>
        <CleanerList initialCleaners={cleaners} />
        <p className="mt-4 text-sm text-zinc-500">
          <Link href="/dashboard" className="text-zinc-700 underline hover:no-underline">
            Back to dashboard
          </Link>
        </p>
      </main>
    </div>
  );
}
