import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export async function GET() {
  let prisma;
  try {
    prisma = getPrisma();
    const count = await prisma.user.count();
    return NextResponse.json({
      ok: true,
      message: "Database connection OK",
      usersCount: count,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database connection failed";
    console.error("DB test error:", error);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  } finally {
    if (prisma) await prisma.$disconnect();
  }
}
