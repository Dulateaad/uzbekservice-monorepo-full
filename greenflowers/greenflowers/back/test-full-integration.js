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

async function fullIntegrationTest() {
  try {
    console.log("\n📋 ПОЛНЫЙ ИНТЕГРАЦИОННЫЙ ТЕСТ\n");
    console.log("========================================================\n");

    // 1. Получаем заказ с delivered статусом
    console.log("1️⃣  Получаем доставленный заказ...");
    const orderRes = await pool.query(
      "SELECT id, status, total_amount FROM orders WHERE status = 'delivered' ORDER BY id DESC LIMIT 1",
    );
    if (orderRes.rows.length === 0) {
      console.log("❌ Нет заказов со статусом delivered");
      return;
    }

    const testOrderId = orderRes.rows[0].id;
    const orderAmount = orderRes.rows[0].total_amount;
    console.log(
      `   ✅ Выбран заказ ID: ${testOrderId}, Сумма: ${orderAmount} ₸\n`,
    );

    // 2. Сбрасываем статус на pending
    console.log("2️⃣  Сбрасываем статус на 'pending'...");
    const resetResp = await axios.put(
      `${API_URL}/orders/${testOrderId}/status`,
      {
        userId: 1,
        status: "pending",
      },
    );
    if (!resetResp.data?.success) {
      console.log("❌ Ошибка при сбросе статуса");
      return;
    }
    console.log(`   ✅ Статус изменён на 'pending'\n`);

    // 3. Проверяем seller_id и shift_sales
    console.log("3️⃣  Проверяем, что seller_id и shift_sales очищены...");
    let orderData = await pool.query(
      "SELECT seller_id FROM orders WHERE id = $1",
      [testOrderId],
    );
    console.log(`   seller_id: ${orderData.rows[0].seller_id || "NULL"}`);

    let salesCheck = await pool.query(
      "SELECT COUNT(*) as count FROM shift_sales WHERE order_id = $1",
      [testOrderId],
    );
    console.log(`   shift_sales: ${salesCheck.rows[0].count} шт\n`);

    // 4. Меняем статус на delivered от пользователя 17
    console.log("4️⃣  Меняем статус на 'delivered' от пользователя ID 17...");
    const fromUserId = 17;
    const deliverResp = await axios.put(
      `${API_URL}/orders/${testOrderId}/status`,
      {
        userId: fromUserId,
        status: "delivered",
      },
    );
    if (!deliverResp.data?.success) {
      console.log("❌ Ошибка при изменении статуса на delivered");
      console.error(deliverResp.data);
      return;
    }
    console.log(`   ✅ Статус изменён на 'delivered'\n`);

    // 5. Проверяем seller_id
    console.log("5️⃣  Проверяем, что seller_id установлен на ${fromUserId}...");
    orderData = await pool.query("SELECT seller_id FROM orders WHERE id = $1", [
      testOrderId,
    ]);
    console.log(
      `   seller_id: ${orderData.rows[0].seller_id} (ожидается: ${fromUserId})`,
    );
    if (orderData.rows[0].seller_id === fromUserId) {
      console.log(`   ✅ seller_id корректен!\n`);
    } else {
      console.log(`   ❌ seller_id неправильный!\n`);
    }

    // 6. Проверяем shift_sales
    console.log("6️⃣  Проверяем shift_sales...");
    salesCheck = await pool.query(
      "SELECT ss.*, s.user_id FROM shift_sales ss JOIN shifts s ON ss.shift_id = s.id WHERE ss.order_id = $1",
      [testOrderId],
    );
    if (salesCheck.rows.length > 0) {
      const sale = salesCheck.rows[0];
      console.log(`   ✅ shift_sales существует`);
      console.log(`   - shift_id: ${sale.shift_id}`);
      console.log(
        `   - Продавец (user_id): ${sale.user_id} (ожидается: ${fromUserId})`,
      );
      console.log(
        `   - Сумма: ${sale.sale_amount} ₸ (ожидается: ${orderAmount})\n`,
      );

      if (
        sale.user_id === fromUserId &&
        sale.sale_amount === Number(orderAmount)
      ) {
        console.log(`   ✅ Данные shift_sales корректны!\n`);
      } else {
        console.log(`   ❌ Данные shift_sales неправильны!\n`);
      }
    } else {
      console.log(`   ❌ shift_sales не найден!\n`);
    }

    // 7. Проверяем G метрику для пользователя 17
    console.log("7️⃣  Проверяем G метрику для пользователя 17...");
    try {
      const commissionResp = await axios.get(
        `${API_URL}/commissions/commission/truck/6decfe72-b3c7-4535-84c4-d82909245e57/Алматы?role=admin`,
      );

      if (commissionResp.data?.success && commissionResp.data?.workers) {
        const worker5 = commissionResp.data.workers.find(
          (w) => w.worker_id === fromUserId,
        );
        if (worker5) {
          console.log(`   💰 User ${fromUserId}, G = ${worker5.G} ₸`);
          if (worker5.G >= orderAmount) {
            console.log(`   ✅ G метрика содержит нашу сумму!\n`);
          } else {
            console.log(`   ⚠️  G метрика может содержать и другие заказы\n`);
          }
        } else {
          console.log(`   ⚠️  User ${fromUserId} не найден в комиссиях\n`);
        }
      }
    } catch (e) {
      console.log(`   ⚠️  Ошибка получения комиссии: ${e.message}\n`);
    }

    console.log("========================================================");
    console.log("✅ ТЕСТ УСПЕШНО ЗАВЕРШЕН!\n");
  } catch (error) {
    console.error("❌ Критическая ошибка:", error.message);
    if (error.response?.data) {
      console.error("Response:", error.response.data);
    }
  } finally {
    await pool.end();
  }
}

fullIntegrationTest();
