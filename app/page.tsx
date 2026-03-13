const features = [
  {
    title: "One clear dispatch board",
    description:
      "View upcoming cleanings in a calm, organized queue that helps your team focus on what matters next.",
  },
  {
    title: "Cleaner-first delivery",
    description:
      "Send job details and reminders directly through Telegram, so cleaners get the right info at the right time.",
  },
  {
    title: "Less admin, fewer gaps",
    description:
      "Track status updates and reduce missed handoffs with a clean workflow built for daily operations.",
  },
];

const steps = [
  "Add your properties and cleaner team.",
  "Import bookings and prepare jobs in minutes.",
  "Dispatch automatically and monitor completion.",
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f8f6f2] text-[#3f3a35]">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 md:px-10">
        <a href="/" className="text-sm font-semibold tracking-[0.18em] uppercase text-[#4f4842]">
          Cleaner Dispatch
        </a>
        <nav className="flex items-center gap-3">
          <a
            href="/login"
            className="rounded-full px-4 py-2 text-sm font-medium text-[#5a524c] transition hover:bg-[#ede8e1]"
          >
            Sign in
          </a>
          <a
            href="/signup"
            className="rounded-full border border-[#d8d1c7] bg-[#fdfcf9] px-4 py-2 text-sm font-medium text-[#49423c] transition hover:bg-[#f3efe8]"
          >
            Get started
          </a>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 pb-16 md:px-10 md:pb-24">
        <section className="relative overflow-hidden rounded-3xl border border-[#e5dfd4] bg-[#fdfcf9] px-6 py-16 md:px-12 md:py-20">
          <div className="pointer-events-none absolute -top-14 -right-14 h-44 w-44 rounded-full bg-[#f1ece4]" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-[#efebe5]" />

          <div className="relative max-w-3xl">
            <p className="mb-5 inline-block rounded-full border border-[#e4ddd3] bg-[#f5f1ea] px-4 py-1 text-xs font-medium tracking-[0.15em] uppercase text-[#5f5751]">
              Dispatch without the noise
            </p>
            <h1 className="text-4xl leading-tight font-semibold tracking-tight text-[#3c3732] md:text-6xl">
              A calm workspace for cleaner operations.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-[#5d554f] md:text-lg">
              Cleaner Dispatch helps property managers route jobs clearly,
              communicate instantly, and keep every clean on track.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a
                href="/signup"
                className="rounded-full bg-[#4b443e] px-6 py-3 text-sm font-medium text-[#f8f6f1] transition hover:bg-[#3f3934]"
              >
                Create account
              </a>
              <a
                href="/login"
                className="rounded-full border border-[#d6cfc4] bg-[#f9f6f0] px-6 py-3 text-sm font-medium text-[#4f4842] transition hover:bg-[#f1ece4]"
              >
                Open dashboard
              </a>
            </div>
          </div>
        </section>

        <section className="mt-12 grid gap-4 md:mt-16 md:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-2xl border border-[#e3dcd1] bg-[#fbf9f5] p-6"
            >
              <h2 className="text-lg font-semibold text-[#3f3934]">{feature.title}</h2>
              <p className="mt-3 text-sm leading-7 text-[#615952]">{feature.description}</p>
            </article>
          ))}
        </section>

        <section className="mt-12 grid gap-6 rounded-3xl border border-[#e5dfd3] bg-[#fdfbf7] p-6 md:mt-16 md:grid-cols-[1.15fr_0.85fr] md:p-10">
          <div>
            <p className="text-xs font-medium tracking-[0.13em] uppercase text-[#6a625c]">
              How it works
            </p>
            <h3 className="mt-4 text-2xl font-semibold tracking-tight text-[#3e3833] md:text-3xl">
              Built for daily dispatch rhythm.
            </h3>
            <p className="mt-4 max-w-xl text-sm leading-7 text-[#5e5650] md:text-base">
              Keep your team aligned from booking intake to final confirmation,
              with a minimal interface designed for speed and clarity.
            </p>
          </div>

          <ol className="space-y-3">
            {steps.map((step, index) => (
              <li
                key={step}
                className="flex items-start gap-3 rounded-xl border border-[#e6dfd5] bg-[#f8f4ed] px-4 py-3"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#ece5dc] text-xs font-semibold text-[#4b443e]">
                  {index + 1}
                </span>
                <span className="text-sm leading-6 text-[#4f4842]">{step}</span>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  );
}
