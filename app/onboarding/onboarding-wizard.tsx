"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Cleaner = { id: string; name: string };

type Props = {
  initialStep: number;
  userId: string;
  botUsername: string;
  ingestCentralEmail: string;
  ingestToken: string;
  firstPropertyId: string | null;
  firstPropertyName: string | null;
  firstCleanerId: string | null;
  firstCleanerName: string | null;
  telegramLinked: boolean;
};

const TOTAL_STEPS = 5;

// ── Design tokens (matching landing page) ────────────────────────────────────
const btn =
  "rounded-full bg-[#4b443e] px-5 py-2.5 text-sm font-medium text-[#f8f6f1] transition hover:bg-[#3f3934] disabled:opacity-40";
const btnSecondary =
  "rounded-full border border-[#d6cfc4] bg-[#f9f6f0] px-5 py-2.5 text-sm font-medium text-[#4f4842] transition hover:bg-[#f1ece4]";
const inputCls =
  "mt-1.5 block w-full rounded-xl border border-[#ddd6cb] bg-[#fdfcf9] px-4 py-2.5 text-sm text-[#3f3a35] shadow-sm placeholder:text-[#b0a89f] focus:border-[#9a9089] focus:outline-none focus:ring-1 focus:ring-[#9a9089]";
const labelCls = "block text-sm font-medium text-[#4a443e]";
const errorCls = "rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700";

// ── Step indicator ────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1.5 mb-8">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <div key={n} className="flex items-center gap-1.5">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition
                ${done
                  ? "bg-[#4b443e] text-[#f8f6f1]"
                  : active
                  ? "bg-[#4b443e] text-[#f8f6f1] ring-2 ring-[#4b443e] ring-offset-2 ring-offset-[#f8f6f2]"
                  : "bg-[#ece5dc] text-[#6a625c]"
                }`}
            >
              {done ? "✓" : n}
            </div>
            {i < TOTAL_STEPS - 1 && (
              <div className={`h-px w-6 ${done ? "bg-[#4b443e]" : "bg-[#ddd6cb]"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Step 1: Add property ──────────────────────────────────────────────────────

function Step1({
  onDone,
  existingId,
  existingName,
}: {
  onDone: (id: string, name: string) => void;
  existingId: string | null;
  existingName: string | null;
}) {
  const [name, setName] = useState("");
  const [checkoutTime, setCheckoutTime] = useState("11:00");
  const [duration, setDuration] = useState("120");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          checkout_time_default: `2000-01-01T${checkoutTime}:00`,
          cleaning_duration_minutes: parseInt(duration, 10) || 120,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to save"); return; }
      onDone(data.id, data.name);
    } finally {
      setSaving(false);
    }
  }

  if (existingId) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl border border-[#ddd6cb] bg-[#f5f1ea] px-4 py-3">
          <span className="text-[#4b443e]">✓</span>
          <span className="text-sm text-[#4a443e]"><strong>{existingName}</strong> is already set up.</span>
        </div>
        <button onClick={() => onDone(existingId, existingName ?? "")} className={btn}>
          Continue →
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <p className={errorCls}>{error}</p>}
      <div>
        <label className={labelCls}>Property name *</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Sea View Apartment, Limassol"
          className={inputCls}
        />
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className={labelCls}>Default checkout time</label>
          <input
            type="time"
            value={checkoutTime}
            onChange={(e) => setCheckoutTime(e.target.value)}
            className={inputCls}
          />
        </div>
        <div className="flex-1">
          <label className={labelCls}>Cleaning duration (min)</label>
          <input
            type="number"
            min={30}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>
      <p className="text-xs text-[#7d7570]">More settings (channel names, instructions) available later in Properties.</p>
      <button type="submit" disabled={saving} className={btn}>
        {saving ? "Saving…" : "Save & continue →"}
      </button>
    </form>
  );
}

// ── Step 2: Add cleaner ───────────────────────────────────────────────────────

function Step2({
  onDone,
  existingId,
  existingName,
  botUsername,
}: {
  onDone: (id: string, name: string) => void;
  existingId: string | null;
  existingName: string | null;
  botUsername: string;
}) {
  const [phase, setPhase] = useState<"form" | "share">(existingId ? "share" : "form");
  const [cleanerName, setCleanerName] = useState("");
  const [newId, setNewId] = useState(existingId ?? "");
  const [savedName, setSavedName] = useState(existingName ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const telegramLink = newId
    ? `https://t.me/${botUsername.replace(/^@/, "")}?start=cleaner_${newId}`
    : "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/cleaners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanerName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed"); return; }
      setNewId(data.id);
      setSavedName(cleanerName.trim());
      setPhase("share");
    } finally {
      setSaving(false);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(telegramLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (phase === "share") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-[#5d554f]">
          Share this link with <strong>{savedName}</strong>. They tap it once in Telegram and they&apos;re connected — ready to receive job offers.
        </p>
        <div className="flex items-center gap-2 rounded-xl border border-[#ddd6cb] bg-[#f5f1ea] px-4 py-3">
          <code className="flex-1 break-all text-xs text-[#4a443e]">{telegramLink}</code>
          <button
            onClick={copyLink}
            className="shrink-0 rounded-lg bg-[#ece5dc] px-3 py-1.5 text-xs font-medium text-[#4b443e] hover:bg-[#e3dbd0] transition"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <p className="text-xs text-[#7d7570]">You can find this link again in Cleaners → Edit cleaner.</p>
        <button onClick={() => onDone(newId, savedName)} className={btn}>
          Continue →
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <p className={errorCls}>{error}</p>}
      <div>
        <label className={labelCls}>Cleaner name *</label>
        <input
          required
          value={cleanerName}
          onChange={(e) => setCleanerName(e.target.value)}
          placeholder="e.g. Anna K."
          className={inputCls}
        />
      </div>
      <p className="text-xs text-[#7d7570]">After saving you&apos;ll get a Telegram link to share with them.</p>
      <button type="submit" disabled={saving} className={btn}>
        {saving ? "Saving…" : "Save & get link →"}
      </button>
    </form>
  );
}

// ── Step 3: Assign cleaner to property ───────────────────────────────────────

function Step3({
  propertyId,
  propertyName,
  onDone,
  alreadyAssigned,
}: {
  propertyId: string;
  propertyName: string;
  onDone: () => void;
  alreadyAssigned: boolean;
}) {
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/cleaners")
      .then((r) => r.json())
      .then((data: Cleaner[]) => {
        setCleaners(data);
        if (data.length > 0) setSelectedId(data[0].id);
      });
  }, []);

  if (alreadyAssigned) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl border border-[#ddd6cb] bg-[#f5f1ea] px-4 py-3">
          <span className="text-[#4b443e]">✓</span>
          <span className="text-sm text-[#4a443e]">A cleaner is already assigned to this property.</span>
        </div>
        <button onClick={onDone} className={btn}>Continue →</button>
      </div>
    );
  }

  async function assign() {
    if (!selectedId) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/properties/${propertyId}/cleaners`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cleaner_id: selectedId, is_primary: true }),
      });
      if (!res.ok) { setError((await res.json()).error || "Failed"); return; }
      onDone();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && <p className={errorCls}>{error}</p>}
      <p className="text-sm text-[#5d554f]">
        Who should handle cleanings at <strong>{propertyName}</strong>?
      </p>
      {cleaners.length === 0 ? (
        <p className="text-sm text-[#9a7c5f]">Loading cleaners…</p>
      ) : (
        <>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className={inputCls}
          >
            {cleaners.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <p className="text-xs text-[#7d7570]">You can add fallback cleaners and adjust priority in Properties → Edit later.</p>
          <button onClick={assign} disabled={saving || !selectedId} className={btn}>
            {saving ? "Assigning…" : "Assign & continue →"}
          </button>
        </>
      )}
    </div>
  );
}

// ── Step 4: Link landlord Telegram ───────────────────────────────────────────

function Step4({
  userId,
  botUsername,
  isLinked,
  onDone,
}: {
  userId: string;
  botUsername: string;
  isLinked: boolean;
  onDone: () => void;
}) {
  const link = `https://t.me/${botUsername.replace(/^@/, "")}?start=landlord_${userId}`;
  const [linked, setLinked] = useState(isLinked);

  function markLinked() { setLinked(true); }

  if (linked) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl border border-[#ddd6cb] bg-[#f5f1ea] px-4 py-3">
          <span className="text-[#4b443e]">✓</span>
          <span className="text-sm text-[#4a443e]">Telegram linked — you&apos;ll get instant booking alerts.</span>
        </div>
        <button onClick={onDone} className={btn}>Continue →</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#5d554f] leading-relaxed">
        Get an instant message when a new booking arrives, or when your cleaner accepts or declines a job. No need to check the app.
      </p>
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full bg-[#2AABEE] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#1d96d6]"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.17 13.238l-2.965-.924c-.644-.204-.657-.644.136-.953l11.57-4.461c.537-.194 1.006.131.983.321z"/></svg>
        Open Telegram to link
      </a>
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={markLinked} className={btnSecondary}>
          I&apos;ve linked it ✓
        </button>
        <button onClick={onDone} className="text-sm text-[#7d7570] underline decoration-[#c5bdb4] hover:text-[#4a443e] transition">
          Skip for now
        </button>
      </div>
    </div>
  );
}

// ── Step 5: Email forwarding ──────────────────────────────────────────────────

function Step5({
  ingestCentralEmail,
  ingestToken,
  onDone,
}: {
  ingestCentralEmail: string;
  ingestToken: string;
  onDone: () => void;
}) {
  const forwardingAddress = ingestCentralEmail
    ? `${ingestCentralEmail.replace("@", `+${ingestToken}@`)}`
    : null;
  const [copied, setCopied] = useState(false);

  function copy() {
    if (forwardingAddress) {
      navigator.clipboard.writeText(forwardingAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#5d554f] leading-relaxed">
        Forward booking confirmation emails from Airbnb, Booking.com, or Vrbo to this address — jobs are created automatically, no copy-paste needed.
      </p>
      {forwardingAddress ? (
        <div className="flex items-center gap-2 rounded-xl border border-[#ddd6cb] bg-[#f5f1ea] px-4 py-3">
          <code className="flex-1 break-all text-xs text-[#4a443e]">{forwardingAddress}</code>
          <button
            onClick={copy}
            className="shrink-0 rounded-lg bg-[#ece5dc] px-3 py-1.5 text-xs font-medium text-[#4b443e] hover:bg-[#e3dbd0] transition"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      ) : (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Email forwarding address is not available yet — ask your admin to set <code>INGEST_CENTRAL_EMAIL</code>.
        </p>
      )}
      <p className="text-xs text-[#7d7570]">
        Full setup guide (Gmail filter + n8n workflow) in{" "}
        <Link href="/dashboard/integrations" className="underline decoration-[#c5bdb4] hover:text-[#4a443e]">
          Dashboard → Integrations
        </Link>.
      </p>
      <button onClick={onDone} className={btn}>
        Done — go to dashboard →
      </button>
    </div>
  );
}

// ── Main wizard ───────────────────────────────────────────────────────────────

const STEPS = [
  {
    title: "Add your first property",
    subtitle: "Where cleanings happen.",
  },
  {
    title: "Add your first cleaner",
    subtitle: "Who does the cleaning.",
  },
  {
    title: "Assign cleaner to property",
    subtitle: "Connect the two so dispatch works automatically.",
  },
  {
    title: "Get Telegram notifications",
    subtitle: "Stay in the loop without opening the app.",
  },
  {
    title: "Set up email forwarding",
    subtitle: "Optional — jobs can also be created manually.",
  },
];

export function OnboardingWizard(props: Props) {
  const [step, setStep] = useState(props.initialStep);
  const [propertyId, setPropertyId] = useState(props.firstPropertyId);
  const [propertyName, setPropertyName] = useState(props.firstPropertyName ?? "");
  const [cleanerId, setCleanerId] = useState(props.firstCleanerId);
  const [propertyCleanerDone, setPropertyCleanerDone] = useState(
    props.initialStep > 3
  );

  function next() {
    if (step < TOTAL_STEPS) setStep(step + 1);
    else window.location.href = "/dashboard";
  }

  if (step > TOTAL_STEPS) {
    window.location.href = "/dashboard";
    return null;
  }

  const { title, subtitle } = STEPS[step - 1];

  return (
    <div className="min-h-screen bg-[#f8f6f2] text-[#3f3a35]">
      {/* Minimal top bar matching the landing page header */}
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-5">
        <span className="text-sm font-semibold tracking-[0.18em] uppercase text-[#4f4842]">
          Cleaner Dispatch
        </span>
        <Link
          href="/dashboard"
          className="rounded-full px-4 py-2 text-sm font-medium text-[#7d7570] transition hover:bg-[#ede8e1]"
        >
          Skip setup
        </Link>
      </header>

      <main className="mx-auto w-full max-w-3xl px-6 pb-16">
        {/* Intro copy shown only on the very first step */}
        {step === 1 && (
          <section className="mb-8 rounded-3xl border border-[#e5dfd4] bg-[#fdfcf9] px-6 py-8 md:px-10">
            <p className="mb-3 inline-block rounded-full border border-[#e4ddd3] bg-[#f5f1ea] px-4 py-1 text-xs font-medium tracking-[0.15em] uppercase text-[#5f5751]">
              Welcome
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-[#3c3732] md:text-3xl">
              Let&apos;s get you set up.
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[#5d554f]">
              A few quick steps and you&apos;ll be ready to dispatch cleaners automatically from email confirmations.
            </p>
          </section>
        )}

        {/* Step card */}
        <div className="rounded-3xl border border-[#e5dfd4] bg-[#fdfcf9] px-6 py-8 shadow-sm md:px-10">
          <StepIndicator current={step} />

          <p className="text-xs font-medium tracking-[0.13em] uppercase text-[#6a625c]">
            Step {step} of {TOTAL_STEPS}
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-[#3c3732] md:text-2xl">
            {title}
          </h2>
          <p className="mt-1 text-sm text-[#6a625c]">{subtitle}</p>

          <div className="mt-7">
            {step === 1 && (
              <Step1
                existingId={propertyId}
                existingName={propertyName || null}
                onDone={(id, name) => {
                  setPropertyId(id);
                  if (name) setPropertyName(name);
                  next();
                }}
              />
            )}
            {step === 2 && (
              <Step2
                existingId={cleanerId}
                existingName={props.firstCleanerName}
                botUsername={props.botUsername}
                onDone={(id, name) => {
                  setCleanerId(id);
                  void name;
                  next();
                }}
              />
            )}
            {step === 3 && propertyId && (
              <Step3
                propertyId={propertyId}
                propertyName={propertyName}
                alreadyAssigned={propertyCleanerDone}
                onDone={() => {
                  setPropertyCleanerDone(true);
                  next();
                }}
              />
            )}
            {step === 4 && (
              <Step4
                userId={props.userId}
                botUsername={props.botUsername}
                isLinked={props.telegramLinked}
                onDone={next}
              />
            )}
            {step === 5 && (
              <Step5
                ingestCentralEmail={props.ingestCentralEmail}
                ingestToken={props.ingestToken}
                onDone={() => (window.location.href = "/dashboard")}
              />
            )}
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-[#9a9089]">
          You can always come back to finish setup from your dashboard.
        </p>
      </main>
    </div>
  );
}
