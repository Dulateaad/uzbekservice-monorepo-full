const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function checkTrucks() {
  try {
    console.log("\n=== АНАЛИЗ TRUCKS ===\n");

    // Посмотреть все trucks со статусами
    const result = await pool.query(`
      SELECT t.id, t.identifier, t.arrival_date, t.status, COUNT(ii.id) as items_count
      FROM trucks t
      LEFT JOIN inventory_items ii ON t.id = ii.truck_id
      GROUP BY t.id, t.identifier, t.arrival_date, t.status
      ORDER BY t.arrival_date DESC
      LIMIT 10
    `);

    console.log("✓ Trucks в БД:");
    console.table(result.rows);

    // Узнать все уникальные статусы
    const statuses = await pool.query(`
      SELECT DISTINCT status FROM trucks ORDER BY status
    `);

    console.log("\n✓ Уникальные статусы trucks:");
    statuses.rows.forEach((r) => console.log(`  - "${r.status}"`));

    // Сколько trucks каждого статуса
    const statusCount = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM trucks
      GROUP BY status
      ORDER BY count DESC
    `);

    console.log("\n✓ Количество trucks по статусам:");
    console.table(statusCount.rows);

    pool.end();
  } catch (err) {
    console.error("❌ Ошибка:", err.message);
    process.exit(1);
  }
}

checkTrucks();
