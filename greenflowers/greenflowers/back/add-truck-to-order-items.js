const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "flower_shop",
});

async function addTruckIdToOrderItems() {
  const client = await pool.connect();
  try {
    console.log("Adding truck_id column to order_items...");
    
    // Проверяем, есть ли уже колонка
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'order_items' AND column_name = 'truck_id'
    `);
    
    if (checkColumn.rows.length > 0) {
      console.log("✅ Column truck_id already exists in order_items");
      return;
    }
    
    // Добавляем колонку
    await client.query(`
      ALTER TABLE order_items ADD COLUMN truck_id UUID REFERENCES trucks(id)
    `);
    
    console.log("✅ Successfully added truck_id column to order_items");
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

addTruckIdToOrderItems();
