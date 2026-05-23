const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "greenflowers_db",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "Sula2206",
});

async function createInventory() {
  try {
    // Get all trucks
    const trucks = await pool.query(`SELECT id, identifier FROM trucks`);
    console.log(`Found ${trucks.rows.length} trucks\n`);

    let created = 0;

    for (const truck of trucks.rows) {
      // Check if truck already has inventory
      const check = await pool.query(
        `SELECT COUNT(*) as cnt FROM inventory_items WHERE truck_id = $1`,
        [truck.id],
      );

      if (check.rows[0].cnt > 0) {
        console.log(
          `${truck.identifier}: Already has ${check.rows[0].cnt} inventory items`,
        );
        continue;
      }

      // Create inventory items for this truck
      const products = [
        { product_id: 41, quantity: 500 },
        { product_id: 40, quantity: 300 },
      ];

      for (const product of products) {
        await pool.query(
          `INSERT INTO inventory_items (truck_id, product_id, quantity)
           VALUES ($1, $2, $3)`,
          [truck.id, product.product_id, product.quantity],
        );
        created++;
        console.log(
          `${truck.identifier}: Added inventory (product ${product.product_id}, qty ${product.quantity})`,
        );
      }
    }

    console.log(`\nTotal inventory items created: ${created}`);
    await pool.end();
  } catch (error) {
    console.error("Error:", error.message);
    await pool.end();
  }
}

createInventory();
