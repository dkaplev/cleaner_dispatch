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
 * Send when a cleaner declines. If a fallback exists, shows who's next.
 * If no fallback, sends an urgent alert with a CTA to manage manually.
 */
export async function notifyLandlordJobDeclined(
  landlordChatId: string | null | undefined,
  propertyName: string,
  cleanerName: string,
  jobId: string,
  nextCleanerName?: string
): Promise<void> {
  if (!landlordChatId?.trim()) return;
  const url = dashboardJobUrl(jobId);

  if (nextCleanerName) {
    const text =
      `❌ <b>Job declined</b>\n\n` +
      `<b>${escapeTg(propertyName)}</b> — ${escapeTg(cleanerName)} declined.\n` +
      `Offering to <b>${escapeTg(nextCleanerName)}</b> now.`;
    if (url) {
      await sendTelegramMessageWithUrlButton(landlordChatId, text, "View job", url);
    } else {
      await sendTelegramMessage(landlordChatId, text);
    }
  } else {
    // No fallback — urgent: landlord must step in
    const text =
      `🚨 <b>Action needed — no cleaner available</b>\n\n` +
      `<b>${escapeTg(propertyName)}</b>\n` +
      `${escapeTg(cleanerName)} declined and there is no backup cleaner configured for this property.\n\n` +
      `Please open the job and assign a cleaner manually.\n\n` +
      `💡 <i>Tip: add a fallback cleaner in Properties → Edit to avoid this in the future.</i>`;
    if (url) {
      await sendTelegramMessageWithUrlButton(landlordChatId, text, "📋 Manage job", url);
    } else {
      await sendTelegramMessage(landlordChatId, text);
    }
  }
}

/**
 * Send when a cleaner didn't respond within the timeout window and the cron re-dispatches.
 * If a fallback exists, reassures the landlord. If not, sends an urgent alert.
 */
export async function notifyLandlordJobTimedOut(
  landlordChatId: string | null | undefined,
  propertyName: string,
  timedOutCleanerName: string,
  jobId: string,
  nextCleanerName?: string
): Promise<void> {
  if (!landlordChatId?.trim()) return;
  const url = dashboardJobUrl(jobId);

  if (nextCleanerName) {
    const text =
      `⏰ <b>No response — trying next cleaner</b>\n\n` +
      `<b>${escapeTg(propertyName)}</b>\n` +
      `${escapeTg(timedOutCleanerName)} didn't respond in time.\n` +
      `Offering the job to <b>${escapeTg(nextCleanerName)}</b> now.`;
    if (url) {
      await sendTelegramMessageWithUrlButton(landlordChatId, text, "View job", url);
    } else {
      await sendTelegramMessage(landlordChatId, text);
    }
  } else {
    // All cleaners exhausted — landlord must act
    const text =
      `🚨 <b>Action needed — no cleaner responded</b>\n\n` +
      `<b>${escapeTg(propertyName)}</b>\n` +
      `${escapeTg(timedOutCleanerName)} didn't respond and there is no backup cleaner configured for this property.\n\n` +
      `Please open the job and assign a cleaner manually.\n\n` +
      `💡 <i>Tip: add a fallback cleaner in Properties → Edit so the next booking is handled automatically.</i>`;
    if (url) {
      await sendTelegramMessageWithUrlButton(landlordChatId, text, "📋 Manage job", url);
    } else {
      await sendTelegramMessage(landlordChatId, text);
    }
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
