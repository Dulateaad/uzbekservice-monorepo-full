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
    // Проверить структуру inventory_items
    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'inventory_items'
      ORDER BY ordinal_position
    `);

    console.log("\n✓ Столбцы в таблице inventory_items:");
    console.table(result.rows);

    // Проверить наличие колонки batch_id
    const batchIdCheck = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'inventory_items' AND column_name = 'batch_id'
    `);

    if (batchIdCheck.rows.length === 0) {
      console.log("\n❌ ОШИБКА: Столбца batch_id НЕ существует!");
      console.log(
        "Возможно, используется другой столбец для связи с партиями.",
      );
    } else {
      console.log("\n✓ Столбец batch_id найден");
    }

    // Проверить внешние ключи
    const fkResult = await pool.query(`
      SELECT constraint_name, column_name, referenced_table_name
      FROM information_schema.key_column_usage
      WHERE table_name = 'inventory_items'
    `);

    console.log("\n✓ Внешние ключи:");
    console.table(fkResult.rows);

    // Проверить структуру inventory_batches для сравнения
    const batchesSchema = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'inventory_batches'
      ORDER BY ordinal_position
    `);

    console.log("\n✓ Столбцы в таблице inventory_batches:");
    console.table(batchesSchema.rows);

    process.exit(0);
  } catch (err) {
    console.error("Ошибка:", err.message);
    process.exit(1);
  }
}

checkSchema();
