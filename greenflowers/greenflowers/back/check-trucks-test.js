const axios = require("axios");

const API_URL = "http://localhost:5000/api";

async function checkAllTrucks() {
  try {
    const response = await axios.get(`${API_URL}/trucks`);
    const trucks = response.data.trucks || [];

    console.log(`Checking ${trucks.length} trucks...\n`);

    for (const truck of trucks) {
      try {
        const commission = await axios.get(
          `${API_URL}/commissions/commission/truck/${truck.id}/Almaty?role=admin`,
        );

        const data = commission.data;
        console.log(`\n${truck.identifier}:`);
        console.log(`  Workers: ${data.workers.length}`);
        console.log(`  A (all goods): ${data.A}`);
        console.log(`  V (delivered): ${data.V}`);
        console.log(`  E (bonus pool): ${data.E}`);

        if (data.workers.length > 0) {
          console.log(
            `  First worker: ${data.workers[0].full_name} - Sales: ${data.workers[0].G}`,
          );
        }
      } catch (err) {
        console.error(`  Error fetching commission: ${err.message}`);
      }
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

checkAllTrucks();
