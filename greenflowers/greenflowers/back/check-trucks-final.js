const http = require("http");

const API_URL = "http://localhost:5000/api";

function fetchData(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

async function checkAllTrucks() {
  try {
    const trucks = await fetchData(`${API_URL}/trucks`);
    const truckList = trucks.trucks || [];

    console.log(`\n✅ Checking ${truckList.length} trucks...\n`);

    for (const truck of truckList) {
      try {
        const commission = await fetchData(
          `${API_URL}/commissions/commission/truck/${truck.id}/Almaty?role=admin`,
        );

        console.log(`\n📦 ${truck.identifier}:`);
        console.log(`   Workers: ${commission.workers.length}`);
        console.log(`   A (all goods ₸): ${commission.A}`);
        console.log(`   V (delivered ₸): ${commission.V}`);
        console.log(`   E (bonus pool ₸): ${commission.E?.toFixed(2) || 0}`);

        if (commission.workers.length > 0) {
          const firstWorker = commission.workers[0];
          console.log(
            `   Sample worker: ${firstWorker.full_name} - Sales: ${firstWorker.G} ₸`,
          );
        }
      } catch (err) {
        console.error(`   ❌ Error: ${err.message}`);
      }
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }

  process.exit(0);
}

checkAllTrucks();
