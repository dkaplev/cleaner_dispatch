"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function SignupForm() {
  const searchParams = useSearchParams();
  const refCode      = searchParams.get("ref") ?? "";

  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [error, setError]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [referrerName, setReferrerName] = useState<string | null>(null);
  const router = useRouter();

  // Pre-fetch referrer name so we can show "Invited by Anna" banner
  useEffect(() => {
    if (!refCode) return;
    fetch(`/api/cleaner-portal/referrer?code=${encodeURIComponent(refCode)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.name) setReferrerName(d.name); })
      .catch(() => null);
  }, [refCode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          ...(refCode ? { referralCode: refCode } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Sign up failed");
        return;
      }
      router.push("/login?registered=1&callbackUrl=/onboarding");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#f7f3ec]">
      <div className="w-full max-w-sm rounded-2xl border border-[#e3dcd1] bg-white px-8 py-10 shadow-sm">

        <div className="mb-6 text-center">
          <a href="/" className="text-xs font-semibold tracking-[0.18em] uppercase text-[#6a625c]">
            Cleaner Dispatch
          </a>
          <h1 className="mt-3 text-xl font-semibold text-[#1a1510]">Create account</h1>
          <p className="mt-1 text-sm text-[#9a9089]">Start automating your cleaning jobs</p>
        </div>

        {/* Referral banner */}
        {refCode && (
          <div className="mb-5 rounded-xl border border-[#f5e0a0] bg-[#fef9ee] px-4 py-3">
            <p className="text-sm font-medium text-[#7a5c1e]">
              🎉 {referrerName ? `${referrerName} invited you` : "You were invited by a cleaner"} — get your first month free!
            </p>
            <p className="mt-0.5 text-xs text-[#9a7a3a]">The referral will be applied automatically when you sign up.</p>
          </div>
        )}

        {error && (
          <p className="mb-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#3c3732]">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 block w-full rounded-xl border border-[#e3dcd1] px-3.5 py-2.5 text-[#1a1510] shadow-sm focus:border-[#1a1510] focus:outline-none focus:ring-1 focus:ring-[#1a1510]"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#3c3732]">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 block w-full rounded-xl border border-[#e3dcd1] px-3.5 py-2.5 text-[#1a1510] shadow-sm focus:border-[#1a1510] focus:outline-none focus:ring-1 focus:ring-[#1a1510]"
            />
            <p className="mt-1 text-xs text-[#9a9089]">At least 8 characters</p>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[#1a1510] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#2e2822] transition-colors disabled:opacity-50"
          >
            {loading ? "Creating account…" : "Create free account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#9a9089]">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-[#1a1510] underline hover:no-underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
