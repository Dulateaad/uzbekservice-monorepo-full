#!/usr/bin/env node

/**
 * End-to-End Test Script для проверки batch delivery системы
 */

const API_URL = "http://localhost:5000/api";

async function test(name, fn) {
  try {
    console.log(`\n🧪 ${name}...`);
    await fn();
    console.log(`✅ ${name} passed`);
    return true;
  } catch (error) {
    console.error(`❌ ${name} failed:`, error.message);
    return false;
  }
}

async function runTests() {
  console.log("\n=== BATCH DELIVERY SYSTEM E2E TESTS ===\n");

  let passed = 0;
  let failed = 0;

  // Test 1: API батчей
  if (
    await test("Test 1: API /catalog/batches endpoint", async () => {
      const response = await fetch(`${API_URL}/catalog/batches?limit=2`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (!data.success) throw new Error(`API returned success=false`);
      if (!Array.isArray(data.batches))
        throw new Error(`Batches are not an array`);
      if (data.batches.length === 0) throw new Error(`No batches returned`);

      const batch = data.batches[0];
      if (!batch.id) throw new Error(`Batch has no ID`);
      if (!batch.items) throw new Error(`Batch has no items`);
      if (!Array.isArray(batch.items))
        throw new Error(`Batch items are not an array`);

      console.log(
        `   └─ Got ${data.batches.length} batches, first has ${batch.items.length} items`,
      );
    })
  ) {
    passed++;
  } else {
    failed++;
  }

  // Test 2: Batch структура
  if (
    await test("Test 2: Batch structure validation", async () => {
      const response = await fetch(`${API_URL}/catalog/batches?limit=1`);
      const data = await response.json();
      const batch = data.batches[0];

      const requiredFields = [
        "id",
        "batch_date",
        "supplier_name",
        "total_items",
        "age_days",
        "is_fresh",
        "is_new",
        "status",
        "items",
      ];
      for (const field of requiredFields) {
        if (!(field in batch)) throw new Error(`Missing field: ${field}`);
      }

      console.log(`   └─ All required fields present`);
    })
  ) {
    passed++;
  } else {
    failed++;
  }

  // Test 3: Товары в батчах
  if (
    await test("Test 3: Items in batch structure", async () => {
      const response = await fetch(`${API_URL}/catalog/batches?limit=1`);
      const data = await response.json();
      const batch = data.batches[0];

      if (batch.items.length === 0) throw new Error(`Batch has no items`);

      const item = batch.items[0];
      const itemFields = [
        "id",
        "name",
        "quantity",
        "selling_price",
        "photo_url",
      ];
      for (const field of itemFields) {
        if (!(field in item)) throw new Error(`Item missing field: ${field}`);
      }

      console.log(
        `   └─ Items have all required fields: ${itemFields.join(", ")}`,
      );
    })
  ) {
    passed++;
  } else {
    failed++;
  }

  // Test 4: API /catalog/batch/:id
  if (
    await test("Test 4: API /catalog/batch/:id endpoint", async () => {
      const listResponse = await fetch(`${API_URL}/catalog/batches?limit=1`);
      const listData = await listResponse.json();
      const batchId = listData.batches[0].id;

      const response = await fetch(`${API_URL}/catalog/batch/${batchId}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (!data.success) throw new Error(`API returned success=false`);
      if (!data.batch) throw new Error(`No batch in response`);
      if (data.batch.id !== batchId) throw new Error(`Batch ID mismatch`);

      console.log(
        `   └─ Single batch API returns: ${data.batch.items.length} items`,
      );
    })
  ) {
    passed++;
  } else {
    failed++;
  }

  // Test 5: Данные батчей содержат URLs
  if (
    await test("Test 5: Items have photo URLs", async () => {
      const response = await fetch(`${API_URL}/catalog/batches?limit=1`);
      const data = await response.json();
      const batch = data.batches[0];

      if (batch.items.length === 0) throw new Error(`Batch has no items`);

      const item = batch.items[0];
      if (!item.photo_url) throw new Error(`Item has no photo_url`);
      if (!item.photo_url.includes("http"))
        throw new Error(`photo_url is not absolute: ${item.photo_url}`);

      console.log(
        `   └─ Photo URLs are absolute: ${item.photo_url.substring(0, 50)}...`,
      );
    })
  ) {
    passed++;
  } else {
    failed++;
  }

  // Summary
  console.log(`\n=== SUMMARY ===`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${passed + failed}\n`);

  if (failed === 0) {
    console.log("🎉 All tests passed! System is operational.\n");
    process.exit(0);
  } else {
    console.log("⚠️  Some tests failed. Please review errors above.\n");
    process.exit(1);
  }
}

runTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
