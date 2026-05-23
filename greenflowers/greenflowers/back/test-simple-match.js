const http = require("http");

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error("Timeout"));
    });
  });
}

async function testSalesMatch() {
  try {
    console.log("🔍 Проверяем соответствие сумм продаж...\n");

    // Получаем комбинации
    const combinationsUrl =
      "http://localhost:5000/api/commissions/commission/all?role=admin";
    const combinationsResp = await makeRequest(combinationsUrl);

    if (!combinationsResp.success) {
      console.error("❌ Ошибка получения комбинаций");
      return;
    }

    const combinations = combinationsResp.combinations;
    console.log(`📊 Найдено ${combinations.length} комбинаций\n`);

    for (const combo of combinations.slice(0, 2)) {
      // Проверяем первые 2
      const { truck_id, city } = combo;

      console.log(`🏍️  Проверяем ${truck_id}/${city}...`);

      // Комиссии
      const commissionUrl = `http://localhost:5000/api/commissions/commission/truck/${truck_id}/${encodeURIComponent(city)}?role=admin`;
      const commissionResp = await makeRequest(commissionUrl);

      if (!commissionResp.success) {
        console.log(`   ⚠️  Нет комиссий`);
        continue;
      }

      // Продажи
      const salesUrl = `http://localhost:5000/api/commissions/truck/${truck_id}/delivered-sales/${encodeURIComponent(city)}`;
      const salesResp = await makeRequest(salesUrl);

      if (!salesResp.success) {
        console.log(`   ⚠️  Нет продаж`);
        continue;
      }

      const deliveredTotal = salesResp.totalSales || 0;
      const workersTotalG = commissionResp.workers.reduce(
        (sum, w) => sum + (w.G || 0),
        0,
      );

      console.log(`   💰 Продано: ${deliveredTotal} ₸`);
      console.log(`   👥 Сумма G: ${workersTotalG} ₸`);

      const diff = Math.abs(deliveredTotal - workersTotalG);
      console.log(`   ${diff < 0.01 ? "✅" : "❌"} Разница: ${diff} ₸\n`);
    }
  } catch (error) {
    console.error("❌ Ошибка:", error.message);
  }
}

testSalesMatch();
