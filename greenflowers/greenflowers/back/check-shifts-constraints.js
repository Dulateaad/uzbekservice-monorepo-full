const { Pool } = require("pg");
const pool = new Pool({
  user: "postgres",
  password: "Sula2206",
  host: "localhost",
  port: 5432,
  database: "greenflowers_db",
});

async function checkShiftsConstraints() {
  const client = await pool.connect();
  try {
    console.log("Проверяю ограничения таблицы shifts...");

    // Проверим уникальные статусы в shifts
    const statusesResult = await client.query(
      "SELECT DISTINCT status FROM shifts",
    );
    console.log("Существующие статусы:", statusesResult.rows);

    // Проверим структуру таблицы shifts
    const columnsResult = await client.query(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_name = 'shifts'
       ORDER BY ordinal_position`,
    );
    console.log("Столбцы таблицы shifts:");
    columnsResult.rows.forEach((col) => {
      console.log(
        `  ${col.column_name}: ${col.data_type} (${col.is_nullable})`,
      );
    });

    // Проверим ограничения
    const constraintsResult = await client.query(`
      SELECT conname, contype, condef
      FROM pg_constraint
      WHERE conrelid = 'shifts'::regclass
    `);
    console.log("Ограничения таблицы shifts:");
    constraintsResult.rows.forEach((con) => {
      console.log(`  ${con.conname}: ${con.contype} - ${con.condef}`);
    });
  } catch (error) {
    console.error("Ошибка:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkShiftsConstraints();
