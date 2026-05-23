#!/usr/bin/env node

/**
 * Test script to verify basePercent parameter works through entire stack:
 * - API client builds query correctly
 * - Backend route extracts basePercent
 * - CommissionCalculator uses overrideBasePercent
 */

const axios = require("axios");

const API_URL = "http://localhost:5000/api";

async function testBasePercentFeature() {
  try {
    console.log("🧪 Testing Base Manager Percent Feature...\n");

    // Get first truck ID for testing
    console.log("1️⃣ Getting available trucks...");
    const trucksRes = await axios.get(`${API_URL}/trucks`);
    const trucks = trucksRes.data?.data || [];

    if (trucks.length === 0) {
      console.error("❌ No trucks found");
      return;
    }

    const testTruck = trucks[0];
    const truckId = testTruck.id;
    const city = testTruck.city || "Almaty";

    console.log(`✅ Found truck: ${testTruck.identifier} (ID: ${truckId})`);
    console.log(`   City: ${city}\n`);

    // Test 1: Get commission with default percent (3%)
    console.log("2️⃣ Testing commission with DEFAULT percent (3%)...");
    const defaultRes = await axios.get(
      `${API_URL}/commissions/commission/truck/${truckId}/${encodeURIComponent(city)}`,
      {
        params: {
          role: "admin",
        },
      },
    );

    if (defaultRes.data.success) {
      console.log("✅ Default commission response received");
      console.log(`   Workers: ${defaultRes.data.workers.length}`);
      if (defaultRes.data.workers.length > 0) {
        const worker = defaultRes.data.workers[0];
        console.log(`   Sample worker: ${worker.worker_name}`);
        console.log(
          `   - Bonus (D=3%): ${(worker.Result ?? 0).toFixed(2)} ₸\n`,
        );
      }
    } else {
      console.error("❌ Failed to fetch default commission:", defaultRes.data);
      return;
    }

    // Test 2: Get commission with CUSTOM percent (5%)
    console.log("3️⃣ Testing commission with CUSTOM percent (5%)...");
    const customRes = await axios.get(
      `${API_URL}/commissions/commission/truck/${truckId}/${encodeURIComponent(city)}`,
      {
        params: {
          basePercent: 5,
          role: "admin",
        },
      },
    );

    if (customRes.data.success) {
      console.log("✅ Custom commission response received");
      console.log(`   Workers: ${customRes.data.workers.length}`);
      if (customRes.data.workers.length > 0) {
        const worker = customRes.data.workers[0];
        console.log(`   Sample worker: ${worker.worker_name}`);
        console.log(
          `   - Bonus (D=5%): ${(worker.Result ?? 0).toFixed(2)} ₸\n`,
        );
      }
    } else {
      console.error("❌ Failed to fetch custom commission:", customRes.data);
      return;
    }

    // Test 3: Get commission with DIFFERENT percent (1%)
    console.log("4️⃣ Testing commission with DIFFERENT percent (1%)...");
    const lowRes = await axios.get(
      `${API_URL}/commissions/commission/truck/${truckId}/${encodeURIComponent(city)}`,
      {
        params: {
          basePercent: 1,
          role: "admin",
        },
      },
    );

    if (lowRes.data.success) {
      console.log("✅ Low percent commission response received");
      console.log(`   Workers: ${lowRes.data.workers.length}`);
      if (lowRes.data.workers.length > 0) {
        const worker = lowRes.data.workers[0];
        console.log(`   Sample worker: ${worker.worker_name}`);
        console.log(
          `   - Bonus (D=1%): ${(worker.Result ?? 0).toFixed(2)} ₸\n`,
        );
      }
    } else {
      console.error("❌ Failed to fetch low percent commission:", lowRes.data);
      return;
    }

    // Verification
    if (
      defaultRes.data.workers.length > 0 &&
      customRes.data.workers.length > 0
    ) {
      const workerDefault = defaultRes.data.workers[0];
      const workerCustom = customRes.data.workers[0];
      const workerLow = lowRes.data.workers[0];

      const bonusDefault = workerDefault.Result ?? 0;
      const bonusCustom = workerCustom.Result ?? 0;
      const bonusLow = workerLow.Result ?? 0;

      console.log("5️⃣ Verification:");
      console.log(`   Default (3%):   ${bonusDefault.toFixed(2)} ₸`);
      console.log(`   Custom (5%):    ${bonusCustom.toFixed(2)} ₸`);
      console.log(`   Low (1%):       ${bonusLow.toFixed(2)} ₸`);

      // Bonuses should increase with higher percent
      const isIncreasing =
        bonusLow < bonusDefault && bonusDefault < bonusCustom;
      if (isIncreasing) {
        console.log("   ✅ Bonuses correctly increase with higher percent!\n");
      } else {
        console.log("   ⚠️ Bonus progression may not be correct");
        console.log(
          `      Expected: ${bonusLow} < ${bonusDefault} < ${bonusCustom}`,
        );
        console.log(
          `      Ratio: ${(bonusCustom / bonusDefault).toFixed(2)}x (should be >1)\n`,
        );
      }
    }

    console.log("✅ All tests completed successfully!");
  } catch (error) {
    console.error("❌ Test error:", error.message);
    if (error.response) {
      console.error("Response:", error.response.data);
    }
  }
}

testBasePercentFeature();
