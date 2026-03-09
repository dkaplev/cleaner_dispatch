import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";

/**
 * GET  /api/account/ingest-token  — returns the current ingest_token (or generates one if missing).
 * POST /api/account/ingest-token  — regenerates the ingest_token (invalidates old forwarding address).
 */

async function getOrCreateToken(userId: string): Promise<string> {
  const prisma = getPrisma();
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { ingest_token: true },
    });
    if (user?.ingest_token) return user.ingest_token;
    const token = randomBytes(16).toString("hex");
    await prisma.user.update({ where: { id: userId }, data: { ingest_token: token } });
    return token;
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const token = await getOrCreateToken(session.user.id);
  return NextResponse.json({ ingest_token: token });
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const prisma = getPrisma();
  try {
    const token = randomBytes(16).toString("hex");
    await prisma.user.update({
      where: { id: session.user.id },
      data: { ingest_token: token },
    });
    return NextResponse.json({ ingest_token: token });
  } finally {
    await prisma.$disconnect();
  }
}
