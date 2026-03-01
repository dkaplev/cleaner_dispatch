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
        <h2 className="text-lg font-semibold text-zinc-900">Assign job</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Choose a cleaner or let the system use primary/fallback. The cleaner receives a Telegram message with Accept/Decline and, after they accept, a link to upload photos and mark done.
        </p>
        <CleaningForm properties={properties} cleaners={cleaners} />
      </main>
    </div>
  );
}
