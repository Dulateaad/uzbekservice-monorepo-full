require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function checkValues() {
  try {
    console.log("🔍 ПРОВЕРЯЕМ СООТВЕТСТВИЕ assigned_to И seller_id:\n");

    // Получаем все delivered заказы и их assigned_to/seller_id
    const result = await pool.query(
      `
      SELECT 
        id,
        assigned_to,
        seller_id,
        status,
        total_amount,
        truck_id
      FROM orders
      WHERE status = 'delivered' AND truck_id = '6decfe72-b3c7-4535-84c4-d82909245e57'
      ORDER BY id
      LIMIT 15
    `,
    );

    console.log("ID | assigned_to | seller_id | Match | Truck | Amount");
    console.log("---|-------------|-----------|-------|-------|--------");

    result.rows.forEach((row) => {
      const match = row.assigned_to === row.seller_id ? "✅" : "❌";
      console.log(
        `${row.id} | ${row.assigned_to || "null"} | ${row.seller_id || "null"} | ${match} | ${row.truck_id?.substring(0, 8)}... | ${row.total_amount}`,
      );
    });

    // Проверяем соответствие между shift_sales.user_id и orders.seller_id
    console.log(
      "\n📊 ПРОВЕРЯЕМ СООТВЕТСТВИЕ shift_sales.user_id И orders.seller_id:\n",
    );

    const ssResult = await pool.query(
      `
      SELECT 
        o.id as order_id,
        o.assigned_to,
        o.seller_id,
        s.user_id as shift_user_id,
        ss.sale_amount,
        CASE 
          WHEN s.user_id = o.seller_id THEN '✅'
          WHEN s.user_id = o.assigned_to THEN '⚠️ RIGHT'
          ELSE '❌'
        END as match_status
      FROM shift_sales ss
      JOIN shifts s ON ss.shift_id = s.id
      JOIN orders o ON ss.order_id = o.id
      WHERE o.truck_id = '6decfe72-b3c7-4535-84c4-d82909245e57' AND o.status = 'delivered'
      ORDER BY o.id
      LIMIT 15
    `,
    );

    console.log("Order ID | assigned_to | seller_id | shift_user | Match");
    console.log("---------|-------------|-----------|-----------|--------");

    ssResult.rows.forEach((row) => {
      console.log(
        `${row.order_id} | ${row.assigned_to} | ${row.seller_id} | ${row.shift_user_id} | ${row.match_status}`,
      );
    });

    // Сколько заказов где assigned_to != seller_id
    const mismatchResult = await pool.query(
      `
      SELECT COUNT(*) as count
      FROM orders
      WHERE status = 'delivered' AND assigned_to IS NOT NULL AND assigned_to != seller_id
      AND truck_id = '6decfe72-b3c7-4535-84c4-d82909245e57'
    `,
    );

    console.log(
      `\n⚠️  Заказов с mismatch (assigned_to != seller_id): ${mismatchResult.rows[0].count}`,
    );

    await pool.end();
  } catch (error) {
    console.error("❌ Ошибка:", error.message);
    await pool.end();
  }
}

checkValues();
