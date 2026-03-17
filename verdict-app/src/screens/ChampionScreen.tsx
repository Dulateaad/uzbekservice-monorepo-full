import { hapticFeedback } from '@/lib/telegram';

interface ChampionScreenProps {
  onSelect: (mode: string) => void;
  onBack?: () => void;
}

const MODES = [
  { id: 'elimination', emoji: '🏆', title: 'Выбывание', desc: 'Проигравшая карточка выбывает' },
  { id: 'round-robin', emoji: '🔁', title: 'Круговой', desc: 'Карточки играют по кругу' },
  { id: 'league', emoji: '⚽', title: 'Лига', desc: 'Карточки набирают очки (3/1/0)' },
];

export function ChampionScreen({ onSelect }: ChampionScreenProps) {
  return (
    <div className="bg-[var(--tg-theme-bg-color)] text-[var(--tg-theme-text-color)] pb-[env(safe-area-inset-bottom)]">
      <main className="p-4">
        <p className="text-[var(--tg-theme-hint-color)] mb-4">Выберите режим турнира</p>
        <div className="space-y-3">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                hapticFeedback('light');
                onSelect(m.id);
              }}
              className="w-full p-4 rounded-2xl bg-[var(--tg-theme-secondary-bg-color)] active:scale-[0.98] transition-transform text-left"
            >
              <div className="flex items-center gap-3 mb-1">
                <span className="text-2xl">{m.emoji}</span>
                <span className="font-semibold">{m.title}</span>
              </div>
              <div className="text-sm text-[var(--tg-theme-hint-color)] ml-10">{m.desc}</div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
