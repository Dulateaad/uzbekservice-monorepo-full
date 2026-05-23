#!/usr/bin/env node

const testData = {
  identifier:
    "TR-FINAL-" + Math.random().toString(36).substr(2, 9).toUpperCase(),
  arrival_date: "2026-01-15",
  status: "pending",
  notes: "Final test",
  metrics: [],
};

console.log("📤 Attempting to create truck via fetch...\n");
console.log("Request URL: http://localhost:5000/api/trucks");
console.log("Request Method: POST");
console.log("Request Body:", JSON.stringify(testData, null, 2));

// Using fetch API
Promise.resolve()
  .then(() =>
    fetch("http://localhost:5000/api/trucks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testData),
    })
  )
  .then(async (res) => {
    console.log("\n✅ Response received");
    console.log("Status:", res.status, res.statusText);
    console.log("Headers:", {
      "Content-Type": res.headers.get("content-type"),
      "CORS Allow Credentials": res.headers.get(
        "access-control-allow-credentials"
      ),
    });

    const data = await res.json();
    console.log("\nResponse Body:");
    console.log(JSON.stringify(data, null, 2));

    if (res.ok) {
      console.log("\n✅ SUCCESS! Truck created with ID:", data.data?.id);
    } else {
      console.log("\n❌ ERROR! Status", res.status);
    }
  })
  .catch((err) => {
    console.error("\n❌ Request failed:", err.message);
  });
