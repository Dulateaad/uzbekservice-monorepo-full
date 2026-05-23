const axios = require("axios").default;

const API_URL = "http://localhost:5000/api";

async function checkSpecificTruck() {
  try {
    // Get all trucks first
    const trucksResp = await axios.get(`${API_URL}/trucks`);
    const trucks = trucksResp.data?.data || [];

    console.log("Available trucks:");
    trucks.forEach((t) => console.log(`- ${t.identifier} (ID: ${t.id})`));
    console.log("\n");

    // Check each truck's commission data
    for (const truck of trucks) {
      console.log(`🔍 Checking truck: ${truck.identifier}`);
      try {
        const commissionResp = await axios.get(
          `${API_URL}/commissions/commission/truck/${truck.id}/Almaty?role=admin`,
        );

        const data = commissionResp.data;
        console.log(`   Workers: ${data.workers?.length || 0}`);
        console.log(
          `   A: ${data.analytics?.A || 0}, V: ${data.analytics?.V || 0}`,
        );

        // Show first few workers
        if (data.workers && data.workers.length > 0) {
          console.log("   Sample workers:");
          data.workers.slice(0, 3).forEach((w) => {
            console.log(
              `     - ${w.worker_name}: G=${w.G}, D=${w.D}, L=${w.L}, Result=${w.Result}`,
            );
          });
        }
        console.log("");
      } catch (err) {
        console.log(`   ❌ Error: ${err.message}`);
        console.log("");
      }
    }
  } catch (error) {
    console.error("❌ Fatal Error:", error.message);
  }
}

checkSpecificTruck();
