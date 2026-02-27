import type { getPrisma } from "@/lib/prisma";
import { generateOfferToken } from "@/lib/dispatch-token";
import { sendTelegramOfferMessage } from "@/lib/telegram";

const DEFAULT_RESPONSE_MINUTES = 10;

/** Minutes a cleaner has to accept/decline before the offer may be routed to the next cleaner. From env RESPONSE_MINUTES (default 10). */
export function getResponseMinutes(): number {
  const v = process.env.RESPONSE_MINUTES;
  if (v === undefined || v === "") return DEFAULT_RESPONSE_MINUTES;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_RESPONSE_MINUTES;
}

function formatJobWindow(start: Date, end: Date): string {
  return `${start.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} – ${end.toLocaleTimeString(undefined, { timeStyle: "short" })}`;
}

/**
 * Offer a job to a cleaner: pick primary (or next available), send Telegram offer with Accept/Decline, create dispatch_attempt.
 * Skips cleaners that already have a DispatchAttempt for this job (any status).
 * Caller must pass a Prisma client and ensure the job belongs to the authenticated landlord.
 */
export async function dispatchJob(
  prisma: Awaited<ReturnType<typeof getPrisma>>,
  jobId: string
): Promise<
  | { success: true; attempt: { id: string; cleaner_id: string; cleaner_name: string } }
  | { success: false; error: string }
> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      property: { select: { id: true, name: true, landlord_id: true } },
    },
  });
  if (!job) return { success: false, error: "Job not found" };
  if (job.status !== "new" && job.status !== "offered") {
    return { success: false, error: "Job can only be offered when status is new or offered" };
  }

  // Cleaners already tried for this job (any status)
  const previousAttempts = await prisma.dispatchAttempt.findMany({
    where: { job_id: jobId },
    select: { cleaner_id: true },
  });
  const triedCleanerIds = new Set(previousAttempts.map((a) => a.cleaner_id));

  // Resolve cleaner: primary for this property, then fallbacks by priority, skipping already-tried cleaners.
  const propertyId = job.property_id;
  const landlordId = job.landlord_id;

  const primaryOrFallback = await prisma.propertyCleaner.findMany({
    where: { property_id: propertyId },
    include: { cleaner: { select: { id: true, name: true, telegram_chat_id: true } } },
    orderBy: [{ is_primary: "desc" }, { priority: "asc" }],
  });

  const eligibleFromProperty = primaryOrFallback
    .map((pc) => pc.cleaner)
    .filter(
      (c) => c.telegram_chat_id?.trim() && !triedCleanerIds.has(c.id)
    );

  let cleaner: { id: string; name: string; telegram_chat_id: string | null } | undefined =
    eligibleFromProperty[0];

  // Fallback: any other landlord cleaner with Telegram not yet tried for this job
  if (!cleaner) {
    const anyCleaner = await prisma.cleaner.findFirst({
      where: {
        landlord_id: landlordId,
        is_active: true,
        telegram_chat_id: { not: null },
        id: { notIn: Array.from(triedCleanerIds) },
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, telegram_chat_id: true },
    });
    cleaner = anyCleaner ?? undefined;
  }

  if (!cleaner?.telegram_chat_id?.trim()) {
    return {
      success: false,
      error: "No cleaner with Telegram linked (or all eligible cleaners already tried for this job).",
    };
  }

  const offerToken = generateOfferToken();
  const attempt = await prisma.dispatchAttempt.create({
    data: {
      job_id: jobId,
      cleaner_id: cleaner.id,
      offer_token: offerToken,
      offer_status: "sent",
    },
    select: { id: true, cleaner_id: true, cleaner: { select: { name: true } } },
  });

  const responseMinutes = getResponseMinutes();
  const messageText =
    `🧹 <b>Cleaning job</b>\n\n` +
    `Property: <b>${escapeTg(job.property.name)}</b>\n` +
    `Window: ${formatJobWindow(job.window_start, job.window_end)}\n\n` +
    `Tap Accept to take this job, or Decline to pass.\n` +
    `You have about ${responseMinutes} minutes before we may offer this job to someone else.`;

  try {
    await sendTelegramOfferMessage(
      cleaner.telegram_chat_id!,
      messageText,
      offerToken
    );
  } catch (e) {
    console.error("[dispatch] Telegram send failed:", e);
    await prisma.dispatchAttempt.update({
      where: { id: attempt.id },
      data: { offer_status: "cancelled" },
    });
    return { success: false, error: "Failed to send Telegram message" };
  }

  await prisma.job.update({
    where: { id: jobId },
    data: { status: "offered" },
  });

  return {
    success: true,
    attempt: {
      id: attempt.id,
      cleaner_id: attempt.cleaner_id,
      cleaner_name: attempt.cleaner.name,
    },
  };
}

function escapeTg(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
