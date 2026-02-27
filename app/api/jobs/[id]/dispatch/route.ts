import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";
import { dispatchJob } from "@/lib/dispatch";

/**
 * POST /api/jobs/[id]/dispatch — offer the job to a cleaner (primary or first with Telegram).
 * Auth required. Job must be in status "new".
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: jobId } = await params;
  const prisma = getPrisma();
  try {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true, landlord_id: true, status: true },
    });
    if (!job || job.landlord_id !== session.user.id) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const result = await dispatchJob(prisma, jobId);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      attempt: result.attempt,
    });
  } catch (error) {
    console.error("[dispatch API] Error:", error);
    return NextResponse.json(
      { error: "Failed to dispatch job" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
