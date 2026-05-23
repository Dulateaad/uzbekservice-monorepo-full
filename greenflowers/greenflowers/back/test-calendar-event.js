const http = require("http");

const eventData = {
  userId: 1,
  eventDate: "2026-01-15",
  eventType: "custom",
  title: "Test Event",
  description: "Testing calendar event creation",
  priority: "medium",
};

console.log("📤 Testing calendar event creation...\n");
console.log("Data:", JSON.stringify(eventData, null, 2));

const options = {
  hostname: "localhost",
  port: 5000,
  path: "/api/calendar/events",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(JSON.stringify(eventData)),
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
      console.log("\n📄 Response:");
      console.log(JSON.stringify(result, null, 2));

      if (res.statusCode === 200) {
        console.log("\n✅ Event created successfully!");
      } else {
        console.log(`\n❌ Error: Status ${res.statusCode}`);
        if (result.error) console.log("Error message:", result.error);
      }
    } catch (e) {
      console.log("Raw response:", data);
    }
  });
});

req.on("error", (e) => {
  console.error(`❌ Error: ${e.message}`);
});

req.write(JSON.stringify(eventData));
req.end();
