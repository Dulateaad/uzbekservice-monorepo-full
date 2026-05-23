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

async function testNewFlow() {
  try {
    console.log("\n🚀 Тестируем новый поток:\n");
    console.log(
      "1️⃣  Берем первый нечитанный заказ и меняем статус на 'delivered'\n",
    );

    // Получаем доставленный заказ
    const orderRes = await pool.query(
      "SELECT id, total_amount FROM orders WHERE status = 'delivered' ORDER BY id DESC LIMIT 1",
    );
    if (orderRes.rows.length === 0) {
      console.log("❌ Нет заказов со статусом delivered");
      return;
    }

    const orderId = orderRes.rows[0].id;
    const orderAmount = orderRes.rows[0].total_amount;
    console.log(`📦 Заказ ID: ${orderId}, Сумма: ${orderAmount} ₸`);

    // Сначала сбрасываем его статус обратно на pending
    console.log("\n2️⃣  Сбрасываем статус на 'pending'...");
    await axios.put(`${API_URL}/orders/${orderId}/status`, {
      userId: 1,
      status: "pending",
    });
    console.log("✅ Статус изменен на 'pending'");

    // Проверяем, что shift_sales удален
    let salesCheck = await pool.query(
      "SELECT * FROM shift_sales WHERE order_id = $1",
      [orderId],
    );
    console.log(`   shift_sales после сброса: ${salesCheck.rows.length} шт`);

    // Теперь меняем статус на 'delivered' от пользователя ID 2
    console.log("\n3️⃣  Меняем статус на 'delivered' от пользователя ID 2...");
    await axios.put(`${API_URL}/orders/${orderId}/status`, {
      userId: 2,
      status: "delivered",
    });
    console.log("✅ Статус изменен на 'delivered'");

    // Проверяем, что shift_sales создан
    salesCheck = await pool.query(
      "SELECT ss.*, s.user_id FROM shift_sales ss JOIN shifts s ON ss.shift_id = s.id WHERE ss.order_id = $1",
      [orderId],
    );
    console.log(`   shift_sales создано: ${salesCheck.rows.length} шт`);
    if (salesCheck.rows.length > 0) {
      const sale = salesCheck.rows[0];
      console.log(
        `   - Продавец (user_id): ${sale.user_id}, Сумма: ${sale.sale_amount} ₸`,
      );
    }

    // Проверяем seller_id в заказе
    const orderCheck = await pool.query(
      "SELECT seller_id FROM orders WHERE id = $1",
      [orderId],
    );
    console.log(`   seller_id в заказе: ${orderCheck.rows[0].seller_id}`);

    // Проверяем G метрику
    console.log(
      "\n4️⃣  Проверяем G метрику для пользователя 2 (Алматы, все грузовики)...",
    );
    try {
      const commissionRes = await axios.get(
        `${API_URL}/commissions/commission/truck/6decfe72-b3c7-4535-84c4-d82909245e57/Алматы?role=admin`,
      );

      if (commissionRes.data.success && commissionRes.data.workers) {
        const worker2 = commissionRes.data.workers.find(
          (w) => w.worker_id === 2,
        );
        if (worker2) {
          console.log(`   💰 User 2, G = ${worker2.G || 0} ₸`);
        } else {
          console.log(`   ⚠️  User 2 не найден в комиссиях`);
        }
      }
    } catch (e) {
      console.log(`   ⚠️  Ошибка получения комиссии: ${e.message}`);
    }

    console.log("\n✅ ТЕСТ ЗАВЕРШЕН");
  } catch (error) {
    console.error("❌ Ошибка:", error.message);
    if (error.response?.data) {
      console.error("Response:", error.response.data);
    }
  } finally {
    await pool.end();
  }
}

testNewFlow();
