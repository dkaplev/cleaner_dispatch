import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { DashboardHeader } from "../../../dashboard-header";
import { CleaningEditForm } from "../../cleaning-edit-form";

export default async function EditCleaningPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { id } = await params;

  let prisma;
  let cleaning: {
    id: string;
    scheduled_at: Date;
    status: string;
    notes: string | null;
    property: { id: string; name: string };
    cleaner: { id: string; name: string };
  } | null = null;
  try {
    prisma = getPrisma();
    cleaning = await prisma.cleaning.findFirst({
      where: { id, property: { landlord_id: session.user.id } },
      include: {
        property: { select: { id: true, name: true } },
        cleaner: { select: { id: true, name: true } },
      },
    });
  } finally {
    if (prisma) await prisma.$disconnect();
  }

  if (!cleaning) redirect("/dashboard/cleanings");

  const scheduledAtLocal = new Date(cleaning.scheduled_at.getTime() - cleaning.scheduled_at.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <DashboardHeader userEmail={session.user.email ?? ""} />
      <main className="mt-8 max-w-lg">
        <h2 className="text-lg font-semibold text-zinc-900">Edit assignment</h2>
        <p className="mt-1 text-sm text-zinc-500">
          {cleaning.property.name} → {cleaning.cleaner.name}
        </p>
        <CleaningEditForm
          id={cleaning.id}
          initialScheduledAt={scheduledAtLocal}
          initialStatus={cleaning.status}
          initialNotes={cleaning.notes ?? ""}
        />
      </main>
    </div>
  );
}
