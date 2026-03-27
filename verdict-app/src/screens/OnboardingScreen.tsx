import { useState } from 'react';
import { hapticFeedback } from '@/lib/telegram';
import { useLocale } from '@/context/LocaleContext';
import { useUser, type Gender, type AgeGroup } from '@/context/UserContext';

const COUNTRIES = [
  { code: 'KZ', name: 'Казахстан', cities: ['Алматы', 'Астана', 'Шымкент'] },
  { code: 'RU', name: 'Россия', cities: ['Москва', 'Санкт-Петербург', 'Екатеринбург'] },
  { code: 'UZ', name: 'Узбекистан', cities: ['Ташкент', 'Самарканд', 'Бухара'] },
  { code: 'US', name: 'США', cities: ['New York', 'Los Angeles', 'Chicago'] },
  { code: 'UA', name: 'Украина', cities: ['Киев', 'Харьков'] },
  { code: 'OTHER', name: 'Другое', cities: [] },
];

const AGE_GROUPS: { id: AgeGroup; label: string; emoji: string }[] = [
  { id: 'under18', label: 'до 18', emoji: '🧒' },
  { id: '18-24', label: '18–24', emoji: '👦' },
  { id: '25-34', label: '25–34', emoji: '👨' },
  { id: '35-44', label: '35–44', emoji: '👨‍🦳' },
  { id: '45-59', label: '45–59', emoji: '👴' },
  { id: '60+', label: '60+', emoji: '👴' },
];

interface OnboardingScreenProps {
  onComplete: () => void;
  onSkip?: () => void;
}

export function OnboardingScreen({ onComplete, onSkip }: OnboardingScreenProps) {
  const { t } = useLocale();
  const { completeOnboarding } = useUser();
  const [gender, setGender] = useState<Gender | null>(null);
  const [ageGroup, setAgeGroup] = useState<AgeGroup | null>(null);
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');

  const handleFinish = () => {
    if (gender && ageGroup && country) {
      completeOnboarding({
        gender,
        ageGroup,
        country,
        city: city || country,
      });
      hapticFeedback('success');
      onComplete();
    }
  };

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)] p-6 flex flex-col overflow-y-auto">
      <h1 className="text-2xl font-bold mb-2">{t.onboardingTitle}</h1>
      <p className="text-[var(--app-text-muted)] text-sm mb-6">{t.onboardingDesc}</p>

      <div className="space-y-6">
        <div>
          <p className="text-sm text-[var(--app-text-muted)] mb-2">{t.onboardingQ1}</p>
          <div className="flex gap-3">
            <button
              onClick={() => { setGender('male'); hapticFeedback('light'); }}
              className={`flex-1 p-4 rounded-2xl border-2 transition-colors ${
                gender === 'male' ? 'border-[var(--app-accent)] bg-[var(--app-accent)]/20' : 'border-[var(--app-border)] bg-[var(--app-bg-secondary)]'
              }`}
            >
              <span className="text-3xl block mb-2">👨</span>
              <span>{t.genderMale}</span>
            </button>
            <button
              onClick={() => { setGender('female'); hapticFeedback('light'); }}
              className={`flex-1 p-4 rounded-2xl border-2 transition-colors ${
                gender === 'female' ? 'border-[var(--app-accent)] bg-[var(--app-accent)]/20' : 'border-[var(--app-border)] bg-[var(--app-bg-secondary)]'
              }`}
            >
              <span className="text-3xl block mb-2">👩</span>
              <span>{t.genderFemale}</span>
            </button>
          </div>
        </div>

        <div>
          <p className="text-sm text-[var(--app-text-muted)] mb-2">{t.onboardingQ2}</p>
          <div className="grid grid-cols-2 gap-2">
            {AGE_GROUPS.map((a) => (
              <button
                key={a.id}
                onClick={() => { setAgeGroup(a.id); hapticFeedback('light'); }}
                className={`p-3 rounded-2xl border-2 transition-colors text-sm ${
                  ageGroup === a.id ? 'border-[var(--app-accent)] bg-[var(--app-accent)]/20' : 'border-[var(--app-border)] bg-[var(--app-bg-secondary)]'
                }`}
              >
                <span className="block text-lg mb-0.5">{a.emoji}</span>
                <span>{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm text-[var(--app-text-muted)] mb-2">{t.onboardingQ3}</p>
          <select
            value={country}
            onChange={(e) => {
              setCountry(e.target.value);
              setCity('');
              hapticFeedback('light');
            }}
            className="w-full px-4 py-3 rounded-xl bg-[var(--app-bg-secondary)] border border-[var(--app-border)] text-[var(--app-text)]"
          >
            <option value="">{t.selectCountry}</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.name}>{c.name}</option>
            ))}
          </select>
          {country && COUNTRIES.find(c => c.name === country)?.cities?.length ? (
            <select
              value={city}
              onChange={(e) => { setCity(e.target.value); hapticFeedback('light'); }}
              className="w-full mt-2 px-4 py-3 rounded-xl bg-[var(--app-bg-secondary)] border border-[var(--app-border)] text-[var(--app-text)]"
            >
              <option value="">{t.selectCity}</option>
              {COUNTRIES.find(c => c.name === country)?.cities.map((ci) => (
                <option key={ci} value={ci}>{ci}</option>
              ))}
            </select>
          ) : country && (
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder={t.selectCity}
              className="w-full mt-2 px-4 py-3 rounded-xl bg-[var(--app-bg-secondary)] border border-[var(--app-border)] text-[var(--app-text)] placeholder:text-[var(--app-text-muted)]"
            />
          )}
        </div>
      </div>

      <div className="mt-auto pt-8 flex gap-3">
        {onSkip && (
          <button
            onClick={() => { hapticFeedback('light'); onSkip(); }}
            className="px-4 py-3 rounded-xl border border-[var(--app-border)] text-[var(--app-text-muted)]"
          >
            {t.skip}
          </button>
        )}
        <button
          onClick={handleFinish}
          disabled={!gender || !ageGroup || !country}
          className="flex-1 py-3 rounded-xl bg-[var(--app-accent)] text-white font-medium disabled:opacity-50"
        >
          {t.finish}
        </button>
      </div>
    </div>
  );
}
