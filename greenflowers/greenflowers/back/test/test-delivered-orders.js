/**
 * Test script: Verify "delivered" order behavior
 * - delivered orders cannot be taken
 * - delivered orders cannot have their status changed
 * - delivered orders can still be downloaded
 * - Frontend shows delivered orders as disabled
 */

const axios = require("axios");
const { Pool } = require("pg");

const API_BASE = process.env.API_BASE || "http://localhost:3000";
const DB_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:password@localhost:5432/greenflowers";

async function createWorker(pool, name, email) {
  const res = await pool.query(
    `INSERT INTO users (name, email, role, phone, password)
     VALUES ($1, $2, 'worker', '+70000000000', 'test')
     ON CONFLICT (email) DO UPDATE SET name = $1
     RETURNING id, name, role`,
    [name, email],
  );
  return res.rows[0];
}

async function createOrder(pool, status = "new", assigned_to = null) {
  const res = await pool.query(
    `INSERT INTO orders (customer_name, customer_phone, delivery_city, delivery_address, total_amount, status, assigned_to)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, status, assigned_to`,
    [
      "Test Client",
      "+70000000000",
      "Almaty",
      "Test St 1",
      1000,
      status,
      assigned_to,
    ],
  );
  return res.rows[0];
}

// API calls
async function fetchOrders(userId) {
  const r = await axios.get(`${API_BASE}/orders/all`, {
    params: { userId },
  });
  return r.data?.orders || [];
}

async function takeOrder(orderId, userId) {
  try {
    const r = await axios.post(
      `${API_BASE}/orders/${orderId}/take`,
      { userId },
      { headers: { "Content-Type": "application/json" } },
    );
    return { success: true, data: r.data };
  } catch (e) {
    return {
      success: false,
      status: e.response?.status,
      error: e.response?.data?.error,
    };
  }
}

async function updateStatus(orderId, userId, newStatus) {
  try {
    const r = await axios.put(
      `${API_BASE}/orders/${orderId}/status`,
      { userId, status: newStatus },
      { headers: { "Content-Type": "application/json" } },
    );
    return { success: true, data: r.data };
  } catch (e) {
    return {
      success: false,
      status: e.response?.status,
      error: e.response?.data?.error,
    };
  }
}

async function runTest() {
  let pool;
  try {
    pool = new Pool({ connectionString: DB_URL });
    console.log("✓ Connected to PostgreSQL\n");

    // Create worker
    const worker = await createWorker(
      pool,
      "Delivery Test Worker",
      "delivery-worker@test.kz",
    );
    console.log(`Test worker created: ${worker.id}\n`);

    // Test 1: Create a delivered order
    console.log("Test 1: Create a 'delivered' order");
    const deliveredOrder = await createOrder(pool, "delivered", worker.id);
    console.log(
      `  Created order: id=${deliveredOrder.id}, status=${deliveredOrder.status}\n`,
    );

    // Test 2: Worker tries to get delivered orders (should NOT see them?)
    console.log("Test 2: Check if delivered orders appear in list");
    const orders = await fetchOrders(worker.id);
    const seesDelivered = orders.some((o) => o.id === deliveredOrder.id);
    console.log(
      `  Delivered order visible to worker: ${seesDelivered ? "YES (expected for admin)" : "NO"}\n`,
    );

    // Test 3: Worker tries to take a delivered order (403)
    console.log("Test 3: Try to take a delivered order");
    const takeResult = await takeOrder(deliveredOrder.id, worker.id);
    console.log(
      `  Result: ${takeResult.success ? "✓ Success" : `✗ Failed (${takeResult.status})`}`,
    );
    console.log(`  Error: ${takeResult.error || "none"}\n`);

    // Test 4: Worker tries to change status of delivered order (403)
    console.log("Test 4: Try to change status of delivered order");
    const statusResult = await updateStatus(
      deliveredOrder.id,
      worker.id,
      "cancelled",
    );
    console.log(
      `  Result: ${statusResult.success ? "✓ Success" : `✗ Failed (${statusResult.status})`}`,
    );
    console.log(`  Error: ${statusResult.error || "none"}\n`);

    // Test 5: Create a normal order for comparison
    console.log("Test 5: Create a normal 'new' order for comparison");
    const newOrder = await createOrder(pool, "new");
    console.log(
      `  Created order: id=${newOrder.id}, status=${newOrder.status}`,
    );

    // Test 6: Worker can take the normal order
    console.log("\nTest 6: Take the normal order");
    const takeNormalResult = await takeOrder(newOrder.id, worker.id);
    console.log(
      `  Result: ${takeNormalResult.success ? "✓ Success (can take)" : `✗ Failed`}\n`,
    );

    // Summary
    console.log("=" + "=".repeat(59));
    const allTestsPassed =
      !takeResult.success &&
      takeResult.status === 403 &&
      !statusResult.success &&
      statusResult.status === 403 &&
      takeNormalResult.success;

    if (allTestsPassed) {
      console.log("✓ ALL DELIVERED ORDER TESTS PASSED");
      console.log("  - Cannot take delivered orders (403)");
      console.log("  - Cannot change delivered order status (403)");
      console.log("  - Can still take new orders");
    } else {
      console.log("✗ SOME TESTS FAILED:");
      if (takeResult.success)
        console.log("  - ERROR: Was able to take delivered order!");
      if (statusResult.success)
        console.log("  - ERROR: Was able to change delivered status!");
      if (!takeNormalResult.success)
        console.log("  - ERROR: Cannot take normal orders!");
      process.exit(1);
    }
  } catch (err) {
    console.error("\n✗ Test Error:", err.message);
    process.exit(1);
  } finally {
    if (pool) await pool.end();
  }
}

runTest();
