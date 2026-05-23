const axios = require("axios").default;

const API_URL = "http://localhost:5000/api";

async function checkAllTrucks() {
  try {
    console.log("📡 Fetching trucks from API...");
    const trucksResp = await axios.get(`${API_URL}/trucks`);
    const trucks = trucksResp.data?.trucks || [];

    console.log(`✅ Found ${trucks.length} trucks\n`);

    for (const truck of trucks) {
      try {
        console.log(`📍 Checking truck: ${truck.identifier}`);
        const commissionResp = await axios.get(
          `${API_URL}/commissions/commission/truck/${truck.id}/Almaty?role=admin`,
        );

        const data = commissionResp.data;
        console.log(
          `   ✅ Workers: ${data.workers?.length || 0}, A: ${data.A || 0}, V: ${data.V || 0}, E: ${(data.E || 0).toFixed(2)}`,
        );
      } catch (err) {
        console.log(`   ❌ Error: ${err.response?.status} - ${err.message}`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Fatal Error:", error.message);
    process.exit(1);
  }
}

checkAllTrucks();
