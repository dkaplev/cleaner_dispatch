"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

type Job = {
  id: string;
  status: string;
  window_start: string;
  window_end: string;
  property: { name: string; address: string | null };
};

type PortalData = {
  id: string;
  name: string;
  referral_code: string | null;
  referral_link: string | null;
  referral_count: number;
  estimated_earnings: number;
  jobs_completed: number;
  upcoming_jobs: Job[];
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      onClick={copy}
      className="rounded-lg border border-[#e3dcd1] bg-white px-3 py-1.5 text-xs font-medium text-[#3c3732] hover:bg-[#f7f3ec] transition-colors shrink-0"
    >
      {copied ? "✓ Copied!" : "Copy link"}
    </button>
  );
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short",
  });
}
function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function CleanerPortalContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [data, setData]       = useState<PortalData | null>(null);
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setError("No access token. Please use the link from your Telegram."); setLoading(false); return; }
    fetch(`/api/cleaner-portal?token=${encodeURIComponent(token)}`)
      .then((r) => r.ok ? r.json() : r.json().then((e: { error?: string }) => { throw new Error(e.error ?? "Error"); }))
      .then((d: PortalData) => setData(d))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f7f3ec]">
        <p className="text-sm text-[#9a9089]">Loading…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f7f3ec] p-6">
        <div className="w-full max-w-sm rounded-2xl border border-[#e3dcd1] bg-white p-8 text-center">
          <p className="text-2xl">🔒</p>
          <h1 className="mt-3 text-base font-semibold text-[#1a1510]">Link invalid or expired</h1>
          <p className="mt-2 text-sm text-[#6a625c]">{error || "Please use the link sent to you in Telegram to access your portal."}</p>
        </div>
      </div>
    );
  }

  const whatsappText = encodeURIComponent(
    `Hey! I use Cleaner Dispatch to manage my cleaning jobs — it automatically sends me job offers on Telegram and I just tap Accept. Works great. If you manage short-term rentals, check it out: ${data.referral_link}`
  );
  const whatsappUrl = `https://wa.me/?text=${whatsappText}`;
  const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(data.referral_link ?? "")}&text=${encodeURIComponent("Cleaner Dispatch — get your cleaning jobs automatically, no WhatsApp chasing. 1 month free:")}`;

  return (
    <div className="min-h-screen bg-[#f7f3ec]">
      {/* Header */}
      <header className="border-b border-[#e3dcd1] bg-white px-6 py-4">
        <div className="mx-auto max-w-md flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.15em] uppercase text-[#9a9089]">Cleaner Dispatch</p>
            <h1 className="text-base font-semibold text-[#1a1510]">Hi, {data.name.split(" ")[0]} 👋</h1>
          </div>
          <div className="rounded-full bg-[#1a1510] h-10 w-10 flex items-center justify-center text-white text-sm font-bold">
            {data.name.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-6 py-6 space-y-5">

        {/* ── Referral card — hero section ── */}
        <div className="rounded-2xl border border-[#f5e0a0] bg-[#fef9ee] p-5">
          <p className="text-xs font-medium uppercase tracking-[0.13em] text-[#9a7a3a]">Earn €20 per referral</p>
          <h2 className="mt-1 text-lg font-semibold text-[#1a1510]">Invite landlords. Get paid.</h2>
          <p className="mt-1.5 text-sm text-[#5a4a2a]">
            Share your personal link with landlords you clean for. When they sign up, they get 1 month free — and you earn €20.
          </p>

          {data.referral_link ? (
            <>
              {/* Link display */}
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#e8d0a0] bg-white px-3 py-2.5">
                <span className="flex-1 truncate text-xs font-mono text-[#3c3732]">{data.referral_link}</span>
                <CopyButton text={data.referral_link} />
              </div>

              {/* Share buttons */}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1ebe5d] transition-colors"
                >
                  <span>💬</span> Share on WhatsApp
                </a>
                <a
                  href={telegramShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#229ED9] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1a8bbf] transition-colors"
                >
                  <span>✈️</span> Share on Telegram
                </a>
              </div>

              {/* Referral stats */}
              <div className="mt-4 grid grid-cols-3 divide-x divide-[#e8d0a0] rounded-xl border border-[#e8d0a0] bg-white">
                {[
                  { label: "Landlords invited", value: data.referral_count },
                  { label: "Earned", value: `€${data.estimated_earnings}` },
                  { label: "Jobs done", value: data.jobs_completed },
                ].map((s) => (
                  <div key={s.label} className="flex flex-col items-center py-3 px-2">
                    <p className="text-xl font-bold text-[#1a1510]">{s.value}</p>
                    <p className="mt-0.5 text-center text-[10px] text-[#9a7a3a] leading-tight">{s.label}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-[#9a7a3a]">Your referral link is being generated. Check back shortly.</p>
          )}
        </div>

        {/* ── How it works ── */}
        <div className="rounded-2xl border border-[#e3dcd1] bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-[0.13em] text-[#6a625c]">How it works</p>
          <div className="mt-3 space-y-3">
            {[
              { n: "1", text: "Copy your link and send it to a landlord you clean for." },
              { n: "2", text: "They sign up — their first month is free." },
              { n: "3", text: "You earn €20, paid when they start their subscription." },
            ].map((s) => (
              <div key={s.n} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1a1510] text-[10px] font-bold text-white">
                  {s.n}
                </span>
                <p className="text-sm text-[#3c3732]">{s.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Upcoming jobs ── */}
        {data.upcoming_jobs.length > 0 && (
          <div className="rounded-2xl border border-[#e3dcd1] bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-[0.13em] text-[#6a625c]">Your upcoming jobs</p>
            <div className="mt-3 space-y-3">
              {data.upcoming_jobs.map((job) => (
                <div key={job.id} className="rounded-xl border border-[#e3dcd1] px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-[#1a1510]">{job.property.name}</p>
                      {job.property.address && (
                        <p className="text-xs text-[#9a9089]">{job.property.address}</p>
                      )}
                      <p className="mt-1 text-xs text-[#6a625c]">
                        {fmt(job.window_start)} · {fmtTime(job.window_start)}–{fmtTime(job.window_end)}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      job.status === "accepted"    ? "bg-blue-50 text-blue-700"  :
                      job.status === "in_progress" ? "bg-green-50 text-green-700" :
                      "bg-[#f5f0e8] text-[#6a625c]"
                    }`}>
                      {job.status === "accepted" ? "Accepted" : job.status === "in_progress" ? "In progress" : job.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="pb-4 text-center text-xs text-[#9a9089]">
          Access this page from your Telegram link · Cleaner Dispatch
        </p>
      </main>
    </div>
  );
}

export default function CleanerPortalPage() {
  return (
    <Suspense>
      <CleanerPortalContent />
    </Suspense>
  );
}
