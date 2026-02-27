const getBotToken = () => process.env.TELEGRAM_BOT_TOKEN?.trim();

/**
 * Send a text message to a Telegram chat via the Bot API.
 * No-op if TELEGRAM_BOT_TOKEN is not set or chatId is empty.
 */
export async function sendTelegramMessage(
  chatId: string,
  text: string
): Promise<void> {
  const token = getBotToken();
  if (!token || !chatId?.trim()) return;

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId.trim(),
      text,
      parse_mode: "HTML",
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("Telegram sendMessage failed:", res.status, err);
    throw new Error("Telegram send failed");
  }
}

/**
 * Send a job offer message with Accept / Decline inline buttons.
 * offerToken is stored in DispatchAttempt and used in callback_data (max 64 bytes).
 */
export async function sendTelegramOfferMessage(
  chatId: string,
  text: string,
  offerToken: string
): Promise<void> {
  const token = getBotToken();
  if (!token || !chatId?.trim()) return;

  // Telegram callback_data max 64 bytes; "accept:XX" / "decline:XX" with 24-char token is safe
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId.trim(),
      text,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Accept", callback_data: `accept:${offerToken}` },
            { text: "❌ Decline", callback_data: `decline:${offerToken}` },
          ],
        ],
      },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("Telegram sendMessage (offer) failed:", res.status, err);
    throw new Error("Telegram send failed");
  }
}

/**
 * Call answerCallbackQuery to dismiss the loading state after handling a button press.
 */
export async function answerTelegramCallback(
  callbackQueryId: string,
  options?: { text?: string; show_alert?: boolean }
): Promise<void> {
  const token = getBotToken();
  if (!token) return;

  const url = `https://api.telegram.org/bot${token}/answerCallbackQuery`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text: options?.text,
      show_alert: options?.show_alert ?? false,
    }),
  });
}
