import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";
import { dispatchJob, offerJobToCleaner } from "@/lib/dispatch";

const JOB_STATUSES = [
  "new",
  "offered",
  "accepted",
  "in_progress",
  "done_awaiting_review",
  "completed",
  "cancelled",
] as const;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let prisma;
  try {
    prisma = getPrisma();
    const jobs = await prisma.job.findMany({
      where: { landlord_id: session.user.id },
      include: {
        property: { select: { id: true, name: true } },
        assigned_cleaner: { select: { id: true, name: true } },
      },
      orderBy: { window_start: "asc" },
    });
    return NextResponse.json(jobs);
  } catch (error) {
    console.error("Jobs list error:", error);
    return NextResponse.json({ error: "Failed to list jobs" }, { status: 500 });
  } finally {
    if (prisma) await prisma.$disconnect();
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let prisma;
  try {
    const body = await request.json();
    const property_id = typeof body.property_id === "string" ? body.property_id.trim() : "";
    const window_start =
      body.window_start != null && body.window_start !== ""
        ? new Date(body.window_start as string)
        : null;
    const window_end =
      body.window_end != null && body.window_end !== ""
        ? new Date(body.window_end as string)
        : null;
    const booking_id =
      typeof body.booking_id === "string" ? body.booking_id.trim() || null : null;
    const cleaner_id =
      typeof body.cleaner_id === "string" ? body.cleaner_id.trim() || null : null;

    if (!property_id) {
      return NextResponse.json({ error: "Property is required" }, { status: 400 });
    }
    if (!window_start || Number.isNaN(window_start.getTime())) {
      return NextResponse.json(
        { error: "Valid window start date and time are required" },
        { status: 400 }
      );
    }
    if (!window_end || Number.isNaN(window_end.getTime())) {
      return NextResponse.json(
        { error: "Valid window end date and time are required" },
        { status: 400 }
      );
    }
    if (window_end <= window_start) {
      return NextResponse.json(
        { error: "Window end must be after window start" },
        { status: 400 }
      );
    }

    prisma = getPrisma();
    const property = await prisma.property.findFirst({
      where: { id: property_id, landlord_id: session.user.id },
    });
    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const job = await prisma.job.create({
      data: {
        landlord_id: session.user.id,
        property_id,
        window_start,
        window_end,
        booking_id,
        status: "new",
      },
      include: {
        property: { select: { id: true, name: true } },
        assigned_cleaner: { select: { id: true, name: true } },
      },
    });

    // Send Telegram offer: to specific cleaner (if chosen) or via fallback
    if (cleaner_id) {
      const result = await offerJobToCleaner(prisma, job.id, cleaner_id);
      if (!result.success) {
        return NextResponse.json({ ...job, offer_error: result.error }, { status: 201 });
      }
      return NextResponse.json({ ...job, attempt: result.attempt }, { status: 201 });
    }
    const result = await dispatchJob(prisma, job.id);
    if (!result.success) {
      return NextResponse.json({ ...job, offer_error: result.error }, { status: 201 });
    }
    return NextResponse.json({ ...job, attempt: result.attempt }, { status: 201 });
  } catch (error) {
    console.error("Job create error:", error);
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
  } finally {
    if (prisma) await prisma.$disconnect();
  }
}
