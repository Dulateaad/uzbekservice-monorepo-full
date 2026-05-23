const axios = require("axios");
require("dotenv").config();

const testSMSC = async () => {
  const basePhone = "77012345678"; // Базовый номер без плюса
  const code = "123456";
  const message = `Код: ${code}`;

  const smscLogin = process.env.SMSC_LOGIN;
  const smscPassword = process.env.SMSC_PASSWORD;

  if (!smscLogin || !smscPassword) {
    console.error("❌ SMSC credentials not found in .env");
    console.log(`SMSC_LOGIN: ${smscLogin}`);
    console.log(`SMSC_PASSWORD: ${smscPassword}`);
    process.exit(1);
  }

  console.log(`\n🧪 Тестирование SMSC.KZ API`);
  console.log(`Код: ${code}`);
  console.log(`Login: ${smscLogin}`);
  console.log(`Message: ${message}`);
  console.log("─".repeat(70));

  // Тестируем разные форматы номера
  const phoneFormats = [
    { name: "без плюса", value: basePhone },
    { name: "с плюсом", value: `+${basePhone}` },
    { name: "с URL кодированием +", value: `%2B${basePhone}` },
    { name: "только 10 цифр", value: basePhone.slice(1) },
    { name: "7 (без первого нуля)", value: "77" + basePhone.slice(2) },
  ];

  let successCount = 0;
  let failureCount = 0;

  for (const phoneFormat of phoneFormats) {
    console.log(`\n📤 Формат номера: ${phoneFormat.name}`);
    console.log(`   Значение: ${phoneFormat.value}`);

    try {
      const smsUrl = `https://smsc.kz/sys/send.php?login=${encodeURIComponent(smscLogin)}&psw=${encodeURIComponent(smscPassword)}&phones=${phoneFormat.value}&mes=${encodeURIComponent(message)}&charset=utf-8`;

      console.log(`   URL: ${smsUrl.substring(0, 80)}...`);

      const startTime = Date.now();
      const response = await axios.get(smsUrl, {
        timeout: 8000,
        headers: {
          "User-Agent": "greenflowers-app/1.0",
        },
      });
      const endTime = Date.now();

      const responseText = String(response.data).trim();
      console.log(`   Ответ: "${responseText}"`);
      console.log(`   Время ответа: ${endTime - startTime}ms`);
      console.log(`   HTTP Status: ${response.status}`);

      // Парсим ответ SMSC
      if (responseText.includes(",")) {
        const parts = responseText.split(",");
        const id = parts[0];
        const status = parts[1];

        console.log(`   ID: ${id}, Статус: ${status}`);

        if (status === "0") {
          console.log(`   ✅ УСПЕХ! Сообщение отправлено`);
          successCount++;
        } else if (status === "1") {
          console.log(`   ⏳ В очереди`);
          successCount++;
        } else if (status === "-1") {
          console.log(`   ❌ Ошибка в номере телефона`);
          failureCount++;
        } else if (status === "-4") {
          console.log(`   ❌ Ошибка аутентификации`);
          failureCount++;
        } else {
          console.log(`   ⚠️  Неизвестный статус: ${status}`);
          failureCount++;
        }
      } else {
        console.log(`   ⚠️  Неожиданный формат ответа`);
        failureCount++;
      }
    } catch (error) {
      console.error(`   ❌ Ошибка: ${error.message}`);
      if (error.response) {
        console.error(`   Статус: ${error.response.status}`);
        console.error(`   Данные: ${error.response.data}`);
      }
      failureCount++;
    }

    // Небольшая задержка между запросами
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log("\n" + "─".repeat(70));
  console.log(`\n📊 Итоги тестирования:`);
  console.log(`   ✅ Успешно: ${successCount}`);
  console.log(`   ❌ Ошибок: ${failureCount}`);

  console.log("\n📋 Коды ошибок SMSC.KZ:");
  console.log("  0 = успешно отправлено");
  console.log("  1 = в очереди");
  console.log("  -1 = ошибка в номере телефона");
  console.log("  -2 = ошибка в тексте сообщения");
  console.log("  -3 = неправильные параметры");
  console.log("  -4 = ошибка аутентификации");
  console.log("  -5 = недостаточно средств");

  process.exit(0);
};

testSMSC().catch((error) => {
  console.error("Критическая ошибка:", error);
  process.exit(1);
});
