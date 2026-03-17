import { hapticFeedback } from '@/lib/telegram';

interface HomeScreenProps {
  onFlow: () => void;
  onChampion: () => void;
  onKnowYourself: () => void;
}

const SECTIONS = [
  {
    id: 'flow',
    emoji: '🌊',
    title: 'Поток',
    subtitle: 'Бесконечная лента карточек',
    onClick: (cb: () => void) => {
      hapticFeedback('light');
      cb();
    },
  },
  {
    id: 'champion',
    emoji: '👑',
    title: 'Чемпион',
    subtitle: 'Турнир карточек',
    onClick: (cb: () => void) => {
      hapticFeedback('light');
      cb();
    },
  },
  {
    id: 'know-yourself',
    emoji: '🧠',
    title: 'Познай себя',
    subtitle: 'Психологические выборы',
    onClick: (cb: () => void) => {
      hapticFeedback('light');
      cb();
    },
  },
];

export function HomeScreen({ onFlow, onChampion, onKnowYourself }: HomeScreenProps) {
  const handleClick = (id: string) => {
    if (id === 'flow') onFlow();
    else if (id === 'champion') onChampion();
    else if (id === 'know-yourself') onKnowYourself();
  };

  return (
    <div className="min-h-screen bg-[var(--tg-theme-bg-color)] text-[var(--tg-theme-text-color)] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <header className="px-4 py-4 flex items-center justify-between border-b border-[var(--tg-theme-hint-color)]/20">
        <h1 className="text-xl font-bold">Verdict</h1>
        <span className="text-sm text-[var(--tg-theme-hint-color)]">Выбери свой вариант</span>
      </header>

      <main className="p-4 space-y-3">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => s.onClick(() => handleClick(s.id))}
            className="w-full p-4 rounded-2xl bg-[var(--tg-theme-secondary-bg-color)] active:scale-[0.98] transition-transform text-left flex items-center gap-4"
          >
            <span className="text-3xl">{s.emoji}</span>
            <div className="flex-1">
              <div className="font-semibold text-lg">{s.title}</div>
              <div className="text-sm text-[var(--tg-theme-hint-color)]">{s.subtitle}</div>
            </div>
            <span className="text-[var(--tg-theme-hint-color)]">→</span>
          </button>
        ))}
      </main>
    </div>
  );
}
