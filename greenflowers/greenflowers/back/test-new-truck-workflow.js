const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "greenflowers_db",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "Sula2206",
});

async function testNewTruck() {
  try {
    console.log("🧪 Тестирование новой фуры...\n");

    // 1. Создаем новую фуру
    console.log("1️⃣ Создание новой фуры...");
    const truckResult = await pool.query(
      `INSERT INTO trucks (identifier, arrival_date, status, notes, metrics, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, identifier`,
      [
        "TEST_NEW_" + Date.now(),
        "2026-03-10T10:00:00.000Z",
        "pending",
        "Тестовая фура",
        JSON.stringify([]),
      ],
    );
    const truckId = truckResult.rows[0].id;
    console.log(
      `✅ Создана фура: ${truckResult.rows[0].identifier} (ID: ${truckId})\n`,
    );

    // 2. Добавляем inventory
    console.log("2️⃣ Добавление inventory...");
    const products = [
      { product_id: 41, name: "Розы Розовые", quantity: 100, price: 100 },
      { product_id: 40, name: "Гипсофилы", quantity: 50, price: 50 },
    ];

    for (const product of products) {
      await pool.query(
        `INSERT INTO inventory_items (truck_id, product_id, name, price, quantity)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          truckId,
          product.product_id,
          product.name,
          product.price,
          product.quantity,
        ],
      );
      console.log(
        `   ✅ Добавлен продукт ${product.name}: ${product.quantity} шт`,
      );
    }
    console.log("");

    // 3. Создаем заказ для новой фуры
    console.log("3️⃣ Создание заказа...");
    const orderResult = await pool.query(
      `INSERT INTO orders
       (user_id, customer_name, customer_phone, total_amount,
        delivery_city, delivery_address, status, seller_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        1, // admin user
        "Тестовый клиент",
        "777-123-4567",
        5000,
        "Almaty",
        "Тестовый адрес",
        "confirmed",
        2, // worker user
      ],
    );
    const orderId = orderResult.rows[0].id;
    console.log(`✅ Создан заказ ID: ${orderId}\n`);

    // 4. Добавляем order_items
    console.log("4️⃣ Добавление позиций заказа...");
    await pool.query(
      `INSERT INTO order_items (order_id, product_id, quantity, unit_price, truck_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [orderId, 41, 10, 500, truckId],
    );
    console.log("✅ Добавлена позиция заказа\n");

    // 5. Проверяем, создалась ли shift_sales автоматически
    console.log("5️⃣ Проверка shift_sales...");
    const shiftSalesCheck = await pool.query(
      `SELECT ss.id, ss.sale_amount, s.user_id, u.name as worker_name
       FROM shift_sales ss
       LEFT JOIN shifts s ON ss.shift_id = s.id
       LEFT JOIN users u ON s.user_id = u.id
       WHERE ss.order_id = $1`,
      [orderId],
    );

    if (shiftSalesCheck.rows.length > 0) {
      console.log("✅ shift_sales создана автоматически:");
      console.table(shiftSalesCheck.rows);
    } else {
      console.log("❌ shift_sales НЕ создана автоматически");

      // Создаем shift_sales вручную
      console.log("🔧 Создание shift_sales вручную...");

      // Проверяем, есть ли открытая смена у worker
      const shiftCheck = await pool.query(
        `SELECT id FROM shifts WHERE user_id = $1 AND status = 'open'`,
        [2], // worker user
      );

      let shiftId;
      if (shiftCheck.rows.length === 0) {
        // Создаем смену
        const newShift = await pool.query(
          `INSERT INTO shifts (user_id, shift_date, started_at, status)
           VALUES ($1, CURRENT_DATE, CURRENT_TIMESTAMP, 'open')
           RETURNING id`,
          [2],
        );
        shiftId = newShift.rows[0].id;
        console.log(`   ✅ Создана смена ID: ${shiftId}`);
      } else {
        shiftId = shiftCheck.rows[0].id;
        console.log(`   ✅ Найдена открытая смена ID: ${shiftId}`);
      }

      // Создаем shift_sales
      await pool.query(
        `INSERT INTO shift_sales (shift_id, order_id, sale_amount)
         VALUES ($1, $2, $3)`,
        [shiftId, orderId, 5000],
      );
      console.log("   ✅ shift_sales создана");
    }
    console.log("");

    // 6. Изменяем статус заказа на delivered
    console.log("6️⃣ Изменение статуса заказа на 'delivered'...");
    await pool.query(`UPDATE orders SET status = 'delivered' WHERE id = $1`, [
      orderId,
    ]);
    console.log("✅ Статус изменен на 'delivered'\n");

    // 7. Проверяем работу commission API
    console.log("7️⃣ Тестирование commission API...");

    // Имитируем вызов API
    const axios = require("axios").default;
    const API_URL = "http://localhost:5000/api";

    try {
      const commissionResp = await axios.get(
        `${API_URL}/commissions/commission/truck/${truckId}/Almaty?role=admin`,
      );

      const data = commissionResp.data;
      console.log("✅ Commission API работает:");
      console.log(`   A (товары): ${data.analytics?.A || 0} ₸`);
      console.log(`   V (продажи): ${data.analytics?.V || 0} ₸`);
      console.log(`   E (бонусный пул): ${data.analytics?.E || 0} ₸`);
      console.log(`   Работников: ${data.workers?.length || 0}`);

      if (data.workers && data.workers.length > 0) {
        console.log("   Детали работников:");
        data.workers.forEach((w) => {
          console.log(
            `     - ${w.worker_name}: G=${w.G}₸, D=${w.D}, L=${w.L}%, Бонус=${w.Result}₸`,
          );
        });
      }
    } catch (err) {
      console.log(`❌ Ошибка API: ${err.message}`);
    }

    console.log("\n🎉 Тест завершен!");
  } catch (error) {
    console.error("❌ Ошибка:", error.message);
    await pool.end();
  }
}

testNewTruck();
