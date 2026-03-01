import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { verifyUploadToken } from "@/lib/upload-token";

const MIN_PHOTOS = 1;

/**
 * POST /api/jobs/[id]/mark-done
 * Body: { token: string }
 * Cleaner marks job as done. Requires at least MIN_PHOTOS uploaded; sets status to done_awaiting_review.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params;
  let body: { token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const token = body.token?.trim();
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const payload = verifyUploadToken(token);
  if (!payload || payload.jobId !== jobId) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  const prisma = getPrisma();
  try {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        status: true,
        assigned_cleaner_id: true,
        _count: { select: { job_media: true } },
      },
    });
    if (!job || job.assigned_cleaner_id !== payload.cleanerId) {
      return NextResponse.json({ error: "Job not found or not assigned to you" }, { status: 404 });
    }
    if (job.status !== "accepted" && job.status !== "in_progress") {
      return NextResponse.json(
        { error: "Job can only be marked done when accepted or in progress" },
        { status: 400 }
      );
    }
    if (job._count.job_media < MIN_PHOTOS) {
      return NextResponse.json(
        { error: `Upload at least ${MIN_PHOTOS} photo(s) before marking the job done` },
        { status: 400 }
      );
    }

    await prisma.job.update({
      where: { id: jobId },
      data: { status: "done_awaiting_review" },
    });
    return NextResponse.json({ ok: true, message: "Job marked done. Landlord will review." });
  } catch (err) {
    console.error("[mark-done] Error:", err);
    return NextResponse.json({ error: "Failed to update job" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
