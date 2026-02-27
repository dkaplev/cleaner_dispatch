import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { DashboardHeader } from "./dashboard-header";
import { TelegramTest } from "./telegram-test";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <DashboardHeader userEmail={session.user.email ?? ""} />
      <main className="mt-8">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-medium text-zinc-900">Welcome</h2>
          <p className="mt-2 text-zinc-600">
            You’re signed in as <strong>{session.user.email}</strong>. This is your protected dashboard.
          </p>
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
              <span className="text-zinc-500 text-sm ml-2">— Assign to a cleaner or create a job to find someone</span>
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
