import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { verifyUploadToken } from "@/lib/upload-token";
import { notifyLandlordJobDone } from "@/lib/notify-landlord-telegram";

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

    // Notify landlord via Telegram — critical so they know the property is ready for the next guest
    try {
      const jobWithLandlord = await prisma.job.findUnique({
        where: { id: jobId },
        select: {
          property: { select: { name: true } },
          landlord: { select: { telegram_chat_id: true } },
          _count: { select: { job_media: true } },
        },
      });
      if (jobWithLandlord?.landlord?.telegram_chat_id) {
        await notifyLandlordJobDone(
          jobWithLandlord.landlord.telegram_chat_id,
          jobWithLandlord.property.name,
          jobId,
          jobWithLandlord._count.job_media
        );
      }
    } catch (notifyErr) {
      console.error("[mark-done] Failed to notify landlord via Telegram:", notifyErr);
    }

    return NextResponse.json({ ok: true, message: "Job marked done. Landlord will review." });
  } catch (err) {
    console.error("[mark-done] Error:", err);
    return NextResponse.json({ error: "Failed to update job" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
