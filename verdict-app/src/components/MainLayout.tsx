import { useState } from 'react';
import { hapticFeedback } from '@/lib/telegram';
import { useLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import type { Locale } from '@/i18n/translations';

export type TabId = 'flow' | 'champion' | 'ranking' | 'friends' | 'profile';

interface MainLayoutProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  children: React.ReactNode;
  onSearchClick?: () => void;
}

const TABS: TabId[] = ['flow', 'champion', 'ranking', 'profile', 'friends'];

export function MainLayout({ activeTab, onTabChange, children, onSearchClick }: MainLayoutProps) {
  const { t, locale, setLocale } = useLocale();
  const { theme, toggleTheme } = useTheme();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)] flex flex-col pt-[env(safe-area-inset-top)] transition-colors">
      <header className="flex-shrink-0 px-4 py-3 border-b border-[var(--app-border)]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              hapticFeedback('light');
              onSearchClick?.();
            }}
            className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[var(--app-bg-secondary)] text-[var(--app-text-muted)] text-left"
          >
            <span>🔍</span>
            <span className="text-sm">{t.searchPlaceholder}</span>
          </button>
          <div className="relative">
            <button
              onClick={() => {
                hapticFeedback('light');
                setShowSettings(s => !s);
              }}
              className="p-2.5 rounded-xl bg-[var(--app-bg-secondary)] active:opacity-70"
              aria-label="Settings"
            >
              <span className="text-xl">⚙️</span>
            </button>
            {showSettings && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowSettings(false)} />
                <div className="absolute right-0 top-full mt-1 py-2 rounded-xl bg-[var(--app-bg-secondary)] border border-[var(--app-border)] shadow-xl z-20 min-w-[180px]">
                  <div className="px-3 py-2 border-b border-[var(--app-border)]">
                    <span className="text-xs text-[var(--app-text-muted)]">{t.language}</span>
                    <div className="flex gap-1 mt-1">
                      {(['en', 'ru', 'zh'] as Locale[]).map((l) => (
                        <button
                          key={l}
                          onClick={() => {
                            setLocale(l);
                            hapticFeedback('light');
                          }}
                          className={`px-2 py-1 rounded text-sm ${locale === l ? 'bg-[var(--app-accent)] text-white' : 'text-[var(--app-text-muted)]'}`}
                        >
                          {l.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      toggleTheme();
                      hapticFeedback('light');
                    }}
                    className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-[var(--app-tab-active)]"
                  >
                    <span>{theme === 'dark' ? '🌙' : '☀️'}</span>
                    <span>{theme === 'dark' ? t.themeDark : t.themeLight}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <nav className="flex gap-1 mt-3">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => {
                hapticFeedback('light');
                onTabChange(tab);
              }}
              className={`flex-1 py-2.5 px-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-[var(--app-tab-active)] text-[var(--app-text)]'
                  : 'text-[var(--app-text-muted)] hover:opacity-90 active:opacity-80'
              }`}
            >
              {t.tabs[tab]}
            </button>
          ))}
        </nav>
      </header>

      <main className="flex-1 min-h-0 overflow-auto bg-[var(--app-bg)]">{children}</main>
    </div>
  );
}
