const http = require("http");

const data = JSON.stringify({
  identifier: "test-truck-" + Date.now(),
  arrival_date: "2026-01-20",
  status: "pending",
  notes: "Test truck",
});

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
    console.log("Status:", res.statusCode);
    console.log("Response:", body);
  });
});

req.on("error", (err) => console.error("Error:", err.message));
req.write(data);
req.end();
