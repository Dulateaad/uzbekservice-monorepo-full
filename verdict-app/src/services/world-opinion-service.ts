/**
 * World Opinion Engine — разбивка голосов по миру, стране, городу, полу, возрасту.
 * Premium feature.
 */

import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const VOTES_COLLECTION = 'verdict_votes';

export interface OpinionBreakdown {
  label: string;
  percentA: number;
  percentB: number;
  total: number;
}

function aggregateVotes(
  votes: { choice: string; gender?: string; ageGroup?: string; country?: string; city?: string }[]
): { votesA: number; votesB: number } {
  let votesA = 0;
  let votesB = 0;
  for (const v of votes) {
    if (v.choice === 'A') votesA++;
    else votesB++;
  }
  return { votesA, votesB };
}

function toPercent(a: number, b: number): number {
  const total = a + b;
  return total > 0 ? Math.round((a / total) * 100) : 50;
}

export async function getCardOpinionBreakdown(cardId: string): Promise<OpinionBreakdown[]> {
  const col = collection(db, VOTES_COLLECTION);
  const q = query(col, where('cardId', '==', cardId), limit(1000));
  const snapshot = await getDocs(q);
  const votes = snapshot.docs.map((d) => {
    const data = d.data();
    return {
      choice: (data.choice ?? 'A') as string,
      gender: data.gender as string | undefined,
      ageGroup: data.ageGroup as string | undefined,
      country: data.country as string | undefined,
      city: data.city as string | undefined,
    };
  });

  const result: OpinionBreakdown[] = [];

  const world = aggregateVotes(votes);
  result.push({
    label: '🌍 Мир',
    percentA: toPercent(world.votesA, world.votesB),
    percentB: 100 - toPercent(world.votesA, world.votesB),
    total: world.votesA + world.votesB,
  });

  const byCountry = new Map<string, typeof votes>();
  const byGender = new Map<string, typeof votes>();
  const byAge = new Map<string, typeof votes>();
  const byCity = new Map<string, typeof votes>();

  for (const v of votes) {
    if (v.country) {
      const arr = byCountry.get(v.country) ?? [];
      arr.push(v);
      byCountry.set(v.country, arr);
    }
    if (v.gender) {
      const arr = byGender.get(v.gender) ?? [];
      arr.push(v);
      byGender.set(v.gender, arr);
    }
    if (v.ageGroup) {
      const arr = byAge.get(v.ageGroup) ?? [];
      arr.push(v);
      byAge.set(v.ageGroup, arr);
    }
    if (v.city) {
      const arr = byCity.get(v.city) ?? [];
      arr.push(v);
      byCity.set(v.city, arr);
    }
  }

  for (const [country, arr] of byCountry) {
    if (arr.length >= 5) {
      const agg = aggregateVotes(arr);
      result.push({
        label: `🏳️ ${country}`,
        percentA: toPercent(agg.votesA, agg.votesB),
        percentB: 100 - toPercent(agg.votesA, agg.votesB),
        total: agg.votesA + agg.votesB,
      });
    }
  }

  for (const [city, arr] of byCity) {
    if (arr.length >= 5) {
      const agg = aggregateVotes(arr);
      result.push({
        label: `🏙️ ${city}`,
        percentA: toPercent(agg.votesA, agg.votesB),
        percentB: 100 - toPercent(agg.votesA, agg.votesB),
        total: agg.votesA + agg.votesB,
      });
    }
  }

  const maleVotes = byGender.get('male') ?? [];
  const femaleVotes = byGender.get('female') ?? [];
  if (maleVotes.length >= 5) {
    const agg = aggregateVotes(maleVotes);
    result.push({
      label: '👨 Мужчины',
      percentA: toPercent(agg.votesA, agg.votesB),
      percentB: 100 - toPercent(agg.votesA, agg.votesB),
      total: agg.votesA + agg.votesB,
    });
  }
  if (femaleVotes.length >= 5) {
    const agg = aggregateVotes(femaleVotes);
    result.push({
      label: '👩 Женщины',
      percentA: toPercent(agg.votesA, agg.votesB),
      percentB: 100 - toPercent(agg.votesA, agg.votesB),
      total: agg.votesA + agg.votesB,
    });
  }

  const ageLabels: Record<string, string> = {
    under18: '🧒 до 18',
    '18-24': '👦 18–24',
    '25-34': '👨 25–34',
    '35-44': '👨‍🦳 35–44',
    '45-59': '👴 45–59',
    '60+': '👴 60+',
  };
  for (const [age, arr] of byAge) {
    if (arr.length >= 5) {
      const agg = aggregateVotes(arr);
      result.push({
        label: ageLabels[age] ?? age,
        percentA: toPercent(agg.votesA, agg.votesB),
        percentB: 100 - toPercent(agg.votesA, agg.votesB),
        total: agg.votesA + agg.votesB,
      });
    }
  }

  return result;
}
