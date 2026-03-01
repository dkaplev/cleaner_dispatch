import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import Link from "next/link";
import { DashboardHeader } from "../../dashboard-header";
import { ImportBookingForm } from "./import-booking-form";

export default async function ImportBookingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  let properties: { id: string; name: string }[] = [];
  let cleaners: { id: string; name: string }[] = [];
  let prisma;
  try {
    prisma = getPrisma();
    [properties, cleaners] = await Promise.all([
      prisma.property.findMany({
        where: { landlord_id: session.user.id },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.cleaner.findMany({
        where: { landlord_id: session.user.id, is_active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
    ]);
  } finally {
    if (prisma) await prisma.$disconnect();
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <DashboardHeader userEmail={session.user.email ?? ""} />
      <main className="mt-8 max-w-lg">
        <h2 className="text-lg font-semibold text-zinc-900">Import booking</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Paste a booking confirmation (e.g. from Airbnb or Booking.com). We detect the checkout date and create a cleaning job. You can also forward booking emails to a dedicated address later (see instructions).
        </p>
        <ImportBookingForm properties={properties} cleaners={cleaners} />
        <p className="mt-4 text-sm text-zinc-500">
          <Link href="/dashboard/cleanings" className="text-zinc-700 underline hover:no-underline">
            Back to Dispatch
          </Link>
        </p>
      </main>
    </div>
  );
}
