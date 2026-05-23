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
  runTransaction,
  where,
} from 'firebase/firestore';
import type { DocumentReference } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { VerdictCard } from '@/types/card';
import { validateCard } from '@/data/forbidden-content';
import { computeQualityScore, QUALITY_THRESHOLD_PUBLISH } from '@/services/quality-score-service';
import { hydrateCardsWithObjects } from '@/services/objects-service';

const CARDS_COLLECTION = 'verdict_cards';
const VOTES_COLLECTION = 'verdict_votes';

export interface FirestoreCard {
  id: string;
  optionA: string;
  optionB: string;
  objectIdA?: string;
  objectIdB?: string;
  imageA?: string;
  imageB?: string;
  category: string;
  votesA: number;
  votesB: number;
  createdAt: Timestamp;
  status?: 'pending' | 'published' | 'rejected' | 'hit';
  authorId?: string;
  geoScope?: 'global' | 'country' | 'city';
  country?: string;
  city?: string;
  subcategory?: string;
  tags?: string[];
  qualityScore?: number;
  isBattleOfDay?: boolean;
  duplicateOf?: string;
}

const HIT_VOTES = 10_000;

function toVerdictCard(docId: string, data: FirestoreCard): VerdictCard {
  const votesA = data.votesA ?? 0;
  const votesB = data.votesB ?? 0;
  const total = votesA + votesB;
  let status: FirestoreCard['status'] = data.status ?? 'published';
  if (status === 'published' && total >= HIT_VOTES) status = 'hit';
  return {
    id: docId,
    optionA: data.optionA,
    optionB: data.optionB,
    objectIdA: data.objectIdA,
    objectIdB: data.objectIdB,
    imageA: data.imageA,
    imageB: data.imageB,
    category: data.category as VerdictCard['category'],
    votesA,
    votesB,
    totalVotes: total,
    createdAt: data.createdAt?.toMillis?.() ?? Date.now(),
    status,
    geoScope: data.geoScope,
    country: data.country,
    city: data.city,
    subcategory: data.subcategory,
    tags: data.tags,
    qualityScore: data.qualityScore,
    isBattleOfDay: data.isBattleOfDay,
    duplicateOf: data.duplicateOf,
  };
}

export interface UserGeo {
  country?: string;
  city?: string;
}

export async function getCards(category?: string, maxCount = 50, userGeo?: UserGeo): Promise<VerdictCard[]> {
  const col = collection(db, CARDS_COLLECTION);
  const q = query(col, orderBy('createdAt', 'desc'), limit(maxCount * 5));
  const snapshot = await getDocs(q);
  let docs = snapshot.docs.filter((d) => {
    const data = d.data() as FirestoreCard;
    const status = data.status ?? 'published';
    return status === 'published' || status === 'hit';
  });
  let cards = docs.map((d) => toVerdictCard(d.id, d.data() as FirestoreCard));
  if (category && category !== 'popular') {
    cards = cards.filter((c) => c.category === category);
  }

  if (userGeo?.country || userGeo?.city) {
    const global = cards.filter((c) => !c.geoScope || c.geoScope === 'global');
    const country = userGeo.country
      ? cards.filter((c) => c.geoScope === 'country' && c.country === userGeo.country)
      : [];
    const city = userGeo.city
      ? cards.filter((c) => c.geoScope === 'city' && c.city === userGeo.city)
      : [];
    const nGlobal = Math.ceil(maxCount * 0.5);
    const nCountry = Math.ceil(maxCount * 0.3);
    const nCity = Math.ceil(maxCount * 0.2);
    const mixed: VerdictCard[] = [];
    const used = new Set<string>();
    const addFrom = (arr: VerdictCard[], limit: number) => {
      let added = 0;
      for (const c of arr) {
        if (added >= limit || mixed.length >= maxCount) break;
        if (!used.has(c.id)) {
          used.add(c.id);
          mixed.push(c);
          added++;
        }
      }
    };
    addFrom(global, nGlobal);
    addFrom(country, nCountry);
    addFrom(city, nCity);
    addFrom(global, maxCount - mixed.length);
    return hydrateCardsWithObjects(mixed.slice(0, maxCount));
  }

  return hydrateCardsWithObjects(cards.slice(0, maxCount));
}

export async function searchCards(queryText: string, maxCount = 20): Promise<VerdictCard[]> {
  if (!queryText.trim()) return [];
  const col = collection(db, CARDS_COLLECTION);
  const q = query(col, orderBy('createdAt', 'desc'), limit(100));
  const snapshot = await getDocs(q);
  const qLower = queryText.toLowerCase().trim();
  const qWords = qLower.split(/\s+/).filter(Boolean);
  const docs = snapshot.docs.filter((d) => {
    const data = d.data() as FirestoreCard;
    const status = data.status ?? 'published';
    if (status !== 'published' && status !== 'hit') return false;
    const c = toVerdictCard(d.id, data);
    const inOptions = c.optionA.toLowerCase().includes(qLower) || c.optionB.toLowerCase().includes(qLower);
    const inTags = (c.tags ?? []).some((t) => t.toLowerCase().includes(qLower) || qWords.some((w) => t.toLowerCase().includes(w)));
    return inOptions || inTags;
  });
  const cards = docs.map((d) => toVerdictCard(d.id, d.data() as FirestoreCard));
  return hydrateCardsWithObjects(cards.slice(0, maxCount));
}

export async function getCardsByAuthor(authorId: string): Promise<VerdictCard[]> {
  const col = collection(db, CARDS_COLLECTION);
  const q = query(col, orderBy('createdAt', 'desc'), limit(50));
  const snapshot = await getDocs(q);
  const docs = snapshot.docs.filter((d) => {
    const data = d.data() as FirestoreCard;
    return data.authorId === authorId;
  });
  return hydrateCardsWithObjects(docs.map((d) => toVerdictCard(d.id, d.data() as FirestoreCard)));
}

export async function getCardById(cardId: string): Promise<VerdictCard | null> {
  const ref = doc(db, CARDS_COLLECTION, cardId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const card = toVerdictCard(snap.id, snap.data() as FirestoreCard);
  const [hydrated] = await hydrateCardsWithObjects([card]);
  return hydrated ?? card;
}

function normalizePair(a: string, b: string): string {
  const [x, y] = [a.trim().toLowerCase(), b.trim().toLowerCase()];
  return x < y ? `${x}|${y}` : `${y}|${x}`;
}

export async function findDuplicateCard(optionA: string, optionB: string): Promise<VerdictCard | null> {
  const col = collection(db, CARDS_COLLECTION);
  const q = query(col, orderBy('createdAt', 'desc'), limit(500));
  const snapshot = await getDocs(q);
  const key = normalizePair(optionA, optionB);
  for (const d of snapshot.docs) {
    const data = d.data() as FirestoreCard;
    if (normalizePair(data.optionA, data.optionB) === key) {
      return toVerdictCard(d.id, data);
    }
  }
  return null;
}

export interface VoteMetadata {
  gender?: string;
  ageGroup?: string;
  country?: string;
  city?: string;
}

/** Один документ на пару (userId, cardId) — без POST API, только Firestore */
export function userVoteDocumentId(userId: string, cardId: string): string {
  const u = String(userId).replace(/\//g, '_');
  const c = String(cardId).replace(/\//g, '_');
  return `uv_${u}__${c}`.slice(0, 1400);
}

function voteMetadataFields(metadata?: VoteMetadata | null): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  if (metadata?.gender) o.gender = metadata.gender;
  if (metadata?.ageGroup) o.ageGroup = metadata.ageGroup;
  if (metadata?.country) o.country = metadata.country;
  if (metadata?.city) o.city = metadata.city;
  return o;
}

/** Голос пользователя по карточке: сначала канонический doc id, иначе старый формат (случайный id) */
export async function getUserVoteForCard(userId: string, cardId: string): Promise<'A' | 'B' | null> {
  const canon = doc(db, VOTES_COLLECTION, userVoteDocumentId(userId, cardId));
  const s = await getDoc(canon);
  if (s.exists()) return (s.data().choice as 'A' | 'B') ?? null;
  const q = query(
    collection(db, VOTES_COLLECTION),
    where('userId', '==', userId),
    where('cardId', '==', cardId),
    limit(15),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  let best = snap.docs[0];
  let bestT = best.data().updatedAt?.toMillis?.() ?? best.data().createdAt?.toMillis?.() ?? 0;
  for (const d of snap.docs) {
    const t = d.data().updatedAt?.toMillis?.() ?? d.data().createdAt?.toMillis?.() ?? 0;
    if (t >= bestT) {
      bestT = t;
      best = d;
    }
  }
  return (best.data().choice as 'A' | 'B') ?? null;
}

export async function hydrateCardsWithUserVotes(
  userId: string | null | undefined,
  cards: VerdictCard[],
): Promise<VerdictCard[]> {
  if (!userId || cards.length === 0) return cards;
  const enriched = await Promise.all(
    cards.map(async c => {
      const v = await getUserVoteForCard(userId, c.id);
      return { ...c, userVote: v };
    }),
  );
  return enriched;
}

type LegacyVoteHint = {
  prevChoice: 'A' | 'B' | null;
  legacyRef: DocumentReference | null;
};

async function readLegacyVoteHint(userId: string, cardId: string): Promise<LegacyVoteHint> {
  const canonId = userVoteDocumentId(userId, cardId);
  const canonRef = doc(db, VOTES_COLLECTION, canonId);
  const canonSnap = await getDoc(canonRef);
  if (canonSnap.exists()) return { prevChoice: null, legacyRef: null };
  const q = query(
    collection(db, VOTES_COLLECTION),
    where('userId', '==', userId),
    where('cardId', '==', cardId),
    limit(15),
  );
  const snap = await getDocs(q);
  if (snap.empty) return { prevChoice: null, legacyRef: null };
  let best = snap.docs[0];
  let bestT = best.data().updatedAt?.toMillis?.() ?? best.data().createdAt?.toMillis?.() ?? 0;
  for (const d of snap.docs) {
    if (d.id === canonId) continue;
    const t = d.data().updatedAt?.toMillis?.() ?? d.data().createdAt?.toMillis?.() ?? 0;
    if (t >= bestT) {
      bestT = t;
      best = d;
    }
  }
  if (best.id === canonId) return { prevChoice: null, legacyRef: null };
  return {
    prevChoice: (best.data().choice as 'A' | 'B') ?? null,
    legacyRef: best.ref,
  };
}

/**
 * Один актуальный голос на карточку: upsert в verdict_votes + корректный increment/decrement по переголосованию.
 * Без userId — только increment на карточке (как раньше).
 */
export async function voteCard(
  cardId: string,
  choice: 'A' | 'B',
  userId?: string | null,
  metadata?: VoteMetadata | null
): Promise<void> {
  const cardRef = doc(db, CARDS_COLLECTION, cardId);

  if (!userId) {
    const batch = writeBatch(db);
    batch.update(cardRef, choice === 'A' ? { votesA: increment(1) } : { votesB: increment(1) });
    await batch.commit();
    return;
  }

  const voteRef = doc(db, VOTES_COLLECTION, userVoteDocumentId(userId, cardId));
  const legacyHint = await readLegacyVoteHint(userId, cardId);

  await runTransaction(db, async tx => {
    const [cardSnap, voteSnap] = await Promise.all([tx.get(cardRef), tx.get(voteRef)]);
    if (!cardSnap.exists()) return;

    let prev: 'A' | 'B' | null = voteSnap.exists() ? ((voteSnap.data().choice as 'A' | 'B') ?? null) : null;
    const legacyRef =
      !voteSnap.exists() && legacyHint.legacyRef ? legacyHint.legacyRef : null;
    if (prev === null && legacyHint.prevChoice !== null && !voteSnap.exists()) {
      prev = legacyHint.prevChoice;
    }

    if (prev === choice) {
      if (legacyRef) {
        tx.set(
          voteRef,
          {
            userId,
            cardId,
            choice,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            ...voteMetadataFields(metadata),
          },
          { merge: true },
        );
        tx.delete(legacyRef);
      } else if (voteSnap.exists()) {
        tx.set(voteRef, { updatedAt: Timestamp.now(), ...voteMetadataFields(metadata) }, { merge: true });
      }
      return;
    }

    if (prev === null) {
      tx.update(cardRef, choice === 'A' ? { votesA: increment(1) } : { votesB: increment(1) });
    } else {
      const decKey = prev === 'A' ? 'votesA' : 'votesB';
      const incKey = choice === 'A' ? 'votesA' : 'votesB';
      tx.update(cardRef, {
        [decKey]: increment(-1),
        [incKey]: increment(1),
      });
    }

    const now = Timestamp.now();
    const base: Record<string, unknown> = {
      userId,
      cardId,
      choice,
      updatedAt: now,
      ...voteMetadataFields(metadata),
    };
    if (!voteSnap.exists()) base.createdAt = now;
    else base.createdAt = voteSnap.data().createdAt ?? now;
    tx.set(voteRef, base, { merge: true });

    if (legacyRef) tx.delete(legacyRef);
  });
}

export interface CreateCardOptions {
  subcategory?: string;
  tags?: string[];
  geoScope?: 'global' | 'country' | 'city';
  country?: string;
  city?: string;
}

export async function createCard(
  optionA: string,
  optionB: string,
  category: string,
  authorId?: string | null,
  options?: CreateCardOptions
): Promise<string> {
  const validation = validateCard(optionA, optionB);
  if (!validation.valid) {
    throw new Error(validation.reason ?? 'Запрещённая тема');
  }

  const duplicate = await findDuplicateCard(optionA, optionB);
  if (duplicate) {
    throw new Error('Такая карточка уже существует');
  }

  const qualityScore = computeQualityScore(optionA, optionB);
  const status = qualityScore >= QUALITY_THRESHOLD_PUBLISH ? 'published' : 'pending';

  const col = collection(db, CARDS_COLLECTION);
  const ref = doc(col);
  const data: Record<string, unknown> = {
    optionA,
    optionB,
    category,
    votesA: 0,
    votesB: 0,
    createdAt: Timestamp.now(),
    status,
    qualityScore: Math.round(qualityScore * 100) / 100,
  };
  if (authorId) data.authorId = authorId;
  if (options?.subcategory) data.subcategory = options.subcategory;
  if (options?.tags?.length) data.tags = options.tags;
  if (options?.geoScope) data.geoScope = options.geoScope;
  if (options?.country) data.country = options.country;
  if (options?.city) data.city = options.city;
  await setDoc(ref, data);
  return ref.id;
}

function getDayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function getBattleOfDayCard(): Promise<VerdictCard | null> {
  const cards = await getCards(undefined, 50);
  if (cards.length === 0) return null;
  const dayKey = getDayKey();
  const seed = dayKey.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const sorted = [...cards].sort((a, b) => b.totalVotes - a.totalVotes);
  const idx = seed % Math.max(1, Math.min(10, sorted.length));
  return sorted[idx] ?? sorted[0];
}
