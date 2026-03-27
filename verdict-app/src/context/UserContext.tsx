import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { getTelegramWebApp } from '@/lib/telegram';

const STORAGE_KEY = 'verdict_user';
const SAVED_CARDS_KEY = 'verdict_saved_cards';
const ASK_PEOPLE_COUNT_KEY = 'verdict_ask_people';

export type Gender = 'male' | 'female';
export type AgeGroup = 'under18' | '18-24' | '25-34' | '35-44' | '45-59' | '60+';

export interface UserProfile {
  userId: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
  gender?: Gender;
  ageGroup?: AgeGroup;
  country?: string;
  city?: string;
  isPremium?: boolean;
}

interface UserContextValue {
  user: UserProfile | null;
  isOnboarded: boolean;
  savedCardIds: string[];
  askPeopleCountThisMonth: number;
  completeOnboarding: (data: { gender: Gender; ageGroup: AgeGroup; country: string; city: string }) => void;
  toggleSavedCard: (cardId: string) => void;
  incrementAskPeopleCount: () => void;
  canAskPeople: boolean;
  refreshUser: () => void;
}

const UserContext = createContext<UserContextValue | null>(null);

function getMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const ASK_PEOPLE_FREE_LIMIT = 3;

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [savedCardIds, setSavedCardIds] = useState<string[]>([]);
  const [askPeopleCount, setAskPeopleCount] = useState<Record<string, number>>({});

  const loadFromStorage = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw));

      const saved = localStorage.getItem(SAVED_CARDS_KEY);
      if (saved) setSavedCardIds(JSON.parse(saved));

      const countRaw = localStorage.getItem(ASK_PEOPLE_COUNT_KEY);
      if (countRaw) setAskPeopleCount(JSON.parse(countRaw));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadFromStorage();

    const tg = getTelegramWebApp();
    const u = tg?.initDataUnsafe?.user;
    if (u) {
      const profile: UserProfile = {
        userId: String(u.id),
        firstName: u.first_name,
        lastName: u.last_name,
        username: u.username,
        photoUrl: u.photo_url,
        isPremium: u.is_premium,
      };
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : {};
      const merged = { ...profile, ...parsed };
      setUser(merged);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    }
  }, [loadFromStorage]);

  const completeOnboarding = useCallback((data: { gender: Gender; ageGroup: AgeGroup; country: string; city: string }) => {
    setUser(prev => {
      const next = prev ? { ...prev, ...data } : { userId: 'anon', ...data };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const toggleSavedCard = useCallback((cardId: string) => {
    setSavedCardIds(prev => {
      const next = prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId];
      localStorage.setItem(SAVED_CARDS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const incrementAskPeopleCount = useCallback(() => {
    const key = getMonthKey();
    setAskPeopleCount(prev => {
      const next = { ...prev, [key]: (prev[key] ?? 0) + 1 };
      localStorage.setItem(ASK_PEOPLE_COUNT_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const askPeopleCountThisMonth = askPeopleCount[getMonthKey()] ?? 0;
  const canAskPeople = user?.isPremium || askPeopleCountThisMonth < ASK_PEOPLE_FREE_LIMIT;

  const isOnboarded = !!(user?.gender && user?.ageGroup && user?.country);

  const refreshUser = useCallback(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  return (
    <UserContext.Provider
      value={{
        user,
        isOnboarded,
        savedCardIds,
        askPeopleCountThisMonth,
        completeOnboarding,
        toggleSavedCard,
        incrementAskPeopleCount,
        canAskPeople,
        refreshUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}
