require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function verifyAmounts() {
  try {
    console.log("🔍 ПРОВЕРЯЕМ СВЯЗЬ total_amount И СУММЫ ТОВАРОВ:\n");

    // Получаем все доставленные заказы с деталями
    const result = await pool.query(
      `
      SELECT 
        o.id,
        o.total_amount,
        o.assigned_to,
        (SELECT COALESCE(SUM(oi.quantity * oi.unit_price), 0)
         FROM order_items oi
         WHERE oi.order_id = o.id) as items_total,
        (SELECT COALESCE(SUM(oi.quantity), 0)
         FROM order_items oi
         WHERE oi.order_id = o.id) as items_count,
        o.status
      FROM orders o
      WHERE o.status = 'delivered'
      ORDER BY o.id
      LIMIT 20
    `,
    );

    console.log(
      "Заказ ID | total_amount | items_total | Разница | Товаров | Статус",
    );
    console.log(
      "---------|-------------|----------|---------|---------|--------",
    );

    let totalAmount = 0;
    let itemsTotal = 0;
    let differences = 0;

    result.rows.forEach((row) => {
      const difference = row.total_amount - row.items_total;
      const match = difference === 0 ? "✅" : "❌";

      console.log(
        `${row.id} | ${row.total_amount.toFixed(2)} | ${row.items_total.toFixed(2)} | ${difference.toFixed(2)} ${match} | ${row.items_count} | ${row.status}`,
      );

      totalAmount += row.total_amount;
      itemsTotal += row.items_total;
      if (difference !== 0) differences++;
    });

    console.log("\n📊 ИТОГО:");
    console.log(`Заказов: ${result.rows.length}`);
    console.log(`Сумма total_amount: ${totalAmount.toFixed(2)} ₸`);
    console.log(`Сумма товаров: ${itemsTotal.toFixed(2)} ₸`);
    console.log(`Заказов с разницей: ${differences}`);

    // Проверяем shift_sales суммы
    console.log("\n📊 ПРОВЕРЯЕМ shift_sales:");
    const shiftSalesResult = await pool.query(
      `
      SELECT 
        ss.order_id,
        ss.sale_amount,
        o.total_amount,
        (SELECT COALESCE(SUM(oi.quantity * oi.unit_price), 0)
         FROM order_items oi
         WHERE oi.order_id = o.id) as items_total
      FROM shift_sales ss
      JOIN orders o ON ss.order_id = o.id
      ORDER BY ss.order_id
      LIMIT 20
    `,
    );

    console.log("Order ID | sale_amount | total_amount | items_total | Match");
    console.log("---------|-------------|-------------|----------|-----");

    shiftSalesResult.rows.forEach((row) => {
      const match1 = row.sale_amount === row.total_amount ? "✅" : "❌";
      const match2 = row.sale_amount === row.items_total ? "✅" : "❌";

      console.log(
        `${row.order_id} | ${row.sale_amount.toFixed(2)} | ${row.total_amount.toFixed(2)} | ${row.items_total.toFixed(2)} | sale==total:${match1} sale==items:${match2}`,
      );
    });

    // Проверяем как рассчитывается A в commission-calculator
    console.log("\n📊 ПРОВЕРЯЕМ РАСЧЕТ A В COMMISSION-CALCULATOR:");
    const AResult = await pool.query(
      `
      SELECT 
        'A_from_order_items' as metric,
        COALESCE(SUM(
         oi.quantity *
         CASE
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
      WHERE o.status IN ('confirmed', 'in_transit', 'delivered', 'completed')
        AND o.payment_status != 'refunded'
    `,
    );
    console.log("A (товары):", AResult.rows[0].value.toFixed(2) + " ₸");

    // Получаем V из shift_sales
    const VResult = await pool.query(
      `
      SELECT 
        COALESCE(SUM(ss.sale_amount), 0) as value
      FROM shift_sales ss
      JOIN orders o ON ss.order_id = o.id
      WHERE o.status IN ('confirmed', 'in_transit', 'delivered', 'completed')
        AND o.payment_status != 'refunded'
    `,
    );
    console.log("V (shift_sales):", VResult.rows[0].value.toFixed(2) + " ₸");

    const A = parseFloat(AResult.rows[0].value);
    const V = parseFloat(VResult.rows[0].value);
    const B = A * 0.9;
    const E = V - B;

    console.log("\n📐 ФОРМУЛА:");
    console.log(`A = ${A.toFixed(2)} ₸ (сумма товаров из order_items)`);
    console.log(`B = A × 0.9 = ${B.toFixed(2)} ₸`);
    console.log(`V = ${V.toFixed(2)} ₸ (сумма из shift_sales)`);
    console.log(`E = V - B = ${E.toFixed(2)} ₸`);

    if (V <= B) {
      console.log(
        "\n⚠️  ПРОБЛЕМА: V <= B! Все бонусы будут 0 по дизайну системы",
      );
    } else {
      console.log("\n✅ V > B, система работает нормально");
    }

    await pool.end();
  } catch (error) {
    console.error("❌ Ошибка:", error.message);
    await pool.end();
  }
}

verifyAmounts();
