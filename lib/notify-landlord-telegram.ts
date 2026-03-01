/**
 * Notify the landlord via Telegram for key job events.
 * Keeps them in control and aware without spamming (only: accepted, declined, job done).
 */

import { sendTelegramMessage, sendTelegramMessageWithUrlButton } from "@/lib/telegram";

function dashboardJobUrl(jobId: string): string {
  const base = process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "";
  return base ? `${base}/dashboard/jobs/${jobId}/edit` : "";
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
