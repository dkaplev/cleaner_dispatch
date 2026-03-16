import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let prisma;
  try {
    prisma = getPrisma();
    const properties = await prisma.property.findMany({
      where: { landlord_id: session.user.id },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(properties);
  } catch (error) {
    console.error("Properties list error:", error);
    return NextResponse.json({ error: "Failed to list properties" }, { status: 500 });
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
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    const checkout_time_default =
      body.checkout_time_default != null && body.checkout_time_default !== ""
        ? new Date(body.checkout_time_default)
        : null;
    const cleaning_duration_minutes =
      typeof body.cleaning_duration_minutes === "number" && body.cleaning_duration_minutes > 0
        ? body.cleaning_duration_minutes
        : typeof body.cleaning_duration_minutes === "string" && body.cleaning_duration_minutes !== ""
          ? parseInt(body.cleaning_duration_minutes, 10)
          : null;
    const instructions_text =
      typeof body.instructions_text === "string" ? body.instructions_text.trim() || null : null;
    const address =
      typeof body.address === "string" ? body.address.trim() || null : null;

    const cleaning_trigger =
      typeof body.cleaning_trigger === "string" &&
      ["after_checkout", "before_checkin", "both"].includes(body.cleaning_trigger)
        ? body.cleaning_trigger
        : "after_checkout";
    const checkin_time_default =
      body.checkin_time_default != null && body.checkin_time_default !== ""
        ? new Date(body.checkin_time_default as string)
        : null;

    prisma = getPrisma();
    const property = await prisma.property.create({
      data: {
        landlord_id: session.user.id,
        name,
        address,
        checkout_time_default: checkout_time_default && !Number.isNaN(checkout_time_default.getTime()) ? checkout_time_default : null,
        checkin_time_default: checkin_time_default && !Number.isNaN(checkin_time_default.getTime()) ? checkin_time_default : null,
        cleaning_duration_minutes: cleaning_duration_minutes != null && !Number.isNaN(cleaning_duration_minutes) ? cleaning_duration_minutes : null,
        instructions_text,
        cleaning_trigger,
      },
    });
    return NextResponse.json(property);
  } catch (error) {
    console.error("Property create error:", error);
    return NextResponse.json({ error: "Failed to create property" }, { status: 500 });
  } finally {
    if (prisma) await prisma.$disconnect();
  }
}
