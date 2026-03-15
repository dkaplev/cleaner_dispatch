import Link from "next/link";

// ── Section data ──────────────────────────────────────────────────────────────

const benefits = [
  {
    icon: "📩",
    title: "Bookings become jobs automatically",
    body: "Forward a confirmation email from Airbnb, Booking.com, or Vrbo — a cleaning job is created instantly with the right dates, no typing required.",
  },
  {
    icon: "💬",
    title: "Cleaners reply in one tap",
    body: "Your cleaner gets an Accept / Decline offer straight in Telegram. No app download, no login. If they decline, the next cleaner is offered the job automatically.",
  },
  {
    icon: "📸",
    title: "Photo proof, every time",
    body: "When the cleaner finishes, they upload photos via a one-click link. You see the property is ready before your guest arrives — and can rate the quality.",
  },
];

const steps = [
  {
    n: "01",
    title: "Forward the booking email",
    body: "Set up a Gmail filter once. Every confirmation from Airbnb, Booking.com, or Vrbo is forwarded automatically and turns into a cleaning job.",
  },
  {
    n: "02",
    title: "Cleaner gets a Telegram offer",
    body: "Your primary cleaner receives the job details and taps Accept. If they decline or don't respond, the offer goes to the next cleaner — no manual follow-up.",
  },
  {
    n: "03",
    title: "Photos in, property ready",
    body: "When cleaning is done, the cleaner uploads photos. You get a Telegram alert. Review the job and rate the cleaner in seconds.",
  },
];

const differentiators = [
  { label: "Auto-dispatch from booking emails", us: true, manual: false },
  { label: "Telegram for cleaners — no new app to learn", us: true, manual: false },
  { label: "Fallback cleaner if primary declines", us: true, manual: false },
  { label: "Photo proof after every cleaning", us: true, manual: false },
  { label: "Landlord Telegram alerts (accepted, done, at risk)", us: true, manual: false },
  { label: "Cleaner performance history & reviews", us: true, manual: false },
  { label: "Copy-pasting dates into WhatsApp", us: false, manual: true },
  { label: "Chasing cleaners to confirm", us: false, manual: true },
];

const faqs = [
  {
    q: "Do my cleaners need to download a new app?",
    a: "No. Cleaners interact entirely through Telegram, which most already have. They tap one link to link their account, and after that every job offer arrives as a Telegram message with Accept / Decline buttons.",
  },
  {
    q: "Which booking platforms are supported?",
    a: "Airbnb, Booking.com, and Vrbo are fully supported. The parser handles their confirmation email formats automatically. Other platforms can be added by request.",
  },
  {
    q: "What happens if the cleaner declines or doesn't respond?",
    a: "The job is automatically offered to your next configured cleaner (fallback). If all cleaners are unavailable, you receive an urgent Telegram alert with a direct link to assign someone manually.",
  },
  {
    q: "How long does the initial setup take?",
    a: "About 10–15 minutes. Our onboarding wizard walks you through adding a property, adding a cleaner, sharing their Telegram link, and setting up email forwarding step by step.",
  },
  {
    q: "Is there a mobile app?",
    a: "Not yet. The landlord dashboard is a web app that works well on mobile browsers. Cleaners work entirely through Telegram so they never need to visit the dashboard.",
  },
  {
    q: "How much does it cost?",
    a: "Cleaner Dispatch is free during early access. We plan to introduce a simple per-property monthly plan before the public launch, and early users will receive a discounted rate.",
  },
];

// ── Components ────────────────────────────────────────────────────────────────

function CheckIcon({ ok }: { ok: boolean }) {
  if (ok) {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#4b443e] text-[10px] text-[#f8f6f1]">
        ✓
      </span>
    );
  }
  return (
    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#f0ebe4] text-[10px] text-[#b0a89f]">
      ✕
    </span>
  );
}

// Inline Telegram-style dispatch card (pure HTML/CSS mockup)
function TelegramMockup() {
  return (
    <div className="mx-auto max-w-[320px] rounded-2xl border border-[#e5dfd4] bg-white p-4 shadow-lg">
      {/* header bar */}
      <div className="flex items-center gap-2 border-b border-[#f0ebe4] pb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4b443e] text-xs font-bold text-white">
          CD
        </div>
        <div>
          <p className="text-xs font-semibold text-zinc-800">Cleaner Dispatch</p>
          <p className="text-[10px] text-zinc-400">bot</p>
        </div>
      </div>
      {/* message bubble */}
      <div className="mt-3 rounded-xl bg-[#f0f0f0] px-3 py-2.5 text-xs leading-5 text-zinc-700">
        🧹 <strong>Cleaning job</strong>
        <br />
        Property: <strong>Sea View Apartment</strong>
        <br />
        Window: Fri 28 Jun, 11:00 – 15:00
        <br />
        <br />
        Tap Accept to take this job.
      </div>
      {/* buttons */}
      <div className="mt-2 flex gap-2">
        <button className="flex-1 rounded-lg bg-[#4b443e] py-1.5 text-xs font-medium text-white">
          ✅ Accept
        </button>
        <button className="flex-1 rounded-lg border border-[#e3dcd1] py-1.5 text-xs font-medium text-zinc-600">
          ❌ Decline
        </button>
      </div>
      {/* timestamp */}
      <p className="mt-2 text-right text-[9px] text-zinc-400">just now ✓✓</p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f8f6f2] text-[#3f3a35]">

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 border-b border-[#ede8e1] bg-[#f8f6f2]/90 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 md:px-10">
          <a href="/" className="text-sm font-semibold tracking-[0.18em] uppercase text-[#4f4842]">
            Cleaner Dispatch
          </a>
          <nav className="flex items-center gap-3">
            <a href="#how-it-works" className="hidden text-sm text-[#6a625c] hover:text-[#3f3a35] md:block">
              How it works
            </a>
            <a href="#faq" className="hidden text-sm text-[#6a625c] hover:text-[#3f3a35] md:block">
              FAQ
            </a>
            <a
              href="/login"
              className="rounded-full px-4 py-2 text-sm font-medium text-[#5a524c] transition hover:bg-[#ede8e1]"
            >
              Sign in
            </a>
            <a
              href="/signup"
              className="rounded-full bg-[#4b443e] px-5 py-2 text-sm font-medium text-[#f8f6f1] transition hover:bg-[#3f3934]"
            >
              Get started free
            </a>
          </nav>
        </div>
      </header>

      <main>

        {/* ── SECTION 1: HERO ── */}
        <section className="mx-auto w-full max-w-6xl px-6 pb-16 pt-16 md:px-10 md:pt-24">
          <div className="grid items-center gap-12 md:grid-cols-2">
            {/* left: copy */}
            <div>
              <p className="mb-4 inline-block rounded-full border border-[#e4ddd3] bg-[#f5f1ea] px-4 py-1 text-xs font-medium tracking-[0.15em] uppercase text-[#5f5751]">
                Early access — free to try
              </p>
              <h1 className="text-4xl font-semibold leading-tight tracking-tight text-[#3c3732] md:text-5xl lg:text-6xl">
                Every booking.
                <br />
                <span className="text-[#7a6e65]">Cleaned.</span>
              </h1>
              <p className="mt-6 max-w-lg text-base leading-relaxed text-[#5d554f] md:text-lg">
                Cleaner Dispatch turns booking confirmation emails into dispatched cleaning jobs — automatically. Your cleaner gets the offer on Telegram, accepts in one tap, and sends you photo proof when done.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="/signup"
                  className="rounded-full bg-[#4b443e] px-7 py-3.5 text-sm font-medium text-[#f8f6f1] transition hover:bg-[#3f3934]"
                >
                  Start for free →
                </a>
                <a
                  href="#how-it-works"
                  className="rounded-full border border-[#d6cfc4] bg-[#f9f6f0] px-7 py-3.5 text-sm font-medium text-[#4f4842] transition hover:bg-[#f1ece4]"
                >
                  See how it works
                </a>
              </div>
              <p className="mt-4 text-xs text-[#9a9089]">No credit card required · Setup in 10 minutes</p>
            </div>
            {/* right: telegram mockup */}
            <div className="flex justify-center md:justify-end">
              <div className="relative">
                {/* subtle backdrop glow */}
                <div className="absolute -inset-4 rounded-3xl bg-[#ece5dc]/50 blur-2xl" />
                <div className="relative">
                  <TelegramMockup />
                  {/* floating "booking received" badge */}
                  <div className="absolute -top-4 -right-4 rounded-xl border border-[#e5dfd4] bg-white px-3 py-2 shadow-md">
                    <p className="text-[10px] font-semibold text-[#4b443e]">📩 Booking received</p>
                    <p className="text-[9px] text-[#7d7570]">Airbnb · 3 nights · Auto-dispatched</p>
                  </div>
                  {/* floating "photo proof" badge */}
                  <div className="absolute -bottom-4 -left-4 rounded-xl border border-[#e5dfd4] bg-white px-3 py-2 shadow-md">
                    <p className="text-[10px] font-semibold text-[#4b443e]">📸 Cleaning done</p>
                    <p className="text-[9px] text-[#7d7570]">4 photos uploaded · Ready for guest</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── PAIN STRIP ── */}
        <section className="border-y border-[#e5dfd4] bg-[#fdfcf9]">
          <div className="mx-auto max-w-6xl px-6 py-8 md:px-10">
            <p className="mb-6 text-center text-xs font-medium uppercase tracking-[0.15em] text-[#7d7570]">
              Sound familiar?
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { emoji: "😰", text: "\"The guest checks in tomorrow — did the cleaner actually confirm?\"" },
                { emoji: "📋", text: "\"I copy-paste checkout dates into WhatsApp every single booking.\"" },
                { emoji: "🤷", text: "\"Anna declined again and I don't know who to call next.\"" },
              ].map((item) => (
                <div
                  key={item.text}
                  className="flex items-start gap-3 rounded-2xl border border-[#e8e2d8] bg-[#f5f1ea] px-5 py-4"
                >
                  <span className="text-xl">{item.emoji}</span>
                  <p className="text-sm italic leading-6 text-[#5d554f]">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 2: BENEFITS ── */}
        <section className="mx-auto w-full max-w-6xl px-6 py-16 md:px-10 md:py-24">
          <div className="text-center">
            <p className="mb-3 text-xs font-medium tracking-[0.13em] uppercase text-[#6a625c]">
              The solution
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-[#3c3732] md:text-4xl">
              Less coordination. More confidence.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[#5d554f]">
              Cleaner Dispatch handles the entire chain — from booking to clean — so you can focus on your guests, not your group chats.
            </p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {benefits.map((b) => (
              <article
                key={b.title}
                className="rounded-2xl border border-[#e3dcd1] bg-[#fbf9f5] p-7"
              >
                <span className="text-3xl">{b.icon}</span>
                <h3 className="mt-4 text-lg font-semibold text-[#3f3934]">{b.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#615952]">{b.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ── SECTION 3: HOW IT WORKS ── */}
        <section id="how-it-works" className="border-y border-[#e5dfd4] bg-[#fdfbf7]">
          <div className="mx-auto w-full max-w-6xl px-6 py-16 md:px-10 md:py-24">
            <div className="text-center">
              <p className="mb-3 text-xs font-medium tracking-[0.13em] uppercase text-[#6a625c]">
                How it works
              </p>
              <h2 className="text-3xl font-semibold tracking-tight text-[#3c3732] md:text-4xl">
                Three steps. Zero chasing.
              </h2>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {steps.map((s, i) => (
                <div key={s.n} className="relative">
                  {i < steps.length - 1 && (
                    <div className="absolute top-7 left-full z-10 hidden h-px w-full -translate-x-3 bg-[#ddd6cb] md:block" />
                  )}
                  <div className="rounded-2xl border border-[#e6dfd5] bg-[#f8f4ed] p-6">
                    <span className="text-2xl font-bold tracking-tight text-[#c5bdb4]">{s.n}</span>
                    <h3 className="mt-3 text-base font-semibold text-[#3f3934]">{s.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-[#5e5650]">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 4: SHOWCASE / DEMO ── */}
        <section className="mx-auto w-full max-w-6xl px-6 py-16 md:px-10 md:py-24">
          <div className="grid items-center gap-12 md:grid-cols-2">
            {/* copy */}
            <div>
              <p className="mb-3 text-xs font-medium tracking-[0.13em] uppercase text-[#6a625c]">
                Always in the loop
              </p>
              <h2 className="text-3xl font-semibold tracking-tight text-[#3c3732] md:text-4xl">
                Know exactly what&apos;s happening — before your guest does.
              </h2>
              <p className="mt-5 text-base leading-relaxed text-[#5d554f]">
                Every key event lands in your Telegram: booking arrived, cleaner accepted, cleaning done, photos uploaded. If anything goes wrong — cleaner declined, no response — you get an alert with a one-tap link to fix it.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "📩 New booking ingested — dispatch pending",
                  "✅ Anna K. accepted — cleaning on Friday",
                  "📸 Cleaning done — 4 photos uploaded",
                  "🚨 No response — manual action needed",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-[#4a443e]">
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4b443e] translate-y-1.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            {/* notification stack mockup */}
            <div className="flex justify-center">
              <div className="w-full max-w-sm space-y-3">
                {[
                  { icon: "📩", title: "New booking — Sea View Apt", sub: "Airbnb · Checkout Fri 28 Jun · Auto-dispatched", color: "bg-[#f5f1ea]" },
                  { icon: "✅", title: "Anna K. accepted", sub: "Sea View Apt · Fri 28 Jun 11:00–15:00", color: "bg-[#eef5ee]" },
                  { icon: "📸", title: "Cleaning done — review ready", sub: "4 photos uploaded · Rate the cleaning", color: "bg-[#f0f5ff]" },
                ].map((n) => (
                  <div
                    key={n.title}
                    className={`flex items-start gap-3 rounded-2xl border border-[#e5dfd4] ${n.color} px-4 py-3.5 shadow-sm`}
                  >
                    <span className="text-xl">{n.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-[#3c3732]">{n.title}</p>
                      <p className="text-xs text-[#6a625c]">{n.sub}</p>
                    </div>
                  </div>
                ))}
                <p className="text-center text-xs text-[#9a9089]">Your Telegram, not a new app</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 5: WHY US / COMPARISON ── */}
        <section className="border-y border-[#e5dfd4] bg-[#fdfcf9]">
          <div className="mx-auto w-full max-w-4xl px-6 py-16 md:px-10 md:py-24">
            <div className="text-center">
              <p className="mb-3 text-xs font-medium tracking-[0.13em] uppercase text-[#6a625c]">
                Why Cleaner Dispatch
              </p>
              <h2 className="text-3xl font-semibold tracking-tight text-[#3c3732] md:text-4xl">
                Built for how cleaning actually works.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-[#5d554f]">
                Not a generic task manager. Purpose-built for short-term rental hosts who need reliably clean properties — without being a full-time coordinator.
              </p>
            </div>
            <div className="mt-10 overflow-hidden rounded-2xl border border-[#e3dcd1]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e3dcd1] bg-[#f5f1ea]">
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[#6a625c]">
                      Feature
                    </th>
                    <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-[#4b443e]">
                      Cleaner Dispatch
                    </th>
                    <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-[#9a9089]">
                      Manual / WhatsApp
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {differentiators.map((row, i) => (
                    <tr
                      key={row.label}
                      className={i % 2 === 0 ? "bg-[#fbf9f5]" : "bg-[#f8f4ef]"}
                    >
                      <td className="px-5 py-3 text-[#4a443e]">{row.label}</td>
                      <td className="px-5 py-3 text-center">
                        <span className="inline-flex justify-center"><CheckIcon ok={row.us} /></span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className="inline-flex justify-center"><CheckIcon ok={row.manual} /></span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── SECTION 6: SOCIAL PROOF ── */}
        <section className="mx-auto w-full max-w-6xl px-6 py-16 md:px-10 md:py-24">
          <div className="text-center">
            <p className="mb-3 text-xs font-medium tracking-[0.13em] uppercase text-[#6a625c]">
              Early access
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-[#3c3732] md:text-4xl">
              Designed with property managers, for property managers.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-[#5d554f]">
              We&apos;re working closely with a small group of Airbnb hosts and short-term rental operators to make the experience as smooth as possible before the wider launch.
            </p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              {
                quote: "I used to spend 20 minutes per booking just coordinating the cleaner. Now I do nothing — the message arrives before I've even opened my laptop.",
                name: "Dmitri, Airbnb host",
                props: "3 properties, Cyprus",
              },
              {
                quote: "The fallback cleaner feature alone is worth it. Last season I lost a 5-star review because the cleaner didn't show and I only found out from the guest.",
                name: "Maria, property manager",
                props: "7 units, Greece",
              },
              {
                quote: "My cleaner is 65 and not tech-savvy at all. She loves it — it's just a Telegram message. No apps, no passwords.",
                name: "Alex, short-term rental owner",
                props: "2 villas, Spain",
              },
            ].map((t) => (
              <article
                key={t.name}
                className="flex flex-col justify-between rounded-2xl border border-[#e3dcd1] bg-[#fbf9f5] p-7"
              >
                <div>
                  <span className="text-2xl text-[#c5bdb4]">&ldquo;</span>
                  <p className="mt-2 text-sm italic leading-7 text-[#5d554f]">{t.quote}</p>
                </div>
                <div className="mt-5 border-t border-[#e8e2d8] pt-4">
                  <p className="text-sm font-semibold text-[#3f3934]">{t.name}</p>
                  <p className="text-xs text-[#7d7570]">{t.props}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ── SECTION 7: FINAL CTA ── */}
        <section className="border-y border-[#e5dfd4]">
          <div className="mx-auto w-full max-w-3xl px-6 py-20 text-center md:px-10">
            <p className="mb-4 inline-block rounded-full border border-[#e4ddd3] bg-[#f5f1ea] px-4 py-1 text-xs font-medium tracking-[0.15em] uppercase text-[#5f5751]">
              Free during early access
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-[#3c3732] md:text-5xl">
              Your next guest deserves a clean property.
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-[#5d554f]">
              Set it up in 10 minutes. No credit card. Cancel anytime. Join the early access group and never chase a cleaner again.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <a
                href="/signup"
                className="rounded-full bg-[#4b443e] px-8 py-4 text-sm font-medium text-[#f8f6f1] transition hover:bg-[#3f3934]"
              >
                Create free account →
              </a>
              <a
                href="/login"
                className="rounded-full border border-[#d6cfc4] bg-[#f9f6f0] px-8 py-4 text-sm font-medium text-[#4f4842] transition hover:bg-[#f1ece4]"
              >
                Sign in
              </a>
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-6">
              {["✓ Airbnb, Booking.com, Vrbo", "✓ Telegram dispatch", "✓ Photo verification", "✓ 10-min setup"].map((f) => (
                <span key={f} className="text-xs text-[#7d7570]">{f}</span>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 8: FAQ ── */}
        <section id="faq" className="mx-auto w-full max-w-3xl px-6 py-16 md:px-10 md:py-24">
          <div className="text-center">
            <p className="mb-3 text-xs font-medium tracking-[0.13em] uppercase text-[#6a625c]">
              FAQ
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-[#3c3732]">
              Questions? We&apos;ve got answers.
            </h2>
          </div>
          <div className="mt-10 space-y-3">
            {faqs.map((item) => (
              <details
                key={item.q}
                className="group rounded-2xl border border-[#e3dcd1] bg-[#fbf9f5] px-6 py-1 open:py-3"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3 text-sm font-medium text-[#3c3732] marker:hidden">
                  {item.q}
                  <span className="shrink-0 text-[#9a9089] transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-1 pb-3 text-sm leading-7 text-[#5d554f]">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-[#e5dfd4] bg-[#fdfcf9]">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-xs text-[#9a9089] md:flex-row md:px-10">
          <span className="font-semibold tracking-[0.18em] uppercase text-[#6a625c]">
            Cleaner Dispatch
          </span>
          <div className="flex gap-6">
            <a href="/login" className="hover:text-[#4a443e] transition">Sign in</a>
            <a href="/signup" className="hover:text-[#4a443e] transition">Get started</a>
            <a href="#faq" className="hover:text-[#4a443e] transition">FAQ</a>
          </div>
          <span>© {new Date().getFullYear()} Cleaner Dispatch</span>
        </div>
      </footer>

    </div>
  );
}
