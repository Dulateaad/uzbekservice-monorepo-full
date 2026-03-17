import { useState } from 'react';
import { hapticFeedback } from '@/lib/telegram';
import { useLocale } from '@/context/LocaleContext';
import { useUser, type Gender, type AgeGroup } from '@/context/UserContext';

const COUNTRIES = [
  { code: 'KZ', name: 'Казахстан', cities: ['Алматы', 'Астана', 'Шымкент'] },
  { code: 'RU', name: 'Россия', cities: ['Москва', 'Санкт-Петербург', 'Екатеринбург'] },
  { code: 'UZ', name: 'Узбекистан', cities: ['Ташкент', 'Самарканд', 'Бухара'] },
  { code: 'US', name: 'США', cities: ['New York', 'Los Angeles', 'Chicago'] },
  { code: 'OTHER', name: 'Другое', cities: [] },
];

interface OnboardingScreenProps {
  onComplete: () => void;
  onSkip?: () => void;
}

export function OnboardingScreen({ onComplete, onSkip }: OnboardingScreenProps) {
  const { t } = useLocale();
  const { completeOnboarding } = useUser();
  const [step, setStep] = useState(1);
  const [gender, setGender] = useState<Gender | null>(null);
  const [ageGroup, setAgeGroup] = useState<AgeGroup | null>(null);
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');

  const handleFinish = () => {
    if (gender && ageGroup && country) {
      completeOnboarding({
        gender,
        ageGroup,
        country: country || 'Unknown',
        city: city || country,
      });
      hapticFeedback('success');
      onComplete();
    }
  };

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)] p-6 flex flex-col">
      <h1 className="text-2xl font-bold mb-2">{t.onboardingTitle}</h1>
      <p className="text-[var(--app-text-muted)] text-sm mb-8">{t.onboardingDesc}</p>

      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-[var(--app-text-muted)]">{t.onboardingQ1}</p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setGender('male');
                hapticFeedback('light');
              }}
              className={`flex-1 p-4 rounded-2xl border-2 transition-colors ${
                gender === 'male' ? 'border-[var(--app-accent)] bg-[var(--app-accent)]/20' : 'border-[var(--app-border)] bg-[var(--app-bg-secondary)]'
              }`}
            >
              <span className="text-3xl block mb-2">👨</span>
              <span>{t.genderMale}</span>
            </button>
            <button
              onClick={() => {
                setGender('female');
                hapticFeedback('light');
              }}
              className={`flex-1 p-4 rounded-2xl border-2 transition-colors ${
                gender === 'female' ? 'border-[var(--app-accent)] bg-[var(--app-accent)]/20' : 'border-[var(--app-border)] bg-[var(--app-bg-secondary)]'
              }`}
            >
              <span className="text-3xl block mb-2">👩</span>
              <span>{t.genderFemale}</span>
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-[var(--app-text-muted)]">{t.onboardingQ2}</p>
          <div className="grid grid-cols-2 gap-2">
            {(['under18', '18-25', '26-35', '35+'] as AgeGroup[]).map((a) => (
              <button
                key={a}
                onClick={() => {
                  setAgeGroup(a);
                  hapticFeedback('light');
                }}
                className={`p-4 rounded-2xl border-2 transition-colors ${
                  ageGroup === a ? 'border-[var(--app-accent)] bg-[var(--app-accent)]/20' : 'border-[var(--app-border)] bg-[var(--app-bg-secondary)]'
                }`}
              >
                {a === 'under18' && '🧒 до 18'}
                {a === '18-25' && '👦 18-25'}
                {a === '26-35' && '👨 26-35'}
                {a === '35+' && '👴 35+'}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <p className="text-sm text-[var(--app-text-muted)]">{t.onboardingQ3}</p>
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
              onChange={(e) => {
                setCity(e.target.value);
                hapticFeedback('light');
              }}
              className="w-full px-4 py-3 rounded-xl bg-[var(--app-bg-secondary)] border border-[var(--app-border)] text-[var(--app-text)]"
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
              className="w-full px-4 py-3 rounded-xl bg-[var(--app-bg-secondary)] border border-[var(--app-border)] text-[var(--app-text)] placeholder:text-[var(--app-text-muted)]"
            />
          )}
        </div>
      )}

      <div className="mt-auto pt-8 flex gap-3">
        {step > 1 ? (
          <button
            onClick={() => {
              setStep(s => s - 1);
              hapticFeedback('light');
            }}
            className="px-4 py-3 rounded-xl border border-[var(--app-border)] text-[var(--app-text-muted)]"
          >
            {t.back}
          </button>
        ) : onSkip ? (
          <button
            onClick={() => {
              hapticFeedback('light');
              onSkip?.();
            }}
            className="px-4 py-3 rounded-xl border border-[var(--app-border)] text-[var(--app-text-muted)]"
          >
            {t.skip}
          </button>
        ) : null}
        <button
          onClick={() => {
            if (step < 3) {
              setStep(s => s + 1);
              hapticFeedback('light');
            } else {
              handleFinish();
            }
          }}
          disabled={
            (step === 1 && !gender) ||
            (step === 2 && !ageGroup) ||
            (step === 3 && !country)
          }
          className="flex-1 py-3 rounded-xl bg-[var(--app-accent)] text-white font-medium disabled:opacity-50"
        >
          {step < 3 ? t.next : t.finish}
        </button>
      </div>
    </div>
  );
}
