import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { DashboardHeader } from "../../dashboard-header";
import { CleaningForm } from "../cleaning-form";

export default async function NewCleaningPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  let properties: { id: string; name: string; cleaning_duration_minutes: number | null }[] = [];
  let cleaners: { id: string; name: string }[] = [];
  let prisma;
  try {
    prisma = getPrisma();
    [properties, cleaners] = await Promise.all([
      prisma.property.findMany({
        where: { landlord_id: session.user.id },
        orderBy: { name: "asc" },
        select: { id: true, name: true, cleaning_duration_minutes: true },
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
        <h2 className="text-lg font-semibold text-zinc-900">Dispatch</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Assign to a cleaner from your roster or create a job to find someone later.
        </p>
        <CleaningForm properties={properties} cleaners={cleaners} />
      </main>
    </div>
  );
}
