require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function analyzeCommissions() {
  try {
    console.log("\n📊 АНАЛИЗИРУЕМ ДАННЫЕ КОМИССИЙ:\n");

    const truck_id = "6decfe72-b3c7-4535-84c4-d82909245e57";
    const city = "Алматы";

    // Получаем все shift_sales для грузовика
    const res = await pool.query(
      `
      SELECT 
        u.id as worker_id,
        u.name as worker_name,
        SUM(ss.sale_amount) as total_sales,
        COUNT(ss.id) as order_count
      FROM shift_sales ss
      JOIN shifts s ON ss.shift_id = s.id
      JOIN users u ON s.user_id = u.id
      JOIN orders o ON ss.order_id = o.id
      WHERE o.truck_id = $1 AND o.delivery_city = $2 AND o.status = 'delivered'
      GROUP BY u.id, u.name
    `,
      [truck_id, city],
    );

    console.log("Рабочие и их продажи:");
    res.rows.forEach((r) => {
      console.log(
        `- ${r.worker_name} (User ${r.worker_id}): ${r.total_sales} ₸, заказов: ${r.order_count}`,
      );
    });

    // Получаем данные товаров для A метрики
    const goodsRes = await pool.query(
      `
      SELECT 
        SUM(p.price * oi.quantity) as total_goods_price,
        COUNT(DISTINCT o.id) as order_count
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      WHERE o.truck_id = $1 AND o.delivery_city = $2 AND o.status = 'delivered'
    `,
      [truck_id, city],
    );

    const totalGoods = goodsRes.rows[0]?.total_goods_price || 0;
    console.log(`\n📦 Товаров (A): ${totalGoods} ₸`);

    // Получаем V (total от shift_sales)
    const vRes = await pool.query(
      `
      SELECT SUM(ss.sale_amount) as total
      FROM shift_sales ss
      JOIN shifts s ON ss.shift_id = s.id
      JOIN orders o ON ss.order_id = o.id
      WHERE o.truck_id = $1 AND o.delivery_city = $2 AND o.status = 'delivered'
    `,
      [truck_id, city],
    );

    const V = vRes.rows[0]?.total || 0;
    console.log(`💰 Продажи (V): ${V} ₸`);

    const B = totalGoods * 0.9;
    console.log(`📊 B = A * 0.9 = ${totalGoods} * 0.9 = ${B} ₸`);

    const E = V - B;
    console.log(`📈 Заработок (E = V - B) = ${V} - ${B} = ${E} ₸`);

    await pool.end();
  } catch (error) {
    console.error("❌ Ошибка:", error.message);
    process.exit(1);
  }
}

analyzeCommissions();
