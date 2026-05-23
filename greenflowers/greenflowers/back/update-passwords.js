// Script to generate password hashes and update database
const bcrypt = require("bcrypt");
const { Pool } = require("pg");
require("dotenv").config();

// New passwords
const newAdminPassword = "AdminPass@2025";
const newWorkerPassword = "WorkerPass@2025";

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function updatePasswords() {
  try {
    console.log("🔄 Generating password hashes...");

    // Generate hashes
    const adminHash = await bcrypt.hash(newAdminPassword, 10);
    const workerHash = await bcrypt.hash(newWorkerPassword, 10);

    console.log("✅ Admin password hash generated");
    console.log("✅ Worker password hash generated");

    // Update admin password
    const adminResult = await pool.query(
      `UPDATE users 
       SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
       WHERE email = $2 AND role = 'admin'
       RETURNING email, name, role`,
      [adminHash, "admin@greenflowers.kz"]
    );

    if (adminResult.rows.length > 0) {
      console.log("✅ Admin password updated:", adminResult.rows[0]);
    } else {
      console.log("⚠️  Admin user not found");
    }

    // Update worker password
    const workerResult = await pool.query(
      `UPDATE users 
       SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
       WHERE email = $2 AND role = 'worker'
       RETURNING email, name, role`,
      [workerHash, "worker@greenflowers.kz"]
    );

    if (workerResult.rows.length > 0) {
      console.log("✅ Worker password updated:", workerResult.rows[0]);
    } else {
      console.log("⚠️  Worker user not found");
    }

    // Display new credentials
    console.log("\n📋 New Credentials:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Admin:");
    console.log(`  Email: admin@greenflowers.kz`);
    console.log(`  Password: ${newAdminPassword}`);
    console.log("");
    console.log("Worker:");
    console.log(`  Email: worker@greenflowers.kz`);
    console.log(`  Password: ${newWorkerPassword}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    await pool.end();
    console.log("✨ Passwords updated successfully!");
  } catch (error) {
    console.error("❌ Error updating passwords:", error.message);
    await pool.end();
    process.exit(1);
  }
}

updatePasswords();
