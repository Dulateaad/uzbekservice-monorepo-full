import { useEffect } from 'react';

/**
 * Проверяет при каждом открытии, не вышла ли новая версия приложения.
 * Если version.json на сервере отличается от встроенной — перезагружает страницу.
 * Это решает проблему кэширования в Telegram WebView.
 */
export function useVersionCheck() {
  useEffect(() => {
    async function check() {
      try {
        const currentVersion = (window as any).__APP_VERSION__;
        if (!currentVersion) return;

        const res = await fetch('/version.json?_=' + Date.now(), {
          cache: 'no-store',
        });
        if (!res.ok) return;

        const data = await res.json();
        if (data.version && data.version !== currentVersion) {
          // Новая версия — принудительная перезагрузка
          console.log(`[VersionCheck] Обновление: ${currentVersion} → ${data.version}`);
          window.location.reload();
        }
      } catch {
        // Не критично — просто пропускаем
      }
    }

    check();

    // Также проверяем когда приложение возвращается из фона
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        check();
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);
}
