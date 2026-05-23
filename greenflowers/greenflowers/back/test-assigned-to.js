const axios = require("axios");
const { Pool } = require("pg");
require("dotenv").config();

const API_URL = "http://localhost:5000/api";
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function testAssignedToLogic() {
  try {
    console.log("\n📋 ТЕСТ: Проверяем, что сумма засчитывается assigned_to\n");
    console.log("==================================================\n");

    // 1. Берем заказ назначенный пользователю 1
    const orderRes = await pool.query(
      "SELECT id, assigned_to, total_amount FROM orders WHERE assigned_to = 1 AND status = 'delivered' LIMIT 1",
    );
    if (orderRes.rows.length === 0) {
      console.log("❌ Нет заказов назначенных пользователю 1");
      return;
    }

    const testOrderId = orderRes.rows[0].id;
    const assignedTo = orderRes.rows[0].assigned_to;
    const orderAmount = orderRes.rows[0].total_amount;

    console.log(
      `1️⃣  Заказ ID ${testOrderId}: assigned_to=${assignedTo}, Amount=${orderAmount} ₸\n`,
    );

    // 2. Сбрасываем статус на pending
    console.log("2️⃣  Сбрасываем статус на 'pending'...");
    await axios.put(`${API_URL}/orders/${testOrderId}/status`, {
      userId: 1,
      status: "pending",
    });
    console.log("   ✅ Статус = pending\n");

    // 3. Администратор (ID 17) меняет статус на delivered
    console.log("3️⃣  Администратор (ID 17) меняет статус на 'delivered'...\n");
    const ADMIN_ID = 17;
    const response = await axios.put(
      `${API_URL}/orders/${testOrderId}/status`,
      {
        userId: ADMIN_ID,
        status: "delivered",
      },
    );

    if (!response.data?.success) {
      console.log("❌ Ошибка при изменении статуса:", response.data?.error);
      return;
    }

    console.log("   ✅ Статус изменён на 'delivered'\n");
    // Проверяем assigned_to в ответе от API
    if (response.data?.order?.assigned_to) {
      console.log(
        `📝 API response: assigned_to=${response.data.order.assigned_to}\n`,
      );
    }
    // 4. Проверяем seller_id
    console.log(
      "4️⃣  Проверяем seller_id (должен быть assigned_to=1, а не Admin ID 17)...",
    );
    const orderData = await pool.query(
      "SELECT seller_id FROM orders WHERE id = $1",
      [testOrderId],
    );
    const seller = orderData.rows[0].seller_id;
    console.log(`   seller_id: ${seller}`);

    if (seller === assignedTo) {
      console.log(
        `   ✅ ПРАВИЛЬНО! seller_id=${seller} (назначен пользователю ${assignedTo})\n`,
      );
    } else {
      console.log(
        `   ❌ НЕПРАВИЛЬНО! seller_id=${seller}, а должен быть ${assignedTo}\n`,
      );
    }

    // 5. Проверяем shift_sales
    console.log("5️⃣  Проверяем shift_sales...");
    const salesCheck = await pool.query(
      "SELECT ss.*, s.user_id FROM shift_sales ss JOIN shifts s ON ss.shift_id = s.id WHERE ss.order_id = $1",
      [testOrderId],
    );

    if (salesCheck.rows.length > 0) {
      const sale = salesCheck.rows[0];
      console.log(`   ✅ shift_sales найден`);
      console.log(
        `   - Присвоен пользователю: ${sale.user_id} (ожидается: ${assignedTo})`,
      );
      console.log(`   - Сумма: ${sale.sale_amount} ₸\n`);

      if (sale.user_id === assignedTo) {
        console.log(
          `   ✅ ПРАВИЛЬНО! Сумма засчитана пользователю ${assignedTo}\n`,
        );
      } else {
        console.log(
          `   ❌ НЕПРАВИЛЬНО! Сумма засчитана пользователю ${sale.user_id}, а должна быть ${assignedTo}\n`,
        );
      }
    } else {
      console.log(`   ❌ shift_sales не найден!\n`);
    }

    // 6. Проверяем G метрику для assigned_to пользователя (User 1)
    console.log(
      `6️⃣  Проверяем G метрику для User ${assignedTo} (тот, кому назначен заказ)...`,
    );
    // Предполагаем грузовик 6decfe72-b3c7-4535-84c4-d82909245e57, Алматы
    try {
      const commissionResp = await axios.get(
        `${API_URL}/commissions/commission/truck/6decfe72-b3c7-4535-84c4-d82909245e57/Алматы?role=admin`,
      );

      if (commissionResp.data?.success && commissionResp.data?.workers) {
        const worker = commissionResp.data.workers.find(
          (w) => w.worker_id === assignedTo,
        );
        if (worker) {
          console.log(`   💰 User ${assignedTo}, G = ${worker.G} ₸`);
          if (worker.G >= orderAmount) {
            console.log(
              `   ✅ G содержит нашу сумму для правильного пользователя!\n`,
            );
          }
        }
      }
    } catch (e) {
      console.log(`   ⚠️  ${e.message}\n`);
    }

    console.log("==================================================");
    console.log("✅ ТЕСТ ЗАВЕРШЕН\n");
  } catch (error) {
    console.error("❌ Ошибка:", error.message);
    if (error.response?.data) {
      console.error("Response:", error.response.data);
    }
  } finally {
    await pool.end();
  }
}

testAssignedToLogic();
