import { hapticFeedback } from '@/lib/telegram';

interface FlowScreenProps {
  onSelect: (subsection: string) => void;
  onBack?: () => void;
}

const SUBSECTIONS = [
  { id: 'popular', emoji: '🔥', title: 'Популярные' },
  { id: 'paradox', emoji: '🤯', title: 'Парадокс' },
  { id: 'philosophy', emoji: '🧠', title: 'Философия' },
  { id: 'absurd', emoji: '😄', title: 'Абсурд' },
  { id: 'fast', emoji: '⚡', title: 'Быстрые' },
  { id: 'gaming', emoji: '🎮', title: 'Игровые' },
];

export function FlowScreen({ onSelect }: FlowScreenProps) {
  return (
    <div className="bg-[var(--tg-theme-bg-color)] text-[var(--tg-theme-text-color)] pb-[env(safe-area-inset-bottom)]">
      <main className="p-4">
        <p className="text-[var(--tg-theme-hint-color)] mb-4">Выберите тип карточек</p>
        <div className="space-y-2">
          {SUBSECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                hapticFeedback('light');
                onSelect(s.id);
              }}
              className="w-full p-4 rounded-2xl bg-[var(--tg-theme-secondary-bg-color)] active:scale-[0.98] transition-transform text-left flex items-center gap-3"
            >
              <span className="text-2xl">{s.emoji}</span>
              <span className="font-medium">{s.title}</span>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
