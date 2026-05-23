const http = require("http");

const truckData = {
  identifier: "TR-" + Math.random().toString(36).substr(2, 9).toUpperCase(),
  arrival_date: new Date().toISOString().split("T")[0], // YYYY-MM-DD format
  status: "active",
  notes: "Test truck",
  metrics: { fuel: 50, mileage: 1000 },
};

console.log("📤 Sending truck data:", JSON.stringify(truckData, null, 2));

const options = {
  hostname: "localhost",
  port: 5000,
  path: "/api/trucks",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(JSON.stringify(truckData)),
  },
};

const req = http.request(options, (res) => {
  console.log(`\n📥 Status: ${res.statusCode}`);
  console.log("Headers:", res.headers);

  let data = "";
  res.on("data", (chunk) => {
    data += chunk;
  });

  res.on("end", () => {
    console.log("\n📄 Response body:");
    try {
      const parsed = JSON.parse(data);
      console.log(JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log(data);
    }
  });
});

req.on("error", (e) => {
  console.error(`❌ Error: ${e.message}`);
});

req.write(JSON.stringify(truckData));
req.end();

console.log("⏳ Waiting for response...");
