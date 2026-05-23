// Test to check if fetch with credentials works from Node.js (simulating browser)
const testData = {
  identifier:
    "TR-TEST-" + Math.random().toString(36).substr(2, 9).toUpperCase(),
  arrival_date: new Date().toISOString().split("T")[0],
  status: "active",
  notes: "Test with credentials",
  metrics: [],
};

console.log("📤 Testing fetch with credentials...");
console.log("Data:", JSON.stringify(testData, null, 2));

fetch("http://localhost:5000/api/trucks", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(testData),
  credentials: "include",
})
  .then((res) => {
    console.log(`\n✅ Status: ${res.status}`);
    console.log("Headers:", Array.from(res.headers.entries()));
    return res.json();
  })
  .then((data) => {
    console.log("\n📄 Response:");
    console.log(JSON.stringify(data, null, 2));
  })
  .catch((err) => {
    console.error("❌ Error:", err.message);
  });
