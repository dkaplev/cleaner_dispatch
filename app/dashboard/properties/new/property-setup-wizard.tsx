"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Cleaner = { id: string; name: string; telegram_chat_id: string | null };

const PLATFORMS = [
  { value: "airbnb",       label: "Airbnb" },
  { value: "booking_com",  label: "Booking.com" },
  { value: "vrbo",         label: "Vrbo / HomeAway" },
  { value: "expedia",      label: "Expedia" },
  { value: "tripadvisor",  label: "TripAdvisor / Holidu" },
  { value: "hometogo",     label: "HomeToGo" },
  { value: "direct",       label: "Direct / own website" },
  { value: "other",        label: "Other platform" },
];

// ── Step indicator ────────────────────────────────────────────────────────────
function StepBar({ current }: { current: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: "Property details" },
    { n: 2, label: "Assign cleaner" },
    { n: 3, label: "Calendar feed" },
  ];
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((s, i) => {
        const done    = s.n < current;
        const active  = s.n === current;
        return (
          <div key={s.n} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1 min-w-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                done   ? "bg-[#1a1510] text-white" :
                active ? "bg-[#c45c0f] text-white" :
                         "bg-[#e3dcd1] text-[#9a9089]"
              }`}>
                {done ? "✓" : s.n}
              </div>
              <span className={`text-[10px] text-center leading-tight whitespace-nowrap ${
                active ? "text-[#c45c0f] font-semibold" :
                done   ? "text-[#1a1510]" :
                         "text-[#9a9089]"
              }`}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-px flex-1 mx-2 mt-[-10px] ${done ? "bg-[#1a1510]" : "bg-[#e3dcd1]"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Shared field styles ───────────────────────────────────────────────────────
const inputCls = "mt-1.5 block w-full rounded-xl border border-[#e3dcd1] px-3.5 py-2.5 text-[#1a1510] bg-white shadow-sm focus:border-[#1a1510] focus:outline-none focus:ring-1 focus:ring-[#1a1510] text-sm";
const labelCls = "block text-sm font-medium text-[#3c3732]";
const hintCls  = "mt-0.5 text-xs text-[#9a9089]";

// ── Step 1: Property details ──────────────────────────────────────────────────
function Step1({
  onNext,
}: {
  onNext: (propertyId: string, name: string) => void;
}) {
  const [name,            setName]           = useState("");
  const [address,         setAddress]        = useState("");
  const [trigger,         setTrigger]        = useState("after_checkout");
  const [checkoutTime,    setCheckoutTime]   = useState("11:00");
  const [checkinTime,     setCheckinTime]    = useState("15:00");
  const [duration,        setDuration]       = useState("120");
  const [instructions,    setInstructions]   = useState("");
  const [loading,         setLoading]        = useState(false);
  const [error,           setError]          = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Property name is required."); return; }
    setError("");
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        address: address.trim() || null,
        cleaning_trigger: trigger,
        instructions_text: instructions.trim() || null,
      };
      if (checkoutTime && (trigger === "after_checkout" || trigger === "both"))
        body.checkout_time_default = `2000-01-01T${checkoutTime}:00`;
      if (checkinTime && (trigger === "before_checkin" || trigger === "both"))
        body.checkin_time_default = `2000-01-01T${checkinTime}:00`;
      const n = parseInt(duration, 10);
      if (!Number.isNaN(n) && n > 0) body.cleaning_duration_minutes = n;

      const res  = await fetch("/api/properties", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Failed to create property"); return; }
      onNext(data.id, name.trim());
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {error && <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div>
        <label htmlFor="name" className={labelCls}>Property name *</label>
        <input id="name" type="text" required value={name} onChange={e => setName(e.target.value)}
          placeholder="e.g. Sea View Apartment" className={inputCls} />
      </div>

      <div>
        <label htmlFor="address" className={labelCls}>Address</label>
        <p className={hintCls}>Shown to cleaners with each dispatch so they know where to go.</p>
        <input id="address" type="text" value={address} onChange={e => setAddress(e.target.value)}
          placeholder="e.g. 12 Sea View Street, Limassol 3042" className={inputCls} />
      </div>

      <div>
        <label htmlFor="trigger" className={labelCls}>When to clean</label>
        <p className={hintCls}>When should the cleaning job be scheduled relative to guest stays?</p>
        <select id="trigger" value={trigger} onChange={e => setTrigger(e.target.value)} className={inputCls}>
          <option value="after_checkout">After guest check-out</option>
          <option value="before_checkin">Before next guest check-in</option>
          <option value="both">Both (after check-out + before check-in)</option>
        </select>
      </div>

      {(trigger === "after_checkout" || trigger === "both") && (
        <div>
          <label htmlFor="co_time" className={labelCls}>Default checkout time</label>
          <p className={hintCls}>When guests usually leave. The cleaning window starts at this time.</p>
          <input id="co_time" type="time" value={checkoutTime} onChange={e => setCheckoutTime(e.target.value)} className={inputCls} />
        </div>
      )}
      {(trigger === "before_checkin" || trigger === "both") && (
        <div>
          <label htmlFor="ci_time" className={labelCls}>Default check-in time</label>
          <p className={hintCls}>When the next guest arrives. Cleaning must finish by this time.</p>
          <input id="ci_time" type="time" value={checkinTime} onChange={e => setCheckinTime(e.target.value)} className={inputCls} />
        </div>
      )}

      <div>
        <label htmlFor="duration" className={labelCls}>Cleaning duration (minutes)</label>
        <input id="duration" type="number" min={1} value={duration} onChange={e => setDuration(e.target.value)}
          placeholder="e.g. 120" className={inputCls} />
      </div>

      <div>
        <label htmlFor="instructions" className={labelCls}>Cleaning instructions</label>
        <p className={hintCls}>Special notes sent to the cleaner with each job offer (access codes, focus areas, etc.).</p>
        <textarea id="instructions" rows={3} value={instructions} onChange={e => setInstructions(e.target.value)} className={inputCls} />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading}
          className="flex-1 rounded-full bg-[#1a1510] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#2e2822] transition-colors disabled:opacity-50">
          {loading ? "Creating…" : "Next — assign cleaner →"}
        </button>
        <Link href="/dashboard/properties"
          className="rounded-full border border-[#e3dcd1] px-5 py-2.5 text-sm font-medium text-[#6a625c] hover:bg-[#f0ebe3] transition-colors">
          Cancel
        </Link>
      </div>
    </form>
  );
}

// ── Step 2: Assign cleaner ────────────────────────────────────────────────────
function Step2({
  cleaners,
  propertyId,
  onNext,
  onSkip,
}: {
  cleaners: Cleaner[];
  propertyId: string;
  onNext: (cleanerName: string) => void;
  onSkip: () => void;
}) {
  const [selectedId, setSelectedId] = useState(cleaners[0]?.id ?? "");
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");

  async function assign() {
    if (!selectedId) { onSkip(); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/properties/${propertyId}/cleaners`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cleaner_id: selectedId, is_primary: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Failed to assign cleaner"); return; }
      const name = cleaners.find(c => c.id === selectedId)?.name ?? "Cleaner";
      onNext(name);
    } finally {
      setLoading(false);
    }
  }

  if (cleaners.length === 0) {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-[#e3dcd1] bg-white p-6 text-center">
          <p className="text-3xl mb-3">👤</p>
          <p className="text-sm font-medium text-[#3c3732]">No cleaners added yet</p>
          <p className="mt-1 text-sm text-[#9a9089]">
            You can add cleaners later from the Cleaners section and assign them to this property.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onSkip}
            className="flex-1 rounded-full bg-[#1a1510] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#2e2822] transition-colors">
            Skip — add calendar feed →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <p className="text-sm text-[#6a625c]">
        Choose which cleaner handles this property. You can add a fallback cleaner or reassign later from the property settings.
      </p>

      <div className="rounded-2xl border border-[#e3dcd1] bg-white divide-y divide-[#f0ebe3] overflow-hidden">
        {cleaners.map((c) => {
          const linked = !!c.telegram_chat_id;
          return (
            <label key={c.id} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#faf7f4] transition-colors">
              <input type="radio" name="cleaner" value={c.id}
                checked={selectedId === c.id} onChange={() => setSelectedId(c.id)}
                className="accent-[#c45c0f] w-4 h-4 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1a1510]">{c.name}</p>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                linked
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-[#f5f0e8] text-[#9a9089]"
              }`}>
                {linked ? "● Telegram linked" : "○ Not linked yet"}
              </span>
            </label>
          );
        })}
      </div>

      {cleaners.find(c => c.id === selectedId && !c.telegram_chat_id) && (
        <p className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-700">
          ⚠ This cleaner hasn&apos;t linked their Telegram yet. They won&apos;t receive dispatch offers until they do. You can share their link from the Cleaners section.
        </p>
      )}

      <div className="flex gap-3 pt-1">
        <button onClick={assign} disabled={loading || !selectedId}
          className="flex-1 rounded-full bg-[#1a1510] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#2e2822] transition-colors disabled:opacity-50">
          {loading ? "Assigning…" : "Assign & continue →"}
        </button>
        <button onClick={onSkip}
          className="rounded-full border border-[#e3dcd1] px-5 py-2.5 text-sm font-medium text-[#6a625c] hover:bg-[#f0ebe3] transition-colors">
          Skip for now
        </button>
      </div>
    </div>
  );
}

// ── Step 3: Calendar feed ─────────────────────────────────────────────────────
function Step3({
  propertyId,
  onNext,
  onSkip,
}: {
  propertyId: string;
  onNext: (source: string) => void;
  onSkip: () => void;
}) {
  const [url,     setUrl]     = useState("");
  const [source,  setSource]  = useState("airbnb");
  const [label,   setLabel]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  async function addFeed() {
    if (!url.trim()) { setError("Please enter the iCal URL from your booking platform."); return; }
    if (!url.startsWith("http")) { setError("URL must start with http:// or https://"); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/properties/${propertyId}/calendar-feeds`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), source, label: label.trim() || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Failed to add calendar feed"); return; }
      onNext(PLATFORMS.find(p => p.value === source)?.label ?? source);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {error && <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <p className="text-sm text-[#6a625c]">
        Connect your booking calendar so new reservations create cleaning jobs automatically. You can add more feeds later.
      </p>

      <div className="rounded-2xl border border-[#e3dcd1] bg-[#fef9ee] p-4">
        <p className="text-xs font-semibold text-[#7a5c1e] mb-1">How to find your iCal link:</p>
        <ul className="text-xs text-[#7a5c1e] space-y-0.5 list-disc list-inside">
          <li><b>Airbnb:</b> Calendar → Export Calendar</li>
          <li><b>Booking.com:</b> Property → Calendar → Sync</li>
          <li><b>Vrbo:</b> Calendar → Export → iCal</li>
        </ul>
      </div>

      <div>
        <label className={labelCls}>Platform</label>
        <select value={source} onChange={e => setSource(e.target.value)} className={inputCls}>
          {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>

      <div>
        <label className={labelCls}>iCal URL *</label>
        <p className={hintCls}>Paste the .ics link from your booking platform. It updates automatically.</p>
        <input type="url" value={url} onChange={e => setUrl(e.target.value)}
          placeholder="https://www.airbnb.com/calendar/ical/..."
          className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>Label <span className="text-[#9a9089] font-normal">(optional)</span></label>
        <input type="text" value={label} onChange={e => setLabel(e.target.value)}
          placeholder={`e.g. My ${PLATFORMS.find(p => p.value === source)?.label ?? "listing"}`}
          className={inputCls} />
      </div>

      <div className="flex gap-3 pt-1">
        <button onClick={addFeed} disabled={loading}
          className="flex-1 rounded-full bg-[#c45c0f] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#a34c0c] transition-colors disabled:opacity-50">
          {loading ? "Connecting…" : "Add calendar & finish →"}
        </button>
        <button onClick={onSkip}
          className="rounded-full border border-[#e3dcd1] px-5 py-2.5 text-sm font-medium text-[#6a625c] hover:bg-[#f0ebe3] transition-colors">
          Skip for now
        </button>
      </div>
    </div>
  );
}

// ── Done screen ───────────────────────────────────────────────────────────────
function DoneScreen({
  propertyId,
  propertyName,
  cleanerName,
  feedSource,
}: {
  propertyId: string;
  propertyName: string;
  cleanerName: string | null;
  feedSource: string | null;
}) {
  const router = useRouter();
  return (
    <div className="text-center space-y-6">
      <div>
        <div className="mx-auto w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center text-2xl mb-4">
          ✅
        </div>
        <h2 className="text-xl font-bold text-[#1a1510]">{propertyName} is set up!</h2>
        <p className="mt-1 text-sm text-[#6a625c]">Here&apos;s what was configured:</p>
      </div>

      <div className="rounded-2xl border border-[#e3dcd1] bg-white divide-y divide-[#f0ebe3] text-left overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3.5">
          <span className="text-lg">🏠</span>
          <div>
            <p className="text-sm font-medium text-[#1a1510]">Property created</p>
            <p className="text-xs text-[#9a9089]">{propertyName}</p>
          </div>
          <span className="ml-auto text-xs text-emerald-600 font-medium">Done</span>
        </div>
        <div className="flex items-center gap-3 px-5 py-3.5">
          <span className="text-lg">👤</span>
          <div>
            <p className="text-sm font-medium text-[#1a1510]">Primary cleaner</p>
            <p className="text-xs text-[#9a9089]">{cleanerName ?? "Not assigned yet"}</p>
          </div>
          <span className={`ml-auto text-xs font-medium ${cleanerName ? "text-emerald-600" : "text-amber-600"}`}>
            {cleanerName ? "Assigned" : "Skipped"}
          </span>
        </div>
        <div className="flex items-center gap-3 px-5 py-3.5">
          <span className="text-lg">📅</span>
          <div>
            <p className="text-sm font-medium text-[#1a1510]">Calendar feed</p>
            <p className="text-xs text-[#9a9089]">{feedSource ?? "Not connected yet"}</p>
          </div>
          <span className={`ml-auto text-xs font-medium ${feedSource ? "text-emerald-600" : "text-amber-600"}`}>
            {feedSource ? "Connected" : "Skipped"}
          </span>
        </div>
      </div>

      {(!cleanerName || !feedSource) && (
        <p className="text-xs text-[#9a9089]">
          Skipped items can be completed from the property settings at any time.
        </p>
      )}

      <div className="flex flex-col gap-2.5">
        <button
          onClick={() => router.push("/dashboard/properties")}
          className="w-full rounded-full bg-[#1a1510] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#2e2822] transition-colors"
        >
          Back to Properties
        </button>
        <Link
          href={`/dashboard/properties/${propertyId}/edit`}
          className="block text-center rounded-full border border-[#e3dcd1] px-5 py-2.5 text-sm font-medium text-[#6a625c] hover:bg-[#f0ebe3] transition-colors"
        >
          Edit property settings
        </Link>
      </div>
    </div>
  );
}

// ── Main wizard ───────────────────────────────────────────────────────────────
export function PropertySetupWizard({ cleaners }: { cleaners: Cleaner[] }) {
  const [step,         setStep]         = useState<1 | 2 | 3 | "done">(1);
  const [propertyId,   setPropertyId]   = useState("");
  const [propertyName, setPropertyName] = useState("");
  const [cleanerName,  setCleanerName]  = useState<string | null>(null);
  const [feedSource,   setFeedSource]   = useState<string | null>(null);

  const TITLES: Record<string, string> = {
    "1":    "Add property",
    "2":    "Assign a cleaner",
    "3":    "Connect a booking calendar",
    "done": "",
  };

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard/properties"
          className="inline-flex items-center gap-1.5 text-sm text-[#6a625c] hover:text-[#1a1510] transition-colors mb-4">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Properties
        </Link>
        {step !== "done" && (
          <>
            <StepBar current={step as 1 | 2 | 3} />
            <h1 className="text-xl font-bold text-[#1a1510]">{TITLES[String(step)]}</h1>
          </>
        )}
      </div>

      <div className="rounded-2xl border border-[#e3dcd1] bg-white p-6 shadow-sm">
        {step === 1 && (
          <Step1
            onNext={(id, name) => {
              setPropertyId(id);
              setPropertyName(name);
              setStep(2);
            }}
          />
        )}
        {step === 2 && (
          <Step2
            cleaners={cleaners}
            propertyId={propertyId}
            onNext={(name) => { setCleanerName(name); setStep(3); }}
            onSkip={() => setStep(3)}
          />
        )}
        {step === 3 && (
          <Step3
            propertyId={propertyId}
            onNext={(src) => { setFeedSource(src); setStep("done"); }}
            onSkip={() => setStep("done")}
          />
        )}
        {step === "done" && (
          <DoneScreen
            propertyId={propertyId}
            propertyName={propertyName}
            cleanerName={cleanerName}
            feedSource={feedSource}
          />
        )}
      </div>
    </div>
  );
}
