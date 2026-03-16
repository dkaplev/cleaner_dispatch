import { NextRequest, NextResponse } from "next/server";
import { verifyCleanerPortalToken } from "@/lib/cleaner-token";
import { getPrisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const cleanerId = verifyCleanerPortalToken(token);
  if (!cleanerId) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 401 });
  }

  let prisma;
  try {
    prisma = getPrisma();
    const cleaner = await prisma.cleaner.findUnique({
      where: { id: cleanerId },
      select: {
        id: true,
        name: true,
        referral_code: true,
        dispatch_attempts: {
          where: { offer_status: "accepted" },
          select: { id: true },
        },
        assigned_jobs: {
          where: { status: { in: ["accepted", "in_progress", "done_awaiting_review", "completed"] } },
          select: {
            id: true,
            status: true,
            window_start: true,
            window_end: true,
            property: { select: { name: true, address: true } },
          },
          orderBy: { window_start: "asc" },
          take: 10,
        },
      },
    });

    if (!cleaner) {
      return NextResponse.json({ error: "Cleaner not found" }, { status: 404 });
    }

    // Count landlords this cleaner referred
    const referralCount = await prisma.user.count({
      where: { referred_by_cleaner_id: cleanerId },
    });

    const baseUrl = process.env.NEXTAUTH_URL ?? "https://cleaner-dispatch.vercel.app";

    return NextResponse.json({
      id: cleaner.id,
      name: cleaner.name,
      referral_code: cleaner.referral_code,
      referral_link: cleaner.referral_code
        ? `${baseUrl}/signup?ref=${cleaner.referral_code}`
        : null,
      referral_count: referralCount,
      estimated_earnings: referralCount * 20, // €20 per referral
      jobs_completed: cleaner.dispatch_attempts.length,
      upcoming_jobs: cleaner.assigned_jobs.filter(
        (j) => j.status === "accepted" || j.status === "in_progress"
      ),
    });
  } finally {
    if (prisma) await prisma.$disconnect();
  }
}
