import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { verifyUploadToken } from "@/lib/upload-token";
import { JobUploadClient } from "./job-upload-client";

export default async function JobUploadPage({
  params,
  searchParams,
}: {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { jobId } = await params;
  const { token } = await searchParams;
  if (!token?.trim()) {
    return (
      <div className="min-h-screen bg-zinc-100 p-6 flex items-center justify-center">
        <p className="text-zinc-600">Invalid link. Use the link from your Telegram message.</p>
      </div>
    );
  }

  const payload = verifyUploadToken(token);
  if (!payload || payload.jobId !== jobId) {
    return (
      <div className="min-h-screen bg-zinc-100 p-6 flex items-center justify-center">
        <p className="text-zinc-600">This link is invalid or has expired.</p>
      </div>
    );
  }

  let prisma;
  let job: { property: { name: string }; window_start: Date; window_end: Date; assigned_cleaner_id: string | null } | null = null;
  try {
    prisma = getPrisma();
    job = await prisma.job.findUnique({
      where: { id: jobId },
      select: {
        property: { select: { name: true } },
        window_start: true,
        window_end: true,
        assigned_cleaner_id: true,
      },
    });
  } finally {
    if (prisma) await prisma.$disconnect();
  }

  if (!job || job.assigned_cleaner_id !== payload.cleanerId) {
    return (
      <div className="min-h-screen bg-zinc-100 p-6 flex items-center justify-center">
        <p className="text-zinc-600">Job not found or you are not assigned to it.</p>
      </div>
    );
  }

  const windowStr = `${new Date(job.window_start).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} – ${new Date(job.window_end).toLocaleTimeString(undefined, { timeStyle: "short" })}`;

  return (
    <div className="min-h-screen bg-zinc-100 p-4 sm:p-6">
      <div className="mx-auto max-w-md">
        <h1 className="text-xl font-semibold text-zinc-900">Upload photos</h1>
        <p className="mt-1 text-sm text-zinc-600">
          {job.property.name} — {windowStr}
        </p>
        <JobUploadClient token={token} jobId={jobId} />
      </div>
    </div>
  );
}
