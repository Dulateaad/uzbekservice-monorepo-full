/**
 * Данные пользователя из Telegram Web Apps / Mini App.
 * @see https://core.telegram.org/bots/webapps#webappuser
 */
export type TelegramWebAppUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
};

type TelegramWebApp = {
  ready: () => void;
  expand?: () => void;
  initData: string;
  initDataUnsafe: {
    user?: TelegramWebAppUser;
    [key: string]: unknown;
  };
  onEvent?: (event: string, handler: () => void) => void;
  offEvent?: (event: string, handler: () => void) => void;
};

function getWebApp(): TelegramWebApp | null {
  if (typeof window === "undefined") return null;
  const tg = (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp;
  return tg ?? null;
}

/** Сообщить клиенту Telegram, что интерфейс готов (важно для Mini App). */
export function initTelegramWebApp(): void {
  const webApp = getWebApp();
  if (!webApp) return;
  try {
    webApp.ready();
    webApp.expand?.();
  } catch {
    // ignore
  }
}

function parseUserFromInitData(initData: string): TelegramWebAppUser | null {
  if (!initData || typeof initData !== "string") return null;
  try {
    const params = new URLSearchParams(initData);
    const rawUser = params.get("user");
    if (!rawUser) return null;
    let user: TelegramWebAppUser;
    try {
      user = JSON.parse(decodeURIComponent(rawUser)) as TelegramWebAppUser;
    } catch {
      user = JSON.parse(rawUser) as TelegramWebAppUser;
    }
    if (user && typeof user.id === "number") return user;
  } catch {
    // ignore
  }
  return null;
}

/** Часть клиентов кладёт initData в hash (#tgWebAppData=... — обычно query-string как у initData). */
function parseUserFromLocationHash(): TelegramWebAppUser | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) return null;
  try {
    const params = new URLSearchParams(hash);
    const packed = params.get("tgWebAppData");
    if (!packed) return null;
    const decoded = decodeURIComponent(packed);
    const fromInit = parseUserFromInitData(decoded);
    if (fromInit) return fromInit;
  } catch {
    // ignore
  }
  return null;
}

/** Прочитать пользователя: initDataUnsafe, затем разбор initData (надёжнее в Mini App). */
export function getTelegramUserFromWebApp(): TelegramWebAppUser | null {
  const webApp = getWebApp();
  if (!webApp) return null;

  initTelegramWebApp();

  const fromUnsafe = webApp.initDataUnsafe?.user;
  if (fromUnsafe && typeof fromUnsafe.id === "number") {
    return fromUnsafe;
  }

  const fromInitData = parseUserFromInitData(webApp.initData);
  if (fromInitData) return fromInitData;

  return parseUserFromLocationHash();
}

/** Подождать появления initData (иногда приходит после первого кадра / события WebView). */
export async function waitForTelegramUser(maxMs = 5000, stepMs = 120): Promise<TelegramWebAppUser | null> {
  const webApp = getWebApp();
  if (webApp) {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
  }

  const tryRead = () => getTelegramUserFromWebApp();
  let resolved: TelegramWebAppUser | null = tryRead();
  if (resolved) return resolved;

  if (webApp?.onEvent) {
    const bump = () => {
      resolved = tryRead();
    };
    const events = [
      "viewportChanged",
      "themeChanged",
      "safeAreaChanged",
      "contentSafeAreaChanged",
    ];
    const handlers: Array<{ e: string; h: () => void }> = [];
    for (const e of events) {
      const h = () => bump();
      handlers.push({ e, h });
      try {
        webApp.onEvent!(e, h);
      } catch {
        // ignore
      }
    }
    const deadline = Date.now() + maxMs;
    while (Date.now() < deadline) {
      resolved = tryRead();
      if (resolved) break;
      await new Promise((r) => setTimeout(r, stepMs));
    }
    for (const { e, h } of handlers) {
      try {
        webApp.offEvent?.(e, h);
      } catch {
        // ignore
      }
    }
    return resolved || tryRead();
  }

  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    resolved = tryRead();
    if (resolved) return resolved;
    await new Promise((r) => setTimeout(r, stepMs));
  }
  return tryRead();
}

export function isInsideTelegramWebApp(): boolean {
  return Boolean(getWebApp());
}
