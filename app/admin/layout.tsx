import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  return (
    <div className="min-h-screen bg-[#f4f2ef] text-[#3f3a35]">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-[#ddd6cb] bg-[#f4f2ef]/95 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-3 md:px-8">
          <div className="flex items-center gap-6">
            <span className="text-xs font-bold tracking-[0.18em] uppercase text-[#4b443e]">
              Admin
            </span>
            <nav className="flex items-center gap-1">
              {[
                { href: "/admin",              label: "Overview" },
                { href: "/admin/landlords",    label: "Landlords" },
                { href: "/admin/feedback",     label: "Feedback" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-lg px-3 py-1.5 text-sm text-[#5a524c] transition hover:bg-[#ede8e1] hover:text-[#3c3732]"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#9a9089]">{admin.email}</span>
            <Link
              href="/dashboard"
              className="rounded-full border border-[#d6cfc4] bg-white px-3 py-1.5 text-xs font-medium text-[#4f4842] hover:bg-[#f1ece4] transition"
            >
              ← Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-6 py-8 md:px-8">
        {children}
      </main>
    </div>
  );
}
