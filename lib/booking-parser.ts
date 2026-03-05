/**
 * Parse booking confirmation text (e.g. from forwarded email) to extract
 * check-out/check-in dates, property name (per channel), and booking/reference ID.
 * Used by Import booking (paste) and email ingest webhook.
 *
 * Rules:
 * - Check-out/check-in come only from lines explicitly labeled (Check-out, Departure, Check-in, Arrival).
 *   Never use "Booking Date", "Date:", "Booked On", "Reservation Created" for checkout.
 * - Reservation/booking ID: prefer value on the next line after "Booking Reference", "Confirmation Code", "Reservation ID".
 *   Reject junk words (Notification, Date, Partner, etc.).
 * - Property name: take the line after "Property Name", "Listing Name", "Listing" for channel→property mapping.
 */

export type ParsedBooking = {
  /** Check-out date (guest leaves) — cleaning window starts after this. */
  checkoutDate: Date | null;
  /** Check-in date (next guest arrives) — optional. */
  checkinDate: Date | null;
  /** Time on checkout day (e.g. 11:00) if found on the same line as checkout; otherwise null → use property default. */
  checkoutTime: { hours: number; minutes: number } | null;
  /** Property/listing name as shown by the channel (for mapping to our property). */
  propertyName: string | null;
  /** Raw reservation/booking reference if found (e.g. BDC-2025-7841936, HMXZ4R8K2). */
  bookingId: string | null;
};

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Parse various date formats; returns Date in local time or null. */
function parseDate(str: string): Date | null {
  const s = str.trim();
  // ISO-like: 2025-03-16
  const iso = /(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) {
    const d = new Date(parseInt(iso[1], 10), parseInt(iso[2], 10) - 1, parseInt(iso[3], 10));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const months: Record<string, number> = {
    jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
    may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8, september: 8,
    oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
  };
  const parts = s.toLowerCase().replace(/,/g, " ").split(/\s+/);
  let day: number | null = null;
  let month: number | null = null;
  let year: number | null = null;
  for (let i = 0; i < parts.length; i++) {
    const n = parseInt(parts[i], 10);
    if (!Number.isNaN(n)) {
      if (n >= 1 && n <= 31 && day === null) day = n;
      else if (n >= 1900 && n <= 2100) year = n;
    }
    const m = months[parts[i].replace(/[^a-z]/g, "")];
    if (m !== undefined) month = m;
  }
  if (day !== null && month !== null && year !== null) {
    const d = new Date(year, month, day);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const slash = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);
  if (slash) {
    const a = parseInt(slash[1], 10);
    const b = parseInt(slash[2], 10);
    const y = parseInt(slash[3], 10);
    const dayFirst = a >= 1 && a <= 31 && b >= 1 && b <= 12;
    const d = dayFirst ? new Date(y, b - 1, a) : new Date(y, a - 1, b);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function parseTime(str: string): { hours: number; minutes: number } | null {
  const m = str.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ampm = (m[3] || "").toLowerCase();
  if (ampm === "pm" && h < 12) h += 12;
  if (ampm === "am" && h === 12) h = 0;
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return { hours: h, minutes: min };
}

/** True if the line is a document/metadata date (e.g. "Date: 14 May 2025", "Booking Date", "Booked On") — never use for checkout. */
function isDocumentDateLine(line: string): boolean {
  const t = line.toLowerCase().trim();
  return (
    /^(date|booking date|booked on|reservation created)\s*[:]?\s*/i.test(t) ||
    /^date:\s*\d/i.test(t)
  );
}

/** True if the line looks like a stay date (check-out/check-in), not a "when the booking was made" date. */
function looksLikeStayDateLine(line: string): boolean {
  if (isDocumentDateLine(line)) return false;
  const d = parseDate(line);
  return d !== null && d >= new Date();
}

/** True if the line is only a checkout/check-in label with no date on it (so we use next line). */
function isOnlyCheckoutLabel(line: string): boolean {
  const trimmed = line.trim();
  if (!/check\s*[- ]?out|departure|leave|vacate/i.test(trimmed)) return false;
  const afterLabel = trimmed.replace(/check\s*[- ]?out|departure|leave|vacate/i, "").replace(/date\s*$/i, "").trim();
  return afterLabel.length < 5 || parseDate(afterLabel) === null;
}

function isOnlyCheckinLabel(line: string): boolean {
  const trimmed = line.trim();
  if (!/check\s*[- ]?in|arrival|arrive/i.test(trimmed)) return false;
  const afterLabel = trimmed.replace(/check\s*[- ]?in|arrival|arrive/i, "").replace(/date\s*$/i, "").trim();
  return afterLabel.length < 5 || parseDate(afterLabel) === null;
}

/** Labels for reservation/booking ID when value is typically on the next line. */
const BOOKING_ID_LABELS = /^(?:booking\s+reference|confirmation\s+code|reservation\s+id|confirmation\s+id)\s*$/i;

/** Reject captured "IDs" that are just common words. */
const JUNK_ID_WORDS = new Set(
  "notification date partner code name id team services details reminder".split(" ")
);

function looksLikeBookingId(value: string): boolean {
  const v = value.trim();
  if (v.length < 5) return false;
  if (JUNK_ID_WORDS.has(v.toLowerCase())) return false;
  if (/^\d+$/.test(v)) return true;
  if (/\d/.test(v) && /^[A-Za-z0-9\-]+$/.test(v)) return true;
  if (v.length >= 8 && /^[A-Za-z0-9\-]+$/.test(v)) return true;
  return false;
}

/** Labels for property/listing name when value is on the next line. */
const PROPERTY_NAME_LABELS = /^(?:property\s+name|listing\s+name|listing|accommodation)\s*$/i;

export function parseBookingText(text: string): ParsedBooking {
  const raw = typeof text === "string" ? text : "";
  const plain = stripHtml(raw);
  const lines = plain.split(/\n/).map((l) => l.trim()).filter(Boolean);

  let checkoutDate: Date | null = null;
  let checkinDate: Date | null = null;
  let checkoutTime: { hours: number; minutes: number } | null = null;
  let propertyName: string | null = null;
  let bookingId: string | null = null;

  const checkoutLabel = /check\s*[- ]?out|departure|leave|vacate/i;
  const checkinLabel = /check\s*[- ]?in|arrival|arrive/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = i + 1 < lines.length ? lines[i + 1] : "";

    // —— Check-out: only from explicit checkout lines; never from "Booking Date" / "Date:" / "Booked On"
    if (checkoutLabel.test(line) && !isDocumentDateLine(line)) {
      const datePart = line.replace(checkoutLabel, "").replace(/\bdate\s*$/i, "").replace(/[:\s]+/, " ").trim();
      let d = parseDate(datePart) || parseDate(line);
      let t: { hours: number; minutes: number } | null = parseTime(datePart) || parseTime(line);
      if (!d && isOnlyCheckoutLabel(line) && nextLine && looksLikeStayDateLine(nextLine)) {
        d = parseDate(nextLine);
        if (!t) t = parseTime(nextLine);
      }
      if (d) {
        checkoutDate = d;
        if (t) checkoutTime = t;
      }
    }

    // —— Check-in: only from explicit check-in lines (for display; we use checkout for the job window)
    if (checkinLabel.test(line) && !isDocumentDateLine(line)) {
      let d = parseDate(line.replace(checkinLabel, "").replace(/\bdate\s*$/i, "").trim()) || parseDate(line);
      if (!d && isOnlyCheckinLabel(line) && nextLine && looksLikeStayDateLine(nextLine)) {
        d = parseDate(nextLine);
      }
      if (d) checkinDate = d;
    }

    // —— Booking/Reservation ID: label on one line, value on next (e.g. "Booking Reference" → "BDC-2025-7841936")
    if (BOOKING_ID_LABELS.test(line) && nextLine && looksLikeBookingId(nextLine) && !bookingId) {
      bookingId = nextLine.trim();
    }
    // Same-line ID only if it looks like a real ID (avoid "Notification", "Date", etc.)
    const sameLineId = line.match(/(?:booking\s+reference|confirmation\s+code|reservation\s+id)\s*[:\s]+([A-Za-z0-9\-]{5,})/i);
    if (sameLineId && !bookingId && looksLikeBookingId(sameLineId[1])) {
      bookingId = sameLineId[1];
    }

    // —— Property name: label on one line, value on next (e.g. "Property Name" → "Sunset Villa Paphos")
    if (PROPERTY_NAME_LABELS.test(line) && nextLine && nextLine.length > 0 && nextLine.length < 200 && !propertyName) {
      propertyName = nextLine.trim();
    }
  }

  // Fallback: only if we still have no checkout and no checkin — and only use lines that are clearly stay dates, not "Date:" or "Booking Date"
  if (!checkoutDate && !checkinDate) {
    for (const line of lines) {
      if (isDocumentDateLine(line)) continue;
      const d = parseDate(line);
      if (d && d >= new Date()) {
        checkoutDate = d;
        const t = parseTime(line);
        if (t) checkoutTime = t;
        break;
      }
    }
  }

  return {
    checkoutDate,
    checkinDate,
    checkoutTime,
    propertyName: propertyName || null,
    bookingId: bookingId || null,
  };
}

/**
 * Build window_start and window_end for a job from parsed booking and property defaults.
 * checkoutTimeDefault is the property's default checkout time (e.g. 11:00) as "HH:mm".
 */
export function bookingToWindow(
  parsed: ParsedBooking,
  propertyCheckoutTime: string | null,
  cleaningDurationMinutes: number
): { window_start: Date; window_end: Date } | null {
  const date = parsed.checkoutDate;
  if (!date) return null;

  let hours = 11;
  let minutes = 0;
  if (parsed.checkoutTime) {
    hours = parsed.checkoutTime.hours;
    minutes = parsed.checkoutTime.minutes;
  } else if (propertyCheckoutTime) {
    const [h, m] = propertyCheckoutTime.split(":").map((x) => parseInt(x, 10));
    if (!Number.isNaN(h)) hours = h;
    if (!Number.isNaN(m)) minutes = m;
  }

  const window_start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0, 0);
  const window_end = new Date(window_start.getTime() + cleaningDurationMinutes * 60 * 1000);
  return { window_start, window_end };
}
