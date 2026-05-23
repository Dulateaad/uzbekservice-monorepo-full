import { hapticFeedback } from '@/lib/telegram';
import { useLocale } from '@/context/LocaleContext';
import { CHAMPION_CATEGORY_IDS } from '@/data/champion-categories';

interface ChampionScreenProps {
  onSelect: (mode: string) => void;
  onBack?: () => void;
}

const CATEGORY_EMOJI: Record<(typeof CHAMPION_CATEGORY_IDS)[number], string> = {
  football: '⚽',
  phones: '📱',
  cinema: '🎬',
  gaming: '🎮',
  food: '🍽️',
  cities: '🌆',
};

export function ChampionScreen({ onSelect }: ChampionScreenProps) {
  const { t } = useLocale();
  return (
    <div className="h-full min-h-0 overflow-y-auto bg-[var(--app-bg)] text-[var(--app-text)] pb-[env(safe-area-inset-bottom)]">
      <main className="p-4">
        <h2 className="text-lg font-bold text-[var(--app-text)] mb-1">{t.championSectorTitle}</h2>
        <p className="text-sm text-[var(--app-text-muted)] mb-4">{t.championSectorDesc}</p>
        <div className="space-y-3">
          {CHAMPION_CATEGORY_IDS.map((id) => {
            const cat = t.championCategories[id];
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  hapticFeedback('light');
                  onSelect(`champion:${id}`);
                }}
                className="w-full p-4 rounded-2xl bg-[var(--app-bg-secondary)] active:scale-[0.98] transition-transform text-left border border-[var(--app-border)]"
              >
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-2xl">{CATEGORY_EMOJI[id]}</span>
                  <span className="font-semibold text-[var(--app-text)]">{cat.title}</span>
                </div>
                <div className="text-sm text-[var(--app-text-muted)] ml-10">{cat.desc}</div>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
