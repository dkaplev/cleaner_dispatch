/**
 * Robust iCal (.ics) parser.
 *
 * Designed around three real-world calendar patterns observed in the wild:
 *
 *  1. Airbnb export  — clean, all events are bookings, UID ends @airbnb.com
 *  2. Booking.com    — clean, all events are bookings, SUMMARY "CLOSED - Not available"
 *  3. Personal/mixed — landlord's own Google/Apple Calendar with guest bookings,
 *                      owner blocks, personal appointments, renovation notes, etc.
 *                      Must apply smart filtering to extract only real guest stays.
 */

export type ParsedEvent = {
  uid: string;
  summary: string;
  checkin: Date;   // DTSTART (all-day events: UTC midnight of that date)
  checkout: Date;  // DTEND   (exclusive in iCal = the checkout day, UTC midnight)
  isDateOnly: boolean;
  status: string;  // CONFIRMED | TENTATIVE | CANCELLED
};

// Keywords in SUMMARY that indicate owner blocks / personal events — NOT guest bookings.
// Covers Russian, English, and common management terms used in European STR calendars.
const SKIP_SUMMARY_KEYWORDS = [
  // Closures / owner blocks
  "closed", "not available", "close by owner", "blocked", "block",
  "unavailable", "owner block", "maintenance", "repair", "remont",
  // Russian
  "ремонт", "уборк", "встреч", "фестивал", "медитац", "пролонг", "продлен",
  // Extension/renewal entries (not a new booking)
  "extension", "prolongation", "renewal",
  // Miscellaneous noise
  "overbooking", "over-booking", "personal", "private", "test",
];

/**
 * Detect booking source from PRODID or UID patterns.
 * Returns a canonical source string matching the CalendarFeed.source enum.
 */
export function detectSource(icsText: string): string {
  const prodLine = icsText.match(/^PRODID[^:\r\n]*:(.+)$/im)?.[1]?.toLowerCase() ?? "";
  if (prodLine.includes("airbnb")) return "airbnb";
  if (prodLine.includes("booking.com")) return "booking_com";
  if (prodLine.includes("vrbo") || prodLine.includes("homeaway")) return "vrbo";
  if (prodLine.includes("expedia")) return "expedia";
  if (prodLine.includes("tripadvisor") || prodLine.includes("flipkey")) return "tripadvisor";
  if (prodLine.includes("hometogo")) return "hometogo";
  if (prodLine.includes("holidu")) return "holidu";
  // Also check UIDs for well-known domains
  if (icsText.includes("@airbnb.com")) return "airbnb";
  if (icsText.includes("@booking.com")) return "booking_com";
  if (icsText.includes("@vrbo.com") || icsText.includes("@homeaway.com")) return "vrbo";
  return "other";
}

/**
 * Parse an iCal date string into a UTC Date.
 * Handles both all-day (VALUE=DATE: YYYYMMDD) and datetime (YYYYMMDDTHHMMSSZ) formats.
 */
function parseICalDate(value: string): Date {
  value = value.trim();
  if (/^\d{8}$/.test(value)) {
    // All-day: YYYYMMDD → UTC midnight
    const y = parseInt(value.slice(0, 4));
    const m = parseInt(value.slice(4, 6)) - 1;
    const d = parseInt(value.slice(6, 8));
    return new Date(Date.UTC(y, m, d));
  }
  // Datetime: YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ
  const iso = value
    .replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/, "$1-$2-$3T$4:$5:$6$7")
    .replace(/([^Z])$/, "$1Z"); // assume UTC if no Z
  const d = new Date(iso);
  return isNaN(d.getTime()) ? new Date(0) : d;
}

/**
 * Unfold iCal line continuations (RFC 5545 §3.1):
 * a CRLF followed by a single whitespace character is a line fold.
 */
function unfoldLines(text: string): string {
  return text.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
}

/**
 * Unescape iCal text values (backslash sequences).
 */
function unescapeValue(v: string): string {
  return v.replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\n/g, "\n").replace(/\\\\/g, "\\");
}

/**
 * Parse all VEVENT blocks from an .ics string.
 * Returns raw parsed events — use filterBookingEvents() to narrow to actual bookings.
 */
export function parseICS(icsText: string): ParsedEvent[] {
  const text = unfoldLines(icsText);
  const lines = text.split(/\r?\n/);
  const events: ParsedEvent[] = [];
  let inEvent = false;
  let cur: Partial<ParsedEvent> & { dtstartRaw?: string; dtendRaw?: string; dtstartParams?: string; dtendParams?: string } = {};

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      cur = { status: "CONFIRMED" };
      continue;
    }
    if (line === "END:VEVENT") {
      inEvent = false;
      // Require both UID and DTSTART to consider valid
      if (cur.uid && cur.dtstartRaw) {
        const isDateOnly = !cur.dtstartParams?.includes("TZID") && (cur.dtstartParams?.includes("VALUE=DATE") || /^\d{8}$/.test(cur.dtstartRaw));
        const checkin  = parseICalDate(cur.dtstartRaw);
        const checkout = cur.dtendRaw ? parseICalDate(cur.dtendRaw) : new Date(checkin.getTime() + 86400_000);
        events.push({
          uid: cur.uid,
          summary: cur.summary ?? "",
          checkin,
          checkout,
          isDateOnly,
          status: cur.status ?? "CONFIRMED",
        });
      }
      cur = {};
      continue;
    }
    if (!inEvent) continue;

    // Split property name (with optional params) from value
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const fullKey = line.slice(0, colonIdx).toUpperCase();
    const value   = line.slice(colonIdx + 1);
    // Key is the part before the first ";"
    const key = fullKey.split(";")[0];

    switch (key) {
      case "UID":     cur.uid = value.trim(); break;
      case "SUMMARY": cur.summary = unescapeValue(value); break;
      case "STATUS":  cur.status  = value.trim().toUpperCase(); break;
      case "DTSTART":
        cur.dtstartRaw    = value.trim();
        cur.dtstartParams = fullKey; // contains VALUE=DATE or TZID if present
        break;
      case "DTEND":
        cur.dtendRaw    = value.trim();
        cur.dtendParams = fullKey;
        break;
    }
  }
  return events;
}

/**
 * Given a list of parsed events and the feed source, return only those
 * that represent actual guest bookings that should trigger a cleaning job.
 *
 * Rules (applied for non-platform calendars):
 *  1. Skip iCal-cancelled events (STATUS:CANCELLED).
 *  2. Skip timed events (not all-day) on personal/mixed calendars — these are
 *     meetings, reminders, 1-hour appointments. Platform calendars always use
 *     date-only events so this rule doesn't affect them.
 *  3. Skip events shorter than 1 night (DTEND − DTSTART < 1 day).
 *  4. Skip events whose SUMMARY matches known non-booking keywords.
 *
 * Platform calendars (airbnb, booking_com, vrbo, expedia, tripadvisor,
 * hometogo, holidu) skip rules 2-4 — all their events ARE bookings.
 */
export function filterBookingEvents(events: ParsedEvent[], source: string): ParsedEvent[] {
  const isPlatform = ["airbnb", "booking_com", "vrbo", "expedia", "tripadvisor", "hometogo", "holidu"].includes(source);

  return events.filter((e) => {
    // Always skip iCal-cancelled events
    if (e.status === "CANCELLED") return false;

    if (!isPlatform) {
      // Skip short timed events (meetings, reminders)
      if (!e.isDateOnly) return false;

      // Must span at least 1 night
      const nights = (e.checkout.getTime() - e.checkin.getTime()) / 86400_000;
      if (nights < 1) return false;

      // Skip owner blocks / personal events by SUMMARY keyword
      const sl = e.summary.toLowerCase();
      if (SKIP_SUMMARY_KEYWORDS.some((kw) => sl.includes(kw))) return false;
    }

    return true;
  });
}
