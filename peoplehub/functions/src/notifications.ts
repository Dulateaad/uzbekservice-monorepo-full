import { db } from "./config/firebase";
import { config } from "./config";

const BOT_TOKEN = config.telegramBotToken;

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
    const telegramId = d.data().telegramId;
    if (telegramId) {
      const ok = await sendTelegramMessage(telegramId, text);
      if (ok) sent++;
    }
  });
  await Promise.allSettled(promises);

  console.log(`Notified ${sent}/${driversSnap.size} drivers about new trip`);
  return sent;
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
    DRIVER_ARRIVING: `🚗 Водитель выехал к вам`,
    DRIVER_ARRIVED: `📍 Водитель на месте, выходите`,
    IN_PROGRESS: `🛣 Поездка началась`,
    COMPLETED: `🏁 Поездка завершена. Оцените водителя!`,
    CANCELLED: `❌ Поездка отменена`,
    NO_DRIVER: `😔 К сожалению, водитель не найден. Попробуйте повысить цену.`,
  };

  const text = messages[newStatus];
  if (!text) return false;

  return sendTelegramMessage(telegramId, text);
}
