import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import Link from "next/link";
import { DashboardHeader } from "../dashboard-header";
import { DispatchList } from "./dispatch-list";

export default async function CleaningsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  let cleanings: {
    id: string;
    scheduled_at: Date;
    status: string;
    notes: string | null;
    property: { id: string; name: string };
    cleaner: { id: string; name: string };
  }[] = [];
  let jobs: {
    id: string;
    window_start: Date;
    window_end: Date;
    status: string;
    property: { id: string; name: string };
    assigned_cleaner: { id: string; name: string } | null;
  }[] = [];
  let prisma;
  try {
    prisma = getPrisma();
    [cleanings, jobs] = await Promise.all([
      prisma.cleaning.findMany({
        where: { property: { landlord_id: session.user.id } },
        include: {
          property: { select: { id: true, name: true } },
          cleaner: { select: { id: true, name: true } },
        },
        orderBy: { scheduled_at: "asc" },
      }),
      prisma.job.findMany({
        where: { landlord_id: session.user.id },
        include: {
          property: { select: { id: true, name: true } },
          assigned_cleaner: { select: { id: true, name: true } },
        },
        orderBy: { window_start: "asc" },
      }),
    ]);
  } finally {
    if (prisma) await prisma.$disconnect();
  }

  const cleaningsForList = cleanings.map((c) => ({
    type: "cleaning" as const,
    id: c.id,
    scheduled_at: c.scheduled_at.toISOString(),
    status: c.status,
    notes: c.notes,
    property: c.property,
    cleaner: c.cleaner,
  }));
  const jobsForList = jobs.map((j) => ({
    type: "job" as const,
    id: j.id,
    window_start: j.window_start.toISOString(),
    window_end: j.window_end.toISOString(),
    status: j.status,
    property: j.property,
    assigned_cleaner: j.assigned_cleaner,
  }));

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <DashboardHeader userEmail={session.user.email ?? ""} />
      <main className="mt-8">
        <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
          <h2 className="text-lg font-semibold text-zinc-900">Dispatch</h2>
          <Link
            href="/dashboard/cleanings/new"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            New cleaning
          </Link>
        </div>
        <p className="mt-2 text-sm text-zinc-500">
          Assign to a cleaner from your roster or create a job to find someone later. All assignments and jobs appear below.
        </p>
        <DispatchList cleanings={cleaningsForList} jobs={jobsForList} />
        <p className="mt-4 text-sm text-zinc-500">
          <Link href="/dashboard" className="text-zinc-700 underline hover:no-underline">
            Back to dashboard
          </Link>
        </p>
      </main>
    </div>
  );
}
