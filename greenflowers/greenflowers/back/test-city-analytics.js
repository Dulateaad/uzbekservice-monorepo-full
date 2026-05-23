const http = require("http");

const options = {
  hostname: "localhost",
  port: 5000,
  // can test different spellings and case (URL-encoded)
  path: "/api/admin/city-analytics?role=admin&city=%D0%A8%D1%8B%D0%BC%D0%BA%D0%B5%D0%BD%D1%82",
  method: "GET",
};

const req = http.request(options, (res) => {
  let data = "";
  res.on("data", (chunk) => {
    data += chunk;
  });
  res.on("end", () => {
    console.log("Response:", data);
  });
});

req.on("error", (e) => {
  console.error("Error:", e);
});

req.end();
