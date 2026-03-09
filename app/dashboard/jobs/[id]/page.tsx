import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import Link from "next/link";
import { DashboardHeader } from "../../dashboard-header";
import { JobActions } from "./job-actions";
import { JobReviewForm } from "../job-review-form";

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  offered: "Offered",
  accepted: "Accepted",
  in_progress: "In progress",
  done_awaiting_review: "Done — awaiting review",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-50 text-blue-700",
  offered: "bg-indigo-50 text-indigo-700",
  accepted: "bg-amber-50 text-amber-700",
  in_progress: "bg-amber-50 text-amber-700",
  done_awaiting_review: "bg-violet-50 text-violet-700",
  completed: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-zinc-100 text-zinc-500",
};

function formatWindow(start: Date, end: Date) {
  return (
    start.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) +
    " – " +
    end.toLocaleTimeString(undefined, { timeStyle: "short" })
  );
}

export default async function JobPage({
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
    booking_id: string | null;
    reminder_sent_at: Date | null;
    property: { id: string; name: string };
    assigned_cleaner: { id: string; name: string } | null;
    dispatch_attempts: { offer_status: string; cleaner: { name: string } }[];
    review: {
      rating_1_5: number;
      tags_json: string | null;
      comment_optional: string | null;
    } | null;
    job_media: { id: string }[];
  } | null = null;

  try {
    prisma = getPrisma();
    job = await prisma.job.findFirst({
      where: { id, landlord_id: session.user.id },
      include: {
        property: { select: { id: true, name: true } },
        assigned_cleaner: { select: { id: true, name: true } },
        dispatch_attempts: {
          orderBy: { offer_sent_at: "desc" },
          select: { offer_status: true, cleaner: { select: { name: true } } },
        },
        review: {
          select: {
            rating_1_5: true,
            tags_json: true,
            comment_optional: true,
          },
        },
        job_media: { select: { id: true } },
      },
    });
  } finally {
    if (prisma) await prisma.$disconnect();
  }

  if (!job) redirect("/dashboard/cleanings");

  const latestSentAttempt = job.dispatch_attempts.find(
    (a) => a.offer_status === "sent"
  );
  const photoCount = job.job_media.length;
  const showReviewForm =
    job.status === "done_awaiting_review" && !job.review && job.assigned_cleaner;

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <DashboardHeader userEmail={session.user.email ?? ""} />
      <main className="mt-8 max-w-lg">
        <div className="mb-4">
          <Link
            href="/dashboard/cleanings"
            className="text-sm text-zinc-500 hover:text-zinc-800"
          >
            ← Back to Dispatch
          </Link>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">
                {job.property.name}
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                {formatWindow(job.window_start, job.window_end)}
              </p>
            </div>
            <span
              className={`mt-0.5 shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                STATUS_COLORS[job.status] ?? "bg-zinc-100 text-zinc-700"
              }`}
            >
              {STATUS_LABELS[job.status] ?? job.status}
            </span>
          </div>

          <dl className="mt-4 space-y-2 text-sm">
            {job.booking_id && (
              <div className="flex gap-2">
                <dt className="w-28 shrink-0 text-zinc-500">Booking ref</dt>
                <dd className="font-mono text-zinc-800">{job.booking_id}</dd>
              </div>
            )}
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-zinc-500">Cleaner</dt>
              <dd className="text-zinc-800">
                {job.assigned_cleaner?.name ??
                  (latestSentAttempt
                    ? `Offered to ${latestSentAttempt.cleaner.name}`
                    : "Not assigned")}
              </dd>
            </div>
            {photoCount > 0 && (
              <div className="flex gap-2">
                <dt className="w-28 shrink-0 text-zinc-500">Photos</dt>
                <dd className="text-zinc-800">{photoCount} uploaded</dd>
              </div>
            )}
            {job.review && (
              <div className="flex gap-2">
                <dt className="w-28 shrink-0 text-zinc-500">Review</dt>
                <dd className="text-zinc-800">
                  {"★".repeat(job.review.rating_1_5)}
                  {"☆".repeat(5 - job.review.rating_1_5)}{" "}
                  ({job.review.rating_1_5}/5)
                </dd>
              </div>
            )}
          </dl>

          <JobActions
            jobId={job.id}
            jobStatus={job.status}
            reminderSentAt={job.reminder_sent_at?.toISOString() ?? null}
          />
        </div>

        {showReviewForm && job.assigned_cleaner && (
          <div className="mt-6">
            <JobReviewForm
              jobId={job.id}
              cleanerName={job.assigned_cleaner.name}
              media={job.job_media}
            />
          </div>
        )}

        {job.status === "done_awaiting_review" && job.review && (
          <p className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
            You already submitted a review ({job.review.rating_1_5}/5).
          </p>
        )}

        <div className="mt-4 text-sm">
          <Link
            href={`/dashboard/jobs/${job.id}/edit`}
            className="text-zinc-500 underline hover:text-zinc-800 hover:no-underline"
          >
            Edit window / status / assign cleaner manually →
          </Link>
        </div>
      </main>
    </div>
  );
}
