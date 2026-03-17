/**
 * Спроси народ — анонимное создание карточки
 * Человек задаёт личный вопрос инкогнито, утром видит результат
 */
import { useState } from 'react';
import { hapticFeedback } from '@/lib/telegram';
import { useLocale } from '@/context/LocaleContext';
import { useUser } from '@/context/UserContext';
import { createCard } from '@/services/cards-service';
import { validateCard } from '@/data/forbidden-content';

interface AskPeopleScreenProps {
  onCreated: () => void;
  onBack: () => void;
}

export function AskPeopleScreen({ onCreated, onBack }: AskPeopleScreenProps) {
  const { t } = useLocale();
  const { canAskPeople, askPeopleCountThisMonth, incrementAskPeopleCount } = useUser();
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!canAskPeople) {
      setError(t.askPeopleLimit.replace('{{used}}', String(askPeopleCountThisMonth)).replace('{{limit}}', '3'));
      return;
    }
    const a = optionA.trim();
    const b = optionB.trim();
    if (!a || !b) {
      setError('Fill both options');
      return;
    }
    const validation = validateCard(a, b);
    if (!validation.valid) {
      setError(validation.reason ?? 'Forbidden topic');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await createCard(a, b, 'askPeople');
      incrementAskPeopleCount();
      hapticFeedback('success');
      onCreated();
    } catch (e) {
      setError((e as Error).message);
      hapticFeedback('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[var(--app-bg)] text-[var(--app-text)] min-h-full p-4 pb-[env(safe-area-inset-bottom)]">
      <button
        onClick={() => {
          hapticFeedback('light');
          onBack();
        }}
        className="flex items-center gap-1 text-[var(--app-text-muted)] text-sm mb-4"
      >
        ← {t.back}
      </button>

      <h2 className="text-xl font-bold mb-1">{t.askPeopleTitle}</h2>
      <p className="text-[var(--app-text-muted)] text-sm mb-6">{t.askPeopleDesc}</p>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm text-[var(--app-text-muted)] mb-1">{t.createOptionA}</label>
          <input
            type="text"
            value={optionA}
            onChange={(e) => setOptionA(e.target.value)}
            placeholder="e.g. Quit"
            className="w-full px-4 py-3 rounded-xl bg-[var(--app-bg-secondary)] border border-[var(--app-border)] text-[var(--app-text)] placeholder:text-[var(--app-text-muted)]"
          />
        </div>
        <div className="text-center text-[var(--app-text-muted)]">vs</div>
        <div>
          <label className="block text-sm text-[var(--app-text-muted)] mb-1">{t.createOptionB}</label>
          <input
            type="text"
            value={optionB}
            onChange={(e) => setOptionB(e.target.value)}
            placeholder="e.g. Stay"
            className="w-full px-4 py-3 rounded-xl bg-[var(--app-bg-secondary)] border border-[var(--app-border)] text-[var(--app-text)] placeholder:text-[var(--app-text-muted)]"
          />
        </div>
      </div>

      <p className="text-xs text-[var(--app-text-muted)] mb-4">{t.askPeopleExamples}</p>

      {!canAskPeople && (
        <p className="text-amber-500 text-sm mb-4">
          {t.askPeopleLimit.replace('{{used}}', String(askPeopleCountThisMonth)).replace('{{limit}}', '3')}. {t.premiumUnlimited}
        </p>
      )}

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={loading || !canAskPeople}
        className="w-full py-3 rounded-xl bg-[var(--app-accent)] text-white font-medium disabled:opacity-50"
      >
        {loading ? '...' : t.createCard}
      </button>
    </div>
  );
}
