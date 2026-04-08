/**
 * Парсинг initData из Telegram Web App.
 * Параметр user приходит URL-encoded; поддерживаем и snake_case, и camelCase.
 */

export interface ParsedTelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

/**
 * Достаёт объект пользователя из initData (query string от Telegram).
 */
export function parseTelegramUserFromInitData(initData: string): ParsedTelegramUser | null {
  if (!initData || typeof initData !== 'string') return null;

  try {
    const params = new URLSearchParams(initData);
    const userStr = params.get('user');
    if (!userStr) return null;

    const decoded = decodeURIComponent(userStr);
    const raw = JSON.parse(decoded) as Record<string, unknown>;

    const id = typeof raw.id === 'number' ? raw.id : Number(raw.id);
    if (!id || Number.isNaN(id)) return null;

    const first_name =
      (raw.first_name as string) ?? (raw.firstName as string) ?? '';
    const last_name =
      (raw.last_name as string) ?? (raw.lastName as string) ?? undefined;
    const username = (raw.username as string) ?? undefined;
    const photo_url =
      (raw.photo_url as string) ?? (raw.photoUrl as string) ?? undefined;

    return { id, first_name, last_name, username, photo_url };
  } catch {
    return null;
  }
}
