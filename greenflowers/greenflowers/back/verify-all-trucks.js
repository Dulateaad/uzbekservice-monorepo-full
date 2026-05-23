const axios = require("axios").default;

const API_URL = "http://localhost:5000/api";

async function checkAllTrucks() {
  try {
    console.log("📡 Fetching trucks from API...\n");
    const trucksResp = await axios.get(`${API_URL}/trucks`);
    const trucks = trucksResp.data?.data || [];

    console.log(`✅ Found ${trucks.length} trucks\n`);

    for (const truck of trucks) {
      try {
        console.log(`\n📍 Truck: ${truck.identifier}`);
        const commissionResp = await axios.get(
          `${API_URL}/commissions/commission/truck/${truck.id}/Almaty?role=admin`,
        );

        const data = commissionResp.data;
        console.log(`   Workers: ${data.workers?.length || 0}`);
        console.log(`   A (all goods): ${data.analytics?.A || 0} ₸`);
        console.log(`   V (delivered): ${data.analytics?.V || 0} ₸`);
        console.log(
          `   E (bonus pool): ${(data.analytics?.E || 0).toFixed(2)} ₸`,
        );

        if ((data.analytics?.V || 0) > 0) {
          console.log(`   ✅ HAS DATA`);
        } else {
          console.log(`   ⚠️  NO DELIVERED ORDERS`);
        }
      } catch (err) {
        console.log(`   ❌ Error: ${err.message}`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Fatal Error:", error.message);
    process.exit(1);
  }
}

checkAllTrucks();
