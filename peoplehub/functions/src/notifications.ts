import { db, admin } from "./config/firebase";
import { config } from "./config";

const BOT_TOKEN = config.telegramBotToken;

async function sendPushNotification(userId: string, title: string, body: string): Promise<boolean> {
  try {
    const userSnap = await db.collection("users").doc(userId).get();
    if (!userSnap.exists) return false;
    const fcmToken = userSnap.data()?.fcmToken;
    if (!fcmToken) return false;

    await admin.messaging().send({
      token: fcmToken,
      notification: { title, body },
      webpush: {
        notification: { icon: "/icons/tariff-econom.png", badge: "/icons/tariff-econom.png" },
      },
    });
    return true;
  } catch (err: any) {
    if (err?.code === "messaging/registration-token-not-registered") {
      await db.collection("users").doc(userId).update({ fcmToken: null });
    }
    console.error("Push notification failed:", err?.message || err);
    return false;
  }
}

async function sendTelegramMessage(chatId: string | number, text: string): Promise<boolean> {
  if (!BOT_TOKEN) {
    console.warn("TELEGRAM_BOT_TOKEN not set, skipping notification");
    return false;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
    if (!res.ok) console.error("Telegram API error:", res.status, await res.text());
    return res.ok;
  } catch (err) {
    console.error("sendTelegramMessage failed:", err);
    return false;
  }
}

/**
 * Notify online drivers in the same city about a new trip.
 */
export async function notifyDriversNewTrip(tripData: {
  pickupAddress: string;
  price: number;
  city?: string;
  distanceKm?: number;
}): Promise<number> {
  const city = tripData.city || "";

  let driverQuery = db
    .collection("users")
    .where("role", "==", "DRIVER")
    .where("driverProfile.driverStatus", "==", "ONLINE");

  if (city) {
    driverQuery = driverQuery.where("city", "==", city);
  }

  const driversSnap = await driverQuery.limit(50).get();
  if (driversSnap.empty) return 0;

  const dist = tripData.distanceKm ? `${tripData.distanceKm.toFixed(1)} км` : "";
  const text =
    `🚕 <b>Новый заказ!</b>\n` +
    `📍 ${tripData.pickupAddress}\n` +
    `💰 ${tripData.price} тг${dist ? ` · ${dist}` : ""}\n` +
    `\nОткройте приложение, чтобы предложить цену.`;

  let sent = 0;
  const promises = driversSnap.docs.map(async (d) => {
    const data = d.data();
    const telegramId = data.telegramId;
    if (telegramId) {
      const ok = await sendTelegramMessage(telegramId, text);
      if (ok) sent++;
    }
    await sendPushNotification(d.id, "Новый заказ!", `📍 ${tripData.pickupAddress} · ${tripData.price} тг`);
  });
  await Promise.allSettled(promises);

  console.log(`Notified ${sent}/${driversSnap.size} drivers about new trip`);
  return sent;
}

/**
 * Notify the client (passenger) that a new bid arrived.
 */
export async function notifyClientNewBid(clientId: string, bidData: {
  driverName: string;
  price: number;
}): Promise<boolean> {
  if (!BOT_TOKEN) return false;

  const userSnap = await db.collection("users").doc(clientId).get();
  if (!userSnap.exists) return false;
  const telegramId = userSnap.data()?.telegramId;
  if (!telegramId) return false;

  const text =
    `🔔 <b>Новый отклик!</b>\n` +
    `👤 ${bidData.driverName || "Водитель"}\n` +
    `💰 ${bidData.price} тг\n` +
    `\nОткройте приложение, чтобы принять или выбрать другого.`;

  const [tgOk] = await Promise.allSettled([
    sendTelegramMessage(telegramId, text),
    sendPushNotification(clientId, "Новый отклик!", `${bidData.driverName || "Водитель"} — ${bidData.price} тг`),
  ]);
  return tgOk.status === "fulfilled" && tgOk.value;
}

/**
 * Notify a specific user about trip status change.
 */
export async function notifyTripStatusChange(
  userId: string,
  tripId: string,
  newStatus: string,
  extra?: { driverName?: string; price?: number }
): Promise<boolean> {
  if (!BOT_TOKEN) return false;

  const userSnap = await db.collection("users").doc(userId).get();
  if (!userSnap.exists) return false;
  const telegramId = userSnap.data()?.telegramId;
  if (!telegramId) return false;

  const messages: Record<string, string> = {
    DRIVER_ASSIGNED: `✅ Водитель ${extra?.driverName || ""} принял ваш заказ! Цена: ${extra?.price || 0} тг`,
    DRIVER_ASSIGNED_DRIVER: `🎉 Пассажир принял вашу заявку! Цена: ${extra?.price || 0} тг. Откройте приложение.`,
    DRIVER_ARRIVING: `🚗 Водитель выехал к вам`,
    DRIVER_ARRIVED: `📍 Водитель на месте, выходите`,
    IN_PROGRESS: `🛣 Поездка началась`,
    COMPLETED: `🏁 Поездка завершена. Оцените водителя!`,
    CANCELLED: `❌ Поездка отменена`,
    NO_DRIVER: `😔 К сожалению, водитель не найден. Попробуйте повысить цену.`,
  };

  const text = messages[newStatus];
  if (!text) return false;

  const pushTitle: Record<string, string> = {
    DRIVER_ASSIGNED: "Водитель найден!",
    DRIVER_ASSIGNED_DRIVER: "Заявка принята!",
    DRIVER_ARRIVING: "Водитель едет",
    DRIVER_ARRIVED: "Водитель на месте",
    IN_PROGRESS: "Поездка началась",
    COMPLETED: "Поездка завершена",
    CANCELLED: "Поездка отменена",
    NO_DRIVER: "Водитель не найден",
  };

  await Promise.allSettled([
    sendTelegramMessage(telegramId, text),
    sendPushNotification(userId, pushTitle[newStatus] || "PeopleHub", text.replace(/<[^>]*>/g, "")),
  ]);
  return true;
}
