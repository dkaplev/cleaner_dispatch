import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import Link from "next/link";
import { DashboardHeader } from "../dashboard-header";
import { DispatchList } from "./dispatch-list";

export default async function CleaningsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  let jobs: {
    id: string;
    window_start: Date;
    window_end: Date;
    status: string;
    reminder_sent_at: Date | null;
    property: { id: string; name: string };
    assigned_cleaner: { id: string; name: string } | null;
    dispatch_attempts: { offer_status: string; cleaner: { name: string } }[];
  }[] = [];
  let prisma;
  try {
    prisma = getPrisma();
    jobs = await prisma.job.findMany({
      where: { landlord_id: session.user.id },
      include: {
        property: { select: { id: true, name: true } },
        assigned_cleaner: { select: { id: true, name: true } },
        dispatch_attempts: {
          orderBy: { offer_sent_at: "desc" },
          select: { offer_status: true, cleaner: { select: { name: true } } },
        },
      },
      orderBy: { window_start: "asc" },
    });
  } finally {
    if (prisma) await prisma.$disconnect();
  }

  const jobsForList = jobs.map((j) => {
    const considering = j.dispatch_attempts.filter((a) => a.offer_status === "sent").length;
    const latestAttempt = j.dispatch_attempts[0];
    return {
      id: j.id,
      window_start: j.window_start.toISOString(),
      window_end: j.window_end.toISOString(),
      status: j.status,
      reminder_sent_at: j.reminder_sent_at?.toISOString() ?? null,
      property: j.property,
      assigned_cleaner: j.assigned_cleaner,
      offered_to_cleaner_name: j.status === "offered" && latestAttempt ? latestAttempt.cleaner.name : null,
      cleaners_considering: considering,
    };
  });

  return (
    <div className="min-h-screen bg-[#f8f6f2]">
      <DashboardHeader userEmail={session.user.email ?? ""} />
      <main className="mx-auto max-w-5xl px-6 pb-16 pt-8">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-4">
          <div>
            <h1 className="text-xl font-bold text-[#3c3732]">Cleaning Jobs</h1>
            <p className="mt-0.5 text-sm text-[#7d7570]">
              All jobs dispatched automatically from calendar feeds. Dispatch, review, and manage from here.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/dashboard/cleanings/import"
              className="rounded-full border border-[#d8d0c4] bg-[#fbf9f5] px-4 py-2 text-sm font-medium text-[#4b443e] hover:bg-[#f0ebe3] transition-colors"
            >
              Import booking
            </Link>
            <Link
              href="/dashboard/cleanings/new"
              className="rounded-full bg-[#3c3732] px-4 py-2 text-sm font-medium text-white hover:bg-[#2d2925] transition-colors"
            >
              + New job
            </Link>
          </div>
        </div>
        <DispatchList jobs={jobsForList} />
        <p className="mt-6 text-sm">
          <Link href="/dashboard" className="text-[#7d7570] hover:text-[#3c3732] hover:underline">
            ← Dashboard
          </Link>
        </p>
      </main>
    </div>
  );
}
