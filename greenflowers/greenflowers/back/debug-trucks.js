const http = require("http");

function getTrucks() {
  return new Promise((resolve, reject) => {
    http.get("http://localhost:5000/api/trucks", (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          console.log("✅ Trucks API Response:");
          console.log(JSON.stringify(json, null, 2));
          resolve(json);
        } catch (e) {
          console.error("❌ Failed to parse JSON:");
          console.error(data);
          reject(e);
        }
      });
    });
  });
}

getTrucks().catch(console.error);
