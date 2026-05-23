const fs = require("fs");
const http = require("http");

console.log("🧪 Testing export endpoint...");

const options = {
  hostname: "localhost",
  port: 5000,
  path: "/api/trucks/export/excel",
  method: "GET",
  headers: {
    Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  },
};

const req = http.request(options, (res) => {
  console.log(`✅ Status: ${res.statusCode}`);
  console.log("Headers:", {
    "Content-Type": res.headers["content-type"],
    "Content-Disposition": res.headers["content-disposition"],
    "Content-Length": res.headers["content-length"],
  });

  // Write to file
  const filename = "export-test.xlsx";
  const file = fs.createWriteStream(filename);

  res.pipe(file);

  file.on("finish", () => {
    file.close();
    const stats = fs.statSync(filename);
    console.log(`\n✅ File saved: ${filename} (${stats.size} bytes)`);
  });

  file.on("error", (err) => {
    console.error("❌ File write error:", err);
    fs.unlink(filename, () => {});
  });
});

req.on("error", (e) => {
  console.error(`❌ Error: ${e.message}`);
});

req.end();
