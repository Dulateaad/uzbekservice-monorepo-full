/**
 * Финальный интерфейс по ТЗ:
 * 🔝 Верхняя часть: Поисковик + Профиль
 * 🧭 Вкладки: Поток | Champion | Познай себя
 */
import { hapticFeedback } from '@/lib/telegram';

export type TabId = 'flow' | 'champion' | 'know-yourself';

interface MainLayoutProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  children: React.ReactNode;
}

const TABS: { id: TabId; label: string; emoji: string }[] = [
  { id: 'flow', label: 'Поток', emoji: '🌊' },
  { id: 'champion', label: 'Champion', emoji: '👑' },
  { id: 'know-yourself', label: 'Познай себя', emoji: '🧠' },
];

export function MainLayout({ activeTab, onTabChange, children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-[var(--tg-theme-bg-color)] text-[var(--tg-theme-text-color)] flex flex-col pt-[env(safe-area-inset-top)]">
      {/* 🔝 Верхняя панель: Поиск + Профиль */}
      <header className="flex-shrink-0 px-4 py-3 border-b border-[var(--tg-theme-hint-color)]/20">
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--tg-theme-secondary-bg-color)] text-[var(--tg-theme-hint-color)]">
            <span className="text-lg">🔍</span>
            <span className="text-sm">Что хотите найти?</span>
          </div>
          <button
            onClick={() => hapticFeedback('light')}
            className="p-2 rounded-xl bg-[var(--tg-theme-secondary-bg-color)] active:opacity-70"
            aria-label="Профиль"
          >
            <span className="text-xl">👤</span>
          </button>
        </div>

        {/* 🧭 Вкладки */}
        <nav className="flex gap-1 mt-3">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                hapticFeedback('light');
                onTabChange(tab.id);
              }}
              className={`flex-1 py-2.5 px-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-[var(--tg-theme-button-color)] text-[var(--tg-theme-button-text-color)]'
                  : 'bg-[var(--tg-theme-secondary-bg-color)] text-[var(--tg-theme-hint-color)] active:opacity-80'
              }`}
            >
              {tab.emoji} {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {/* Контент */}
      <main className="flex-1 min-h-0 overflow-auto">{children}</main>
    </div>
  );
}
