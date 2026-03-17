import { hapticFeedback } from '@/lib/telegram';
import { useLocale } from '@/context/LocaleContext';

interface ChampionScreenProps {
  onSelect: (mode: string) => void;
  onBack?: () => void;
}

const MODES: { id: string; key: keyof typeof import('@/i18n/translations').translations.en.championModes }[] = [
  { id: 'elimination', key: 'elimination' },
  { id: 'round-robin', key: 'roundRobin' },
  { id: 'league', key: 'league' },
];
const EMOJIS: Record<string, string> = { elimination: '🏆', 'round-robin': '🔁', league: '⚽' };

export function ChampionScreen({ onSelect }: ChampionScreenProps) {
  const { t } = useLocale();
  return (
    <div className="bg-[var(--app-bg)] text-[var(--app-text)] pb-[env(safe-area-inset-bottom)]">
      <main className="p-4">
        <p className="text-[var(--app-text-muted)] mb-4">{t.chooseTournamentMode}</p>
        <div className="space-y-3">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                hapticFeedback('light');
                onSelect(m.id);
              }}
              className="w-full p-4 rounded-2xl bg-[var(--app-bg-secondary)] active:scale-[0.98] transition-transform text-left border border-[var(--app-border)]"
            >
              <div className="flex items-center gap-3 mb-1">
                <span className="text-2xl">{EMOJIS[m.id]}</span>
                <span className="font-semibold text-[var(--app-text)]">{t.championModes[m.key]}</span>
              </div>
              <div className="text-sm text-[var(--app-text-muted)] ml-10">{t.championModeDesc[m.key]}</div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
