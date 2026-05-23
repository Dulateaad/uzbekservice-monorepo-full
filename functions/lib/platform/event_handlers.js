"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.routeBusinessEvent = routeBusinessEvent;
const audit_1 = require("./audit");
/**
 * Точка расширения: AI, отчёты, уведомления, налоги, salary engine.
 * Сейчас — безопасные заглушки + аудит по критичным типам.
 */
async function routeBusinessEvent(type, data, eventId) {
    const companyId = data.companyId || 'unknown';
    switch (type) {
        case 'payment_received':
        case 'order_completed':
        case 'production_done':
        case 'delivery_status':
        case 'pos_shift_closed':
            await (0, audit_1.writeAuditLog)({
                companyId,
                action: 'business_event',
                entityType: type,
                entityId: eventId,
                actorId: data.userId || 'system',
                after: Object.assign({ type }, shallowData(data)),
                source: 'event_router',
            });
            return;
        default:
            console.log('[platform] unhandled event type (reserved for future)', type, eventId);
    }
}
function shallowData(d) {
    const out = {};
    for (const k of Object.keys(d).slice(0, 20)) {
        const v = d[k];
        if (v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
            out[k] = v;
        }
    }
    return out;
}
//# sourceMappingURL=event_handlers.js.map