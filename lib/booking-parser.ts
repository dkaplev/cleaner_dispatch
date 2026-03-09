/**
 * Parse booking confirmation text (e.g. from forwarded email) to extract
 * check-out/check-in dates, property name (per channel), and booking/reference ID.
 *
 * Checkout date/time: taken ONLY from the line that is explicitly labeled
 * "Check-out" / "Departure" (or the immediate next line). We never use
 * "Booking Date", "Date:", "Booked On", "Reservation Created", "Payout", etc.
 * No fallback to "first date in text" — if we don't find a labeled checkout, we return null.
 */

export type ParsedBooking = {
  checkoutDate: Date | null;
  checkinDate: Date | null;
  checkoutTime: { hours: number; minutes: number } | null;
  propertyName: string | null;
  bookingId: string | null;
};

function stripHtml(input: string): string {
  // Plain text (no tags): preserve line structure as-is
  if (!/<[a-zA-Z]/.test(input)) return input;
  // HTML: convert block-level elements to newlines first, then strip all remaining tags
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<\/?(br|p|div|tr|td|th|li|h[1-6])\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    // Normalize spaces within each line but preserve line breaks
    .split("\n")
    .map((l) => l.replace(/[ \t]+/g, " ").trim())
    .filter((l) => l.length > 0)
    .join("\n")
    .trim();
}

const MONTH_NAMES = /(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)/i;

/** Parse date from string; must contain a month name to be valid. Returns null for metadata dates. */
function parseDate(str: string): Date | null {
  const s = str.trim();
  if (!MONTH_NAMES.test(s)) return null;
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

/** Lines that are document/metadata — never use for checkout/checkin date. */
function isBlacklistedDateLine(line: string): boolean {
  const t = line.toLowerCase();
  return (
    /^date\s*:\s*\d/.test(t) ||
    /\bbooking\s+date\b/.test(t) ||
    /\bbooked\s+on\b/.test(t) ||
    /\breservation\s+created\b/.test(t) ||
    /\bpayout\s+(date|schedule|released)/.test(t) ||
    /\bpayment\s+/.test(t) ||
    /\bcancellation\s+policy\b/.test(t) ||
    /\breleased\s+\d+\s+hours?\s+after\b/.test(t) ||
    /\b1\s+day\s+after\s+guest\s+check-in\b/.test(t) ||
    // "14 May 2025 at 09:47 (CET)" — creation timestamp, not stay date
    /\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}\s+at\s+\d{1,2}:\d{2}/.test(t) ||
    /\d{4}\s+at\s+\d{1,2}:\d{2}\s*\(/.test(t)
  );
}

/** True if this line is ONLY a checkout/departure label (no calendar date on it; we'll use next line for date). */
function isCheckoutLabelOnly(line: string): boolean {
  const t = line.trim().toLowerCase();
  if (!t) return false;
  const withoutLabel = t
    .replace(/^check\s*[- ]?out\s*(date)?\s*$/i, "")
    .replace(/^departure\s*(date)?\s*$/i, "")
    .replace(/^leave\s*$/i, "")
    .replace(/^vacate\s*$/i, "")
    .trim();
  return withoutLabel.length === 0;
}

/** True if this line is a checkout/departure label (may have date on same line). */
function isCheckoutLabel(line: string): boolean {
  const t = line.trim();
  return /^check\s*[- ]?out(\s+date)?\s*$/i.test(t) || /^departure(\s+date)?\s*$/i.test(t) || /^leave\s*$/i.test(t) || /^vacate\s*$/i.test(t);
}

/** True if this line is ONLY a check-in/arrival label. */
function isCheckinLabelOnly(line: string): boolean {
  const t = line.trim().toLowerCase();
  const withoutLabel = t
    .replace(/^check\s*[- ]?in\s*(date)?\s*$/i, "")
    .replace(/^arrival\s*(date)?\s*$/i, "")
    .replace(/^arrive\s*$/i, "")
    .trim();
  return withoutLabel.length === 0;
}

function isCheckinLabel(line: string): boolean {
  const t = line.trim();
  return /^check\s*[- ]?in(\s+date)?\s*$/i.test(t) || /^arrival(\s+date)?\s*$/i.test(t) || /^arrive\s*$/i.test(t);
}

/** Time from a line is only valid if it looks like stay time (e.g. "before 11:00"), not creation time ("at 09:47 (CET)"). */
function parseStayTime(line: string): { hours: number; minutes: number } | null {
  if (/\d{4}\s+at\s+\d{1,2}:\d{2}\s*\(/.test(line)) return null;
  if (/\bat\s+\d{1,2}:\d{2}\s*\(?(CET|EET|UTC)/i.test(line)) return null;
  return parseTime(line);
}

const BOOKING_ID_LABELS = /^(?:booking\s+reference|confirmation\s+code|reservation\s+id|confirmation\s+id)\s*$/i;
const JUNK_ID_WORDS = new Set("notification date partner code name id team services details reminder".split(" "));
function looksLikeBookingId(value: string): boolean {
  const v = value.trim();
  if (v.length < 5) return false;
  if (JUNK_ID_WORDS.has(v.toLowerCase())) return false;
  if (/\d/.test(v) && /^[A-Za-z0-9\-]+$/.test(v)) return true;
  if (v.length >= 8 && /^[A-Za-z0-9\-]+$/.test(v)) return true;
  return false;
}
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

  // —— 1) Check-out: supports two formats:
  //    a) Label-only line → date on next line  ("Check-out\nMonday, 30 June 2025")
  //    b) Inline           → label + date same line ("Check-out Monday, 30 June 2025" or "Check-out: ...")
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // (a) label is the entire line → date is on the next line
    if (isCheckoutLabelOnly(line)) {
      let next = i + 1;
      while (next < lines.length && lines[next].trim().toLowerCase() === "date") next++;
      if (next >= lines.length) continue;
      const dateLine = lines[next];
      if (isBlacklistedDateLine(dateLine) || !MONTH_NAMES.test(dateLine)) continue;
      const d = parseDate(dateLine);
      if (d) { checkoutDate = d; checkoutTime = parseStayTime(dateLine); }
      break;
    }

    // (b) label + date on same line, e.g. "Check-out Monday, 30 June 2025 (before 11:00)"
    //     or "Check-out: 30 June 2025"
    const inlineMatch = line.match(/^check\s*[- ]?out(?:\s+date)?[\s:]+(.+)$/i)
      ?? line.match(/^departure(?:\s+date)?[\s:]+(.+)$/i);
    if (inlineMatch) {
      const datePart = inlineMatch[1];
      if (!isBlacklistedDateLine(datePart) && MONTH_NAMES.test(datePart)) {
        const d = parseDate(datePart);
        if (d) { checkoutDate = d; checkoutTime = parseStayTime(datePart); }
        break;
      }
    }
  }

  // —— 2) Check-in: same two formats
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (isCheckinLabelOnly(line)) {
      let next = i + 1;
      while (next < lines.length && lines[next].trim().toLowerCase() === "date") next++;
      if (next >= lines.length) continue;
      const dateLine = lines[next];
      if (isBlacklistedDateLine(dateLine) || !MONTH_NAMES.test(dateLine)) continue;
      const d = parseDate(dateLine);
      if (d) checkinDate = d;
      break;
    }

    const inlineMatch = line.match(/^check\s*[- ]?in(?:\s+date)?[\s:]+(.+)$/i)
      ?? line.match(/^arrival(?:\s+date)?[\s:]+(.+)$/i);
    if (inlineMatch) {
      const datePart = inlineMatch[1];
      if (!isBlacklistedDateLine(datePart) && MONTH_NAMES.test(datePart)) {
        const d = parseDate(datePart);
        if (d) checkinDate = d;
        break;
      }
    }
  }

  // —— 3) Booking ID: label on one line + value on next; OR inline "Label: VALUE"
  for (let i = 0; i < lines.length; i++) {
    if (BOOKING_ID_LABELS.test(lines[i])) {
      // next-line format
      if (i + 1 < lines.length && looksLikeBookingId(lines[i + 1])) {
        bookingId = lines[i + 1].trim();
        break;
      }
    }
    // inline format: "Confirmation Code HMXZ4R8K2"
    const inlineId = lines[i].match(/^(?:booking\s+reference|confirmation\s+code|reservation\s+id|confirmation\s+id)[\s:]+(\S+)/i);
    if (inlineId && looksLikeBookingId(inlineId[1])) {
      bookingId = inlineId[1].trim();
      break;
    }
  }

  // —— 4) Property name: label on one line + value on next; OR inline "Label: VALUE"
  for (let i = 0; i < lines.length; i++) {
    if (PROPERTY_NAME_LABELS.test(lines[i])) {
      if (i + 1 < lines.length && lines[i + 1].length > 0 && lines[i + 1].length < 200) {
        propertyName = lines[i + 1].trim();
        break;
      }
    }
    // inline format: "Listing Name Charming Sea View Apartment, Limassol"
    const inlineProp = lines[i].match(/^(?:property\s+name|listing\s+name|listing|accommodation)[\s:]+(.+)$/i);
    if (inlineProp && inlineProp[1].length > 0 && inlineProp[1].length < 200) {
      propertyName = inlineProp[1].trim();
      break;
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
