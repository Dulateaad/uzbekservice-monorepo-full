import { useLocale } from '@/context/LocaleContext';
import { SearchScreen } from '@/screens/SearchScreen';
import { AdvisorScreen } from '@/screens/AdvisorScreen';
import type { VerdictCard } from '@/types/card';

interface SearchWithTabsProps {
  searchMode: 'play' | 'advisor';
  onSearchModeChange: (mode: 'play' | 'advisor') => void;
  onSelectCard: (card: VerdictCard) => void;
  onBack: () => void;
}

export function SearchWithTabs({
  searchMode,
  onSearchModeChange,
  onSelectCard,
  onBack,
}: SearchWithTabsProps) {
  const { t } = useLocale();

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-[var(--app-border)]">
        <button
          onClick={() => onSearchModeChange('play')}
          className={`flex-1 py-3 text-sm font-medium ${searchMode === 'play' ? 'border-b-2 border-[var(--app-accent)] text-[var(--app-accent)]' : 'text-[var(--app-text-muted)]'}`}
        >
          🎮 {t.searchTabPlay}
        </button>
        <button
          onClick={() => onSearchModeChange('advisor')}
          className={`flex-1 py-3 text-sm font-medium ${searchMode === 'advisor' ? 'border-b-2 border-[var(--app-accent)] text-[var(--app-accent)]' : 'text-[var(--app-text-muted)]'}`}
        >
          🎯 {t.searchTabAdvisor}
        </button>
      </div>
      {searchMode === 'play' ? (
        <SearchScreen onSelectCard={onSelectCard} onBack={onBack} />
      ) : (
        <AdvisorScreen onSelectCard={onSelectCard} onBack={onBack} />
      )}
    </div>
  );
}
