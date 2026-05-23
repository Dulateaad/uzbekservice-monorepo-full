import * as admin from 'firebase-admin';
import {PLATFORM_COLLECTIONS} from './collections';

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

export type AuditPayload = {
  companyId: string;
  action: string;
  entityType: string;
  entityId: string;
  /** userId из Auth или 'system' */
  actorId?: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  source: string;
  metadata?: Record<string, unknown>;
};

/**
 * Неомутируемая запись в журнал аудита (финансы, склад, налоги, права — по ТЗ).
 */
export async function writeAuditLog(payload: AuditPayload): Promise<void> {
  const ref = db.collection(PLATFORM_COLLECTIONS.auditLogs).doc();
  await ref.set({
    ...payload,
    createdAt: FieldValue.serverTimestamp(),
  });
}
