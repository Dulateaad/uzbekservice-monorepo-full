import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * RMSSD по RR-интервалам в мс (пилот, не клиника).
 */
function computeRmssd(rrMs: number[]): number {
  if (rrMs.length < 2) return 0;
  const slice = rrMs.length > 30 ? rrMs.slice(-30) : rrMs;
  let sumSq = 0;
  for (let i = 0; i < slice.length - 1; i++) {
    const d = slice[i + 1] - slice[i];
    sumSq += d * d;
  }
  return Math.sqrt(sumSq / (slice.length - 1));
}

function stressStatusFromRmssd(rmssd: number): 'green' | 'yellow' | 'red' | 'unknown' {
  if (rmssd <= 0 || Number.isNaN(rmssd)) return 'unknown';
  if (rmssd >= 35) return 'green';
  if (rmssd <= 15) return 'red';
  return 'yellow';
}

function pickInsightId(
  ageBand: string,
  stress: string,
  quiz: Record<string, unknown>,
): string {
  const self = String(quiz.stress_self || '');
  if (ageBand === 'parent_0_5') {
    if (stress === 'red' || self === 'high') return 'stress_resilience_parent';
    if (stress === 'green') return 'motor_leadership_parent';
    return 'negotiation_empathy_parent';
  }
  if (stress === 'red' || self === 'high') return 'stress_resilience';
  if (ageBand === 'young_adult') return 'motor_leadership';
  return 'negotiation_empathy';
}

const INSIGHT_TITLE_RU: Record<string, string> = {
  negotiation_empathy: 'Переговоры и эмпатия',
  motor_leadership: 'Лидерство и моторика',
  stress_resilience: 'Стрессоустойчивость',
  negotiation_empathy_parent: 'Переговоры и эмпатия (0–5)',
  motor_leadership_parent: 'Лидерство и моторика (0–5)',
  stress_resilience_parent: 'Стрессоустойчивость (0–5)',
};

function buildRecommendationRu(
  stress: string,
  quiz: Record<string, unknown>,
): string {
  const mood = String(quiz.mood || '');
  const sleep = String(quiz.sleep || '');
  return (
    `Сводка пилота (не диагноз): вариабельность — ориентир «${stress}». ` +
    `Опрос: настроение ${mood}/5, сон: ${sleep}. ` +
    'Сохраняйте режим сна, делайте короткие паузы при нагрузке. ' +
    'При стойком ухудшении самочувствия обратитесь к специалисту.'
  );
}

/**
 * Опционально: Gemini усиливает текст рекомендации. Задайте GEMINI_API_KEY или GOOGLE_AI_API_KEY
 * в конфигурации Functions (environment variables).
 */
async function tryGeminiRecommendationRu(opts: {
  ageBand: string;
  stressStatus: string;
  rmssd: number;
  quiz: Record<string, unknown>;
  insightId: string;
}): Promise<string | null> {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_AI_API_KEY ||
    '';
  if (!apiKey) return null;
  try {
    const {GoogleGenerativeAI} = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({model: 'gemini-1.5-flash'});
    const title = INSIGHT_TITLE_RU[opts.insightId] || opts.insightId;
    const prompt =
      'Ты помощник образовательного пилота эмоционального самочувствия (не врач, не диагноз).\n' +
      `Возрастная группа: ${opts.ageBand}. ` +
      `RMSSD (эвристика пилота): ${opts.rmssd.toFixed(1)} мс. Статус напряжения: ${opts.stressStatus}.\n` +
      `Опрос: настроение 1–5 = ${opts.quiz.mood}, сон = ${opts.quiz.sleep}, субъективный стресс = ${opts.quiz.stress_self}.\n` +
      `Тема инсайта: ${title}.\n` +
      'Напиши по-русски 2–4 коротких предложения: мягкие бытовые рекомендации, без медицинских назначений. ' +
      'В конце одна фраза: при стойком ухудшении обратиться к специалисту.';
    const r = await model.generateContent(prompt);
    const text = r.response?.text()?.trim();
    if (text && text.length > 24) return text;
    return null;
  } catch (e) {
    console.warn('anamaMergePilotSession: Gemini недоступен или ошибка:', e);
    return null;
  }
}

function buildDailyPatch(
  stressStatus: string,
  ageBand: string,
  quiz: Record<string, unknown>,
): Record<string, unknown> {
  const daily: Record<string, unknown> = {
    completedCount: admin.firestore.FieldValue.increment(1),
    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
  };
  daily[`stress_${stressStatus}`] = admin.firestore.FieldValue.increment(1);
  if (['teen_school', 'young_adult', 'parent_0_5'].includes(ageBand)) {
    daily[`age_${ageBand}`] = admin.firestore.FieldValue.increment(1);
  }
  const moodKey = String(quiz.mood || '').replace(/\D/g, '');
  if (moodKey.length === 1 && '12345'.includes(moodKey)) {
    daily[`mood_${moodKey}`] = admin.firestore.FieldValue.increment(1);
  }
  const self = String(quiz.stress_self || '');
  if (['high', 'medium', 'low'].includes(self)) {
    daily[`stress_self_${self}`] = admin.firestore.FieldValue.increment(1);
  }
  const sleep = String(quiz.sleep || '');
  if (sleep === 'ok' || sleep === 'tired') {
    daily[`sleep_${sleep}`] = admin.firestore.FieldValue.increment(1);
  }
  return daily;
}

/**
 * Объединяет Firestore-сессию пилота с телеметрией RTDB, считает RMSSD,
 * пишет агрегаты в anama_pilot_daily.
 *
 * Деплой: проект с включённым Realtime Database (рекомендуется anama-app).
 */
// Явный регион — совпадает с клиентом Flutter (FirebaseFunctions default / us-central1)
export const anamaMergePilotSession = functions.region('us-central1').https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Нужна анонимная авторизация Firebase.',
    );
  }

  const sessionId = String(data.sessionId || '');
  const rawDevice = String(data.deviceId || 'child_01');
  const deviceId = rawDevice.replace(/[^a-zA-Z0-9_-]/g, '') || 'child_01';

  if (!sessionId) {
    throw new functions.https.HttpsError('invalid-argument', 'sessionId обязателен');
  }

  const uid = context.auth.uid;
  const fs = admin.firestore();
  const sessionRef = fs.collection('anama_pilot_sessions').doc(sessionId);
  const sessionSnap = await sessionRef.get();

  if (!sessionSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Сессия не найдена');
  }

  const session = sessionSnap.data()!;
  if (session.anonUid !== uid) {
    throw new functions.https.HttpsError('permission-denied', 'Чужая сессия');
  }

  const ageBand = String(session.ageBand || 'teen_school');
  const quiz = (session.quiz || {}) as Record<string, unknown>;

  let rrList: number[] = [];

  try {
    const db = admin.database();
    const histSnap = await db.ref(`users/${deviceId}/rr_history`).once('value');
    if (histSnap.exists()) {
      const h = histSnap.val() as unknown;
      if (Array.isArray(h)) {
        rrList = h.filter((x): x is number => typeof x === 'number');
      } else if (h && typeof h === 'object') {
        rrList = Object.values(h as Record<string, unknown>).filter(
          (x): x is number => typeof x === 'number',
        );
      }
    }
    if (rrList.length < 2) {
      const teleSnap = await db.ref(`users/${deviceId}/telemetry`).once('value');
      const tele = teleSnap.val() as Record<string, unknown> | null;
      if (tele && typeof tele.last_rr === 'number') {
        rrList = [tele.last_rr];
      }
    }
  } catch (e) {
    console.warn('anamaMergePilotSession: RTDB недоступен или не настроен:', e);
  }

  rrList = rrList.map(Number).filter((x) => x > 200 && x < 3000);

  const rmssd = rrList.length >= 2 ? computeRmssd(rrList) : 0;
  const stressStatus = stressStatusFromRmssd(rmssd);
  const insightId = pickInsightId(ageBand, stressStatus, quiz);
  const templateRu = buildRecommendationRu(stressStatus, quiz);

  const geminiRu = await tryGeminiRecommendationRu({
    ageBand,
    stressStatus,
    rmssd,
    quiz,
    insightId,
  });

  const recommendationRu = geminiRu || templateRu;
  const recommendationSource = geminiRu ? 'gemini' : 'template';

  await sessionRef.update({
    rmssd,
    stressStatus,
    insightId,
    recommendationRu,
    recommendationSource,
    mergedAt: admin.firestore.FieldValue.serverTimestamp(),
    telemetryDeviceId: deviceId,
    rrSampleSize: rrList.length,
  });

  const dayKey = new Date().toISOString().slice(0, 10);
  await fs.collection('anama_pilot_daily').doc(dayKey).set(
    buildDailyPatch(stressStatus, ageBand, quiz),
    {merge: true},
  );

  return {
    rmssd,
    stressStatus,
    insightId,
    recommendationRu,
    recommendationSource,
    ageBand,
    sessionId,
  };
});
