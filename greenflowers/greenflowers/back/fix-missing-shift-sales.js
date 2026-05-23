const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function fixMissingShiftSales() {
  try {
    console.log(
      "🔧 Исправляем отсутствующие shift_sales для delivered заказов...\n",
    );

    // Находим delivered заказы без shift_sales
    const missingSales = await pool.query(`
      SELECT o.id, o.total_amount, o.seller_id, o.user_id
      FROM orders o
      LEFT JOIN shift_sales ss ON o.id = ss.order_id
      WHERE o.status = 'delivered' AND ss.id IS NULL AND o.seller_id IS NOT NULL
    `);

    console.log(
      `Найдено ${missingSales.rows.length} delivered заказов без shift_sales\n`,
    );

    for (const order of missingSales.rows) {
      const { id: orderId, total_amount, seller_id } = order;

      console.log(
        `📦 Обрабатываем заказ ${orderId}, сумма ${total_amount} ₸, продавец ${seller_id}`,
      );

      // Проверяем, есть ли открытая смена для продавца
      let shiftResult = await pool.query(
        "SELECT id FROM shifts WHERE user_id = $1 AND status = 'open'",
        [seller_id],
      );

      let shiftId;
      if (shiftResult.rows.length === 0) {
        // Создаем новую смену
        console.log(`   Создаем новую смену для продавца ${seller_id}`);
        const shiftInsert = await pool.query(
          `INSERT INTO shifts (user_id, shift_date, started_at, status, opening_cash, total_sales)
           VALUES ($1, $2, $3, 'open', 0, 0) RETURNING id`,
          [seller_id, new Date().toISOString().split("T")[0], new Date()],
        );
        shiftId = shiftInsert.rows[0].id;
      } else {
        shiftId = shiftResult.rows[0].id;
        console.log(`   Используем существующую смену ${shiftId}`);
      }

      // Создаем shift_sales
      await pool.query(
        `INSERT INTO shift_sales (shift_id, order_id, sale_amount, discount_amount, sale_time)
         VALUES ($1, $2, $3, 0, $4)`,
        [shiftId, orderId, total_amount, new Date()],
      );

      console.log(`   ✅ Создан shift_sales для заказа ${orderId}\n`);
    }

    // Проверяем итоговые суммы
    const shiftSalesTotal = await pool.query(
      "SELECT SUM(sale_amount) as total FROM shift_sales",
    );
    const deliveredTotal = await pool.query(
      "SELECT SUM(total_amount) as total FROM orders WHERE status = 'delivered'",
    );

    console.log("📊 Итоговые суммы:");
    console.log(`   shift_sales: ${shiftSalesTotal.rows[0].total} ₸`);
    console.log(`   delivered orders: ${deliveredTotal.rows[0].total} ₸`);

    if (
      Math.abs(shiftSalesTotal.rows[0].total - deliveredTotal.rows[0].total) <
      0.01
    ) {
      console.log("✅ Суммы совпадают!");
    } else {
      console.log(
        "⚠️  Суммы не совпадают, возможно есть другие источники shift_sales",
      );
    }
  } catch (error) {
    console.error("❌ Ошибка:", error.message);
  } finally {
    await pool.end();
  }
}

fixMissingShiftSales();
