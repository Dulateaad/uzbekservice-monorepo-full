import * as admin from "firebase-admin";
import cors from "cors";
import express, { Request, Response } from "express";
import { allowedOrigins, joinUrlBaseFromRequest } from "./config";
import { dailyCreateMeetingToken, dailyCreateRoom } from "./daily-client";
import { sendAppointmentJoinLink } from "./messaging";
import { AppointmentDoc, JoinGrantDoc } from "./types";
import { verifyDailyWebhookSignature } from "./webhook-verify";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

function getDb() {
  return admin.firestore();
}

function getAllowedOrigins(): string[] {
  const extra =
    process.env.ALLOWED_ORIGINS?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) || [];
  return [...allowedOrigins, ...extra];
}

function dailyApiKey(): string {
  const k = process.env.DAILY_API_KEY?.trim();
  if (!k) throw new Error("DAILY_API_KEY is not set");
  return k;
}

function webhookHmac(): string {
  const k = process.env.DAILY_WEBHOOK_HMAC_BASE64?.trim();
  if (!k) throw new Error("DAILY_WEBHOOK_HMAC_BASE64 is not set");
  return k;
}

function internalNotifyKey(): string | null {
  return process.env.INTERNAL_NOTIFY_KEY?.trim() || null;
}

function hostingJoinOrigin(): string {
  const o = process.env.HOSTING_JOIN_ORIGIN?.trim();
  if (!o) {
    return "http://localhost:5173";
  }
  return o;
}

function roomNameForAppointment(appointmentId: string): string {
  const safe = appointmentId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 36);
  return `dch-${safe || "appt"}`;
}

export function createApp(): express.Application {
  const app = express();

  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin || getAllowedOrigins().includes(origin)) {
          cb(null, true);
          return;
        }
        cb(null, false);
      },
    })
  );

  const rawWebhook = express.raw({ type: "application/json" });

  app.post("/webhooks/daily", rawWebhook, async (req: Request, res: Response) => {
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : String(req.body);
    const sig = req.header("X-Webhook-Signature");
    const ts = req.header("X-Webhook-Timestamp");

    const insecure = process.env.ALLOW_INSECURE_WEBHOOK === "1";
    let hmac: string | null = null;
    try {
      hmac = webhookHmac();
    } catch {
      if (!insecure) {
        res.status(503).send("webhook_hmac_not_configured");
        return;
      }
    }

    if (hmac && !verifyDailyWebhookSignature(rawBody, ts, sig, hmac)) {
      res.status(401).send("invalid_signature");
      return;
    }

    let body: {
      type?: string;
      id?: string;
      room?: { name?: string };
      payload?: { room?: { name?: string } };
    };
    try {
      body = JSON.parse(rawBody) as typeof body;
    } catch {
      res.status(400).send("invalid_json");
      return;
    }

    res.status(200).send("ok");

    try {
      const eventType = body.type || "";
      const eventId = body.id || `${eventType}-${Date.now()}`;
      const db = getDb();
      const idemRef = db.collection("webhook_idempotency").doc(eventId);
      const idemSnap = await idemRef.get();
      if (idemSnap.exists) return;
      await idemRef.set({ receivedAt: FieldValue.serverTimestamp(), type: eventType });

      const roomName =
        body.room?.name ||
        (body as { room_name?: string }).room_name ||
        body.payload?.room?.name;

      if (!roomName) {
        console.log("[webhook] no room name", eventType);
        return;
      }

      const apptSnap = await db
        .collection("appointments")
        .where("video.roomName", "==", roomName)
        .limit(1)
        .get();

      if (apptSnap.empty) {
        console.log("[webhook] appointment not found for room", roomName);
        return;
      }
      const apptRef = apptSnap.docs[0].ref;

      if (eventType === "meeting.started" || eventType === "participant.joined") {
        await apptRef.set(
          {
            status: "in_progress",
            meetingStartedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        await apptRef.collection("video_events").doc(eventId).set({
          type: eventType,
          at: FieldValue.serverTimestamp(),
        });
      }

      if (eventType === "meeting.ended") {
        await apptRef.set(
          {
            status: "completed",
            meetingEndedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        await apptRef.collection("video_events").doc(eventId).set({
          type: eventType,
          at: FieldValue.serverTimestamp(),
        });
      }
    } catch (e) {
      console.error("[webhook] handler error", e);
    }
  });

  app.use(express.json());

  app.post("/appointments/:appointmentId/video/prepare", async (req: Request, res: Response) => {
    try {
      const authHeader = req.header("Authorization") || "";
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
      if (!token) {
        res.status(401).json({ error: "missing_token" });
        return;
      }
      const decoded = await admin.auth().verifyIdToken(token);
      const { appointmentId } = req.params;
      const db = getDb();
      const apptRef = db.collection("appointments").doc(appointmentId);
      const apptSnap = await apptRef.get();
      if (!apptSnap.exists) {
        res.status(404).json({ error: "appointment_not_found" });
        return;
      }
      const appt = apptSnap.data() as AppointmentDoc;
      if (appt.doctorId !== decoded.uid) {
        res.status(403).json({ error: "forbidden" });
        return;
      }
      if (appt.type !== "online_consultation") {
        res.status(400).json({ error: "not_online_appointment" });
        return;
      }

      if (appt.video?.roomName && appt.video?.roomUrl) {
        res.json({
          roomName: appt.video.roomName,
          roomUrl: appt.video.roomUrl,
          alreadyExisted: true,
        });
        return;
      }

      const roomName = roomNameForAppointment(appointmentId);
      const roomTtlSec = 60 * 60 * 24;
      const room = await dailyCreateRoom(dailyApiKey(), roomName, roomTtlSec);
      const now = Timestamp.now();
      const expiresAt = Timestamp.fromMillis(now.toMillis() + roomTtlSec * 1000);

      await apptRef.set(
        {
          video: {
            provider: "daily",
            roomName: room.name,
            roomUrl: room.url,
            createdAt: now,
            expiresAt,
          },
        },
        { merge: true }
      );

      res.json({
        roomName: room.name,
        roomUrl: room.url,
        alreadyExisted: false,
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "prepare_failed", detail: String(e) });
    }
  });

  /**
   * Пациент передаёт только grantId из ссылки (?g=...), без знания appointmentId.
   */
  app.post("/video/token-by-grant", async (req: Request, res: Response) => {
    try {
      const { grantId } = req.body as { grantId?: string };
      if (!grantId) {
        res.status(400).json({ error: "grantId_required" });
        return;
      }
      const db = getDb();
      const grantRef = db.collection("join_grants").doc(grantId);
      const grantSnap = await grantRef.get();
      if (!grantSnap.exists) {
        res.status(404).json({ error: "grant_not_found" });
        return;
      }
      const grant = grantSnap.data() as JoinGrantDoc;
      if (grant.used && grant.singleUse) {
        res.status(403).json({ error: "grant_used" });
        return;
      }
      if (grant.expiresAt.toMillis() < Date.now()) {
        res.status(403).json({ error: "grant_expired" });
        return;
      }
      const apptRef = db.collection("appointments").doc(grant.appointmentId);
      const apptSnap = await apptRef.get();
      if (!apptSnap.exists) {
        res.status(404).json({ error: "appointment_not_found" });
        return;
      }
      const appt = apptSnap.data() as AppointmentDoc;
      if (!appt.video?.roomName || !appt.video?.roomUrl) {
        res.status(400).json({ error: "video_not_prepared" });
        return;
      }
      const exp = Math.floor(Date.now() / 1000) + 60 * 60;
      const meetingToken = await dailyCreateMeetingToken(dailyApiKey(), {
        roomName: appt.video.roomName,
        isOwner: false,
        userName: appt.patientName || "Patient",
        exp,
      });
      if (grant.singleUse) {
        await grantRef.set({ used: true }, { merge: true });
      }
      res.json({
        token: meetingToken,
        roomUrl: appt.video.roomUrl,
        appointmentId: grant.appointmentId,
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "token_by_grant_failed", detail: String(e) });
    }
  });

  app.post("/video/token", async (req: Request, res: Response) => {
    try {
      const { appointmentId, role, grantId } = req.body as {
        appointmentId?: string;
        role?: "doctor" | "patient";
        grantId?: string;
      };
      if (!appointmentId || !role) {
        res.status(400).json({ error: "appointmentId_and_role_required" });
        return;
      }

      const db = getDb();
      const apptRef = db.collection("appointments").doc(appointmentId);
      const apptSnap = await apptRef.get();
      if (!apptSnap.exists) {
        res.status(404).json({ error: "appointment_not_found" });
        return;
      }
      const appt = apptSnap.data() as AppointmentDoc;
      if (!appt.video?.roomName || !appt.video?.roomUrl) {
        res.status(400).json({ error: "video_not_prepared" });
        return;
      }

      const exp = Math.floor(Date.now() / 1000) + 60 * 60;

      if (role === "doctor") {
        const authHeader = req.header("Authorization") || "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
        if (!token) {
          res.status(401).json({ error: "missing_token" });
          return;
        }
        const decoded = await admin.auth().verifyIdToken(token);
        if (appt.doctorId !== decoded.uid) {
          res.status(403).json({ error: "forbidden" });
          return;
        }
        const meetingToken = await dailyCreateMeetingToken(dailyApiKey(), {
          roomName: appt.video.roomName,
          isOwner: true,
          userName: decoded.name || decoded.email || "Doctor",
          exp,
        });
        res.json({ token: meetingToken, roomUrl: appt.video.roomUrl });
        return;
      }

      if (role === "patient") {
        if (!grantId) {
          res.status(401).json({ error: "grant_required" });
          return;
        }
        const grantRef = db.collection("join_grants").doc(grantId);
        const grantSnap = await grantRef.get();
        if (!grantSnap.exists) {
          res.status(404).json({ error: "grant_not_found" });
          return;
        }
        const grant = grantSnap.data() as JoinGrantDoc;
        if (grant.appointmentId !== appointmentId) {
          res.status(403).json({ error: "grant_mismatch" });
          return;
        }
        if (grant.used && grant.singleUse) {
          res.status(403).json({ error: "grant_used" });
          return;
        }
        if (grant.expiresAt.toMillis() < Date.now()) {
          res.status(403).json({ error: "grant_expired" });
          return;
        }
        const meetingToken = await dailyCreateMeetingToken(dailyApiKey(), {
          roomName: appt.video.roomName,
          isOwner: false,
          userName: appt.patientName || "Patient",
          exp,
        });
        if (grant.singleUse) {
          await grantRef.set({ used: true }, { merge: true });
        }
        res.json({ token: meetingToken, roomUrl: appt.video.roomUrl });
        return;
      }

      res.status(400).json({ error: "invalid_role" });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "token_failed", detail: String(e) });
    }
  });

  app.post("/notify/appointment-link", async (req: Request, res: Response) => {
    try {
      const internalKey = internalNotifyKey();
      if (!internalKey) {
        res.status(503).json({ error: "INTERNAL_NOTIFY_KEY_not_configured" });
        return;
      }
      const got = req.header("X-Internal-Key");
      if (got !== internalKey) {
        res.status(403).json({ error: "forbidden" });
        return;
      }

      const { appointmentId } = req.body as { appointmentId?: string };
      if (!appointmentId) {
        res.status(400).json({ error: "appointmentId_required" });
        return;
      }

      const db = getDb();
      const apptRef = db.collection("appointments").doc(appointmentId);
      const apptSnap = await apptRef.get();
      if (!apptSnap.exists) {
        res.status(404).json({ error: "appointment_not_found" });
        return;
      }
      const appt = apptSnap.data() as AppointmentDoc;
      const phone = appt.patientPhone?.trim();
      if (!phone) {
        res.status(400).json({ error: "patient_phone_missing" });
        return;
      }

      const grantRef = db.collection("join_grants").doc();
      const now = Timestamp.now();
      const grantTtlMs = 1000 * 60 * 60 * 48;
      await grantRef.set({
        appointmentId,
        createdAt: now,
        expiresAt: Timestamp.fromMillis(now.toMillis() + grantTtlMs),
        used: false,
        singleUse: false,
      } satisfies JoinGrantDoc);

      const base = joinUrlBaseFromRequest(hostingJoinOrigin());
      const joinUrl = `${base}/?g=${grantRef.id}`;

      const send = await sendAppointmentJoinLink({
        toPhone: phone,
        patientName: appt.patientName,
        joinUrl,
        appointmentId,
      });

      res.json({ grantId: grantRef.id, joinUrl, messaging: send });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "notify_failed", detail: String(e) });
    }
  });

  app.get("/health", (_req: Request, res: Response) => {
    res.json({ ok: true, service: "dch-telemed-api" });
  });

  return app;
}
