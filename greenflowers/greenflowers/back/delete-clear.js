const http = require("http");

const options = {
  hostname: "localhost",
  port: 5000,
  path: "/api/trucks/admin/clear",
  method: "DELETE",
  headers: {
    "Content-Type": "application/json",
  },
};

console.log("🧹 Clearing trucks table...\n");

const req = http.request(options, (res) => {
  let data = "";

  res.on("data", (chunk) => {
    data += chunk;
  });

  res.on("end", () => {
    console.log(`Status: ${res.statusCode}`);
    try {
      const result = JSON.parse(data);
      console.log("\nResponse:");
      console.log(JSON.stringify(result, null, 2));
      if (res.statusCode === 200) {
        console.log("\n✅ Table cleared successfully!");
      }
    } catch (e) {
      console.log(data);
    }
  });
});

req.on("error", (e) => {
  console.error(`❌ Error: ${e.message}`);
  console.error("Full error:", e);
});

console.log("📤 Sending request...");
req.end();
