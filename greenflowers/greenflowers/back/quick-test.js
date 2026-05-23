#!/usr/bin/env node
const http = require("http");
const uniqueId =
  "TRUCK-" + Math.random().toString(36).substr(2, 8).toUpperCase();
const truckData = {
  identifier: uniqueId,
  arrival_date: "2026-01-20",
  status: "pending",
  notes: "Test",
  metrics: [],
};
console.log("Creating:", uniqueId);
http
  .request(
    {
      hostname: "localhost",
      port: 5000,
      path: "/api/trucks",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => {
        const r = JSON.parse(d);
        console.log("Status:", res.statusCode);
        console.log("Success:", r.success);
        console.log("Error:", r.error);
        if (r.success) console.log("ID:", r.data.id);
      });
    }
  )
  .on("error", (e) => console.error("Error:", e.message))
  .end(JSON.stringify(truckData));
