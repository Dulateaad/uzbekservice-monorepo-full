const http = require("http");

async function testAPIDirectly() {
  const truckId = "6decfe72-b3c7-4535-84c4-d82909245e57"; // ыыы truck

  const options = {
    hostname: "localhost",
    port: 5000,
    path: `/api/commissions/commission/truck/${truckId}/Almaty?role=admin`,
    method: "GET",
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          console.log("Status:", res.statusCode);
          const parsed = JSON.parse(data);
          console.log("A:", parsed.A || parsed.analytics?.A || "N/A");
          console.log("V:", parsed.V || parsed.analytics?.V || "N/A");
          console.log("Full response:", JSON.stringify(parsed, null, 2));
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on("error", reject);
    req.end();
  });
}

testAPIDirectly().catch(console.error);
