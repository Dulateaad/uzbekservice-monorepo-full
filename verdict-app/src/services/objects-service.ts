import { collection, getDocs, query, where, documentId } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { VerdictObject } from '@/types/object';
import type { VerdictCard } from '@/types/card';

const OBJECTS_COLLECTION = 'verdict_objects';

/** Firestore IN limit */
const BATCH = 30;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export interface FirestoreObjectDoc {
  label: string;
  imageUrl: string;
  imageSource?: string;
  externalRef?: string;
  createdAt?: { toMillis: () => number };
}

function toObject(id: string, data: FirestoreObjectDoc): VerdictObject {
  return {
    id,
    label: data.label,
    imageUrl: data.imageUrl,
    imageSource: data.imageSource as VerdictObject['imageSource'],
    externalRef: data.externalRef,
    createdAt: data.createdAt?.toMillis?.(),
  };
}

export async function batchGetObjects(ids: string[]): Promise<Map<string, VerdictObject>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const map = new Map<string, VerdictObject>();
  if (unique.length === 0) return map;

  for (const part of chunk(unique, BATCH)) {
    const col = collection(db, OBJECTS_COLLECTION);
    const q = query(col, where(documentId(), 'in', part));
    const snap = await getDocs(q);
    snap.forEach((d) => {
      map.set(d.id, toObject(d.id, d.data() as FirestoreObjectDoc));
    });
  }
  return map;
}

/** Подставляет imageA/imageB из объектов, если на карточке их нет */
export function mergeCardImages(card: VerdictCard, objects: Map<string, VerdictObject>): VerdictCard {
  const oa = card.objectIdA ? objects.get(card.objectIdA) : undefined;
  const ob = card.objectIdB ? objects.get(card.objectIdB) : undefined;
  return {
    ...card,
    imageA: card.imageA ?? oa?.imageUrl,
    imageB: card.imageB ?? ob?.imageUrl,
  };
}

export async function hydrateCardsWithObjects(cards: VerdictCard[]): Promise<VerdictCard[]> {
  const ids: string[] = [];
  for (const c of cards) {
    if (c.objectIdA && !c.imageA) ids.push(c.objectIdA);
    if (c.objectIdB && !c.imageB) ids.push(c.objectIdB);
  }
  if (ids.length === 0) return cards;
  const objects = await batchGetObjects(ids);
  return cards.map((c) => mergeCardImages(c, objects));
}
