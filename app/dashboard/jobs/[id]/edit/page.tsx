import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { DashboardHeader } from "../../../dashboard-header";
import { JobEditForm } from "../../job-edit-form";
import { JobReviewForm } from "../../job-review-form";

function toLocalDatetimeLocal(d: Date) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { id } = await params;

  let prisma;
  let job: {
    id: string;
    window_start: Date;
    window_end: Date;
    status: string;
    assigned_cleaner_id: string | null;
    property: { id: string; name: string };
    assigned_cleaner: { id: string; name: string } | null;
    review: { rating_1_5: number; tags_json: string | null; comment_optional: string | null } | null;
    job_media: { id: string }[];
  } | null = null;
  let cleaners: { id: string; name: string }[] = [];
  try {
    prisma = getPrisma();
    [job, cleaners] = await Promise.all([
      prisma.job.findFirst({
        where: { id, landlord_id: session.user.id },
        include: {
          property: { select: { id: true, name: true } },
          assigned_cleaner: { select: { id: true, name: true } },
          review: {
            select: { rating_1_5: true, tags_json: true, comment_optional: true },
          },
          job_media: { select: { id: true } },
        },
      }),
      prisma.cleaner.findMany({
        where: { landlord_id: session.user.id, is_active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
    ]);
  } finally {
    if (prisma) await prisma.$disconnect();
  }

  if (!job) redirect("/dashboard/cleanings");

  const showReviewForm =
    job.status === "done_awaiting_review" && !job.review && job.assigned_cleaner;

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <DashboardHeader userEmail={session.user.email ?? ""} />
      <main className="mt-8 max-w-lg">
        <h2 className="text-lg font-semibold text-zinc-900">Edit job</h2>
        <p className="mt-1 text-sm text-zinc-500">
          {job.property.name} — {job.status}
        </p>
        <JobEditForm
          id={job.id}
          initialWindowStart={toLocalDatetimeLocal(job.window_start)}
          initialWindowEnd={toLocalDatetimeLocal(job.window_end)}
          initialStatus={job.status}
          initialAssignedCleanerId={job.assigned_cleaner_id}
          cleaners={cleaners}
        />
        {showReviewForm && job.assigned_cleaner && (
          <JobReviewForm
            jobId={job.id}
            cleanerName={job.assigned_cleaner.name}
            media={job.job_media}
          />
        )}
        {job.status === "done_awaiting_review" && job.review && (
          <p className="mt-6 text-sm text-zinc-600">
            You already submitted a review ({job.review.rating_1_5}/5). Save the job with status
            &quot;completed&quot; if it is not yet.
          </p>
        )}
      </main>
    </div>
  );
}
