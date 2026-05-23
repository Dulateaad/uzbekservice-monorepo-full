"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeAuditLog = writeAuditLog;
const admin = require("firebase-admin");
const collections_1 = require("./collections");
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
/**
 * Неомутируемая запись в журнал аудита (финансы, склад, налоги, права — по ТЗ).
 */
async function writeAuditLog(payload) {
    const ref = db.collection(collections_1.PLATFORM_COLLECTIONS.auditLogs).doc();
    await ref.set(Object.assign(Object.assign({}, payload), { createdAt: FieldValue.serverTimestamp() }));
}
//# sourceMappingURL=audit.js.map