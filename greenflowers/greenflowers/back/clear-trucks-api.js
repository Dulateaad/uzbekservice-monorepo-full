// Direct API call to clear trucks
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

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);

  let data = "";
  res.on("data", (chunk) => {
    data += chunk;
  });

  res.on("end", () => {
    try {
      const result = JSON.parse(data);
      console.log(JSON.stringify(result, null, 2));
    } catch (e) {
      console.log(data);
    }
  });
});

req.on("error", (e) => {
  console.error(`Error: ${e.message}`);
});

req.end();
