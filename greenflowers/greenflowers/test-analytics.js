// Quick test of new analytics endpoints
const http = require("http");

async function testEndpoint(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "localhost",
      port: 5000,
      path: path,
      method: "GET",
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        console.log(`\n✓ ${path}`);
        console.log(JSON.stringify(JSON.parse(data), null, 2));
        resolve();
      });
    });

    req.on("error", reject);
    req.end();
  });
}

async function main() {
  try {
    console.log("Testing new analytics endpoints...\n");

    // Test inventory total
    await testEndpoint("/api/inventory-items/truck/1/total");

    // Test delivered orders total
    await testEndpoint("/api/commissions/truck/1/delivered-sales/ALL");

    console.log("\n✅ All tests passed!");
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main();
