import { requireAdmin } from "@/lib/admin-auth";
import { getPrisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";

const STATUS_COLORS: Record<string, string> = {
  new:                 "bg-[#e5e0d8] text-[#4b443e]",
  offered:             "bg-[#fde9ce] text-[#7a4500]",
  accepted:            "bg-[#d1ead1] text-[#2d6b2d]",
  in_progress:         "bg-[#c6e4c6] text-[#245824]",
  done_awaiting_review:"bg-[#fef3cd] text-[#7a5800]",
  completed:           "bg-[#ddd6cb] text-[#3c3732]",
  cancelled:           "bg-[#fde0e0] text-[#7a1a1a]",
};

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${color}`}>
      {label}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#ddd6cb] bg-white p-6">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#6a625c]">{title}</h2>
      {children}
    </section>
  );
}

export default async function AdminLandlordDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const prisma = getPrisma();
  try {
    const landlord = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        created_at: true,
        telegram_chat_id: true,
        ingest_token: true,
        role: true,
        properties: {
          orderBy: { created_at: "asc" },
          select: {
            id: true,
            name: true,
            name_airbnb: true,
            name_booking_com: true,
            name_vrbo: true,
            cleaning_trigger: true,
            created_at: true,
            property_cleaners: {
              select: {
                is_primary: true,
                cleaner: { select: { id: true, name: true, telegram_chat_id: true } },
              },
            },
          },
        },
        cleaners: {
          orderBy: { created_at: "asc" },
          select: { id: true, name: true, telegram_chat_id: true, created_at: true },
        },
        jobs: {
          orderBy: { created_at: "desc" },
          take: 30,
          select: {
            id: true,
            status: true,
            source: true,
            checkout_date: true,
            checkin_date: true,
            created_at: true,
            property: { select: { name: true } },
          },
        },
        feedback: {
          orderBy: { created_at: "desc" },
          select: { id: true, category: true, message: true, status: true, created_at: true },
        },
      },
    });

    if (!landlord || landlord.role !== "landlord") notFound();

    const hasProp    = landlord.properties.length > 0;
    const hasCleaner = landlord.cleaners.length > 0;
    const hasAssign  = landlord.properties.some((p) => p.property_cleaners.length > 0);
    const hasTg      = !!landlord.telegram_chat_id;
    const setupScore = (hasProp ? 25 : 0) + (hasCleaner ? 25 : 0) + (hasAssign ? 25 : 0) + (hasTg ? 25 : 0);

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link href="/admin/landlords" className="mb-1 block text-xs text-[#7d7570] hover:text-[#4a443e]">
              ← All landlords
            </Link>
            <h1 className="text-xl font-bold text-[#3c3732]">{landlord.email}</h1>
            <p className="mt-0.5 text-xs text-[#7d7570]">
              Joined {landlord.created_at.toLocaleDateString()} ·{" "}
              Setup <span className="font-semibold">{setupScore}%</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {hasTg
              ? <Chip label="✓ Telegram" color="bg-[#d1ead1] text-[#2d6b2d]" />
              : <Chip label="No Telegram" color="bg-[#fde0e0] text-[#7a1a1a]" />}
            {landlord.ingest_token
              ? <Chip label="✓ Email fwd" color="bg-[#d1ead1] text-[#2d6b2d]" />
              : <Chip label="No email fwd" color="bg-[#e5e0d8] text-[#5a524c]" />}
          </div>
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Properties", value: landlord.properties.length },
            { label: "Cleaners",   value: landlord.cleaners.length },
            { label: "Jobs total", value: landlord.jobs.length >= 30 ? "30+" : landlord.jobs.length },
            { label: "Feedback",   value: landlord.feedback.length },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-[#ddd6cb] bg-white p-4 text-center">
              <p className="text-2xl font-bold text-[#3c3732]">{s.value}</p>
              <p className="mt-0.5 text-xs text-[#7d7570]">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Properties */}
        <Section title="Properties">
          {landlord.properties.length === 0 ? (
            <p className="text-sm text-[#9a9089]">No properties added.</p>
          ) : (
            <div className="divide-y divide-[#f0ebe3]">
              {landlord.properties.map((p) => (
                <div key={p.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-[#3c3732]">{p.name}</p>
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        {p.name_airbnb && (
                          <span className="rounded bg-[#f0ebe3] px-1.5 py-0.5 text-[10px] text-[#4b443e]">Airbnb: {p.name_airbnb}</span>
                        )}
                        {p.name_booking_com && (
                          <span className="rounded bg-[#f0ebe3] px-1.5 py-0.5 text-[10px] text-[#4b443e]">Booking: {p.name_booking_com}</span>
                        )}
                        {p.name_vrbo && (
                          <span className="rounded bg-[#f0ebe3] px-1.5 py-0.5 text-[10px] text-[#4b443e]">Vrbo: {p.name_vrbo}</span>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-[#ede8e1] px-2 py-0.5 text-[10px] text-[#5a524c]">
                      {p.cleaning_trigger ?? "after_checkout"}
                    </span>
                  </div>
                  {p.property_cleaners.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {p.property_cleaners.map((pc) => (
                        <span
                          key={pc.cleaner.id}
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            pc.is_primary ? "bg-[#4b443e] text-white" : "bg-[#e5e0d8] text-[#4b443e]"
                          }`}
                        >
                          {pc.is_primary ? "★ " : ""}{pc.cleaner.name}
                          {!pc.cleaner.telegram_chat_id ? " ⚠" : ""}
                        </span>
                      ))}
                    </div>
                  )}
                  {p.property_cleaners.length === 0 && (
                    <p className="mt-1 text-[11px] text-[#c47a50]">⚠ No cleaner assigned</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Cleaners */}
        <Section title="Cleaners">
          {landlord.cleaners.length === 0 ? (
            <p className="text-sm text-[#9a9089]">No cleaners added.</p>
          ) : (
            <div className="divide-y divide-[#f0ebe3]">
              {landlord.cleaners.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                  <p className="text-sm font-medium text-[#3c3732]">{c.name}</p>
                  <div className="flex items-center gap-2">
                    {c.telegram_chat_id
                      ? <Chip label="✓ Telegram" color="bg-[#d1ead1] text-[#2d6b2d]" />
                      : <Chip label="No Telegram" color="bg-[#fde0e0] text-[#7a1a1a]" />}
                    <span className="text-[10px] text-[#9a9089]">{c.created_at.toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Jobs */}
        <Section title={`Recent jobs${landlord.jobs.length >= 30 ? " (last 30)" : ""}`}>
          {landlord.jobs.length === 0 ? (
            <p className="text-sm text-[#9a9089]">No jobs yet.</p>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#f0ebe3] text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6a625c]">
                    <th className="pb-2 text-left">Property</th>
                    <th className="pb-2 text-left">Source</th>
                    <th className="pb-2 text-left">Checkout</th>
                    <th className="pb-2 text-left">Status</th>
                    <th className="pb-2 text-left">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f7f4ef]">
                  {landlord.jobs.map((j) => (
                    <tr key={j.id} className="text-xs text-[#4a443e]">
                      <td className="py-2 pr-4 font-medium">{j.property.name}</td>
                      <td className="py-2 pr-4 capitalize text-[#7d7570]">{j.source ?? "—"}</td>
                      <td className="py-2 pr-4 text-[#7d7570]">
                        {j.checkout_date ? new Date(j.checkout_date).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-2 pr-4">
                        <Chip
                          label={j.status.replace(/_/g, " ")}
                          color={STATUS_COLORS[j.status] ?? "bg-[#e5e0d8] text-[#4b443e]"}
                        />
                      </td>
                      <td className="py-2 text-[#9a9089]">{j.created_at.toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {/* Feedback */}
        <Section title="Feedback submitted">
          {landlord.feedback.length === 0 ? (
            <p className="text-sm text-[#9a9089]">No feedback submitted.</p>
          ) : (
            <div className="space-y-3">
              {landlord.feedback.map((f) => (
                <div key={f.id} className="rounded-xl border border-[#e5dfd4] bg-[#faf7f2] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <Chip
                      label={f.category}
                      color={
                        f.category === "bug"          ? "bg-[#fde0e0] text-[#7a1a1a]"
                        : f.category === "feature"    ? "bg-[#fef3cd] text-[#7a5800]"
                        : f.category === "testimonial"? "bg-[#d1ead1] text-[#2d6b2d]"
                        : "bg-[#e5e0d8] text-[#4b443e]"
                      }
                    />
                    <span className="text-[10px] text-[#9a9089]">{f.created_at.toLocaleDateString()}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-[#4a443e]">{f.message}</p>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    );
  } finally {
    await prisma.$disconnect();
  }
}
