import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { DashboardHeader } from "../../../dashboard-header";
import { PropertyForm } from "../../property-form";

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { id } = await params;

  let prisma;
  let property: { id: string; name: string; checkout_time_default: Date | null; cleaning_duration_minutes: number | null; instructions_text: string | null } | null = null;
  try {
    prisma = getPrisma();
    property = await prisma.property.findFirst({
      where: { id, landlord_id: session.user.id },
    });
  } finally {
    if (prisma) await prisma.$disconnect();
  }

  if (!property) {
    redirect("/dashboard/properties");
  }

  const checkoutTimeForForm =
    property.checkout_time_default != null
      ? property.checkout_time_default.toISOString().slice(11, 16)
      : "";

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <DashboardHeader userEmail={session.user.email ?? ""} />
      <main className="mt-8 max-w-lg">
        <h2 className="text-lg font-semibold text-zinc-900">Edit property</h2>
        <PropertyForm
          action="edit"
          id={property.id}
          initialName={property.name}
          initialCheckoutTime={checkoutTimeForForm}
          initialDuration={property.cleaning_duration_minutes ?? ""}
          initialInstructions={property.instructions_text ?? ""}
        />
      </main>
    </div>
  );
}
