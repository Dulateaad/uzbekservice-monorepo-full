const axios = require("axios");

const API_URL = "http://localhost:3001/api";

async function testDeliveredSalesMatch() {
  try {
    console.log("🔍 Проверяем соответствие сумм продаж...\n");

    // Получаем все комбинации грузовиков и городов
    const combinationsResp = await axios.get(
      `${API_URL}/commissions/commission/all`,
      {
        params: { role: "admin" },
      },
    );

    if (!combinationsResp.data.success) {
      console.error("❌ Ошибка получения комбинаций:", combinationsResp.data);
      return;
    }

    const combinations = combinationsResp.data.combinations;
    console.log(
      `📊 Найдено ${combinations.length} комбинаций грузовик+город\n`,
    );

    for (const combo of combinations) {
      const { truck_id, city } = combo;

      console.log(`🏍️  Проверяем грузовик ${truck_id}, город ${city}...`);

      // Получаем данные комиссий
      const commissionResp = await axios.get(
        `${API_URL}/shifts/commission/truck/${truck_id}/${encodeURIComponent(city)}`,
        {
          params: { role: "admin" },
        },
      );

      if (!commissionResp.data.success) {
        console.log(`   ⚠️  Нет данных комиссий для ${truck_id}/${city}`);
        continue;
      }

      const commissionData = commissionResp.data;

      // Получаем сумму проданных товаров
      const deliveredResp = await axios.get(
        `${API_URL}/commissions/truck/${truck_id}/delivered-sales/${encodeURIComponent(city)}`,
      );

      if (!deliveredResp.data.success) {
        console.log(`   ⚠️  Нет данных о продажах для ${truck_id}/${city}`);
        continue;
      }

      const deliveredTotal = deliveredResp.data.totalSales || 0;

      // Суммируем G по всем работникам
      const workersTotalG = commissionData.workers.reduce(
        (sum, worker) => sum + (worker.G || 0),
        0,
      );

      console.log(`   💰 Продано доставленных заказов: ${deliveredTotal} ₸`);
      console.log(`   👥 Сумма G по работникам: ${workersTotalG} ₸`);

      const difference = Math.abs(deliveredTotal - workersTotalG);
      if (difference < 0.01) {
        // Учитываем погрешность округления
        console.log(`   ✅ Суммы совпадают!\n`);
      } else {
        console.log(`   ❌ Разница: ${difference} ₸`);
        console.log(`   📋 Детали:`);
        commissionData.workers.forEach((worker) => {
          console.log(`      ${worker.worker_name}: G = ${worker.G} ₸`);
        });
        console.log("");
      }
    }
  } catch (error) {
    console.error("❌ Ошибка тестирования:", error.message);
  }
}

testDeliveredSalesMatch();
