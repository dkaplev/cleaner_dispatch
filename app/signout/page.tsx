import Link from "next/link";
import { signOut } from "@/auth";

export default function SignOutPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f3ec]">
      <div className="w-full max-w-sm rounded-2xl border border-[#e3dcd1] bg-white px-8 py-10 shadow-sm text-center">
        <div className="mb-1 flex justify-center">
          <span className="text-3xl">🔑</span>
        </div>
        <h1 className="mt-3 text-xl font-semibold text-[#1a1510]">Sign out</h1>
        <p className="mt-2 text-sm text-[#6a625c]">
          Are you sure you want to sign out of your account?
        </p>

        <form
          className="mt-7 space-y-3"
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="w-full rounded-full bg-[#1a1510] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#2e2822] transition-colors"
          >
            Yes, sign me out
          </button>
        </form>

        <Link
          href="/dashboard"
          className="mt-4 block text-sm text-[#9a9089] hover:text-[#3c3732] transition-colors"
        >
          ← Back to dashboard
        </Link>
      </div>
    </div>
  );
}
