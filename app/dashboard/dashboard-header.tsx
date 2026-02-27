import Link from "next/link";

export function DashboardHeader({ userEmail }: { userEmail: string }) {
  return (
    <header className="flex items-center justify-between border-b border-zinc-200 pb-4">
      <h1 className="text-xl font-semibold text-zinc-900">
        <Link href="/dashboard" className="hover:underline">Dashboard</Link>
      </h1>
      <div className="flex items-center gap-4">
        <span className="text-sm text-zinc-600">{userEmail}</span>
        <Link
          href="/api/auth/signout?callbackUrl=/"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Sign out
        </Link>
      </div>
    </header>
  );
}
