import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";

const JOB_STATUSES = [
  "new",
  "offered",
  "accepted",
  "in_progress",
  "done_awaiting_review",
  "completed",
  "cancelled",
] as const;

async function getJobAndCheckOwner(
  id: string,
  prisma: Awaited<ReturnType<typeof getPrisma>>,
  landlordId: string
) {
  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      property: { select: { landlord_id: true, name: true } },
      assigned_cleaner: { select: { id: true, name: true } },
    },
  });
  if (!job || job.landlord_id !== landlordId) return null;
  return job;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  let prisma;
  try {
    prisma = getPrisma();
    const existing = await getJobAndCheckOwner(id, prisma, session.user.id);
    if (!existing) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const window_start =
      body.window_start != null && body.window_start !== ""
        ? new Date(body.window_start as string)
        : existing.window_start;
    const window_end =
      body.window_end != null && body.window_end !== ""
        ? new Date(body.window_end as string)
        : existing.window_end;
    const status =
      typeof body.status === "string" && (JOB_STATUSES as readonly string[]).includes(body.status)
        ? body.status
        : existing.status;
    const assigned_cleaner_id =
      body.assigned_cleaner_id !== undefined
        ? (typeof body.assigned_cleaner_id === "string"
            ? body.assigned_cleaner_id.trim() || null
            : null)
        : existing.assigned_cleaner_id;

    if (assigned_cleaner_id !== null && assigned_cleaner_id !== undefined) {
      const cleaner = await prisma.cleaner.findFirst({
        where: { id: assigned_cleaner_id, landlord_id: session.user.id },
      });
      if (!cleaner) {
        return NextResponse.json({ error: "Cleaner not found" }, { status: 404 });
      }
    }

    const job = await prisma.job.update({
      where: { id },
      data: {
        window_start: !Number.isNaN(window_start.getTime()) ? window_start : undefined,
        window_end: !Number.isNaN(window_end.getTime()) ? window_end : undefined,
        status,
        assigned_cleaner_id: assigned_cleaner_id === "" || assigned_cleaner_id === null ? null : assigned_cleaner_id,
      },
      include: {
        property: { select: { id: true, name: true } },
        assigned_cleaner: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(job);
  } catch (error) {
    console.error("Job update error:", error);
    return NextResponse.json({ error: "Failed to update job" }, { status: 500 });
  } finally {
    if (prisma) await prisma.$disconnect();
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  let prisma;
  try {
    prisma = getPrisma();
    const existing = await getJobAndCheckOwner(id, prisma, session.user.id);
    if (!existing) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    await prisma.job.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Job delete error:", error);
    return NextResponse.json({ error: "Failed to delete job" }, { status: 500 });
  } finally {
    if (prisma) await prisma.$disconnect();
  }
}
