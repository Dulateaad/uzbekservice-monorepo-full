/**
 * Test script: verify that assigned orders are NOT visible to other workers
 * Test flow:
 * 1. Create 2 test workers (if they don't exist)
 * 2. Create an order with status 'new' + no assignment
 * 3. Worker A takes the order -> assigned_to = A
 * 4. Worker B tries to fetch orders -> should NOT see the order
 * 5. Worker A fetches orders -> SHOULD see it in her list
 */

const axios = require("axios");
const { Pool } = require("pg");

const API_BASE = process.env.API_BASE || "http://localhost:3000";
const DB_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:password@localhost:5432/greenflowers";

// Database queries
async function getWorkers(pool) {
  const res = await pool.query(
    "SELECT id, name, role FROM users WHERE role = 'worker' ORDER BY id LIMIT 2",
  );
  return res.rows;
}

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

async function getOrderCount(pool, orderId, userId) {
  const res = await pool.query(
    `SELECT assigned_to, status FROM orders WHERE id = $1`,
    [orderId],
  );
  return res.rows[0] || null;
}

// API calls
async function fetchOrders(userId) {
  try {
    const r = await axios.get(`${API_BASE}/orders/all`, {
      params: { userId },
    });
    return r.data?.orders || [];
  } catch (e) {
    console.error(
      `[Worker ${userId}] Fetch error:`,
      e.response?.status,
      e.response?.data?.error,
    );
    return [];
  }
}

async function createOrder() {
  const payload = {
    customer_name: "Test Client",
    customer_phone: "+70000000000",
    delivery_city: "Testgrad",
    delivery_address: "Test St, 1",
    total_amount: 500,
    items: [{ product_id: 1, quantity: 1, unit_price: 500 }],
    status: "new",
  };
  try {
    const r = await axios.post(`${API_BASE}/orders`, payload);
    return r.data?.order || r.data;
  } catch (e) {
    console.error(
      "Create order error:",
      e.response?.status,
      e.response?.data?.error,
    );
    throw e;
  }
}

async function takeOrder(orderId, userId) {
  try {
    const r = await axios.post(
      `${API_BASE}/orders/${orderId}/take`,
      { userId },
      { headers: { "Content-Type": "application/json" } },
    );
    return r.data;
  } catch (e) {
    console.error(
      `[Worker ${userId}] Take order error:`,
      e.response?.status,
      e.response?.data?.error,
    );
    throw e;
  }
}

// Main test
async function runTest() {
  let pool;
  try {
    // Connect to DB
    pool = new Pool({ connectionString: DB_URL });
    console.log("✓ Connected to PostgreSQL");

    // Get or create workers
    let workers = await getWorkers(pool);
    console.log(`Found ${workers.length} workers in DB`);

    if (workers.length < 2) {
      console.log("Creating test workers...");
      const w1 = await createWorker(pool, "Test Worker 1", "worker1@test.kz");
      const w2 = await createWorker(pool, "Test Worker 2", "worker2@test.kz");
      workers = [w1, w2];
      console.log(`✓ Created workers: ${w1.id}, ${w2.id}`);
    }

    const [workerA, workerB] = workers;
    console.log(
      `\nTest workers: A=${workerA.id} (${workerA.name}), B=${workerB.id} (${workerB.name})`,
    );

    // Step 1: Create new order
    console.log("\n[Step 1] Creating new order...");
    const order = await createOrder();
    console.log(
      `✓ Order created: id=${order.id}, status=${order.status}, assigned_to=${order.assigned_to}`,
    );

    // Step 2: Worker A and B see unassigned order
    console.log(
      "\n[Step 2] Both workers should see the new order in 'Other orders'",
    );
    let ordersA = await fetchOrders(workerA.id);
    let ordersB = await fetchOrders(workerB.id);

    const orderVisibleToA = ordersA.some((o) => o.id === order.id);
    const orderVisibleToB = ordersB.some((o) => o.id === order.id);

    console.log(
      `  Worker A sees order: ${orderVisibleToA ? "✓ YES" : "✗ NO (ERROR)"}`,
    );
    console.log(
      `  Worker B sees order: ${orderVisibleToB ? "✓ YES" : "✗ NO (ERROR)"}`,
    );

    if (!orderVisibleToA || !orderVisibleToB) {
      throw new Error("Both workers should see unassigned order");
    }

    // Step 3: Worker A takes the order
    console.log(`\n[Step 3] Worker A takes the order...`);
    await takeOrder(order.id, workerA.id);
    const orderAfterTake = await getOrderCount(pool, order.id);
    console.log(
      `✓ Order taken by A: assigned_to=${orderAfterTake.assigned_to}, status=${orderAfterTake.status}`,
    );

    // Step 4: Check visibility after take
    console.log(`\n[Step 4] After taking:`);

    ordersA = await fetchOrders(workerA.id);
    ordersB = await fetchOrders(workerB.id);

    const inMyOrders = ordersA.some(
      (o) => o.id === order.id && o.assigned_to === workerA.id,
    );
    const stillInOthers = ordersB.some((o) => o.id === order.id);

    console.log(
      `  Worker A sees order in 'My orders': ${inMyOrders ? "✓ YES (CORRECT)" : "✗ NO (ERROR)"}`,
    );
    console.log(
      `  Worker B sees order: ${stillInOthers ? "✗ YES (ERROR - BUG!)" : "✓ NO (CORRECT)"}`,
    );

    // Final result
    console.log("\n" + "=".repeat(60));
    if (inMyOrders && !stillInOthers) {
      console.log(
        "✓ VISIBILITY TEST PASSED: Order correctly hidden from other workers",
      );
    } else {
      console.log("✗ VISIBILITY TEST FAILED: Order visibility bug detected");
      if (!inMyOrders)
        console.log("  - Worker A should see order in 'My orders'");
      if (stillInOthers)
        console.log("  - Worker B should NOT see assigned order");
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
