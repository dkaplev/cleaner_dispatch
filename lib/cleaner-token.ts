import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";

const ALG     = "sha256";
const SEP     = ".";
const TTL_SEC = 60 * 60 * 24 * 30; // 30 days

function getSecret(): string {
  const s = process.env.UPLOAD_TOKEN_SECRET || process.env.NEXTAUTH_SECRET;
  if (!s?.trim()) throw new Error("UPLOAD_TOKEN_SECRET or NEXTAUTH_SECRET required");
  return s.trim();
}

/**
 * Create a signed, 30-day token that lets a cleaner access their portal.
 * Embeds cleanerId. No DB column needed — verified by HMAC.
 */
export function createCleanerPortalToken(cleanerId: string): string {
  const secret  = getSecret();
  const exp     = Math.floor(Date.now() / 1000) + TTL_SEC;
  const payload = `portal:${cleanerId}:${exp}`;
  const sig     = createHmac(ALG, secret).update(payload).digest("base64url");
  return `${payload}${SEP}${sig}`;
}

/**
 * Verify a cleaner portal token. Returns cleanerId or null.
 */
export function verifyCleanerPortalToken(token: string): string | null {
  try {
    const secret = getSecret();
    const i      = token.lastIndexOf(SEP);
    if (i === -1) return null;
    const payload = token.slice(0, i);
    const sig     = token.slice(i + 1);
    const expected = createHmac(ALG, secret).update(payload).digest("base64url");
    if (
      sig.length !== expected.length ||
      !timingSafeEqual(Buffer.from(sig, "base64url"), Buffer.from(expected, "base64url"))
    ) return null;
    const parts = payload.split(":");
    if (parts[0] !== "portal" || parts.length < 3) return null;
    const cleanerId = parts[1];
    const exp       = parseInt(parts[2], 10);
    if (!cleanerId || Number.isNaN(exp) || Date.now() / 1000 > exp) return null;
    return cleanerId;
  } catch {
    return null;
  }
}

/**
 * Generate a short, human-friendly referral code.
 * Format: <firstname-lowercase>-<4 hex chars>  e.g. "anna-c7f2"
 */
export function generateReferralCode(cleanerName: string): string {
  const base    = cleanerName.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, "");
  const suffix  = randomBytes(2).toString("hex"); // 4 hex chars
  return `${base || "cleaner"}-${suffix}`;
}
