const http = require("http");

async function testEndpoints() {
  const endpoints = [
    { path: "/api/trucks/analytics/summary", method: "GET" },
    { path: "/api/trucks", method: "GET" },
  ];

  for (const endpoint of endpoints) {
    console.log(`\n🔄 Testing ${endpoint.method} ${endpoint.path}...`);

    await new Promise((resolve) => {
      const options = {
        hostname: "localhost",
        port: 5000,
        path: endpoint.path,
        method: endpoint.method,
      };

      const req = http.request(options, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            console.log(
              "✅ Response:",
              JSON.stringify(json, null, 2).substring(0, 200)
            );
          } catch (e) {
            console.log("Raw:", data.substring(0, 200));
          }
          resolve();
        });
      });

      req.on("error", (error) => {
        console.error("❌ Error:", error.message);
        resolve();
      });

      req.end();
    });
  }
}

testEndpoints();
