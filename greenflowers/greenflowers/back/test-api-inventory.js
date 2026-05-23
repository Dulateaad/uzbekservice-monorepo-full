#!/usr/bin/env node
/**
 * Test Inventory API
 */

const axios = require("axios");

const API_URL = "http://localhost:5000/api";

async function testInventoryAPI() {
  console.log("🧪 Testing Inventory API...\n");

  try {
    // 1. Get all trucks
    console.log("1️⃣ Getting all trucks...");
    const trucksResponse = await axios.get(`${API_URL}/trucks`);
    console.log(`✅ Got ${trucksResponse.data.data?.length || 0} trucks`);

    if (trucksResponse.data.data && trucksResponse.data.data.length > 0) {
      const truck = trucksResponse.data.data[0];
      console.log(`   First truck ID: ${truck.id}`);
      console.log(
        `   First truck: ${truck.identifier || truck.name || "Unknown"}`,
      );

      // 2. Get items for this truck
      console.log(`\n2️⃣ Getting items for truck ${truck.id}...`);
      const itemsResponse = await axios.get(
        `${API_URL}/inventory-items/truck/${truck.id}`,
      );
      console.log(
        `✅ Got ${itemsResponse.data.data?.length || 0} items for truck`,
      );

      if (itemsResponse.data.data && itemsResponse.data.data.length > 0) {
        console.log("   Items:");
        itemsResponse.data.data.forEach((item, idx) => {
          console.log(
            `   ${idx + 1}. ${item.name} (qty: ${item.quantity}, price: ${item.price})`,
          );
        });
      }
    } else {
      console.log("❌ No trucks found");
    }

    console.log("\n✅ API is working!");
  } catch (error) {
    console.error("❌ API Error:", error.response?.data || error.message);
    console.error(`   Status: ${error.response?.status}`);
    console.error(`   URL: ${error.config?.url}`);
  }
}

testInventoryAPI();
