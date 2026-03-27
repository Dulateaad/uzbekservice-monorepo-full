import { hapticFeedback } from '@/lib/telegram';
import { useLocale } from '@/context/LocaleContext';

interface FlowScreenProps {
  onSelect: (subsection: string) => void;
  onBack?: () => void;
}

const SUBSECTION_IDS = ['popular', 'people', 'askPeople', 'paradox', 'philosophy', 'absurd', 'fast', 'gaming'] as const;
const EMOJIS: Record<string, string> = {
  popular: '🔥',
  people: '👥',
  askPeople: '🕵️',
  paradox: '🤯',
  philosophy: '🧠',
  absurd: '😄',
  fast: '⚡',
  gaming: '🎮',
};

export function FlowScreen({ onSelect }: FlowScreenProps) {
  const { t } = useLocale();
  return (
    <div className="bg-[var(--app-bg)] text-[var(--app-text)] pb-[env(safe-area-inset-bottom)]">
      <main className="p-3">
        <p className="text-[var(--app-text-muted)] text-sm mb-3">{t.chooseCardType}</p>
        <div className="space-y-1.5">
          {SUBSECTION_IDS.map((id) => (
            <button
              key={id}
              onClick={() => {
                hapticFeedback('light');
                onSelect(id);
              }}
              className="w-full p-3 rounded-xl bg-[var(--app-bg-secondary)] active:scale-[0.98] transition-transform text-left flex items-center gap-3 text-[var(--app-text)] border border-[var(--app-border)]"
            >
              <span className="text-xl">{EMOJIS[id]}</span>
              <span className="font-medium">{t.flowSubsections[id]}</span>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
