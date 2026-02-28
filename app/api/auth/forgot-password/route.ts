import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import crypto from "crypto";

const TOKEN_BYTES = 32;
const EXPIRY_HOURS = 1;

function getBaseUrl(request: Request): string {
  const url = process.env.NEXTAUTH_URL;
  if (url) return url.replace(/\/$/, "");
  const origin = request.headers.get("x-forwarded-host")
    ? `${request.headers.get("x-forwarded-proto") || "https"}://${request.headers.get("x-forwarded-host")}`
    : request.headers.get("origin") || request.headers.get("referer")?.replace(/\/[^/]*$/, "");
  return origin || "http://localhost:3000";
}

export async function POST(request: Request) {
  let prisma;
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { error: "No account found with this email" },
        { status: 404 }
      );
    }

    const token = crypto.randomBytes(TOKEN_BYTES).toString("hex");
    const expiresAt = new Date(Date.now() + EXPIRY_HOURS * 60 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: { email, token, expires_at: expiresAt },
    });

    const baseUrl = getBaseUrl(request);
    const resetLink = `${baseUrl}/reset-password?token=${token}`;

    return NextResponse.json({
      ok: true,
      message: "Use the link below to set a new password (valid for 1 hour).",
      resetLink,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    if (
      msg.includes("password_reset_tokens") ||
      msg.includes("does not exist") ||
      msg.includes("Unknown table")
    ) {
      return NextResponse.json(
        {
          error:
            "Password reset is not set up. The database migration may not have been run. Run: npx prisma migrate deploy",
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: "Something went wrong. Please try again or contact support." },
      { status: 500 }
    );
  } finally {
    if (prisma) await prisma.$disconnect();
  }
}
