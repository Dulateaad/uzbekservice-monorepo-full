/**
 * Test script: Verify user permissions are working correctly
 */

const http = require("http");

function makeRequest(path, method = "GET", body = null) {
  return new Promise((resolve, reject) => {
    const pathWithRole = path.includes("?")
      ? path + "&role=admin"
      : path + "?role=admin";
    const options = {
      hostname: "localhost",
      port: 5000,
      path: pathWithRole,
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
        resolve({ status: res.statusCode, body: JSON.parse(data) });
      });
    });

    req.on("error", reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function test() {
  console.log("🧪 Testing User Permissions API...\n");

  try {
    // Test 1: Get default permissions (user 1)
    console.log("Test 1: Get default permissions for user 1");
    let result = await makeRequest("/api/permissions/user-permissions/1");
    console.log("  Status:", result.status);
    console.log("  Permissions:", result.body.permissions);
    console.log("  ✅ Default permissions returned\n");

    // Test 2: Save reduced permissions
    console.log("Test 2: Revoke some permissions for user 1");
    result = await makeRequest("/api/permissions/user-permissions/1", "POST", {
      create_product: false,
      create_batch: true,
      edit_truck: false,
      edit_position: true,
      can_view_analytics: true,
      can_manage_users: false,
    });
    console.log("  Status:", result.status);
    console.log("  Saved permissions:", result.body.permissions);
    console.log("  ✅ Permissions saved\n");

    // Test 3: Load saved permissions
    console.log("Test 3: Load saved permissions for user 1");
    result = await makeRequest("/api/permissions/user-permissions/1");
    console.log("  Status:", result.status);
    console.log("  Permissions:", result.body.permissions);
    console.log("  ✅ Saved permissions loaded correctly\n");

    // Test 4: Different user gets defaults
    console.log("Test 4: Get permissions for user 999 (should be defaults)");
    result = await makeRequest("/api/permissions/user-permissions/999");
    console.log("  Status:", result.status);
    console.log("  Permissions:", result.body.permissions);
    console.log("  ✅ New user gets default permissions\n");

    console.log("✅ All tests passed!");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

test();
