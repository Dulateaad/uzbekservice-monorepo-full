require("dotenv").config();
const { Pool } = require("pg");
const axios = require("axios");

const API_URL = "http://localhost:5000/api";
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function cleanTestStatus() {
  try {
    console.log(
      "🧪 ЧИСТЫЙ ТЕСТ: функция обновления статуса при pending → delivered\n",
    );

    // 1. Создаем новый заказ с assigned_to = 1 и status = pending
    console.log(
      "1️⃣  Создаем новый заказ: assigned_to=1, status='pending'...\n",
    );

    const createResult = await pool.query(
      `INSERT INTO orders (
        truck_id, user_id, customer_name, customer_phone, 
        delivery_city, delivery_address, total_amount, 
        payment_status, status, assigned_to
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        "6decfe72-b3c7-4535-84c4-d82909245e57",
        27, // Creator user
        "Test Customer",
        "+7-123-456-7890",
        "Алматы",
        "Test Address",
        999.99,
        "paid",
        "pending",
        1, // assigned_to Worker 1
      ],
    );

    const testOrderId = createResult.rows[0].id;
    console.log(`   ✅ Создан заказ ID: ${testOrderId}`);
    console.log(
      `   - assigned_to: ${createResult.rows[0].assigned_to} (ожидается: 1)`,
    );
    console.log(
      `   - status: ${createResult.rows[0].status} (ожидается: pending)\n`,
    );

    // 2. Администратор (userId=17) меняет статус на delivered
    console.log(
      "2️⃣  Администратор (ID 17) меняет статус: pending → delivered...\n",
    );

    try {
      const response = await axios.put(
        `${API_URL}/orders/${testOrderId}/status`,
        {
          userId: 17, // Admin ID
          status: "delivered",
        },
      );

      console.log(`   ✅ PUT запрос выполнен успешно`);
      console.log(
        `   API результат - assigned_to: ${response.data?.order?.assigned_to}`,
      );
    } catch (err) {
      console.log(
        `   ⚠️  Ошибка при PUT запросе: ${err.response?.data?.error || err.message}`,
      );
    }

    console.log(""); // Empty line

    // 3. Проверяем данные в БД
    console.log("3️⃣  Проверяем данные в БД после изменения статуса...\n");

    const dbResult = await pool.query(
      "SELECT id, assigned_to, seller_id, status FROM orders WHERE id = $1",
      [testOrderId],
    );

    const dbOrder = dbResult.rows[0];
    console.log(`   ID: ${dbOrder.id}`);
    console.log(`   assigned_to: ${dbOrder.assigned_to} (ожидается: 1)`);
    console.log(
      `   seller_id: ${dbOrder.seller_id} (должен быть assigned_to=1)`,
    );
    console.log(`   status: ${dbOrder.status} (ожидается: delivered)`);

    const result = {
      assigned_to_correct: dbOrder.assigned_to === 1,
      seller_id_correct: dbOrder.seller_id === 1,
      status_correct: dbOrder.status === "delivered",
    };

    console.log("\n📊 РЕЗУЛЬТАТЫ:");
    console.log(
      `   assigned_to == 1: ${result.assigned_to_correct ? "✅" : "❌"}`,
    );
    console.log(`   seller_id == 1: ${result.seller_id_correct ? "✅" : "❌"}`);
    console.log(
      `   status == delivered: ${result.status_correct ? "✅" : "❌"}`,
    );

    if (
      !result.assigned_to_correct ||
      !result.seller_id_correct ||
      !result.status_correct
    ) {
      console.log("\n⚠️  ОШИБКА: Не все условия выполнены!");
    } else {
      console.log("\n✅ ТЕСТ ПРОЙДЕН: Все условия выполнены!");
    }

    // Cleanup
    await pool.query("DELETE FROM shift_sales WHERE order_id = $1", [
      testOrderId,
    ]);
    await pool.query("DELETE FROM orders WHERE id = $1", [testOrderId]);

    await pool.end();
  } catch (error) {
    console.error("❌ Ошибка:", error.message);
    if (error.response?.data) {
      console.error("Response:", error.response.data);
    }
    await pool.end();
  }
}

cleanTestStatus();
