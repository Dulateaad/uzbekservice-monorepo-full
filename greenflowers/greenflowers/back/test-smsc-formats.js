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
    console.log("Set SMSC_LOGIN and SMSC_PASSWORD in .env file");
    return;
  }

  console.log(`Testing SMSC.KZ API...`);
  console.log(`Code: ${code}`);
  console.log(`Login: ${smscLogin}`);
  console.log("---\n");

  // Тестируем разные форматы номера
  const phoneFormats = [
    { name: "без плюса", value: basePhone },
    { name: "с плюсом", value: `+${basePhone}` },
    { name: "с URL кодированием +", value: `%2B${basePhone}` },
    { name: "только 10 цифр", value: basePhone.slice(1) },
  ];

  for (const phoneFormat of phoneFormats) {
    console.log(`\n📤 Попытка номер ${phoneFormat.name}: ${phoneFormat.value}`);

    try {
      const smsUrl = `https://smsc.kz/sys/send.php?login=${encodeURIComponent(smscLogin)}&psw=${encodeURIComponent(smscPassword)}&phones=${phoneFormat.value}&mes=${encodeURIComponent(message)}&charset=utf-8`;

      const response = await axios.get(smsUrl, {
        timeout: 10000,
        headers: { "User-Agent": "greenflowers-app" },
      });

      const responseText = String(response.data).trim();
      console.log(`  Ответ: ${responseText}`);

      // Парсим простой ответ SMSC
      const parts = responseText.split(",");
      if (parts.length === 2) {
        const id = parts[0];
        const status = parts[1];

        if (status === "0") {
          console.log(`  ✅ УСПЕХ! Message ID: ${id}`);
        } else if (status === "1") {
          console.log(`  ⏳ В очереди. Message ID: ${id}`);
        } else {
          console.log(
            `  ⚠️  Статус: ${status} (возможно ошибка - см. коды ниже)`,
          );
        }
      }
    } catch (error) {
      console.error(`  ❌ Error: ${error.message}`);
    }
  }

  console.log("\n\n📋 Коды ошибок SMSC.KZ:");
  console.log("0 = успешно отправлено");
  console.log("1 = в очереди");
  console.log("-1 = ошибка в номере телефона");
  console.log("-2 = ошибка в тексте сообщения");
  console.log("-3 = неправильные параметры");
  console.log("-4 = ошибка аутентификации");
};

testSMSC();
