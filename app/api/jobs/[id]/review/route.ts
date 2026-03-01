import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";

const REVIEW_TAGS = ["late", "low_quality", "missing_photos", "communication", "excellent"];

/**
 * POST /api/jobs/[id]/review
 * Landlord submits review for a job in done_awaiting_review. Sets job status to completed.
 * Body: { rating_1_5: number, tags?: string[], comment_optional?: string }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: jobId } = await params;

  let body: { rating_1_5?: number; tags?: string[]; comment_optional?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rating = typeof body.rating_1_5 === "number" ? body.rating_1_5 : Number(body.rating_1_5);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "rating_1_5 must be 1–5" }, { status: 400 });
  }

  const tags = Array.isArray(body.tags)
    ? body.tags.filter((t) => typeof t === "string" && REVIEW_TAGS.includes(t))
    : [];
  const comment =
    typeof body.comment_optional === "string" ? body.comment_optional.trim().slice(0, 2000) : null;

  const prisma = getPrisma();
  try {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        landlord_id: true,
        status: true,
        assigned_cleaner_id: true,
        review: true,
      },
    });
    if (!job || job.landlord_id !== session.user.id) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    if (job.status !== "done_awaiting_review") {
      return NextResponse.json(
        { error: "Only jobs awaiting review can be reviewed" },
        { status: 400 }
      );
    }
    if (!job.assigned_cleaner_id) {
      return NextResponse.json({ error: "Job has no assigned cleaner" }, { status: 400 });
    }
    if (job.review) {
      return NextResponse.json({ error: "This job was already reviewed" }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.review.create({
        data: {
          job_id: jobId,
          cleaner_id: job.assigned_cleaner_id,
          rating_1_5: rating,
          tags_json: tags.length > 0 ? JSON.stringify(tags) : null,
          comment_optional: comment || null,
        },
      }),
      prisma.job.update({
        where: { id: jobId },
        data: { status: "completed" },
      }),
    ]);

    return NextResponse.json({ ok: true, message: "Review saved; job completed." });
  } catch (err) {
    console.error("[review] Error:", err);
    return NextResponse.json({ error: "Failed to save review" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
