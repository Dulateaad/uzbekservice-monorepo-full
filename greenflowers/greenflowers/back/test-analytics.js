const http = require("http");

const options = {
  hostname: "localhost",
  port: 5000,
  path: "/api/trucks/analytics/summary",
  method: "GET",
};

const req = http.request(options, (res) => {
  let data = "";

  res.on("data", (chunk) => {
    data += chunk;
  });

  res.on("end", () => {
    console.log("Analytics Response:");
    console.log(data);
  });
});

req.on("error", (error) => {
  console.error("Error:", error);
});

req.end();
