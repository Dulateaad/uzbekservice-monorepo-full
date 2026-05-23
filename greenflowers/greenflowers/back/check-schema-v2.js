const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function checkSchema() {
  try {
    // Проверить структуру trucks / items_batches / inventory_batches
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log("\n✓ Все таблицы в БД:");
    tables.rows.forEach((t) => console.log("  -", t.table_name));

    // Проверить structure inventory_items
    const itemsColumns = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'inventory_items'
      ORDER BY ordinal_position
    `);

    console.log("\n✓ Столбцы inventory_items:");
    itemsColumns.rows.forEach((r) =>
      console.log(`  - ${r.column_name} (${r.data_type})`),
    );

    // Проверить inventory_batches
    const batchesColumns = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'inventory_batches'
      ORDER BY ordinal_position
    `);

    console.log("\n✓ Столбцы inventory_batches:");
    batchesColumns.rows.forEach((r) =>
      console.log(`  - ${r.column_name} (${r.data_type})`),
    );

    // Проверить trucks
    const trucksColumns = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'trucks'
      ORDER BY ordinal_position
    `);

    console.log("\n✓ Столбцы trucks:");
    trucksColumns.rows.forEach((r) =>
      console.log(`  - ${r.column_name} (${r.data_type})`),
    );

    // Проверить сколько уникальных truck_id в inventory_items
    const truckCount = await pool.query(`
      SELECT COUNT(DISTINCT truck_id) as unique_trucks 
      FROM inventory_items
    `);

    console.log(
      "\n✓ Уникальные truck_id в inventory_items:",
      truckCount.rows[0].unique_trucks,
    );

    // Проверить связь truck -> batch
    const truckBatchLink = await pool.query(`
      SELECT 
        t.id as truck_id,
        t.arrival_date,
        COUNT(ii.id) as items_count
      FROM trucks t
      LEFT JOIN inventory_items ii ON t.id = ii.truck_id
      GROUP BY t.id, t.arrival_date
      LIMIT 5
    `);

    console.log("\n✓ Связь trucks -> inventory_items:");
    console.table(truckBatchLink.rows);

    process.exit(0);
  } catch (err) {
    console.error("❌ Ошибка:", err.message);
    process.exit(1);
  }
}

checkSchema();
