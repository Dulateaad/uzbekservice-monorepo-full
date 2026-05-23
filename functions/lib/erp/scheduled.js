"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.erpAnalyticsDailyRollup = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const types_1 = require("./types");
const db = admin.firestore();
/** Предыдущие сутки по UTC (для идемпотентного ключа date в документе). */
function utcYesterdayBounds() {
    const now = new Date();
    const startOfTodayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const startOfYesterdayMs = startOfTodayUtc - 86400000;
    const start = admin.firestore.Timestamp.fromMillis(startOfYesterdayMs);
    const end = admin.firestore.Timestamp.fromMillis(startOfTodayUtc);
    const dateStr = new Date(startOfYesterdayMs).toISOString().slice(0, 10);
    return { start, end, dateStr };
}
/**
 * Ежедневный снимок P&L и денежного потока в erp_analytics_daily/{companyId_YYYY-MM-DD}.
 */
exports.erpAnalyticsDailyRollup = functions
    .runWith({ timeoutSeconds: 300, memory: '512MB' })
    .pubsub.schedule('every day 03:00')
    .timeZone('UTC')
    .onRun(async () => {
    var _a, _b;
    const { start, end, dateStr } = utcYesterdayBounds();
    const companiesSnap = await db.collection(types_1.ERP_COLLECTIONS.companies).get();
    if (companiesSnap.empty) {
        console.log('[ERP] analytics: no companies');
        return null;
    }
    let processed = 0;
    for (const cdoc of companiesSnap.docs) {
        const companyId = cdoc.id;
        const plSnap = await db
            .collection(types_1.ERP_COLLECTIONS.plEntries)
            .where('companyId', '==', companyId)
            .where('date', '>=', start)
            .where('date', '<', end)
            .get();
        let revenue = 0;
        let expense = 0;
        for (const d of plSnap.docs) {
            const row = d.data();
            const t = row.type;
            const amt = Number((_a = row.amount) !== null && _a !== void 0 ? _a : 0);
            if (t === 'income')
                revenue += amt;
            else if (t === 'expense')
                expense += amt;
        }
        const cashSnap = await db
            .collection(types_1.ERP_COLLECTIONS.cashMovements)
            .where('companyId', '==', companyId)
            .where('date', '>=', start)
            .where('date', '<', end)
            .get();
        let cashNet = 0;
        for (const d of cashSnap.docs) {
            const row = d.data();
            const amt = Number((_b = row.amount) !== null && _b !== void 0 ? _b : 0);
            const typ = row.type;
            if (typ === 'in')
                cashNet += amt;
            else if (typ === 'out')
                cashNet -= amt;
        }
        const docId = `${companyId}_${dateStr}`;
        await db
            .collection(types_1.ERP_COLLECTIONS.analyticsDaily)
            .doc(docId)
            .set({
            companyId,
            date: dateStr,
            revenue: Math.round(revenue * 100) / 100,
            expense: Math.round(expense * 100) / 100,
            profit: Math.round((revenue - expense) * 100) / 100,
            cashFlowDay: Math.round(cashNet * 100) / 100,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        processed++;
    }
    console.log('[ERP] analytics rollup', dateStr, 'companies', processed);
    return null;
});
//# sourceMappingURL=scheduled.js.map