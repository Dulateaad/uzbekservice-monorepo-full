const axios = require("axios");
require("dotenv").config();

(async () => {
  console.log("=== SMSC.KZ Integration Test ===\n");

  const phone = "+77012345678";
  const code = "123456";
  const message = `Код: ${code}`;

  const smscLogin = process.env.SMSC_LOGIN;
  const smscPassword = process.env.SMSC_PASSWORD;

  console.log("Configuration:");
  console.log(`  Login: ${smscLogin || "NOT SET"}`);
  console.log(
    `  Password: ${smscPassword ? smscPassword.substring(0, 3) + "***" : "NOT SET"}`,
  );
  console.log(`  Phone: ${phone}`);
  console.log(`  Message: ${message}\n`);

  if (!smscLogin || !smscPassword) {
    console.log("ERROR: SMSC credentials not found!");
    process.exit(1);
  }

  try {
    const smsUrl = `https://smsc.kz/sys/send.php?login=${encodeURIComponent(smscLogin)}&psw=${encodeURIComponent(smscPassword)}&phones=${encodeURIComponent(phone)}&mes=${encodeURIComponent(message)}&charset=utf-8&fmt=1`;

    console.log("Sending request to SMSC.KZ API...");
    console.log(`URL: ${smsUrl.substring(0, 100)}...\n`);

    const response = await axios.get(smsUrl, {
      timeout: 10000,
      headers: { "User-Agent": "greenflowers-app" },
    });

    console.log("=== RESPONSE FROM SMSC.KZ ===");
    console.log(`Status: ${response.status}`);
    console.log(`Raw Data: ${JSON.stringify(response.data)}\n`);

    if (typeof response.data === "object") {
      console.log("Parsed Response:");
      console.log(JSON.stringify(response.data, null, 2));
    }
  } catch (error) {
    console.log("=== ERROR ===");
    console.log(`Message: ${error.message}`);
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Data: ${JSON.stringify(error.response.data)}`);
    }
    if (error.code) console.log(`Code: ${error.code}`);
  }

  process.exit(0);
})();
