import { randomBytes } from "node:crypto";

const TOKEN_BYTES = 18; // base64url ~24 chars, fits in Telegram callback_data (64 byte limit)

/**
 * Generate a unique token for an offer (Accept/Decline buttons).
 * Stored in DispatchAttempt.offer_token and sent in Telegram inline keyboard.
 */
export function generateOfferToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url").slice(0, 24);
}
