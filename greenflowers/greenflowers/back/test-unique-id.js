const http = require("http");

// Generate unique identifier each time
const uniqueId =
  "TR-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5);

const truckData = {
  identifier: uniqueId,
  arrival_date: "2026-01-20",
  status: "pending",
  notes: "Fresh test",
  metrics: [],
};

console.log("📤 Creating truck with unique identifier...\n");
console.log("Data:", JSON.stringify(truckData, null, 2));

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
  console.log(`\n✅ Status: ${res.statusCode}`);

  let data = "";
  res.on("data", (chunk) => {
    data += chunk;
  });

  res.on("end", () => {
    try {
      const result = JSON.parse(data);
      console.log("\nResponse:");
      console.log(JSON.stringify(result, null, 2));

      if (res.statusCode === 201) {
        console.log("\n✅ SUCCESS! Truck created");
      } else {
        console.log(`\n❌ ERROR: Status ${res.statusCode}`);
        console.log("Error message:", result.error);
      }
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
