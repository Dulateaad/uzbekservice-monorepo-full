import { useEffect, useMemo } from 'react';
import type { TelegramWebApp } from '../types';

export function useTelegram() {
  const tg: TelegramWebApp | undefined = window.Telegram?.WebApp;

  useEffect(() => {
    tg?.ready();
    tg?.expand();
    // Prevent accidental swipe-to-close
    if (tg?.enableClosingConfirmation) {
      tg.enableClosingConfirmation();
    }
    // Disable vertical swipe gestures that can close the app
    if ((tg as any)?.disableVerticalSwipes) {
      (tg as any).disableVerticalSwipes();
    }
  }, [tg]);

  const user = useMemo(() => tg?.initDataUnsafe?.user, [tg]);
  const initData = tg?.initData || '';
  const colorScheme = tg?.colorScheme || 'light';
  const isDark = colorScheme === 'dark';

  return {
    tg,
    user,
    initData,
    colorScheme,
    isDark,
    haptic: tg?.HapticFeedback,
    mainButton: tg?.MainButton,
    backButton: tg?.BackButton,
  };
}
