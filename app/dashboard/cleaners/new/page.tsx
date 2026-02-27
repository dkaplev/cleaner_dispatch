import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { DashboardHeader } from "../../dashboard-header";
import { CleanerForm } from "../cleaner-form";
import { CleanerTelegramLink } from "../cleaner-telegram-link";

export default async function NewCleanerPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const botUsername = process.env.TELEGRAM_BOT_USERNAME;

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <DashboardHeader userEmail={session.user.email ?? ""} />
      <main className="mt-8 max-w-lg">
        <h2 className="text-lg font-semibold text-zinc-900">Add cleaner</h2>
        <CleanerTelegramLink
          botUsername={botUsername}
          cleanerId={null}
          currentChatId={null}
        />
        <CleanerForm action="create" />
      </main>
    </div>
  );
}
