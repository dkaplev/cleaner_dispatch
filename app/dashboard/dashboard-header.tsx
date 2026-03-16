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
          href="/signout"
          className="rounded-lg border border-[#e3dcd1] bg-white px-3 py-1.5 text-sm font-medium text-[#3c3732] hover:bg-[#f7f3ec] transition-colors"
        >
          Sign out
        </Link>
      </div>
    </header>
  );
}
