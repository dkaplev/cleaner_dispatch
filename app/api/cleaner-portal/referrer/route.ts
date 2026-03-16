import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

// Public endpoint — returns cleaner first name for the referral banner on the signup page.
// Only returns name; no sensitive data exposed.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code") ?? "";
  if (!code) return NextResponse.json({ name: null });

  let prisma;
  try {
    prisma = getPrisma();
    const cleaner = await prisma.cleaner.findUnique({
      where: { referral_code: code },
      select: { name: true },
    });
    if (!cleaner) return NextResponse.json({ name: null });
    // Return only first name for privacy
    const firstName = cleaner.name.trim().split(/\s+/)[0];
    return NextResponse.json({ name: firstName });
  } finally {
    if (prisma) await prisma.$disconnect();
  }
}
