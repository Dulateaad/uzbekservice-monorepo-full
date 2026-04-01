"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cpaPostbackOnUserCreate = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios_1 = require("axios");
/**
 * После регистрации пользователя с полем cpaAttribution отправляет S2S postback на URL из
 * документа Firestore `app_settings/cpa` (поле registrationPostbackUrl).
 *
 * Пример документа `app_settings/cpa`:
 * {
 *   "enabled": true,
 *   "registrationPostbackUrl": "https://tracker.example.com/postback?click_id={{click_id}}&status=lead&sub1={{sub1}}&uid={{userId}}"
 * }
 *
 * Подстановка: {{ключ}} из cpaAttribution и служебные userId, phoneNumber, name.
 */
exports.cpaPostbackOnUserCreate = functions
    .region('us-central1')
    .firestore.document('users/{userId}')
    .onCreate(async (snap, context) => {
    var _a;
    const data = snap.data();
    if (!data)
        return;
    const cpa = data.cpaAttribution;
    if (!cpa || typeof cpa !== 'object')
        return;
    const cpaRecord = cpa;
    const clickId = (_a = cpaRecord.click_id) !== null && _a !== void 0 ? _a : cpaRecord.clickId;
    if (clickId == null || String(clickId).trim() === '') {
        functions.logger.info('cpaPostback: no click_id, skip', { userId: context.params.userId });
        return;
    }
    const db = admin.firestore();
    const settingsRef = db.doc('app_settings/cpa');
    const settingsSnap = await settingsRef.get();
    if (!settingsSnap.exists) {
        functions.logger.info('cpaPostback: app_settings/cpa missing, skip');
        return;
    }
    const settings = settingsSnap.data();
    if (settings.enabled === false)
        return;
    const template = settings.registrationPostbackUrl;
    if (typeof template !== 'string' || !template.startsWith('http')) {
        functions.logger.warn('cpaPostback: registrationPostbackUrl invalid or empty');
        return;
    }
    const vars = {};
    for (const [k, v] of Object.entries(cpaRecord)) {
        if (v != null)
            vars[k] = String(v);
    }
    vars.userId = context.params.userId;
    if (data.phoneNumber != null)
        vars.phoneNumber = String(data.phoneNumber);
    if (data.name != null)
        vars.name = String(data.name);
    const url = applyTemplate(template, vars);
    try {
        const res = await axios_1.default.get(url, {
            timeout: 15000,
            validateStatus: () => true,
        });
        functions.logger.info('cpaPostback: GET done', {
            userId: context.params.userId,
            status: res.status,
        });
        await snap.ref.update({
            cpaPostbackSentAt: admin.firestore.FieldValue.serverTimestamp(),
            cpaPostbackRegistrationStatus: res.status,
        });
    }
    catch (err) {
        functions.logger.error('cpaPostback: request failed', err);
    }
});
function applyTemplate(template, vars) {
    return template.replace(/\{\{([\w]+)\}\}/g, (_m, key) => {
        const v = vars[key];
        return v != null ? encodeURIComponent(v) : '';
    });
}
//# sourceMappingURL=cpa_postback.js.map