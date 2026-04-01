import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';

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
export const cpaPostbackOnUserCreate = functions
  .region('us-central1')
  .firestore.document('users/{userId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    if (!data) return;

    const cpa = data.cpaAttribution;
    if (!cpa || typeof cpa !== 'object') return;

    const cpaRecord = cpa as Record<string, unknown>;
    const clickId = cpaRecord.click_id ?? cpaRecord.clickId;
    if (clickId == null || String(clickId).trim() === '') {
      functions.logger.info('cpaPostback: no click_id, skip', {userId: context.params.userId});
      return;
    }

    const db = admin.firestore();
    const settingsRef = db.doc('app_settings/cpa');
    const settingsSnap = await settingsRef.get();
    if (!settingsSnap.exists) {
      functions.logger.info('cpaPostback: app_settings/cpa missing, skip');
      return;
    }

    const settings = settingsSnap.data() as Record<string, unknown>;
    if (settings.enabled === false) return;

    const template = settings.registrationPostbackUrl;
    if (typeof template !== 'string' || !template.startsWith('http')) {
      functions.logger.warn('cpaPostback: registrationPostbackUrl invalid or empty');
      return;
    }

    const vars: Record<string, string> = {};
    for (const [k, v] of Object.entries(cpaRecord)) {
      if (v != null) vars[k] = String(v);
    }
    vars.userId = context.params.userId;
    if (data.phoneNumber != null) vars.phoneNumber = String(data.phoneNumber);
    if (data.name != null) vars.name = String(data.name);

    const url = applyTemplate(template, vars);

    try {
      const res = await axios.get(url, {
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
    } catch (err: unknown) {
      functions.logger.error('cpaPostback: request failed', err);
    }
  });

function applyTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{([\w]+)\}\}/g, (_m, key: string) => {
    const v = vars[key];
    return v != null ? encodeURIComponent(v) : '';
  });
}
