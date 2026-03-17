"use client";

import { useEffect, useState } from "react";

type ReferralRow = {
  userId:        string;
  landlordEmail: string;
  signedUpAt:    string;
  cleanerId:     string | null;
  cleanerName:   string | null;
  portalUrl:     string | null;
  paidAt:        string | null;
};

type CleanerRow = {
  id:          string;
  name:        string;
  portalUrl:   string;
  totalSignups: number;
  paidSignups:  number;
};

export default function AdminReferralsPage() {
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [cleaners,  setCleaners]  = useState<CleanerRow[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [approving, setApproving] = useState<string | null>(null);
  const [flash,     setFlash]     = useState<{ userId: string; msg: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/referrals")
      .then((r) => r.json())
      .then((d) => {
        setReferrals(d.referrals ?? []);
        setCleaners(d.cleaners ?? []);
      })
      .catch(() => setError("Failed to load referrals"))
      .finally(() => setLoading(false));
  }, []);

  async function approvePayout(userId: string) {
    setApproving(userId);
    try {
      const res = await fetch(`/api/admin/referrals/${userId}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setFlash({ userId, msg: data.error ?? "Error" });
      } else {
        setReferrals((prev) =>
          prev.map((r) => r.userId === userId ? { ...r, paidAt: new Date().toISOString() } : r)
        );
        setFlash({ userId, msg: "✓ Payout approved — Telegram sent to cleaner" });
      }
    } finally {
      setApproving(null);
      setTimeout(() => setFlash(null), 4000);
    }
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  const pending  = referrals.filter((r) => !r.paidAt);
  const approved = referrals.filter((r) =>  r.paidAt);
  const totalEarned = approved.length * 20;

  if (loading) return <p className="text-sm text-[#9a9089] py-12 text-center">Loading…</p>;
  if (error)   return <p className="text-sm text-red-600 py-12 text-center">{error}</p>;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-[#3c3732]">Referral Payouts</h1>
        <p className="mt-1 text-sm text-[#7d7570]">
          Approve payouts once a landlord has paid their first month. The cleaner gets a Telegram message to arrange cash pickup.
        </p>
      </div>

      {/* ── Summary ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total referral signups",  value: referrals.length },
          { label: "Awaiting payout",         value: pending.length },
          { label: "Payouts approved",        value: approved.length },
          { label: "Total paid out",          value: `€${totalEarned}` },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-[#ddd6cb] bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#6a625c]">{s.label}</p>
            <p className="mt-2 text-3xl font-bold text-[#3c3732]">{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Cleaner portal links (for testing) ── */}
      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.13em] text-[#6a625c]">
          Cleaner portals — open to test
        </h2>
        {cleaners.length === 0 ? (
          <p className="text-sm text-[#9a9089]">No cleaners with referral codes yet.</p>
        ) : (
          <div className="rounded-2xl border border-[#ddd6cb] bg-white divide-y divide-[#f0ebe3] overflow-hidden">
            {cleaners.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-5 py-3.5 gap-4">
                <div>
                  <p className="text-sm font-medium text-[#1a1510]">{c.name}</p>
                  <p className="text-xs text-[#9a9089]">
                    {c.totalSignups} signup{c.totalSignups !== 1 ? "s" : ""} · {c.paidSignups} paid
                  </p>
                </div>
                <a
                  href={c.portalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-[#e3dcd1] px-3.5 py-1.5 text-xs font-medium text-[#3c3732] hover:bg-[#f5f0e8] transition-colors shrink-0"
                >
                  Open portal →
                </a>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Pending payouts ── */}
      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.13em] text-[#6a625c]">
          Awaiting payout ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-[#9a9089]">No pending payouts.</p>
        ) : (
          <div className="rounded-2xl border border-[#ddd6cb] bg-white divide-y divide-[#f0ebe3] overflow-hidden">
            {pending.map((r) => (
              <div key={r.userId} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-sm font-medium text-[#1a1510]">{r.landlordEmail}</p>
                    <p className="text-xs text-[#9a9089]">
                      Signed up {fmt(r.signedUpAt)}
                      {r.cleanerName && <> · Referred by <span className="font-medium text-[#3c3732]">{r.cleanerName}</span></>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {flash?.userId === r.userId && (
                      <span className="text-xs text-emerald-600">{flash.msg}</span>
                    )}
                    <button
                      onClick={() => approvePayout(r.userId)}
                      disabled={approving === r.userId}
                      className="rounded-full bg-[#1a1510] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#2e2822] transition-colors disabled:opacity-50"
                    >
                      {approving === r.userId ? "Approving…" : "Approve €20 payout"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Approved payouts ── */}
      {approved.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.13em] text-[#6a625c]">
            Approved ({approved.length})
          </h2>
          <div className="rounded-2xl border border-[#ddd6cb] bg-white divide-y divide-[#f0ebe3] overflow-hidden">
            {approved.map((r) => (
              <div key={r.userId} className="flex items-center justify-between px-5 py-3.5 gap-4">
                <div>
                  <p className="text-sm font-medium text-[#1a1510]">{r.landlordEmail}</p>
                  <p className="text-xs text-[#9a9089]">
                    Signed up {fmt(r.signedUpAt)}
                    {r.cleanerName && <> · <span className="font-medium text-[#3c3732]">{r.cleanerName}</span></>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#9a9089]">Paid {fmt(r.paidAt!)}</span>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">€20 paid</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
