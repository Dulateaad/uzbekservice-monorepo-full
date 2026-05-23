import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/* eslint-disable require-jsdoc */
// Инициализация при отдельной загрузке модуля (порядок импортов в index.ts может отличаться).
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Push при новой записи в bh_crm_notifications (лиды, сделки, платежи, задачи).
 * Токены: users/{userId}.deviceTokens[] — как в Flutter PushNotificationService.saveTokenToUser.
 */
export const onBhCrmNotificationPush = functions
  .runWith({ memory: '256MB', timeoutSeconds: 60 })
  .firestore.document('bh_crm_notifications/{notifId}')
  .onCreate(async (snapshot, context) => {
    const data = snapshot.data();
    if (!data) {
      return null;
    }

    const userId = data.userId as string | undefined;
    const title = (data.title as string) || 'Business Hub';
    const body = (data.body as string) || '';

    if (!userId) {
      console.warn('onBhCrmNotificationPush: missing userId', context.params.notifId);
      return null;
    }

    const userRef = admin.firestore().collection('users').doc(userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      console.warn('onBhCrmNotificationPush: user not found', userId);
      return null;
    }

    const raw = userSnap.data()?.deviceTokens;
    const tokens = Array.isArray(raw)
      ? raw.filter((t: unknown): t is string => typeof t === 'string' && t.length > 8)
      : [];

    if (tokens.length === 0) {
      console.log('onBhCrmNotificationPush: no deviceTokens for', userId);
      return null;
    }

    const notifId = context.params.notifId as string;
    const orgId = String(data.organizationId ?? '');

    const dataPayload: Record<string, string> = {
      type: 'bh_crm_notification',
      notificationId: notifId,
      organizationId: orgId,
      click_action: 'FLUTTER_NOTIFICATION_CLICK',
    };

    const messages = tokens.map((token) => ({
      token,
      notification: { title, body },
      data: dataPayload,
      android: {
        priority: 'high' as const,
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
          },
        },
      },
    }));

    try {
      const resp = await admin.messaging().sendEach(messages);
      console.log(
        `onBhCrmNotificationPush ${notifId}: ok=${resp.successCount} fail=${resp.failureCount}`
      );

      const invalid = new Set<string>();
      resp.responses.forEach((r, i) => {
        if (!r.success && r.error?.code === 'messaging/registration-token-not-registered') {
          invalid.add(tokens[i]);
        }
      });
      if (invalid.size > 0) {
        const keep = tokens.filter((t) => !invalid.has(t));
        await userRef.update({ deviceTokens: keep });
        console.log(`onBhCrmNotificationPush: pruned ${invalid.size} dead tokens for ${userId}`);
      }
    } catch (e) {
      console.error('onBhCrmNotificationPush sendEach error', e);
    }

    return null;
  });
