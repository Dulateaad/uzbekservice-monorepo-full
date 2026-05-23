const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function diagnoseBonus() {
  try {
    console.log("🔍 ДИАГНОСТИКА РАСЧЕТОВ БОНУСОВ\n");

    const truckId = "6decfe72-b3c7-4535-84c4-d82909245e57";
    const city = "Алматы";

    // 1. Получаем A (сумма товаров)
    const ARes = await pool.query(
      `SELECT COALESCE(SUM(
         oi.quantity * CASE
           WHEN p.price_per_unit IS NOT NULL
                AND oi.unit_price IS NOT NULL
                AND oi.unit_price / NULLIF(p.price_per_unit,0) = 50
           THEN oi.unit_price / 50
           ELSE oi.unit_price
         END
       ), 0) as value
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE (o.truck_id = $1 OR oi.truck_id = $1)
         AND o.delivery_city = $2
         AND o.status = 'delivered'
         AND o.payment_status != 'refunded'`,
      [truckId, city],
    );

    // 2. Получаем V (сумма shift_sales)
    const VRes = await pool.query(
      `SELECT COALESCE(SUM(ss.sale_amount), 0) as value
       FROM shift_sales ss
       JOIN orders o ON ss.order_id = o.id
       WHERE (o.truck_id = $1 OR EXISTS(
         SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.truck_id = $1
       ))
         AND o.delivery_city = $2
         AND o.status = 'delivered'`,
      [truckId, city],
    );

    const A = parseFloat(ARes.rows[0].value);
    const V = parseFloat(VRes.rows[0].value);
    const B = A * 0.9;
    const E = V - B;

    console.log("📐 ФОРМУЛА РАСЧЕТА:");
    console.log(`A = ${A.toFixed(2)} ₸ (сумма товаров)`);
    console.log(`B = A × 0.9 = ${B.toFixed(2)} ₸`);
    console.log(`V = ${V.toFixed(2)} ₸ (продажи из shift_sales)`);
    console.log(
      `E = V - B = ${E.toFixed(2)} ₸ (доход для распределения среди рабочих)\n`,
    );

    if (V <= B) {
      console.log("⚠️  V <= B: Бонусы будут 0 по дизайну системы!");
      console.log("Это нормально если V близко к B.\n");
    }

    // 3. Получаем расчеты для каждого рабочего - упрощенный запрос
    console.log("👥 РАСЧЕТЫ ДЛЯ КАЖДОГО РАБОЧЕГО:\n");

    const workersRes = await pool.query(
      `SELECT
         s.user_id as worker_id,
         u.name as worker_name,
         SUM(ss.sale_amount) as G,
         COUNT(ss.id) as order_count
       FROM shift_sales ss
       JOIN shifts s ON ss.shift_id = s.id
       JOIN users u ON s.user_id = u.id
       JOIN orders o ON ss.order_id = o.id
       WHERE (o.truck_id = $1 OR EXISTS(
         SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.truck_id = $1
       ))
         AND o.delivery_city = $2
         AND o.status = 'delivered'
       GROUP BY s.user_id, u.name
       ORDER BY G DESC`,
      [truckId, city],
    );

    console.log(`Found ${workersRes.rows.length} workers with sales\n`);
    if (workersRes.rows.length > 0) {
      console.log("Sample row:", JSON.stringify(workersRes.rows[0]));
    } else {
      console.log("⚠️  No workers found!\n");
    }

    const baseManagerPercent = 0.03; // 3%
    const K = baseManagerPercent * 10; // 0.3
    const U = E * K; // Total bonus fund

    console.log(`K = D × 10 = ${baseManagerPercent} × 10 = ${K.toFixed(4)}`);
    console.log(
      `U = E × K = ${E.toFixed(2)} × ${K.toFixed(4)} = ${U.toFixed(2)} ₸ (фонд для распределения)\n`,
    );

    let totalBonus = 0;
    workersRes.rows.forEach((row) => {
      const G = parseFloat(row.g) || 0;

      const L = G / V; // Manager's share
      const Bonus = U * L; // Manager's bonus
      const ManagerPercent = (Bonus / A) * 100; // Percent of truck

      totalBonus += Bonus;

      console.log(
        `Worker: ${row.worker_name || "Unknown"} (ID ${row.worker_id})`,
      );
      console.log(`  G = ${G.toFixed(2)} ₸ (продажи рабочего)`);
      console.log(
        `  L = G / V = ${G.toFixed(2)} / ${V.toFixed(2)} = ${L.toFixed(4)} (${(L * 100).toFixed(2)}%)`,
      );
      console.log(
        `  Bonus = U × L = ${U.toFixed(2)} × ${L.toFixed(4)} = ${Bonus.toFixed(2)} ₸`,
      );
      console.log(
        `  ManagerPercent = (Bonus / A) × 100 = (${Bonus.toFixed(2)} / ${A.toFixed(2)}) × 100 = ${ManagerPercent.toFixed(2)}%`,
      );
      console.log("");
    });

    console.log("📊 ИТОГО:");
    console.log(`Всего бонусов распределено: ${totalBonus.toFixed(2)} ₸`);
    console.log(`Фонд доступный (U): ${U.toFixed(2)} ₸`);
    console.log(
      `${totalBonus.toFixed(2) === U.toFixed(2) ? "✅" : "❌"} Сумма совпадает\n`,
    );

    // 4. Проверяем если есть проблема с unit_price
    console.log("🔎 ПРОВЕРЯЕМ order_items цены:\n");

    const pricesRes = await pool.query(
      `SELECT 
        oi.order_id,
        oi.product_id,
        oi.unit_price as order_price,
        p.price_per_unit as product_price,
        CASE WHEN oi.unit_price = p.price_per_unit THEN '✅' ELSE '❌' END as match,
        oi.quantity,
        (oi.unit_price * oi.quantity) as item_total
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id  
       WHERE oi.order_id IN (
         SELECT id FROM orders WHERE truck_id = $1 AND delivery_city = $2 AND status = 'delivered' LIMIT 10
       )
       ORDER BY oi.order_id`,
      [truckId, city],
    );

    let mismatchCount = 0;
    pricesRes.rows.forEach((row) => {
      if (row.order_price !== row.product_price) {
        console.log(
          `Order ${row.order_id}, Product ${row.product_id}: order_price=${row.order_price} vs product_price=${row.product_price} ${row.match}`,
        );
        mismatchCount++;
      }
    });

    if (mismatchCount === 0) {
      console.log("✅ Все цены в order_items совпадают с product_price\n");
    } else {
      console.log(`❌ Найдено ${mismatchCount} несоответствий цен!\n`);
    }

    await pool.end();
  } catch (error) {
    console.error("❌ Ошибка:", error.message);
    await pool.end();
  }
}

diagnoseBonus();
