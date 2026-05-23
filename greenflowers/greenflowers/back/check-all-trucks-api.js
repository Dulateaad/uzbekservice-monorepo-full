const http = require("http");

const trucks = [
  { id: "6decfe72-b3c7-4535-84c4-d82909245e57", name: "ыыы" },
  { id: "1d1946ca-05bd-46d0-831c-224241c78feb", name: "ффф" },
  { id: "266566cf-a918-496e-8ba8-3f536f31e754", name: "122" },
  { id: "18c0226f-e1fa-4a8d-b88f-d56c5a1cc0cc", name: "кккк" },
];

let completed = 0;

trucks.forEach((truck) => {
  const url = `http://localhost:5000/api/commissions/commission/truck/${truck.id}/ALL?role=admin`;

  http
    .get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          console.log(
            `${truck.name}: Workers=${json.workers.length}, V=${json.analytics?.V}`,
          );
        } catch (e) {
          console.log(`${truck.name}: ERROR parsing`);
        }
        completed++;
      });
    })
    .on("error", (e) => {
      console.log(`${truck.name}: ${e.message}`);
      completed++;
    });
});

setTimeout(() => {
  if (completed < trucks.length) {
    console.log("\nSome requests timeout");
  }
}, 5000);
