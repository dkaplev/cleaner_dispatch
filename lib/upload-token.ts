import { createHmac, timingSafeEqual } from "node:crypto";

const ALG = "sha256";
const SEP = ".";
const TTL_SEC = 60 * 60 * 24 * 7; // 7 days

function getSecret(): string {
  const s = process.env.UPLOAD_TOKEN_SECRET || process.env.NEXTAUTH_SECRET;
  if (!s?.trim()) throw new Error("UPLOAD_TOKEN_SECRET or NEXTAUTH_SECRET required for upload tokens");
  return s.trim();
}

/**
 * Create a signed token for the cleaner upload page. Embeds jobId and cleanerId.
 */
export function createUploadToken(jobId: string, cleanerId: string): string {
  const secret = getSecret();
  const exp = Math.floor(Date.now() / 1000) + TTL_SEC;
  const payload = `${jobId}:${cleanerId}:${exp}`;
  const sig = createHmac(ALG, secret).update(payload).digest("base64url");
  return `${payload}${SEP}${sig}`;
}

/**
 * Verify token and return jobId + cleanerId. Returns null if invalid or expired.
 */
export function verifyUploadToken(token: string): { jobId: string; cleanerId: string } | null {
  try {
    const secret = getSecret();
    const i = token.lastIndexOf(SEP);
    if (i === -1) return null;
    const payload = token.slice(0, i);
    const sig = token.slice(i + 1);
    const expected = createHmac(ALG, secret).update(payload).digest("base64url");
    if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig, "base64url"), Buffer.from(expected, "base64url"))) return null;
    const [jobId, cleanerId, expStr] = payload.split(":");
    const exp = parseInt(expStr, 10);
    if (!jobId || !cleanerId || Number.isNaN(exp) || Date.now() / 1000 > exp) return null;
    return { jobId, cleanerId };
  } catch {
    return null;
  }
}
