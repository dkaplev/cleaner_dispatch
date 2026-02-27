import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import Link from "next/link";
import { DashboardHeader } from "../dashboard-header";
import { CleanerList } from "./cleaner-list";

export default async function CleanersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  let cleaners: {
    id: string;
    name: string;
    telegram_chat_id: string | null;
    notes: string | null;
    is_active: boolean;
  }[] = [];
  let prisma;
  try {
    prisma = getPrisma();
    cleaners = await prisma.cleaner.findMany({
      where: { landlord_id: session.user.id },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        telegram_chat_id: true,
        notes: true,
        is_active: true,
      },
    });
  } finally {
    if (prisma) await prisma.$disconnect();
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <DashboardHeader userEmail={session.user.email ?? ""} />
      <main className="mt-8">
        <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
          <h2 className="text-lg font-semibold text-zinc-900">Cleaners</h2>
          <Link
            href="/dashboard/cleaners/new"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Add cleaner
          </Link>
        </div>
        <CleanerList initialCleaners={cleaners} />
        <p className="mt-4 text-sm text-zinc-500">
          <Link href="/dashboard" className="text-zinc-700 underline hover:no-underline">
            Back to dashboard
          </Link>
        </p>
      </main>
    </div>
  );
}
