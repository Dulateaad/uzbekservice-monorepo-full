/**
 * Test script: Verify user permissions API works WITHOUT admin role
 * (simulating frontend calls from browser)
 */

const http = require("http");

function makeRequest(path, method = "GET", body = null) {
  return new Promise((resolve, reject) => {
    // DO NOT add role=admin - testing as regular user
    const options = {
      hostname: "localhost",
      port: 5000,
      path: path,
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on("error", reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log("🧪 Testing User Permissions API WITHOUT admin role...\n");

  try {
    // Test 1: Get permissions for user 1 (reading own)
    console.log("Test 1: Get permissions for user 1 (reading own permissions)");
    const test1 = await makeRequest(
      "/api/permissions/user-permissions/1?currentUserId=1",
    );
    console.log("  Status:", test1.status);
    console.log("  Body:", JSON.stringify(test1.body, null, 2));
    console.log("  Success:", test1.status === 200 ? "✅" : "❌");
    console.log();

    // Test 2: Try to get permissions for user 2 (should fail - not own)
    console.log(
      "Test 2: Try to get permissions for user 2 (should FAIL - not own user)",
    );
    const test2 = await makeRequest(
      "/api/permissions/user-permissions/2?currentUserId=1",
    );
    console.log("  Status:", test2.status);
    console.log("  Expected: 403");
    console.log("  Success:", test2.status === 403 ? "✅" : "❌");
    console.log("  Response:", test2.body.error);
    console.log();

    // Test 3: Try to POST (should fail - not admin)
    console.log("Test 3: Try to POST without admin role (should FAIL)");
    const test3 = await makeRequest(
      "/api/permissions/user-permissions/1?currentUserId=1",
      "POST",
      { create_product: false },
    );
    console.log("  Status:", test3.status);
    console.log("  Expected: 403");
    console.log("  Success:", test3.status === 403 ? "✅" : "❌");
    console.log("  Response:", test3.body.error);
    console.log();

    console.log("✅ All tests completed!");
  } catch (error) {
    console.error("❌ Test error:", error);
  }
}

runTests();
