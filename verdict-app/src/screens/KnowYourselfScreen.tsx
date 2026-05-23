import { hapticFeedback } from '@/lib/telegram';

interface KnowYourselfScreenProps {
  onSelect: (subsection: string) => void;
  onBack?: () => void;
}

const SUBSECTIONS = [
  { id: 'love', emoji: '❤️', title: 'Любовь' },
  { id: 'family', emoji: '👨‍👩‍👧', title: 'Семья' },
  { id: 'character', emoji: '🧠', title: 'Характер' },
  { id: 'money', emoji: '💼', title: 'Деньги и успех' },
  { id: 'lifestyle', emoji: '🌍', title: 'Образ жизни' },
];

export function KnowYourselfScreen({ onSelect }: KnowYourselfScreenProps) {
  return (
    <div className="h-full min-h-0 overflow-y-auto bg-[var(--tg-theme-bg-color)] text-[var(--tg-theme-text-color)] pb-[env(safe-area-inset-bottom)]">
      <main className="p-4">
        <p className="text-[var(--tg-theme-hint-color)] mb-4">Карточки для размышления</p>
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
