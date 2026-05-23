const http = require("http");

// Test data matching what frontend sends
const testData = {
  identifier: "TRUCK-" + Date.now(),
  arrival_date: "2026-01-20", // Must be in YYYY-MM-DD format for DATE type
  status: "pending",
  notes: "Test truck from console",
};

console.log("[*] Sending:", JSON.stringify(testData, null, 2));

const data = JSON.stringify(testData);

const options = {
  hostname: "localhost",
  port: 5000,
  path: "/api/trucks",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": data.length,
  },
};

const req = http.request(options, (res) => {
  let body = "";
  res.on("data", (chunk) => (body += chunk));
  res.on("end", () => {
    console.log("[Response] Status:", res.statusCode);
    console.log("[Response] Headers:", JSON.stringify(res.headers, null, 2));
    try {
      const json = JSON.parse(body);
      console.log("[Response] Body:", JSON.stringify(json, null, 2));
    } catch (e) {
      console.log("[Response] Body (raw):", body);
    }
  });
});

req.on("error", (err) => {
  console.error("[Error]:", err.message);
});

req.write(data);
req.end();

console.log("[*] Request sent...");
