import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getPrisma } from "@/lib/prisma";
import { DashboardHeader } from "./dashboard-header";
import { LandlordTelegramLink } from "./landlord-telegram-link";
import { TelegramTest } from "./telegram-test";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  let telegramChatId: string | null = null;
  try {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, telegram_chat_id: true },
    });
    telegramChatId = user?.telegram_chat_id ?? null;
  } catch {
    // ignore
  }

  const botUsername = process.env.TELEGRAM_BOT_USERNAME?.trim();
  const landlordLink =
    botUsername && session.user.id
      ? `https://t.me/${botUsername.replace(/^@/, "")}?start=landlord_${session.user.id}`
      : null;

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <DashboardHeader userEmail={session.user.email ?? ""} />
      <main className="mt-8">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-medium text-zinc-900">Welcome</h2>
          <p className="mt-2 text-zinc-600">
            You’re signed in as <strong>{session.user.email}</strong>. This is your protected dashboard.
          </p>
          <LandlordTelegramLink
            botUsername={botUsername ?? undefined}
            landlordLink={landlordLink}
            isLinked={!!telegramChatId}
          />
          <ul className="mt-6 space-y-2">
            <li>
              <Link
                href="/dashboard/properties"
                className="text-zinc-700 underline hover:no-underline font-medium"
              >
                Properties
              </Link>
              <span className="text-zinc-500 text-sm ml-2">— Add and manage properties</span>
            </li>
            <li>
              <Link
                href="/dashboard/cleaners"
                className="text-zinc-700 underline hover:no-underline font-medium"
              >
                Cleaners
              </Link>
              <span className="text-zinc-500 text-sm ml-2">— Add and manage cleaners</span>
            </li>
            <li>
              <Link
                href="/dashboard/cleanings"
                className="text-zinc-700 underline hover:no-underline font-medium"
              >
                Dispatch
              </Link>
              <span className="text-zinc-500 text-sm ml-2">— Assign jobs (choose cleaner or use fallback); cleaner gets Accept/Decline and photo upload in Telegram</span>
            </li>
          </ul>
          <TelegramTest />
          <p className="mt-6 text-sm text-zinc-500">
            <Link href="/" className="text-zinc-700 underline hover:no-underline">Back to home</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
