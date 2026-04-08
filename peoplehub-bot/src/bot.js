require("dotenv").config();
const { Bot, InlineKeyboard } = require("grammy");
const { initializeApp } = require("firebase/app");
const {
  getFirestore, doc, getDoc, updateDoc, serverTimestamp,
} = require("firebase/firestore");

// ==================== CONFIG ====================

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error("BOT_TOKEN not set!");
  process.exit(1);
}

const WEB_APP_URL = process.env.WEB_APP_URL || "https://taxi-eb8b7.web.app";
const STARS_PER_DAY = parseInt(process.env.STARS_PER_DAY || "33");
const STARS_PER_MONTH = parseInt(process.env.STARS_PER_MONTH || "600");
const SUBSCRIPTION_PERIOD = 30 * 24 * 60 * 60; // 30 days in seconds

// ==================== FIREBASE ====================

const firebaseApp = initializeApp({
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyB7z8VimBp_-eP8iIKkvW_9cak6zNqIfPg",
  projectId: process.env.FIREBASE_PROJECT_ID || "taxi-eb8b7",
});
const db = getFirestore(firebaseApp);

function getUserRef(telegramId) {
  return doc(db, "users", `tg_${telegramId}`);
}

async function getUser(telegramId) {
  const snap = await getDoc(getUserRef(telegramId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

async function activateSubscription(telegramId, paymentChargeId, stars, days) {
  const user = await getUser(telegramId);
  const now = new Date();
  let currentExpiry = null;

  if (user?.driverProfile?.subscriptionExpiresAt) {
    const exp = user.driverProfile.subscriptionExpiresAt.toDate
      ? user.driverProfile.subscriptionExpiresAt.toDate()
      : new Date(user.driverProfile.subscriptionExpiresAt);
    if (exp > now) currentExpiry = exp;
  }

  const base = currentExpiry || now;
  const expiresAt = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

  await updateDoc(getUserRef(telegramId), {
    "driverProfile.subscriptionActive": true,
    "driverProfile.subscriptionExpiresAt": expiresAt,
    "driverProfile.subscriptionStars": stars,
    "driverProfile.subscriptionType": days === 1 ? "daily" : "monthly",
    "driverProfile.lastPaymentId": paymentChargeId,
    "driverProfile.lastPaymentAt": serverTimestamp(),
  });
  return expiresAt;
}

// ==================== BOT ====================

const bot = new Bot(BOT_TOKEN);

// ==================== COMMANDS ====================

bot.command("start", async (ctx) => {
  const param = ctx.match;

  const productRoutes = {
    taxi: "/client",
    driver: "/driver",
    realty: "/realty",
    auto: "/auto",
    tourism: "/tourism",
  };

  const route = productRoutes[param] || "/hub";

  const keyboard = new InlineKeyboard()
    .webApp("🚗 Поездки", `${WEB_APP_URL}/client`)
    .row()
    .webApp("🏠 Все сервисы", `${WEB_APP_URL}/hub`);

  await ctx.reply(
    `👋 Добро пожаловать в *PeopleHub*!\n\n` +
      `Платформа взаимного уважения:\n\n` +
      `🚗 *Поездки* — 0% комиссии, оплата по договорённости\n` +
      `🏠 *Недвижимость* — скоро\n` +
      `🚗 *Авто* — скоро\n` +
      `🌴 *Туризм* — скоро\n\n` +
      `⭐ Рейтинг уважения — система репутации\n` +
      `🤝 Оплата по договорённости\n\n` +
      `Выберите сервис:`,
    {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    }
  );
});

bot.command("taxi", async (ctx) => {
  const keyboard = new InlineKeyboard().webApp(
    "🚗 Поездки",
    `${WEB_APP_URL}/client`
  );
  await ctx.reply("Нажмите кнопку, чтобы открыть поездки:", {
    reply_markup: keyboard,
  });
});

bot.command("driver", async (ctx) => {
  const keyboard = new InlineKeyboard().webApp(
    "🚗 Панель водителя",
    `${WEB_APP_URL}/driver`
  );
  await ctx.reply("Откройте панель водителя:", {
    reply_markup: keyboard,
  });
});

// ==================== SUBSCRIPTION (Stars) ====================

bot.command("subscribe", async (ctx) => {
  const user = await getUser(ctx.from.id);

  if (!user) {
    await ctx.reply(
      "⚠️ Сначала зарегистрируйтесь в приложении как водитель.",
      {
        reply_markup: new InlineKeyboard().webApp(
          "🚗 Регистрация водителя",
          `${WEB_APP_URL}/driver`
        ),
      }
    );
    return;
  }

  if (user.role !== "DRIVER") {
    await ctx.reply(
      "⚠️ Абонентка доступна только для водителей.\n" +
        "Переключитесь на роль водителя в настройках профиля."
    );
    return;
  }

  const sub = user.driverProfile;
  if (sub?.subscriptionActive && sub?.subscriptionExpiresAt) {
    const expires = sub.subscriptionExpiresAt.toDate
      ? sub.subscriptionExpiresAt.toDate()
      : new Date(sub.subscriptionExpiresAt);
    if (expires > new Date()) {
      const daysLeft = Math.ceil((expires - new Date()) / (1000 * 60 * 60 * 24));
      await ctx.reply(
        `✅ Абонентка активна!\n\n` +
          `⏳ Осталось: *${daysLeft} дн.*\n` +
          `📅 До: ${expires.toLocaleDateString("ru-RU")}\n\n` +
          `Хотите продлить?\n` +
          `📅 /sub\\_day — +1 день (${STARS_PER_DAY} ⭐)\n` +
          `📅 /sub\\_month — +30 дней (${STARS_PER_MONTH} ⭐)`,
        { parse_mode: "Markdown" }
      );
      return;
    }
  }

  const savingsPercent = Math.round((1 - STARS_PER_MONTH / (STARS_PER_DAY * 30)) * 100);

  await ctx.reply(
    `⭐ *Абонентка водителя*\n\n` +
      `Без абонентки вы не видите заказы.\n\n` +
      `Выберите тариф:\n\n` +
      `1️⃣ *На 1 день* — ${STARS_PER_DAY} ⭐ (~200 тг)\n` +
      `   Разовый платёж, без автопродления\n\n` +
      `2️⃣ *На 30 дней* — ${STARS_PER_MONTH} ⭐ (~6 000 тг)\n` +
      `   Автопродление, экономия ${savingsPercent}%\n\n` +
      `👇 Выберите:`,
    {
      parse_mode: "Markdown",
      reply_markup: new InlineKeyboard()
        .text(`1 день — ${STARS_PER_DAY} ⭐`, "sub_day")
        .row()
        .text(`30 дней — ${STARS_PER_MONTH} ⭐ (выгоднее)`, "sub_month"),
    }
  );
});

bot.callbackQuery("sub_day", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.api.sendInvoice(ctx.chat.id,
    `⭐ Абонентка — 1 день`,
    `Доступ к заказам PeopleHub на 1 день.\n` +
      `• Видите все заказы в вашем городе\n` +
      `• Предлагаете свою цену\n` +
      `• 0% комиссии с поездок`,
    `sub_day_${ctx.from.id}_${Date.now()}`,
    "XTR",
    [{ label: "Абонентка (1 день)", amount: STARS_PER_DAY }],
  );
});

bot.callbackQuery("sub_month", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.api.sendInvoice(ctx.chat.id,
    `⭐ Абонентка — 30 дней`,
    `Полный доступ к заказам PeopleHub на 30 дней.\n` +
      `• Видите все заказы в вашем городе\n` +
      `• Предлагаете свою цену\n` +
      `• 0% комиссии с поездок\n` +
      `• Автопродление каждые 30 дней`,
    `sub_month_${ctx.from.id}_${Date.now()}`,
    "XTR",
    [{ label: "Абонентка (30 дней)", amount: STARS_PER_MONTH }],
    { subscription_period: SUBSCRIPTION_PERIOD }
  );
});

bot.command("sub_day", async (ctx) => {
  await ctx.api.sendInvoice(ctx.chat.id,
    `⭐ Абонентка — 1 день`,
    `Доступ к заказам PeopleHub на 1 день.\n` +
      `• Видите все заказы в вашем городе\n` +
      `• Предлагаете свою цену\n` +
      `• 0% комиссии с поездок`,
    `sub_day_${ctx.from.id}_${Date.now()}`,
    "XTR",
    [{ label: "Абонентка (1 день)", amount: STARS_PER_DAY }],
  );
});

bot.command("sub_month", async (ctx) => {
  await ctx.api.sendInvoice(ctx.chat.id,
    `⭐ Абонентка — 30 дней`,
    `Полный доступ к заказам PeopleHub на 30 дней.\n` +
      `• Видите все заказы в вашем городе\n` +
      `• Предлагаете свою цену\n` +
      `• 0% комиссии с поездок\n` +
      `• Автопродление каждые 30 дней`,
    `sub_month_${ctx.from.id}_${Date.now()}`,
    "XTR",
    [{ label: "Абонентка (30 дней)", amount: STARS_PER_MONTH }],
    { subscription_period: SUBSCRIPTION_PERIOD }
  );
});

bot.command("subscription", async (ctx) => {
  const user = await getUser(ctx.from.id);

  if (!user || user.role !== "DRIVER") {
    await ctx.reply("Вы не зарегистрированы как водитель.");
    return;
  }

  const sub = user.driverProfile;
  if (!sub?.subscriptionActive) {
    await ctx.reply(
      `❌ Абонентка не активна\n\n` +
        `Без абонентки вы не видите заказы.\n\n` +
        `Тарифы:\n` +
        `• 1 день — *${STARS_PER_DAY} ⭐* (~200 тг)\n` +
        `• 30 дней — *${STARS_PER_MONTH} ⭐* (~6 000 тг)\n\n` +
        `Нажмите /subscribe для активации`,
      { parse_mode: "Markdown" }
    );
    return;
  }

  const expires = sub.subscriptionExpiresAt?.toDate
    ? sub.subscriptionExpiresAt.toDate()
    : new Date(sub.subscriptionExpiresAt);
  const daysLeft = Math.ceil((expires - new Date()) / (1000 * 60 * 60 * 24));
  const isExpired = expires < new Date();

  if (isExpired) {
    await ctx.reply(
      `⏰ Абонентка истекла!\n\n` +
        `Нажмите /subscribe для продления`,
      { parse_mode: "Markdown" }
    );
    return;
  }

  const typeText = sub.subscriptionType === "daily" ? "Дневная" : "Месячная (автопродление)";

  await ctx.reply(
    `📋 *Ваша подписка*\n\n` +
      `✅ Статус: Активна\n` +
      `📦 Тип: ${typeText}\n` +
      `⏳ Осталось: ${daysLeft} дн.\n` +
      `📅 Действует до: ${expires.toLocaleDateString("ru-RU")}\n\n` +
      `Продлить:\n` +
      `/sub\\_day — +1 день (${STARS_PER_DAY} ⭐)\n` +
      `/sub\\_month — +30 дней (${STARS_PER_MONTH} ⭐)`,
    { parse_mode: "Markdown" }
  );
});

// ==================== PAYMENT HANDLERS ====================

bot.on("pre_checkout_query", async (ctx) => {
  try {
    const user = await getUser(ctx.from.id);
    if (!user || user.role !== "DRIVER") {
      await ctx.answerPreCheckoutQuery(false, {
        error_message: "Зарегистрируйтесь как водитель в приложении",
      });
      return;
    }
    await ctx.answerPreCheckoutQuery(true);
  } catch (err) {
    console.error("Pre-checkout error:", err.message);
    await ctx.answerPreCheckoutQuery(true);
  }
});

bot.on("message:successful_payment", async (ctx) => {
  const payment = ctx.message.successful_payment;
  const payload = payment.invoice_payload || "";
  const isDaily = payload.startsWith("sub_day_");
  const days = isDaily ? 1 : 30;

  try {
    const expiresAt = await activateSubscription(
      ctx.from.id,
      payment.telegram_payment_charge_id,
      payment.total_amount,
      days
    );

    const expiresStr = expiresAt.toLocaleDateString("ru-RU");
    const periodText = isDaily ? "1 день" : "30 дней";
    const renewText = isDaily ? "" : "\n🔄 Автопродление через 30 дней";

    await ctx.reply(
      `🎉 *Абонентка активирована!*\n\n` +
        `⭐ Оплачено: ${payment.total_amount} Stars\n` +
        `📅 Период: ${periodText}\n` +
        `📅 Активна до: ${expiresStr}` +
        `${renewText}\n\n` +
        `Теперь вы видите все заказы. Удачи на линии! 🚗`,
      {
        parse_mode: "Markdown",
        reply_markup: new InlineKeyboard().webApp(
          "🚗 Открыть панель водителя",
          `${WEB_APP_URL}/driver`
        ),
      }
    );

    console.log(
      `[PAYMENT] User ${ctx.from.id}: ${periodText} for ${payment.total_amount} Stars, ` +
        `charge: ${payment.telegram_payment_charge_id}`
    );
  } catch (err) {
    console.error("Payment processing error:", err.message);
    await ctx.reply(
      "⚠️ Оплата прошла, но произошла ошибка активации.\n" +
        "Напишите в /support — мы активируем вручную."
    );
  }
});

// ==================== OTHER COMMANDS ====================

bot.command("help", async (ctx) => {
  await ctx.reply(
    `📖 *Команды PeopleHub Bot*\n\n` +
      `*Сервисы:*\n` +
      `/start — Все сервисы\n` +
      `/taxi — Поездки (пассажир)\n` +
      `/driver — Панель водителя\n\n` +
      `*Абонентка водителя:*\n` +
      `/subscribe — Выбрать тариф абонентки\n` +
      `/sub\\_day — Купить на 1 день (${STARS_PER_DAY} ⭐)\n` +
      `/sub\\_month — Купить на 30 дней (${STARS_PER_MONTH} ⭐)\n` +
      `/subscription — Статус подписки\n\n` +
      `*Прочее:*\n` +
      `/about — О платформе\n` +
      `/support — Поддержка`,
    { parse_mode: "Markdown" }
  );
});

bot.command("about", async (ctx) => {
  await ctx.reply(
    `ℹ️ *PeopleHub — Платформа нового формата*\n\n` +
      `Мы убрали всё лишнее и оставили главное:\n\n` +
      `🚗 *Поездки:*\n` +
      `• 0% комиссии с поездок\n` +
      `• Абонентка от ${STARS_PER_DAY} Stars/день\n` +
      `• Рейтинг уважения\n\n` +
      `🏠 *Недвижимость:* скоро\n` +
      `🚗 *Авто:* скоро\n` +
      `🌴 *Туризм:* скоро`,
    { parse_mode: "Markdown" }
  );
});

bot.command("support", async (ctx) => {
  await ctx.reply(
    `🆘 *Нужна помощь?*\n\n` +
      `Напишите нам: @peoplehub\\_support\n` +
      `Или отправьте сообщение прямо сюда — мы ответим!`,
    { parse_mode: "Markdown" }
  );
});

// Any text → show buttons
bot.on("message:text", async (ctx) => {
  const keyboard = new InlineKeyboard()
    .webApp("🚗 Поездки", `${WEB_APP_URL}/client`)
    .row()
    .webApp("🏠 Все сервисы", `${WEB_APP_URL}/hub`);

  await ctx.reply("Выберите сервис PeopleHub:", {
    reply_markup: keyboard,
  });
});

// Error handler
bot.catch((err) => {
  console.error("Bot error:", err.message);
});

// ==================== START ====================

async function main() {
  try {
    await bot.api.deleteWebhook();
  } catch (err) {
    if (err.description === "Unauthorized" || err.error_code === 401) {
      console.error("BOT_TOKEN rejected by Telegram (401).");
      process.exit(1);
    }
    throw err;
  }

  console.log("PeopleHub Bot started (long polling)");
  console.log(`Web App: ${WEB_APP_URL}`);
  console.log(`Subscription: ${STARS_PER_DAY} Stars/day, ${STARS_PER_MONTH} Stars/month`);
  console.log("Products: TAXI (active), REALTY/AUTO/TOURISM (coming soon)");
  bot.start();
}

main().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
