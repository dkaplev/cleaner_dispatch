/**
 * Notify the landlord via Telegram for key job events.
 * Keeps them in control and aware without spamming (only: accepted, declined, job done).
 */

import { sendTelegramMessage, sendTelegramMessageWithUrlButton, sendTelegramLandlordBookingMessage } from "@/lib/telegram";

function dashboardJobUrl(jobId: string): string {
  const base = process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "";
  return base ? `${base}/dashboard/jobs/${jobId}` : "";
}

function escapeTg(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Send when a cleaner accepts a job. Landlord knows who is on it and feels in control.
 */
export async function notifyLandlordJobAccepted(
  landlordChatId: string | null | undefined,
  propertyName: string,
  cleanerName: string,
  jobId: string
): Promise<void> {
  if (!landlordChatId?.trim()) return;
  const text =
    `✅ <b>Job accepted</b>\n\n` +
    `<b>${escapeTg(propertyName)}</b> — ${escapeTg(cleanerName)} has accepted. You're all set.`;
  const url = dashboardJobUrl(jobId);
  if (url) {
    await sendTelegramMessageWithUrlButton(
      landlordChatId,
      text,
      "View job",
      url
    );
  } else {
    await sendTelegramMessage(landlordChatId, text);
  }
}

/**
 * Send when a cleaner declines. Landlord knows we're trying the next cleaner or that they need to step in.
 */
export async function notifyLandlordJobDeclined(
  landlordChatId: string | null | undefined,
  propertyName: string,
  cleanerName: string,
  jobId: string,
  nextCleanerName?: string
): Promise<void> {
  if (!landlordChatId?.trim()) return;
  const nextLine = nextCleanerName
    ? `We've offered the job to <b>${escapeTg(nextCleanerName)}</b>.`
    : "No other cleaner available — please assign in the dashboard.";
  const text =
    `❌ <b>Job declined</b>\n\n` +
    `<b>${escapeTg(propertyName)}</b> — ${escapeTg(cleanerName)} declined. ${nextLine}`;
  const url = dashboardJobUrl(jobId);
  if (url) {
    await sendTelegramMessageWithUrlButton(
      landlordChatId,
      text,
      "View job",
      url
    );
  } else {
    await sendTelegramMessage(landlordChatId, text);
  }
}

/**
 * Notify landlord when a booking is automatically ingested (via email forwarding).
 * Shows booking details + cleaning order preview, and offers two buttons:
 *   "Dispatch" — sends the offer to the primary/fallback cleaner immediately.
 *   "Manage in app" — opens the job page in the dashboard.
 */
export async function notifyLandlordNewIngestedBooking(
  landlordChatId: string | null | undefined,
  {
    jobId,
    propertyName,
    windowStart,
    windowEnd,
    bookingRef,
    channelPropertyName,
    primaryCleanerName,
    fallbackCleanerNames,
    propertyAutoFallback,
    platform,
    extraWindows,
  }: {
    jobId: string;
    propertyName: string;
    windowStart: Date;
    windowEnd: Date;
    bookingRef?: string | null;
    channelPropertyName?: string | null;
    primaryCleanerName?: string | null;
    fallbackCleanerNames?: string[];
    propertyAutoFallback?: boolean;
    platform?: string | null;
    extraWindows?: Array<{ window_start: Date; window_end: Date }>;
  }
): Promise<void> {
  if (!landlordChatId?.trim()) return;

  const windowStr =
    `${windowStart.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} – ` +
    `${windowEnd.toLocaleTimeString(undefined, { timeStyle: "short" })}`;

  let msg = `📩 <b>New booking received</b>\n\n`;
  if (platform) msg += `Platform: <b>${escapeTg(platform)}</b>\n`;
  if (propertyAutoFallback && channelPropertyName) {
    msg += `⚠️ "<b>${escapeTg(channelPropertyName)}</b>" not matched — defaulted to <b>${escapeTg(propertyName)}</b>.\nSet the channel name in Properties → Edit to auto-match next time.\n\n`;
  } else if (channelPropertyName && channelPropertyName.trim() !== propertyName.trim()) {
    msg += `Channel listing: ${escapeTg(channelPropertyName)}\n`;
  }
  msg += `Property: <b>${escapeTg(propertyName)}</b>\n`;
  msg += `Cleaning window: ${escapeTg(windowStr)}\n`;
  if (extraWindows?.length) {
    for (const w of extraWindows) {
      const wStr =
        `${w.window_start.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} – ` +
        `${w.window_end.toLocaleTimeString(undefined, { timeStyle: "short" })}`;
      msg += `Cleaning window: ${escapeTg(wStr)}\n`;
    }
  }
  if (bookingRef) msg += `Booking ref: <code>${escapeTg(bookingRef)}</code>\n`;

  msg += `\n`;
  if (primaryCleanerName) {
    const fallbackStr =
      fallbackCleanerNames?.length
        ? ` → ${fallbackCleanerNames.map(escapeTg).join(" → ")} (fallback)`
        : "";
    msg += `Will offer to: <b>${escapeTg(primaryCleanerName)}</b>${fallbackStr}\n\n`;
    msg += `Press <b>Dispatch</b> to send the offer now.`;
  } else {
    msg += `⚠️ No cleaner configured for this property.\nPress <b>Manage in app</b> to assign one manually.`;
  }

  const jobUrl = dashboardJobUrl(jobId);
  try {
    await sendTelegramLandlordBookingMessage(landlordChatId, msg, jobId, jobUrl);
  } catch {
    await sendTelegramMessage(landlordChatId, msg);
  }
}

/**
 * Send when cleaning is done and photos are uploaded. CRITICAL: landlord knows the property is ready for the next tenant.
 */
export async function notifyLandlordJobDone(
  landlordChatId: string | null | undefined,
  propertyName: string,
  jobId: string,
  photoCount: number
): Promise<void> {
  if (!landlordChatId?.trim()) return;
  const text =
    `🏠 <b>Cleaning completed</b>\n\n` +
    `<b>${escapeTg(propertyName)}</b> — ${photoCount} photo(s) uploaded. Property is ready for the next guest. Please review and rate the cleaner.`;
  const url = dashboardJobUrl(jobId);
  if (url) {
    await sendTelegramMessageWithUrlButton(
      landlordChatId,
      text,
      "Review & rate",
      url
    );
  } else {
    await sendTelegramMessage(landlordChatId, text);
  }
}
