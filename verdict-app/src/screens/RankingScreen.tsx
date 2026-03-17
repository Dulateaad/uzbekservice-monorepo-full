import { useLocale } from '@/context/LocaleContext';

export function RankingScreen() {
  const { t } = useLocale();
  return (
    <div className="min-h-[50vh] flex items-center justify-center p-6">
      <p className="text-[var(--app-text-muted)] text-center">Ranking — {t.comingSoon}</p>
    </div>
  );
}
