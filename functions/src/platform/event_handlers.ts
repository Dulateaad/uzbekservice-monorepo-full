import {writeAuditLog} from './audit';

/**
 * Точка расширения: AI, отчёты, уведомления, налоги, salary engine.
 * Сейчас — безопасные заглушки + аудит по критичным типам.
 */
export async function routeBusinessEvent(
  type: string,
  data: Record<string, unknown>,
  eventId: string
): Promise<void> {
  const companyId = (data.companyId as string) || 'unknown';

  switch (type) {
    case 'payment_received':
    case 'order_completed':
    case 'production_done':
    case 'delivery_status':
    case 'pos_shift_closed':
      await writeAuditLog({
        companyId,
        action: 'business_event',
        entityType: type,
        entityId: eventId,
        actorId: (data.userId as string) || 'system',
        after: {type, ...shallowData(data)},
        source: 'event_router',
      });
      return;
    default:
      console.log('[platform] unhandled event type (reserved for future)', type, eventId);
  }
}

function shallowData(d: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(d).slice(0, 20)) {
    const v = d[k];
    if (v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      out[k] = v;
    }
  }
  return out;
}
