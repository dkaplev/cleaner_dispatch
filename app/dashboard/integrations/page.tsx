import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { getPrisma } from "@/lib/prisma";
import Link from "next/link";
import { DashboardHeader } from "../dashboard-header";
import { IntegrationsClient } from "./integrations-client";

async function getOrCreateToken(userId: string): Promise<string> {
  const prisma = getPrisma();
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { ingest_token: true },
    });
    if (user?.ingest_token) return user.ingest_token;
    const token = randomBytes(16).toString("hex");
    await prisma.user.update({ where: { id: userId }, data: { ingest_token: token } });
    return token;
  } finally {
    await prisma.$disconnect();
  }
}

export default async function IntegrationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const token = await getOrCreateToken(session.user.id);
  const centralEmail = process.env.INGEST_CENTRAL_EMAIL?.trim() ?? "";
  const forwardingAddress = centralEmail
    ? centralEmail.replace("@", `+${token}@`)
    : null;

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <DashboardHeader userEmail={session.user.email ?? ""} />
      <main className="mt-8 max-w-xl">
        <div className="mb-4">
          <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-zinc-800">
            ← Back to dashboard
          </Link>
        </div>

        <h2 className="text-lg font-semibold text-zinc-900">Email ingest integration</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Forward your booking confirmation emails to the address below. The app will automatically
          create a cleaning job and notify you via Telegram.
        </p>

        <div className="mt-6 space-y-6">
          {/* Forwarding address */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-zinc-800">Your forwarding address</h3>
            {forwardingAddress ? (
              <>
                <p className="mt-1 text-sm text-zinc-500">
                  Set up a Gmail filter to forward booking confirmation emails from Airbnb,
                  Booking.com, and Vrbo to this address. Do this once — it works automatically
                  for every new booking.
                </p>
                <IntegrationsClient forwardingAddress={forwardingAddress} />
              </>
            ) : (
              <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <strong>Setup required:</strong> The operator needs to set{" "}
                <code className="rounded bg-amber-100 px-1">INGEST_CENTRAL_EMAIL</code> in the
                server environment before forwarding addresses can be shown.
              </p>
            )}
          </div>

          {/* Gmail filter instructions */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-zinc-800">How to set up the Gmail filter</h3>
            <ol className="mt-3 space-y-2 text-sm text-zinc-700">
              <li>
                <span className="font-medium">1.</span> Open Gmail → click the search bar → click
                the filter icon (⚙) on the right.
              </li>
              <li>
                <span className="font-medium">2.</span> In the <strong>From</strong> field, enter:
                <code className="ml-1 rounded bg-zinc-100 px-1.5 py-0.5 text-xs">
                  automated@airbnb.com OR noreply@booking.com OR no-reply@vrbo.com
                </code>
              </li>
              <li>
                <span className="font-medium">3.</span> Click <strong>"Create filter"</strong>.
              </li>
              <li>
                <span className="font-medium">4.</span> Check <strong>"Forward it to"</strong> →
                paste your forwarding address above → confirm the address if Gmail asks.
              </li>
              <li>
                <span className="font-medium">5.</span> Click <strong>"Create filter"</strong>.
                Done — every future booking confirmation is forwarded automatically.
              </li>
            </ol>
            <p className="mt-3 text-xs text-zinc-400">
              Important: sign up with the same email address you use for Airbnb/Booking.com/Vrbo
              notifications. That&apos;s how the app knows which account a booking belongs to.
            </p>
          </div>

          {/* What happens next */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-zinc-800">What happens when an email is forwarded</h3>
            <ul className="mt-3 space-y-1.5 text-sm text-zinc-700">
              <li>✅ Booking details parsed automatically (check-out date, property, booking ref)</li>
              <li>✅ Cleaning job created with status "New"</li>
              <li>✅ You receive a Telegram notification with a <strong>"🚀 Dispatch"</strong> button</li>
              <li>✅ Tap Dispatch → offer sent to your cleaner — they accept/decline via Telegram</li>
            </ul>
            <p className="mt-3 text-xs text-zinc-500">
              Make sure your{" "}
              <Link href="/dashboard" className="underline hover:no-underline">
                Telegram
              </Link>{" "}
              is linked and at least one property has a cleaner assigned.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
