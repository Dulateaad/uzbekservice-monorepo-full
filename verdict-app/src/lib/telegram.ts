export function getTelegramWebApp() {
  if (typeof window === 'undefined') return null;
  return window.Telegram?.WebApp ?? null;
}

export function initTelegramWebApp() {
  const tg = getTelegramWebApp();
  if (!tg) return null;

  tg.ready();
  tg.expand();
  tg.enableClosingConfirmation();

  document.documentElement.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#ffffff');
  document.documentElement.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#000000');
  document.documentElement.style.setProperty('--tg-theme-hint-color', tg.themeParams.hint_color || '#999999');
  document.documentElement.style.setProperty('--tg-theme-link-color', tg.themeParams.link_color || '#2481cc');
  document.documentElement.style.setProperty('--tg-theme-button-color', tg.themeParams.button_color || '#2481cc');
  document.documentElement.style.setProperty('--tg-theme-button-text-color', tg.themeParams.button_text_color || '#ffffff');
  document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', tg.themeParams.secondary_bg_color || '#f4f4f5');

  return tg;
}

export function hapticFeedback(type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') {
  const tg = getTelegramWebApp();
  if (!tg?.HapticFeedback) return;

  if (type === 'success' || type === 'warning' || type === 'error') {
    tg.HapticFeedback.notificationOccurred(type);
  } else {
    tg.HapticFeedback.impactOccurred(type as 'light' | 'medium' | 'heavy');
  }
}

export function shareToTelegram(text: string, url?: string) {
  const tg = getTelegramWebApp();
  if (tg?.switchInlineQuery) {
    tg.switchInlineQuery(text, ['users', 'groups', 'channels']);
  } else if (url) {
    tg?.openLink(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`);
  }
}
