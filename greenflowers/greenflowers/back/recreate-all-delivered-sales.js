const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function recreateAllDeliveredSales() {
  try {
    console.log("\n🔧 Пересоздаем shift_sales для всех delivered заказов...\n");

    // Получаем все delivered заказы
    const orders = await pool.query(
      "SELECT id, total_amount, assigned_to FROM orders WHERE status = 'delivered' ORDER BY id",
    );

    console.log(`📦 Найдено ${orders.rows.length} delivered заказов\n`);

    for (const order of orders.rows) {
      const { id: orderId, total_amount, assigned_to } = order;

      // Используем assigned_to как seller_id
      const sellerId = assigned_to;

      if (!sellerId) {
        console.log(`⚠️  Заказ ${orderId}: нет assigned_to, пропускаем`);
        continue;
      }

      console.log(
        `📦 Заказ ${orderId}: Amount=${total_amount}, Seller=${sellerId}`,
      );

      // Обновляем seller_id в заказе
      await pool.query("UPDATE orders SET seller_id = $1 WHERE id = $2", [
        sellerId,
        orderId,
      ]);

      // Проверяем, есть ли открытая смена для продавца
      let shiftResult = await pool.query(
        "SELECT id FROM shifts WHERE user_id = $1 AND status = 'open'",
        [sellerId],
      );

      let shiftId;
      if (shiftResult.rows.length === 0) {
        // Создаем новую смену
        const shiftInsert = await pool.query(
          `INSERT INTO shifts (user_id, shift_date, started_at, status, opening_cash, total_sales)
           VALUES ($1, $2, $3, 'open', 0, 0) RETURNING id`,
          [sellerId, new Date().toISOString().split("T")[0], new Date()],
        );
        shiftId = shiftInsert.rows[0].id;
        console.log(`   - Создана новая смена ${shiftId}`);
      } else {
        shiftId = shiftResult.rows[0].id;
        console.log(`   - Используется смена ${shiftId}`);
      }

      // Проверяем, есть ли уже shift_sales для этого заказа
      const existingSale = await pool.query(
        "SELECT id FROM shift_sales WHERE order_id = $1",
        [orderId],
      );

      if (existingSale.rows.length === 0) {
        // Создаем shift_sales
        await pool.query(
          `INSERT INTO shift_sales (shift_id, order_id, sale_amount, discount_amount, sale_time)
           VALUES ($1, $2, $3, 0, $4)`,
          [shiftId, orderId, total_amount, new Date()],
        );
        console.log(`   - Создан shift_sales: ${total_amount} ₸`);
      } else {
        console.log(`   ⚠️  shift_sales уже существует для этого заказа`);
      }
    }

    // Проверяем итоговые суммы
    console.log("\n📊 Проверка итоговых сумм:");
    const shiftSalesTotal = await pool.query(
      "SELECT SUM(sale_amount) as total FROM shift_sales",
    );
    const deliveredTotal = await pool.query(
      "SELECT SUM(total_amount) as total FROM orders WHERE status = 'delivered'",
    );

    console.log(
      `   shift_sales total: ${shiftSalesTotal.rows[0].total || 0} ₸`,
    );
    console.log(
      `   delivered orders total: ${deliveredTotal.rows[0].total || 0} ₸`,
    );

    const diff = Math.abs(
      (shiftSalesTotal.rows[0].total || 0) -
        (deliveredTotal.rows[0].total || 0),
    );
    if (diff < 0.01) {
      console.log("✅ Суммы совпадают!\n");
    } else {
      console.log(`⚠️  Разница: ${diff} ₸\n`);
    }
  } catch (error) {
    console.error("❌ Ошибка:", error.message);
  } finally {
    await pool.end();
  }
}

recreateAllDeliveredSales();
