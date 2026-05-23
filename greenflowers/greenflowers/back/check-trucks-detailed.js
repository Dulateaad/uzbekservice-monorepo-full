const http = require("http");

const trucks = [
  { id: "6decfe72-b3c7-4535-84c4-d82909245e57", name: "ыыы" },
  { id: "1d1946ca-05bd-46d0-831c-224241c78feb", name: "ффф" },
  { id: "266566cf-a918-496e-8ba8-3f536f31e754", name: "122" },
  { id: "18c0226f-e1fa-4a8d-b88f-d56c5a1cc0cc", name: "кккк" },
];

console.log("Checking all trucks...\n");

trucks.forEach((truck) => {
  const url = `http://localhost:5000/api/commissions/commission/truck/${truck.id}/ALL?role=admin`;

  http
    .get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          const analytics = json.analytics || {};
          console.log(`${truck.name}:`);
          console.log(`  Workers: ${json.workers.length}`);
          console.log(`  A (all goods): ${analytics.A}`);
          console.log(`  V (delivered sales): ${analytics.V}`);
          console.log(`  E (bonus pool): ${analytics.E}`);
          if (json.workers.length > 0) {
            console.log("  Worker details:");
            json.workers.forEach((w) => {
              console.log(
                `    - ${w.worker_name}: G=${w.G}, Bonus=${w.Result ?? 0}`,
              );
            });
          }
        } catch (e) {
          console.log(`${truck.name}: ERROR parsing`);
        }
        console.log();
      });
    })
    .on("error", (e) => {
      console.log(`${truck.name}: ${e.message}\n`);
    });
});
