import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { getPrisma } from "@/lib/prisma";

export async function POST(request: Request) {
  let prisma;
  try {
    const body = await request.json();
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and new password are required" },
        { status: 400 }
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    prisma = getPrisma();
    const row = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!row) {
      return NextResponse.json(
        { error: "Invalid or expired reset link. Request a new one." },
        { status: 400 }
      );
    }
    if (row.expires_at < new Date()) {
      await prisma.passwordResetToken.delete({ where: { id: row.id } });
      return NextResponse.json(
        { error: "This reset link has expired. Request a new one." },
        { status: 400 }
      );
    }

    const password_hash = await hash(password, 12);
    await prisma.user.update({
      where: { email: row.email },
      data: { password_hash },
    });
    await prisma.passwordResetToken.delete({ where: { id: row.id } });

    return NextResponse.json({
      ok: true,
      message: "Password updated. You can sign in with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  } finally {
    if (prisma) await prisma.$disconnect();
  }
}
