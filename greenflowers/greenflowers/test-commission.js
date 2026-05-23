const axios = require("axios");

async function testCommission() {
  try {
    // Assuming worker id 1, truck 'truck-uuid', city 'Moscow'
    const response = await axios.get(
      "http://localhost:4000/api/shifts/commission/truck/truck-uuid/Moscow?userId=1&role=worker",
    );
    console.log("Response:", JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
  }
}

testCommission();
