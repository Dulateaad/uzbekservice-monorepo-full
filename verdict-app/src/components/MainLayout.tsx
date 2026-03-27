import { hapticFeedback } from '@/lib/telegram';
import { useLocale } from '@/context/LocaleContext';

export type TabId = 'flow' | 'champion' | 'discover';

interface MainLayoutProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  children: React.ReactNode;
  onSearchClick?: () => void;
  onProfileClick?: () => void;
}

const TABS: TabId[] = ['flow', 'champion', 'discover'];

export function MainLayout({ activeTab, onTabChange, children, onSearchClick, onProfileClick }: MainLayoutProps) {
  const { t } = useLocale();

  return (
    <div className="h-[100dvh] bg-[var(--app-bg)] text-[var(--app-text)] flex flex-col pt-[env(safe-area-inset-top)] transition-colors overflow-hidden">
      <header className="flex-shrink-0 px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              hapticFeedback('light');
              onSearchClick?.();
            }}
            className="flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--app-bg-secondary)] text-[var(--app-text-muted)] text-left min-w-0"
          >
            <span className="text-sm">🔍</span>
            <span className="text-xs truncate">{t.searchPlaceholder}</span>
          </button>
          <button
            onClick={() => {
              hapticFeedback('light');
              onProfileClick?.();
            }}
            className="p-1.5 rounded-lg bg-[var(--app-bg-secondary)] active:opacity-70 flex-shrink-0"
            aria-label="Profile"
          >
            <span className="text-lg">👤</span>
          </button>
        </div>

        <nav className="flex mt-2 border-b border-[var(--app-border)]">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => {
                hapticFeedback('light');
                onTabChange(tab);
              }}
              className="flex-1 py-1.5 px-1 text-xs font-medium transition-colors min-w-0 relative text-[var(--app-text-muted)] hover:opacity-90 active:opacity-80"
            >
              <span className="truncate block">{t.tabs[tab]}</span>
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--app-accent)] rounded-full" />
              )}
            </button>
          ))}
        </nav>
      </header>

      <main className="flex-1 min-h-0 overflow-auto bg-[var(--app-bg)]">{children}</main>
    </div>
  );
}
