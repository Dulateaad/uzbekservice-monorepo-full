const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "greenflowers_db",
});

async function fixAndSeedData() {
  const client = await pool.connect();
  try {
    console.log("\n🛠️ Fixing truck_id column type and seeding data...\n");

    const checkResult = await client.query(`
      SELECT data_type FROM information_schema.columns 
      WHERE table_name = 'orders' AND column_name = 'truck_id'
    `);

    if (checkResult.rows.length > 0) {
      const currentType = checkResult.rows[0].data_type;
      console.log(`Current truck_id type: ${currentType}`);

      if (currentType !== "uuid") {
        console.log("Converting truck_id to UUID type...");
        await client.query("ALTER TABLE orders DROP COLUMN truck_id CASCADE");
        await client.query("ALTER TABLE orders ADD COLUMN truck_id UUID");
        console.log("✓ truck_id column converted to UUID");
      }
    }

    const trucksResult = await client.query("SELECT id FROM trucks");
    const trucks = trucksResult.rows;

    if (trucks.length === 0) {
      console.log("⚠️ No trucks found. Skipping seeding.");
      await pool.end();
      return;
    }

    const truckIds = trucks.map((t) => t.id);
    const cities = ["Алматы", "Нур-Султан", "Караганда", "Өскемен", "Атырау"];

    const ordersResult = await client.query(
      "SELECT id FROM orders WHERE truck_id IS NULL",
    );
    const orders = ordersResult.rows;

    console.log(`Found ${orders.length} orders without truck_id`);

    let updated = 0;
    for (const order of orders) {
      const randomTruck = truckIds[Math.floor(Math.random() * truckIds.length)];
      const randomCity = cities[Math.floor(Math.random() * cities.length)];

      await client.query(
        "UPDATE orders SET truck_id = $1, city = $2 WHERE id = $3",
        [randomTruck, randomCity, order.id],
      );
      updated++;
    }

    console.log(`✅ Updated ${updated} orders with truck_id and city`);

    const summaryResult = await client.query(`
      SELECT truck_id, city, COUNT(*) as count
      FROM orders
      WHERE truck_id IS NOT NULL
      GROUP BY truck_id, city
      ORDER BY city
      LIMIT 10
    `);

    console.log("\n📊 Summary by truck and city:");
    summaryResult.rows.forEach((row) => {
      console.log(
        `  • Truck ${row.truck_id.substring(0, 8)}..., ${row.city}: ${row.count} orders`,
      );
    });

    console.log("\n✅ Data seeding completed successfully!\n");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    await client.end();
    await pool.end();
  }
}

fixAndSeedData();
