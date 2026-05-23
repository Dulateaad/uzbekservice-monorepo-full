
"use server";

import { redirect } from 'next/navigation';
import { normalizeInquiryPhoneDigits, reserveInquirySlotForPhone } from '@/lib/inquiry-rate-limit';

export type SubmitInquiryResult =
  | { success: true }
  | { success: false; code: 'RATE_LIMIT' };

async function sendTelegramNotification(message: string): Promise<{ ok: boolean; error?: string }> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatIds = (process.env.TELEGRAM_CHAT_ID || '7593008791')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean);

  if (!botToken || chatIds.length === 0) {
    console.warn('[submitInquiry] Telegram not configured: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID missing');
    return { ok: false, error: 'Telegram not configured' };
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const errors: string[] = [];

  for (const chatId of chatIds) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        errors.push(`Chat ${chatId}: ${data.description || res.statusText}`);
      }
    } catch (error) {
      errors.push(`Chat ${chatId}: ${error instanceof Error ? error.message : 'Network error'}`);
    }
  }

  if (errors.length > 0) {
    console.error('[submitInquiry] Telegram error:', errors.join('; '));
    return { ok: false, error: errors.join('; ') };
  }
  return { ok: true };
}

export async function submitInquiry(
  formData: FormData,
): Promise<SubmitInquiryResult | void> {
  const name = String(formData.get('name') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();
  const service = String(formData.get('service') ?? '').trim();
  const locale = String(formData.get('locale') ?? 'ru').trim() || 'ru';
  const noRedirect = formData.get('noRedirect') === 'true';

  if (!name || !phone) {
    throw new Error('Имя и телефон обязательны');
  }

  const phoneDigits = normalizeInquiryPhoneDigits(phone);
  if (phoneDigits.length < 7) {
    throw new Error('Пожалуйста, введите корректный номер телефона.');
  }

  const reserved = await reserveInquirySlotForPhone(phoneDigits);
  if (!reserved) {
    return { success: false, code: 'RATE_LIMIT' };
  }

  const message = `📥 <b>Новая заявка</b>\n\n👤 Имя: ${name}\n📞 Телефон: ${phone}\n📝 Инфо: ${service || '—'}\n🌍 Источник: website`;
    
  const tgResult = await sendTelegramNotification(message);
  if (!tgResult.ok) {
    console.warn('[submitInquiry] Telegram failed, but form accepted:', tgResult.error);
  }
  
  if (noRedirect) {
    return { success: true };
  }
  redirect(`/${locale}/calculator?submitted=1`);
}
