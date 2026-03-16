/**
 * Calendar feed sync engine.
 *
 * Fetches an iCal URL, diffs it against previously-seen bookings,
 * and creates / updates / cancels cleaning jobs accordingly.
 */

import type { getPrisma } from "@/lib/prisma";
import { parseICS, filterBookingEvents } from "@/lib/ics-parser";
import { dispatchJob } from "@/lib/dispatch";
import { sendTelegramMessageWithUrlButton, sendTelegramMessage } from "@/lib/telegram";

type PrismaClient = Awaited<ReturnType<typeof getPrisma>>;

// ── Date helpers ──────────────────────────────────────────────────────────────

/** Format a UTC Date as YYYY-MM-DD for comparison / display. */
function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Compute cleaning window based on property's cleaning_trigger setting. */
function buildWindow(
  checkin: Date,
  checkout: Date,
  cleaningTrigger: string,
  checkinDefault: Date | null
): { window_start: Date; window_end: Date } {
  // checkout day starts at 11:00 UTC (default checkout time)
  const checkoutDay = new Date(checkout);
  checkoutDay.setUTCHours(11, 0, 0, 0);

  // checkin day ends at 15:00 UTC (default check-in time, or from property setting)
  const checkinDay = new Date(checkin);
  const checkinHour = checkinDefault
    ? checkinDefault.getUTCHours() || 15
    : 15;
  checkinDay.setUTCHours(checkinHour, 0, 0, 0);

  if (cleaningTrigger === "before_checkin") {
    // clean up to 4 hours before check-in on the check-in day
    const end = new Date(checkinDay);
    const start = new Date(end.getTime() - 4 * 3600_000);
    return { window_start: start, window_end: end };
  }
  if (cleaningTrigger === "both") {
    // use checkout window (first job); "before_checkin" job is a future enhancement
    return { window_start: checkoutDay, window_end: new Date(checkoutDay.getTime() + 4 * 3600_000) };
  }
  // default: after_checkout
  return {
    window_start: checkoutDay,
    window_end: new Date(checkoutDay.getTime() + 4 * 3600_000),
  };
}

// ── Notify landlord ───────────────────────────────────────────────────────────

async function notifyBookingChange(
  chatId: string,
  propertyName: string,
  jobId: string,
  type: "updated" | "cancelled",
  oldCheckin: string,
  newCheckin?: string
) {
  const baseUrl = process.env.NEXTAUTH_URL ?? "https://cleaner-dispatch.vercel.app";
  const jobUrl = `${baseUrl}/dashboard/cleanings/${jobId}`;
  if (type === "cancelled") {
    const text =
      `🚫 <b>Booking cancelled</b>\n` +
      `Property: ${propertyName}\n` +
      `Check-in was: ${oldCheckin}\n\n` +
      `The associated cleaning job has been cancelled automatically.`;
    try {
      await sendTelegramMessageWithUrlButton(chatId, text, "📋 View job", jobUrl);
    } catch {
      await sendTelegramMessage(chatId, text);
    }
  } else {
    const text =
      `📅 <b>Booking dates updated</b>\n` +
      `Property: ${propertyName}\n` +
      `Old check-in: ${oldCheckin}\n` +
      `New check-in: ${newCheckin ?? "?"}\n\n` +
      `The cleaning job window has been updated accordingly.`;
    try {
      await sendTelegramMessageWithUrlButton(chatId, text, "📋 View job", jobUrl);
    } catch {
      await sendTelegramMessage(chatId, text);
    }
  }
}

// ── Core sync function ────────────────────────────────────────────────────────

export type SyncResult = {
  feedId: string;
  created: number;
  updated: number;
  cancelled: number;
  skipped: number;
  error?: string;
};

/**
 * Sync a single calendar feed.
 * Returns a summary of what changed.
 */
export async function syncCalendarFeed(
  prisma: PrismaClient,
  feedId: string
): Promise<SyncResult> {
  const result: SyncResult = { feedId, created: 0, updated: 0, cancelled: 0, skipped: 0 };

  const feed = await prisma.calendarFeed.findUnique({
    where: { id: feedId },
    include: {
      property: {
        select: {
          id: true,
          name: true,
          landlord_id: true,
          cleaning_trigger: true,
          checkin_time_default: true,
          landlord: { select: { telegram_chat_id: true } },
        },
      },
    },
  });
  if (!feed) { result.error = "Feed not found"; return result; }

  // ── 1. Fetch the iCal URL ──────────────────────────────────────────────────
  let icsText: string;
  try {
    const res = await fetch(feed.url, {
      headers: { "User-Agent": "CleanerDispatch/1.0 (calendar sync)" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    icsText = await res.text();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await prisma.calendarFeed.update({ where: { id: feedId }, data: { sync_error: msg } });
    result.error = msg;
    return result;
  }

  // ── 2. Parse + filter events ───────────────────────────────────────────────
  const allEvents  = parseICS(icsText);
  const bookings   = filterBookingEvents(allEvents, feed.source);
  const incomingMap = new Map(bookings.map((e) => [e.uid, e]));

  // ── 3. Load existing CalendarBookings for this feed ────────────────────────
  const existing = await prisma.calendarBooking.findMany({
    where: { feed_id: feedId },
  });
  const existingMap = new Map(existing.map((b) => [b.uid, b]));

  const { property } = feed;

  // ── 4. Process incoming events ─────────────────────────────────────────────
  for (const [uid, event] of incomingMap) {
    const known = existingMap.get(uid);

    if (!known) {
      // ── NEW BOOKING ──────────────────────────────────────────────────────
      const { window_start, window_end } = buildWindow(
        event.checkin,
        event.checkout,
        property.cleaning_trigger,
        property.checkin_time_default
      );

      // Create the Job
      const job = await prisma.job.create({
        data: {
          landlord_id: property.landlord_id,
          property_id: property.id,
          window_start,
          window_end,
          status: "new",
        },
      });

      // Record the CalendarBooking
      await prisma.calendarBooking.create({
        data: {
          feed_id: feedId,
          uid,
          checkin:  event.checkin,
          checkout: event.checkout,
          job_id:   job.id,
          status:   "active",
        },
      });

      // Dispatch to cleaner
      await dispatchJob(prisma, job.id);

      result.created++;
    } else if (known.status === "active") {
      // ── CHECK FOR DATE CHANGE ────────────────────────────────────────────
      const checkinChanged  = toDateStr(known.checkin)  !== toDateStr(event.checkin);
      const checkoutChanged = toDateStr(known.checkout) !== toDateStr(event.checkout);

      if (checkinChanged || checkoutChanged) {
        const { window_start, window_end } = buildWindow(
          event.checkin,
          event.checkout,
          property.cleaning_trigger,
          property.checkin_time_default
        );

        // Update the linked job's window if it isn't already completed/cancelled
        if (known.job_id) {
          const job = await prisma.job.findUnique({ where: { id: known.job_id } });
          if (job && !["completed", "cancelled"].includes(job.status)) {
            await prisma.job.update({
              where: { id: known.job_id },
              data: { window_start, window_end },
            });

            // Notify landlord of the change
            const chatId = property.landlord.telegram_chat_id;
            if (chatId) {
              await notifyBookingChange(
                chatId,
                property.name,
                known.job_id,
                "updated",
                toDateStr(known.checkin),
                toDateStr(event.checkin)
              );
            }
          }
        }

        // Update CalendarBooking record
        await prisma.calendarBooking.update({
          where: { id: known.id },
          data: { checkin: event.checkin, checkout: event.checkout },
        });

        result.updated++;
      } else {
        result.skipped++;
      }
    }
  }

  // ── 5. Detect cancellations (UIDs no longer in the feed) ──────────────────
  for (const [uid, known] of existingMap) {
    if (known.status !== "active") continue;
    if (incomingMap.has(uid)) continue;

    // Booking disappeared → cancel
    await prisma.calendarBooking.update({
      where: { id: known.id },
      data: { status: "cancelled" },
    });

    if (known.job_id) {
      const job = await prisma.job.findUnique({ where: { id: known.job_id } });
      if (job && !["completed", "cancelled"].includes(job.status)) {
        await prisma.job.update({ where: { id: known.job_id }, data: { status: "cancelled" } });

        const chatId = property.landlord.telegram_chat_id;
        if (chatId) {
          await notifyBookingChange(
            chatId,
            property.name,
            known.job_id,
            "cancelled",
            toDateStr(known.checkin)
          );
        }
      }
    }

    result.cancelled++;
  }

  // ── 6. Update feed metadata ────────────────────────────────────────────────
  await prisma.calendarFeed.update({
    where: { id: feedId },
    data: { last_synced_at: new Date(), sync_error: null },
  });

  return result;
}

/**
 * Sync all active calendar feeds. Called by the hourly cron.
 */
export async function syncAllCalendarFeeds(prisma: PrismaClient): Promise<SyncResult[]> {
  const feeds = await prisma.calendarFeed.findMany({ select: { id: true } });
  const results: SyncResult[] = [];
  for (const feed of feeds) {
    try {
      results.push(await syncCalendarFeed(prisma, feed.id));
    } catch (e) {
      results.push({ feedId: feed.id, created: 0, updated: 0, cancelled: 0, skipped: 0, error: String(e) });
    }
  }
  return results;
}
