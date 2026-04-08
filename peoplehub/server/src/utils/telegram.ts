import crypto from 'crypto';
import { config } from '../config';

/**
 * Валидация данных Telegram WebApp initData.
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateTelegramWebAppData(initData: string): {
  valid: boolean;
  user?: TelegramUser;
} {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return { valid: false };

    // Удаляем hash из параметров и сортируем
    params.delete('hash');
    const dataCheckArr: string[] = [];
    params.sort();
    params.forEach((value, key) => {
      dataCheckArr.push(`${key}=${value}`);
    });
    const dataCheckString = dataCheckArr.join('\n');

    // Создаём HMAC
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(config.telegramBotToken)
      .digest();

    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (calculatedHash !== hash) {
      return { valid: false };
    }

    // Парсим данные пользователя
    const userStr = params.get('user');
    if (!userStr) return { valid: false };

    const user: TelegramUser = JSON.parse(userStr);
    return { valid: true, user };
  } catch {
    return { valid: false };
  }
}

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}
