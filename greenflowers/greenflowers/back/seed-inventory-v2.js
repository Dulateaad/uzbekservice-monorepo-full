const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function seedData() {
  try {
    console.log("🌱 Seeding test data...\n");

    // Get existing trucks
    console.log("📦 Getting trucks...");
    const existingTrucks = await pool.query(`
      SELECT id, identifier FROM trucks 
      ORDER BY created_at DESC 
      LIMIT 3
    `);

    if (existingTrucks.rows.length === 0) {
      console.log("  ❌ No trucks found. Create trucks first!");
      await pool.end();
      return;
    }

    const truckIds = existingTrucks.rows.map((t) => t.id);
    console.log(`  ✓ Found ${truckIds.length} trucks`);
    existingTrucks.rows.forEach((t) => {
      console.log(`    - ${t.identifier}`);
    });

    // Delete existing items for clean seed
    await pool.query(`DELETE FROM inventory_items`);

    // Create test inventory items
    console.log("\n🌸 Creating test inventory items...");

    const items = [
      {
        truck_id: truckIds[0],
        name: "Розы",
        variety: "Красные садовые",
        price: 90,
        quantity: 50,
      },
      {
        truck_id: truckIds[0],
        name: "Розы",
        variety: "Белые премиум",
        price: 120,
        quantity: 30,
      },
      {
        truck_id: truckIds[0],
        name: "Хризантемы",
        variety: "Жёлтые",
        price: 45,
        quantity: 100,
      },
      {
        truck_id: truckIds[1],
        name: "Тюльпаны",
        variety: "Красные",
        price: 60,
        quantity: 80,
      },
      {
        truck_id: truckIds[1],
        name: "Лилии",
        variety: "Ароматные",
        price: 150,
        quantity: 20,
      },
      {
        truck_id: truckIds[2],
        name: "Гвоздики",
        variety: "Розовые",
        price: 40,
        quantity: 150,
      },
    ];

    for (const item of items) {
      const result = await pool.query(
        `INSERT INTO inventory_items (truck_id, name, variety, price, quantity, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING id, name, variety, quantity`,
        [item.truck_id, item.name, item.variety, item.price, item.quantity],
      );
      const row = result.rows[0];
      const totalCost = item.price * item.quantity;
      console.log(
        `  ✓ ${row.name} (${row.variety}): ${row.quantity} шт. = ₸${totalCost.toLocaleString()}`,
      );
    }

    // Show summary
    console.log("\n📊 Summary:");
    const itemCount = await pool.query(
      `SELECT COUNT(*) as count FROM inventory_items`,
    );
    const totalValue = await pool.query(
      `SELECT SUM(price * quantity)::BIGINT as total FROM inventory_items`,
    );

    console.log(`  - Total items: ${itemCount.rows[0].count}`);
    console.log(
      `  - Total inventory value: ₸${totalValue.rows[0].total?.toLocaleString() || 0}`,
    );

    await pool.end();
    console.log("\n✅ Seeding completed!");
  } catch (error) {
    console.error("❌ Error:", error.message);
    await pool.end();
    process.exit(1);
  }
}

seedData();
