import {
  collection,
  doc,
  getDocs,
  query,
  orderBy,
  limit,
  writeBatch,
  increment,
  getDoc,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { VerdictCard } from '@/types/card';
import { validateCard } from '@/data/forbidden-content';

const CARDS_COLLECTION = 'verdict_cards';
const VOTES_COLLECTION = 'verdict_votes';

export interface FirestoreCard {
  id: string;
  optionA: string;
  optionB: string;
  imageA?: string;
  imageB?: string;
  category: string;
  votesA: number;
  votesB: number;
  createdAt: Timestamp;
}

function toVerdictCard(docId: string, data: FirestoreCard): VerdictCard {
  const votesA = data.votesA ?? 0;
  const votesB = data.votesB ?? 0;
  return {
    id: docId,
    optionA: data.optionA,
    optionB: data.optionB,
    imageA: data.imageA,
    imageB: data.imageB,
    category: data.category as VerdictCard['category'],
    votesA,
    votesB,
    totalVotes: votesA + votesB,
    createdAt: data.createdAt?.toMillis?.() ?? Date.now(),
  };
}

export async function getCards(category?: string, maxCount = 50): Promise<VerdictCard[]> {
  const col = collection(db, CARDS_COLLECTION);
  const q = query(col, orderBy('createdAt', 'desc'), limit(maxCount));
  const snapshot = await getDocs(q);
  let cards = snapshot.docs.map((d) => toVerdictCard(d.id, d.data() as FirestoreCard));
  if (category) {
    cards = cards.filter((c) => c.category === category);
  }
  return cards;
}

export async function getCardById(cardId: string): Promise<VerdictCard | null> {
  const ref = doc(db, CARDS_COLLECTION, cardId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return toVerdictCard(snap.id, snap.data() as FirestoreCard);
}

export async function voteCard(
  cardId: string,
  choice: 'A' | 'B',
  userId?: string
): Promise<void> {
  const cardRef = doc(db, CARDS_COLLECTION, cardId);
  const batch = writeBatch(db);

  batch.update(cardRef, choice === 'A' ? { votesA: increment(1) } : { votesB: increment(1) });

  if (userId) {
    const voteRef = doc(collection(db, VOTES_COLLECTION));
    batch.set(voteRef, {
      cardId,
      userId,
      choice,
      createdAt: Timestamp.now(),
    });
  }

  await batch.commit();
}

export async function createCard(
  optionA: string,
  optionB: string,
  category: string
): Promise<string> {
  const validation = validateCard(optionA, optionB);
  if (!validation.valid) {
    throw new Error(validation.reason ?? 'Запрещённая тема');
  }

  const col = collection(db, CARDS_COLLECTION);
  const ref = doc(col);
  await setDoc(ref, {
    optionA,
    optionB,
    category,
    votesA: 0,
    votesB: 0,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}
