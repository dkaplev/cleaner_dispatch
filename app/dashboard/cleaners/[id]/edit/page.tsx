import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { DashboardHeader } from "../../../dashboard-header";
import { CleanerForm } from "../../cleaner-form";
import { CleanerTelegramLink } from "../../cleaner-telegram-link";

export default async function EditCleanerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { id } = await params;

  let prisma;
  let cleaner: {
    id: string;
    name: string;
    telegram_chat_id: string | null;
    notes: string | null;
    is_active: boolean;
  } | null = null;
  try {
    prisma = getPrisma();
    cleaner = await prisma.cleaner.findFirst({
      where: { id, landlord_id: session.user.id },
    });
  } finally {
    if (prisma) await prisma.$disconnect();
  }

  if (!cleaner) {
    redirect("/dashboard/cleaners");
  }

  const botUsername = process.env.TELEGRAM_BOT_USERNAME;

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <DashboardHeader userEmail={session.user.email ?? ""} />
      <main className="mt-8 max-w-lg">
        <h2 className="text-lg font-semibold text-zinc-900">Edit cleaner</h2>
        <CleanerTelegramLink
          botUsername={botUsername}
          cleanerId={cleaner.id}
          currentChatId={cleaner.telegram_chat_id}
        />
        <CleanerForm
          action="edit"
          id={cleaner.id}
          initialName={cleaner.name}
          initialTelegramChatId={cleaner.telegram_chat_id ?? ""}
          initialNotes={cleaner.notes ?? ""}
          initialIsActive={cleaner.is_active}
        />
      </main>
    </div>
  );
}
