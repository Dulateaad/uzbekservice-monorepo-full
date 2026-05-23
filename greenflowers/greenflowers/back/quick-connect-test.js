const axios = require("axios");

(async () => {
  try {
    console.log(
      "Testing connection to http://localhost:5000/api/orders/all?userId=1",
    );
    const response = await axios.get(
      "http://localhost:5000/api/orders/all?userId=1",
      {
        timeout: 10000,
      },
    );
    console.log("✅ Connected! Got " + response.data.length + " orders");

    // Find a pending order with assigned_to = 1
    const pending = response.data.filter(
      (o) => o.status === "pending" && o.assigned_to === 1,
    );
    console.log("Pending orders with assigned_to=1: " + pending.length);
    if (pending.length > 0) {
      console.log(
        "First one: ID=" +
          pending[0].id +
          ", amount=" +
          pending[0].total_amount,
      );
    }
  } catch (error) {
    console.log("❌ Error: " + error.message);
    if (error.code) console.log("Error code: " + error.code);
  }
})();
