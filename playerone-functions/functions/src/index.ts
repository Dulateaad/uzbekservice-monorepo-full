/**
 * Player One — удаление видео из Storage после анализа (TTL с момента регистрации).
 *
 * 1) scheduleDeleteAnalyzedVideos — каждые 10 мин удаляет объекты, у которых в Firestore
 *    коллекция ttl_storage_deletions поле deleteAt <= сейчас.
 *
 * 2) registerVideoDeletionAfterAnalysis — POST от вашего API после успешного анализа:
 *    Authorization: Bearer <VIDEO_TTL_REGISTER_SECRET>
 *    { "objectPath": "videos/uid/file.mp4", "bucket": "optional" }
 *
 * Настройка:
 *   cd playerone-functions/functions && firebase functions:secrets:set VIDEO_TTL_REGISTER_SECRET
 *   (опционально параметры STORAGE_BUCKET, VIDEO_TTL_HOURS в консоли Firebase → Functions → ваш HTTP-функции)
 *   cd .. && firebase deploy --only functions
 *
 * У сервисного аккаунта функций должна быть роль на удаление объектов в бакете (например Storage Object Admin на проект).
 *
 * Альтернатива HTTP: из Cloud Run после анализа записать в Firestore документ с теми же полями,
 * doc ID = sha256(bucket + "\\0" + objectPath) hex — см. jobId() ниже (или вызывать только HTTP).
 *
 * Важно: добавьте в свои firestore.rules запрет клиентам на коллекцию ttl_storage_deletions,
 * если у вас есть широкие правила на запись.
 */

import * as crypto from "crypto";
import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret, defineString } from "firebase-functions/params";

admin.initializeApp();

const COLLECTION = "ttl_storage_deletions";

const defaultBucket = defineString("STORAGE_BUCKET", {
  default: "playerone-e6ff2.firebasestorage.app",
});

const ttlHoursParam = defineString("VIDEO_TTL_HOURS", {
  default: "12",
});

const registerSecret = defineSecret("VIDEO_TTL_REGISTER_SECRET");

export function jobId(bucket: string, objectPath: string): string {
  return crypto
    .createHash("sha256")
    .update(`${bucket}\0${objectPath}`)
    .digest("hex");
}

function parseTtlHours(): number {
  const raw = ttlHoursParam.value();
  const n = Number.parseFloat(raw);
  if (Number.isNaN(n)) return 12;
  return Math.min(168, Math.max(1, n));
}

/**
 * Удаляет просроченные объекты и документы очереди.
 */
export const scheduleDeleteAnalyzedVideos = onSchedule(
  {
    schedule: "every 10 minutes",
    region: "us-central1",
    timeoutSeconds: 540,
    memory: "512MiB",
  },
  async () => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();
    const snap = await db
      .collection(COLLECTION)
      .where("deleteAt", "<=", now)
      .limit(300)
      .get();

    if (snap.empty) {
      console.log("[ttl-storage] no jobs due");
      return;
    }

    for (const doc of snap.docs) {
      const data = doc.data();
      const bucketName = typeof data.bucket === "string" ? data.bucket : "";
      const objectPath = typeof data.objectPath === "string" ? data.objectPath : "";
      if (!bucketName || !objectPath) {
        await doc.ref.delete();
        continue;
      }

      try {
        await admin
          .storage()
          .bucket(bucketName)
          .file(objectPath)
          .delete({ ignoreNotFound: true } as { ignoreNotFound?: boolean });
        console.log("[ttl-storage] deleted gs://" + bucketName + "/" + objectPath);
      } catch (e) {
        console.error("[ttl-storage] delete failed", bucketName, objectPath, e);
        continue;
      }
      await doc.ref.delete();
    }
  }
);

/**
 * Регистрирует удаление объекта через TTL часов (по умолчанию 12) с текущего момента.
 */
export const registerVideoDeletionAfterAnalysis = onRequest(
  {
    region: "us-central1",
    cors: true,
    secrets: [registerSecret],
  },
  async (req, res) => {
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
    const expected = registerSecret.value();
    if (!expected || token !== expected) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const body = req.body as { objectPath?: string; bucket?: string };
    const objectPath = body.objectPath?.trim();
    const bucket = (body.bucket || defaultBucket.value()).trim();

    if (!objectPath || objectPath.includes("..")) {
      res.status(400).json({ error: "Invalid objectPath" });
      return;
    }

    const hours = parseTtlHours();
    const deleteAt = admin.firestore.Timestamp.fromMillis(
      Date.now() + hours * 3600 * 1000
    );

    const id = jobId(bucket, objectPath);
    await admin
      .firestore()
      .collection(COLLECTION)
      .doc(id)
      .set(
        {
          bucket,
          objectPath,
          deleteAt,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    res.status(200).json({
      ok: true,
      jobId: id,
      deleteAt: deleteAt.toDate().toISOString(),
      ttlHours: hours,
    });
  }
);
