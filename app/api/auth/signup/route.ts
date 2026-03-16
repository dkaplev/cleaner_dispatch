import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { randomBytes } from "crypto";
import { getPrisma } from "@/lib/prisma";

const ROLE_LANDLORD = "landlord";

export async function POST(request: Request) {
  let prisma;
  try {
    const body = await request.json();
    const email        = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password     = typeof body.password === "string" ? body.password : "";
    const referralCode = typeof body.referralCode === "string" ? body.referralCode.trim() : null;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
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
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Resolve referral: look up cleaner by referral_code
    let referred_by_cleaner_id: string | null = null;
    let referrerName: string | null = null;
    if (referralCode) {
      const referrer = await prisma.cleaner.findUnique({
        where: { referral_code: referralCode },
        select: { id: true, name: true },
      });
      if (referrer) {
        referred_by_cleaner_id = referrer.id;
        referrerName           = referrer.name;
      }
    }

    const password_hash = await hash(password, 12);
    const ingest_token  = randomBytes(16).toString("hex");
    await prisma.user.create({
      data: {
        email,
        password_hash,
        role: ROLE_LANDLORD,
        ingest_token,
        ...(referred_by_cleaner_id ? { referred_by_cleaner_id } : {}),
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Account created",
      ...(referrerName ? { referrerName } : {}),
    });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  } finally {
    if (prisma) await prisma.$disconnect();
  }
}
