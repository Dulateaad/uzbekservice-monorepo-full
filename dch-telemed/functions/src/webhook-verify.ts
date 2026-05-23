import * as crypto from "crypto";

/**
 * Проверка подписи Daily.co (см. https://docs.daily.co/reference/rest-api/webhooks).
 * Используется формат: HMAC-SHA256 от строки `${timestamp}.${rawBody}`,
 * секрет — Buffer из BASE64 (поле hmac при создании webhook).
 */
export function verifyDailyWebhookSignature(
  rawBody: string,
  timestampHeader: string | undefined,
  signatureHeader: string | undefined,
  hmacBase64: string
): boolean {
  if (!timestampHeader || !signatureHeader) return false;
  try {
    const secret = Buffer.from(hmacBase64, "base64");
    const payload = `${timestampHeader}.${rawBody}`;
    const expected = crypto.createHmac("sha256", secret).update(payload).digest("base64");
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(signatureHeader, "utf8");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
