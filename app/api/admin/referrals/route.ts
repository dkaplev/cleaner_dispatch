import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getPrisma } from "@/lib/prisma";
import { createCleanerPortalToken } from "@/lib/cleaner-token";

export async function GET() {
  await requireAdmin();

  const prisma = getPrisma();
  try {
    const baseUrl = process.env.NEXTAUTH_URL ?? "https://cleaner-dispatch.vercel.app";

    // All referred landlords
    const referredUsers = await prisma.user.findMany({
      where: { referred_by_cleaner_id: { not: null } },
      select: {
        id: true,
        email: true,
        created_at: true,
        referred_by_cleaner_id: true,
        referral_paid_at: true,
      },
      orderBy: { created_at: "desc" },
    });

    // Fetch cleaner names
    const cleanerIds = [...new Set(referredUsers.map((u) => u.referred_by_cleaner_id).filter(Boolean) as string[])];
    const cleaners = cleanerIds.length
      ? await prisma.cleaner.findMany({
          where: { id: { in: cleanerIds } },
          select: { id: true, name: true, referral_code: true },
        })
      : [];
    const cleanerMap: Record<string, { name: string; referral_code: string | null }> = {};
    for (const c of cleaners) cleanerMap[c.id] = { name: c.name, referral_code: c.referral_code };

    const referrals = referredUsers.map((u) => {
      const c = u.referred_by_cleaner_id ? (cleanerMap[u.referred_by_cleaner_id] ?? null) : null;
      return {
        userId:        u.id,
        landlordEmail: u.email,
        signedUpAt:    u.created_at.toISOString(),
        cleanerId:     u.referred_by_cleaner_id ?? null,
        cleanerName:   c?.name ?? null,
        portalUrl:     null as string | null,
        paidAt:        u.referral_paid_at?.toISOString() ?? null,
      };
    });

    // All cleaners (for portal links / testing)
    const allCleaners = await prisma.cleaner.findMany({
      where: { is_active: true },
      select: { id: true, name: true, referral_code: true },
      orderBy: { name: "asc" },
    });

    // Count signups per cleaner
    const signupCounts = await prisma.user.groupBy({
      by: ["referred_by_cleaner_id"],
      where: { referred_by_cleaner_id: { not: null } },
      _count: { id: true },
    });
    const paidCounts = await prisma.user.groupBy({
      by: ["referred_by_cleaner_id"],
      where: { referred_by_cleaner_id: { not: null }, referral_paid_at: { not: null } },
      _count: { id: true },
    });
    const signupMap: Record<string, number> = {};
    const paidMap:   Record<string, number> = {};
    for (const r of signupCounts) if (r.referred_by_cleaner_id) signupMap[r.referred_by_cleaner_id] = r._count.id;
    for (const r of paidCounts)   if (r.referred_by_cleaner_id) paidMap[r.referred_by_cleaner_id]   = r._count.id;

    const cleanerRows = allCleaners.map((c) => ({
      id:           c.id,
      name:         c.name,
      portalUrl:    `${baseUrl}/cleaner/portal?token=${encodeURIComponent(createCleanerPortalToken(c.id))}`,
      totalSignups: signupMap[c.id] ?? 0,
      paidSignups:  paidMap[c.id]   ?? 0,
    }));

    return NextResponse.json({ referrals, cleaners: cleanerRows });
  } finally {
    await prisma.$disconnect();
  }
}
