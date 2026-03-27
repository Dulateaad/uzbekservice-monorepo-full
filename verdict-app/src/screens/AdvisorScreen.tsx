/**
 * Advisor — «Найти решение».
 * Пользователь описывает проблему, получает рейтинг карточек по голосам.
 * ТЗ: минимум 10K голосов по категории. Пока упрощённый поиск.
 */

import { useState, useCallback } from 'react';
import { hapticFeedback } from '@/lib/telegram';
import { useLocale } from '@/context/LocaleContext';
import { searchCards } from '@/services/cards-service';
import { VoiceInput } from '@/components/VoiceInput';
import type { VerdictCard } from '@/types/card';

interface AdvisorScreenProps {
  onSelectCard: (card: VerdictCard) => void;
  onBack: () => void;
}

const MIN_VOTES_FOR_ADVISOR = 100;

export function AdvisorScreen({ onSelectCard, onBack }: AdvisorScreenProps) {
  const { t } = useLocale();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<VerdictCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setSearched(true);
    try {
      const cards = await searchCards(q, 15);
      setResults(cards.filter((c) => c.totalVotes >= MIN_VOTES_FOR_ADVISOR));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
      <div className="p-4 border-b border-[var(--app-border)]">
        <button
          onClick={() => {
            hapticFeedback('light');
            onBack();
          }}
          className="p-2 -ml-2 text-[var(--app-text-muted)] mb-4"
        >
          ← {t.back}
        </button>
        <h2 className="text-lg font-bold mb-1">{t.advisorTitle}</h2>
        <p className="text-sm text-[var(--app-text-muted)] mb-4">{t.advisorDesc}</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && doSearch()}
            placeholder={t.advisorPlaceholder}
            className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--app-bg-secondary)] border border-[var(--app-border)] text-[var(--app-text)] placeholder:text-[var(--app-text-muted)]"
          />
          <VoiceInput onResult={setQuery} className="shrink-0" />
          <button
            onClick={() => {
              hapticFeedback('light');
              doSearch();
            }}
            disabled={loading || !query.trim()}
            className="px-4 py-2.5 rounded-xl bg-[var(--app-accent)] text-white font-medium disabled:opacity-50"
          >
            {loading ? '...' : '🔍'}
          </button>
        </div>
      </div>

      <div className="p-4">
        {!searched ? (
          <p className="text-[var(--app-text-muted)] text-sm text-center py-8">{t.advisorPlaceholder}</p>
        ) : results.length === 0 ? (
          <p className="text-[var(--app-text-muted)] text-sm text-center py-8">
            {t.noResults}
            <br />
            <span className="text-xs">Нужно минимум {MIN_VOTES_FOR_ADVISOR} голосов по карточке</span>
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-[var(--app-text-muted)] mb-2">Рейтинг по голосам людей:</p>
            {results.map((card, i) => {
              const total = card.votesA + card.votesB;
              const pA = total > 0 ? Math.round((card.votesA / total) * 100) : 50;
              return (
                <button
                  key={card.id}
                  onClick={() => {
                    hapticFeedback('light');
                    onSelectCard(card);
                  }}
                  className="w-full p-4 rounded-2xl bg-[var(--app-bg-secondary)] border border-[var(--app-border)] text-left hover:border-[var(--app-accent)] transition-colors"
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-lg font-bold text-[var(--app-text-muted)]">#{i + 1}</span>
                    <p className="font-medium flex-1">{card.optionA} vs {card.optionB}</p>
                  </div>
                  <div className="mt-2 flex gap-2 items-center">
                    <div className="flex-1 h-2 rounded-full bg-[var(--app-border)] overflow-hidden">
                      <div
                        className="h-full bg-[var(--app-accent)] rounded-full"
                        style={{ width: `${pA}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold">{pA}%</span>
                  </div>
                  <p className="text-xs text-[var(--app-text-muted)] mt-1">{total} голосов</p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
