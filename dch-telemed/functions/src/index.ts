import * as admin from "firebase-admin";
import { setGlobalOptions } from "firebase-functions/v2";
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret, defineString } from "firebase-functions/params";
import { createApp } from "./app";

if (process.env.FUNCTIONS_EMULATOR === "true") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("dotenv").config({ path: ".env.local" });
  } catch {
    /* optional */
  }
}

const dailyApiKey = defineSecret("DAILY_API_KEY");
const dailyWebhookHmac = defineSecret("DAILY_WEBHOOK_HMAC_BASE64");
const internalNotifyKey = defineSecret("INTERNAL_NOTIFY_KEY");

/** Подставьте production URL join-приложения (Firebase Hosting). */
defineString("HOSTING_JOIN_ORIGIN", { default: "http://localhost:5173" });
defineString("MESSAGING_API_URL", { default: "" });
defineString("MESSAGING_API_KEY", { default: "" });

setGlobalOptions({ maxInstances: 10 });

if (!admin.apps.length) {
  admin.initializeApp();
}

const expressApp = createApp();

export const dchApi = onRequest(
  {
    region: "us-central1",
    secrets: [dailyApiKey, dailyWebhookHmac, internalNotifyKey],
    cors: false,
    invoker: "public",
  },
  expressApp
);
