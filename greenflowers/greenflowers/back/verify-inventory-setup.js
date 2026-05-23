#!/usr/bin/env node
/**
 * Quick Verification Script
 * Checks if all inventory-related components are properly configured
 */

const fs = require("fs");
const path = require("path");

const checks = [];

// Helper function
function checkFile(filePath, searchStrings, description) {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const results = searchStrings.map((search) => ({
      search,
      found: content.includes(search),
    }));

    checks.push({
      file: path.basename(filePath),
      description,
      results,
      status: results.every((r) => r.found) ? "✅" : "⚠️",
    });
  } catch (error) {
    checks.push({
      file: path.basename(filePath),
      description,
      error: error.message,
      status: "❌",
    });
  }
}

console.log("🔍 Verifying Inventory Configuration...\n");

// Check AddPositionModal - should send "photo" not "image"
checkFile(
  path.join(__dirname, "../sdfg/components/inventory/AddPositionModal.tsx"),
  [
    'data.append("photo"',
    'data.append("price", formData.unit_price)',
    'data.append("truck_id", truckId)',
  ],
  "AddPositionModal FormData sends correct fields",
);

// Check database schema - inventory_items should have "price" field
checkFile(
  path.join(__dirname, "migrations/005_create_inventory_items.sql"),
  ["price DECIMAL(10, 2)", "photo_url TEXT", "truck_id UUID"],
  "Database schema has correct fields",
);

// Check API endpoint - expects "price" field
checkFile(
  path.join(__dirname, "routes/inventory-items.js"),
  [
    "const { truck_id, name, variety, price, quantity, notes } = req.body",
    "photo_url",
  ],
  "API endpoint expects correct fields",
);

// Check colors are updated
checkFile(
  path.join(__dirname, "../sdfg/components/inventory/AddPositionModal.tsx"),
  ["#568a56"],
  "AddPositionModal has correct brand color",
);

checkFile(
  path.join(__dirname, "../sdfg/app/admin/inventory/page.tsx"),
  ["#568a56"],
  "Inventory page has correct brand color",
);

// Display results
console.log("=" + "=".repeat(60));
checks.forEach((check) => {
  console.log(`\n${check.status} ${check.file}`);
  console.log(`   ${check.description}`);

  if (check.error) {
    console.log(`   ❌ Error: ${check.error}`);
  } else if (check.results) {
    check.results.forEach((result) => {
      const icon = result.found ? "✓" : "✗";
      console.log(`   [${icon}] "${result.search.substring(0, 50)}..."`);
    });
  }
});

console.log("\n" + "=".repeat(60));
const allPassed = checks.every((c) => c.status === "✅");
console.log(
  allPassed
    ? "\n✅ All configurations verified successfully!"
    : "\n⚠️ Some checks failed. Please review above.",
);
