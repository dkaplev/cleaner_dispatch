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
    <div className="min-h-screen bg-zinc-50 p-6">
      <DashboardHeader userEmail={session.user.email ?? ""} />
      <main className="mt-8">
        <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
          <h2 className="text-lg font-semibold text-zinc-900">Dispatch</h2>
          <div className="flex gap-2">
            <Link
              href="/dashboard/cleanings/import"
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Import booking
            </Link>
            <Link
              href="/dashboard/cleanings/new"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Assign job
            </Link>
          </div>
        </div>
        <p className="mt-2 text-sm text-zinc-500">
          One place for all cleaning jobs. Choose a cleaner or let the system use primary/fallback. The cleaner gets a Telegram message with Accept/Decline and, after they accept, a link to upload photos and mark done.
        </p>
        <DispatchList jobs={jobsForList} />
        <p className="mt-4 text-sm text-zinc-500">
          <Link href="/dashboard" className="text-zinc-700 underline hover:no-underline">
            Back to dashboard
          </Link>
        </p>
      </main>
    </div>
  );
}
