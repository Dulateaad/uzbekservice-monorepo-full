import { useState, useCallback } from 'react';
import { hapticFeedback } from '@/lib/telegram';
import { useLocale } from '@/context/LocaleContext';
import { searchCards } from '@/services/cards-service';
import { VoiceInput } from '@/components/VoiceInput';
import type { VerdictCard } from '@/types/card';

interface SearchScreenProps {
  onSelectCard: (card: VerdictCard) => void;
  onBack: () => void;
}

export function SearchScreen({ onSelectCard, onBack }: SearchScreenProps) {
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
      const cards = await searchCards(q);
      setResults(cards);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
      <div className="p-4 border-b border-[var(--app-border)]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              hapticFeedback('light');
              onBack();
            }}
            className="p-2 -ml-2 text-[var(--app-text-muted)]"
          >
            ←
          </button>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && doSearch()}
            placeholder={t.searchPlaceholder}
            className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--app-bg-secondary)] border border-[var(--app-border)] text-[var(--app-text)] placeholder:text-[var(--app-text-muted)]"
            autoFocus
          />
          <VoiceInput onResult={setQuery} />
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
          <p className="text-[var(--app-text-muted)] text-sm text-center py-8">{t.searchPlaceholder}</p>
        ) : results.length === 0 ? (
          <p className="text-[var(--app-text-muted)] text-sm text-center py-8">{t.noResults}</p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-[var(--app-text-muted)] mb-2">{t.searchResults}</p>
            {results.map((card) => (
              <button
                key={card.id}
                onClick={() => {
                  hapticFeedback('light');
                  onSelectCard(card);
                }}
                className="w-full p-4 rounded-2xl bg-[var(--app-bg-secondary)] border border-[var(--app-border)] text-left hover:border-[var(--app-accent)] transition-colors"
              >
                <p className="font-medium">{card.optionA} vs {card.optionB}</p>
                <p className="text-xs text-[var(--app-text-muted)] mt-1">
                  {card.votesA + card.votesB} {t.totalVotes.toLowerCase()}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
