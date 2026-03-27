import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const VOTES_COLLECTION = 'verdict_votes';

export interface UserVote {
  cardId: string;
  choice: 'A' | 'B';
  createdAt: number;
}

export async function getUserVotes(userId: string, maxCount = 500): Promise<UserVote[]> {
  try {
    const col = collection(db, VOTES_COLLECTION);
    const q = query(col, where('userId', '==', userId), limit(maxCount));
    const snapshot = await getDocs(q);
    const votes = snapshot.docs.map((d) => {
      const data = d.data();
      return {
        cardId: data.cardId,
        choice: (data.choice ?? 'A') as 'A' | 'B',
        createdAt: data.createdAt?.toMillis?.() ?? Date.now(),
      };
    });
    votes.sort((a, b) => b.createdAt - a.createdAt);
    return votes.slice(0, maxCount);
  } catch {
    return [];
  }
}

export async function getUserVoteCount(userId: string): Promise<number> {
  const votes = await getUserVotes(userId, 1000);
  return votes.length;
}
