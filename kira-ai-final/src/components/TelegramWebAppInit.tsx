'use client';

import { useLayoutEffect } from 'react';
import { initTelegramWebApp } from '@/lib/telegram-webapp';

/** Ранний вызов WebApp.ready() / expand() для Mini App (до страницы логина). */
export function TelegramWebAppInit() {
  useLayoutEffect(() => {
    initTelegramWebApp();
  }, []);
  return null;
}
