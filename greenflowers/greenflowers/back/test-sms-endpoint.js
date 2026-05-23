const axios = require("axios");

const testSMSAPI = async () => {
  console.log("🧪 Testing send-sms-code endpoint...\n");

  try {
    const response = await axios.post(
      "http://localhost:5000/api/users/send-sms-code",
      {
        phone: "+77771234567",
      },
      {
        timeout: 5000,
      },
    );

    console.log("✅ Response status:", response.status);
    console.log("✅ Response body:");
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data.code) {
      console.log(`\n✓ DEV MODE: SMS code - ${response.data.code}`);
      console.log("✓ Используй этот код для теста логина");
    } else {
      console.log("\n✓ Код отправлена в консоль сервера");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    }
  }
};

testSMSAPI();
