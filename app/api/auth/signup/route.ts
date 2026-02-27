import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { getPrisma } from "@/lib/prisma";

const ROLE_LANDLORD = "landlord";

export async function POST(request: Request) {
  let prisma;
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

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

    const password_hash = await hash(password, 12);
    await prisma.user.create({
      data: {
        email,
        password_hash,
        role: ROLE_LANDLORD,
      },
    });

    return NextResponse.json({ ok: true, message: "Account created" });
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
