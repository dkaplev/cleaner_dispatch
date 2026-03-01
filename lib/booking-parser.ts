/**
 * Parse booking confirmation text (e.g. from forwarded email) to extract
 * check-in/check-out dates and optional property hint.
 * Used by Import booking (paste) and later by email ingest webhook.
 */

export type ParsedBooking = {
  /** Check-out date (guest leaves) — cleaning window starts after this. */
  checkoutDate: Date | null;
  /** Check-in date (next guest arrives) — optional. */
  checkinDate: Date | null;
  /** Time on checkout day (e.g. 11:00) if found; otherwise null → use property default. */
  checkoutTime: { hours: number; minutes: number } | null;
  /** Best-effort property/listing name from subject or body. */
  propertyHint: string | null;
  /** Raw reservation/confirmation ID if found. */
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
  // 16 March 2025, 16 Mar 2025, March 16 2025
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
  // DD/MM/YYYY or MM/DD/YYYY (prefer DD/MM when day <= 12)
  const slash = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);
  if (slash) {
    const a = parseInt(slash[1], 10);
    const b = parseInt(slash[2], 10);
    const y = parseInt(slash[3], 10);
    const dayFirst = a >= 1 && a <= 31 && b >= 1 && b <= 12;
    const d = dayFirst
      ? new Date(y, b - 1, a)
      : new Date(y, a - 1, b);
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

/**
 * Extract checkout date/time and optional property hint from email or pasted text.
 */
export function parseBookingText(text: string): ParsedBooking {
  const raw = typeof text === "string" ? text : "";
  const plain = stripHtml(raw);
  const lines = plain.split(/\n/).map((l) => l.trim()).filter(Boolean);

  let checkoutDate: Date | null = null;
  let checkinDate: Date | null = null;
  let checkoutTime: { hours: number; minutes: number } | null = null;
  let propertyHint: string | null = null;
  let bookingId: string | null = null;

  // Common labels (case-insensitive)
  const checkoutLabels = /check\s*[- ]?out|departure|leave|vacate/i;
  const checkinLabels = /check\s*[- ]?in|arrival|arrive/i;
  const reservationId = /(?:reservation|booking|confirmation)\s*(?:id|#|number)?\s*[:\s]*([A-Za-z0-9\-]+)/i;

  for (const line of lines) {
    if (checkoutLabels.test(line)) {
      const datePart = line.replace(checkoutLabels, "").replace(/[:\s]+/, " ").trim();
      const t = parseTime(datePart);
      if (t) checkoutTime = t;
      const d = parseDate(datePart) || parseDate(line);
      if (d) checkoutDate = d;
    }
    if (checkinLabels.test(line) && !checkoutDate) {
      const d = parseDate(line);
      if (d) checkinDate = d;
    }
    const rid = line.match(reservationId);
    if (rid && !bookingId) bookingId = rid[1];
  }

  // If we didn't find labeled checkout, look for any clear date (e.g. "16 March 2025")
  if (!checkoutDate && !checkinDate) {
    for (const line of lines) {
      const d = parseDate(line);
      if (d && d >= new Date()) {
        checkoutDate = d;
        const t = parseTime(line);
        if (t) checkoutTime = t;
        break;
      }
    }
  }

  // Property hint: often in subject or "Listing:" / "Property:"
  const subjectLine = lines[0] || plain.slice(0, 200);
  const listingMatch = (plain + " " + subjectLine).match(/(?:listing|property|accommodation)\s*[:\s]+([^\n]+)/i);
  if (listingMatch) propertyHint = listingMatch[1].trim().slice(0, 120);
  else if (subjectLine.length < 150 && subjectLine.length > 2) propertyHint = subjectLine.slice(0, 120);

  return {
    checkoutDate,
    checkinDate,
    checkoutTime,
    propertyHint: propertyHint || null,
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
