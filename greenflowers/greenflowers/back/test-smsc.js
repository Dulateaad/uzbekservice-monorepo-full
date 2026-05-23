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

  try {
    // Тест 1: Базовый запрос
    const smsUrl = `https://smsc.kz/sys/send.php?login=${encodeURIComponent(smscLogin)}&psw=${encodeURIComponent(smscPassword)}&phones=${encodeURIComponent(phone)}&mes=${encodeURIComponent(message)}&charset=utf-8&fmt=1`;

    console.log("\n📤 Sending SMS via SMSC.KZ...\n");

    const response = await axios.get(smsUrl, {
      timeout: 15000,
      headers: { "User-Agent": "greenflowers-app" },
    });

    const responseText = String(response.data);
    console.log("Raw response:", responseText);

    // Парсим JSON ответ
    let smscData;
    try {
      smscData = JSON.parse(responseText);
    } catch {
      smscData = { raw: responseText };
    }

    console.log("\nParsed response:", JSON.stringify(smscData, null, 2));

    // Анализируем результат
    if (smscData.error) {
      console.error(
        `\n❌ SMSC Error Code ${smscData.error_code}: ${smscData.error}`,
      );
    } else if (smscData.id) {
      console.log(`\n✅ SMS sent successfully!`);
      console.log(`Message ID: ${smscData.id}`);
      console.log(`Status: ${smscData.status || "pending"}`);
    } else if (smscData.send_status) {
      console.log(`\n✅ SMS queued for delivery`);
      console.log(`Send status: ${smscData.send_status}`);
    } else {
      console.log("\n⚠️  Unclear response from SMSC");
      console.log("Full response:", responseText);
    }
  } catch (error) {
    console.error("\n❌ Request failed:", error.message);
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    }
  }
};

testSMSC();
