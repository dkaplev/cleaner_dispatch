import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";

async function getPropertyAndCheckOwner(id: string, prisma: Awaited<ReturnType<typeof getPrisma>>, landlordId: string) {
  const property = await prisma.property.findUnique({
    where: { id },
  });
  if (!property || property.landlord_id !== landlordId) return null;
  return property;
}

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  let prisma;
  try {
    prisma = getPrisma();
    const existing = await getPropertyAndCheckOwner(id, prisma, session.user.id);
    if (!existing) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }
    const body = (await _request.json()) as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : existing.name;
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    const checkout_time_default =
      body.checkout_time_default != null && body.checkout_time_default !== ""
        ? new Date(body.checkout_time_default as string)
        : null;
    const cleaning_duration_minutes =
      typeof body.cleaning_duration_minutes === "number" && body.cleaning_duration_minutes > 0
        ? body.cleaning_duration_minutes
        : typeof body.cleaning_duration_minutes === "string" && body.cleaning_duration_minutes !== ""
          ? parseInt(body.cleaning_duration_minutes, 10)
          : null;
    const instructions_text =
      typeof body.instructions_text === "string" ? body.instructions_text.trim() || null : null;

    const property = await prisma.property.update({
      where: { id },
      data: {
        name,
        checkout_time_default: checkout_time_default && !Number.isNaN(checkout_time_default.getTime()) ? checkout_time_default : null,
        cleaning_duration_minutes: cleaning_duration_minutes != null && !Number.isNaN(cleaning_duration_minutes) ? cleaning_duration_minutes : null,
        instructions_text,
      },
    });
    return NextResponse.json(property);
  } catch (error) {
    console.error("Property update error:", error);
    return NextResponse.json({ error: "Failed to update property" }, { status: 500 });
  } finally {
    if (prisma) await prisma.$disconnect();
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  let prisma;
  try {
    prisma = getPrisma();
    const existing = await getPropertyAndCheckOwner(id, prisma, session.user.id);
    if (!existing) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }
    await prisma.property.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Property delete error:", error);
    return NextResponse.json({ error: "Failed to delete property" }, { status: 500 });
  } finally {
    if (prisma) await prisma.$disconnect();
  }
}
