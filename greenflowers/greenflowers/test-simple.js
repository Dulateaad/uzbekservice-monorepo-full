const http = require("http");

const options = {
  hostname: "localhost",
  port: 5000,
  path: "/api/admin/user-permissions/1?currentUserId=1",
  method: "GET",
};

const req = http.request(options, (res) => {
  let body = "";
  res.on("data", (chunk) => {
    body += chunk;
  });
  res.on("end", () => {
    console.log("Status:", res.statusCode);
    console.log("Body:", body);
    process.exit(0);
  });
});

req.on("error", (e) => {
  console.error("Error:", e.message);
  process.exit(1);
});

req.end();
