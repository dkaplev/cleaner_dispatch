import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getPrisma } from "@/lib/prisma";
import { DashboardHeader } from "../../../dashboard-header";
import { PropertyForm } from "../../property-form";
import { PropertyCleaners } from "../../property-cleaners";
import { CalendarFeeds } from "../../calendar-feeds";

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { id } = await params;

  let prisma;
  let property: { id: string; name: string; address: string | null; checkout_time_default: Date | null; checkin_time_default: Date | null; cleaning_duration_minutes: number | null; instructions_text: string | null; cleaning_trigger: string } | null = null;
  let allCleaners: { id: string; name: string; telegram_chat_id: string | null }[] = [];
  try {
    prisma = getPrisma();
    [property, allCleaners] = await Promise.all([
      prisma.property.findFirst({ where: { id, landlord_id: session.user.id } }),
      prisma.cleaner.findMany({ where: { landlord_id: session.user.id }, orderBy: { name: "asc" }, select: { id: true, name: true, telegram_chat_id: true } }),
    ]);
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
  const checkinTimeForForm =
    property.checkin_time_default != null
      ? property.checkin_time_default.toISOString().slice(11, 16)
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
          initialAddress={property.address ?? ""}
          initialCheckoutTime={checkoutTimeForForm}
          initialCheckinTime={checkinTimeForForm}
          initialCleaningTrigger={property.cleaning_trigger}
          initialDuration={property.cleaning_duration_minutes ?? ""}
          initialInstructions={property.instructions_text ?? ""}
          hideButtons
        />
        <PropertyCleaners propertyId={property.id} allCleaners={allCleaners} />
        <CalendarFeeds propertyId={property.id} />

        {/* Save/Cancel anchored below the cleaners section */}
        <div className="mt-6 flex gap-3 border-t border-zinc-200 pt-6">
          <button
            type="submit"
            form="property-details-form"
            className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Save changes
          </button>
          <Link
            href="/dashboard/properties"
            className="rounded-lg border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Cancel
          </Link>
        </div>
      </main>
    </div>
  );
}
