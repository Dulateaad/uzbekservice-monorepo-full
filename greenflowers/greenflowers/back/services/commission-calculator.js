/**
 * Worker Commission/Bonus Calculation Service
 * Calculates commission for workers by truck (fura) + city
 *
 * Formula (strictly ordered, no simplifications):
 * 1. A = sum of all goods (order items) by truck + city
 * 2. B = A * 0.9
 * 3. V = total sales amount by truck + city (from shift_sales)
 * 4. E = V - B (earnings)
 * 5. For each worker:
 *    - G = worker's sales amount (shift_sales.sale_amount where user_id matches)
 *    - D = (G / total_for_all_workers_in_fura_city) * 100 (worker percentage)
 *    - Ж = D * 10
 *    - У = E * (Ж / 100)
 *    - И = V / 100
 *    - Л = G / И
 *    - Result = У * (Л / 100)
 * 6. Edge cases:
 *    - If V <= B or V = 0, then Result = 0
 *    - Handle division by zero (И)
 */

class CommissionCalculator {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Calculate commission for a specific truck + city combination
   * @param {number} truckId - Truck/fura ID
   * @param {string} city - City name (delivery_city)
   * @param {number} workerId - Optional worker ID (for specific worker calculation)
   * @returns {Object} - Analytics and commission results
   */
  /**
   * Calculate commission for a specific truck + city combination
   * @param {string} truckId - Truck/fura ID
   * @param {string} city - City name
   * @param {number|null} workerId - optional worker id
   * @param {number|null} overrideBasePercent - optional base percent (e.g. 0.03 for 3%)
   */
  async calculateTruckCityCommission(
    truckId,
    city,
    workerId = null,
    overrideBasePercent = null,
  ) {
    try {
      // Step 1: Get all orders for this truck + city that are delivered or in_transit (completed sales)
      // if city is ALL, ignore city filter
      // fetch orders that either have truck_id directly or contain at least
      // one item assigned to this truck (handles per-item truck cases)
      const ordersResult = await this.pool.query(
        `
        SELECT DISTINCT
          o.id,
          o.total_amount,
          o.seller_id,
          ss.id as sale_id,
          ss.sale_amount,
          ss.shift_id,
          COALESCE(u_seller.id, u_shift.id) as worker_id,
          COALESCE(u_seller.name, u_shift.name) as worker_name
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN shift_sales ss ON o.id = ss.order_id
        LEFT JOIN shifts s ON ss.shift_id = s.id
        LEFT JOIN users u_shift ON s.user_id = u_shift.id
        LEFT JOIN users u_seller ON o.seller_id = u_seller.id
        WHERE (o.truck_id = $1 OR oi.truck_id = $1)
          AND ($2 = 'ALL' OR o.city = $2 OR o.delivery_city = $2)
          AND o.status IN ('confirmed', 'in_transit', 'delivered')
          AND o.payment_status != 'refunded'
          AND (o.seller_id IS NOT NULL OR s.user_id IS NOT NULL)
        ORDER BY o.id, worker_id
      `,
        [truckId, city],
      );

      const orders = ordersResult.rows;

      // Step 1a: Get ALL workers associated with this truck (from shifts/shift_sales)
      // even if they have no orders in the current period
      const allWorkersResult = await this.pool.query(
        `
        SELECT DISTINCT
          COALESCE(u_seller.id, u_shift.id) as worker_id,
          COALESCE(u_seller.name, u_shift.name) as worker_name
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN shift_sales ss ON o.id = ss.order_id
        LEFT JOIN shifts s ON ss.shift_id = s.id
        LEFT JOIN users u_shift ON s.user_id = u_shift.id
        LEFT JOIN users u_seller ON o.seller_id = u_seller.id
        WHERE (o.truck_id = $1 OR oi.truck_id = $1)
          AND ($2 = 'ALL' OR o.city = $2 OR o.delivery_city = $2)
          AND (o.seller_id IS NOT NULL OR s.user_id IS NOT NULL)
        
        UNION
        
        SELECT DISTINCT
          u.id as worker_id,
          u.name as worker_name
        FROM users u
        WHERE u.role = 'admin'
        
        ORDER BY worker_id
      `,
        [truckId, city],
      );

      const allWorkers = allWorkersResult.rows;

      // Calculate refunds for this truck+city (orders with payment_status = 'refunded')
      const refundsResult = await this.pool.query(
        `SELECT COALESCE(SUM(o.total_amount), 0) as refunds
         FROM orders o
         LEFT JOIN order_items oi ON o.id = oi.order_id
         WHERE (o.truck_id = $1 OR oi.truck_id = $1)
           AND ($2 = 'ALL' OR o.city = $2 OR o.delivery_city = $2)
           AND o.payment_status = 'refunded'`,
        [truckId, city],
      );
      const refunds = parseFloat(refundsResult.rows[0].refunds || 0);

      if (orders.length === 0) {
        const netEarnedEmpty = 0 - refunds;
        // Still include all workers even if no orders
        const workers = allWorkers.map((w) => ({
          worker_id: w.worker_id,
          worker_name: w.worker_name,
          G: 0,
          D: 0,
          L: 0,
          Result: 0,
        }));
        return {
          success: true,
          truckId,
          city,
          analytics: {
            A: 0, // total goods
            B: 0, // goods * 0.9
            V: 0, // total sales
            E: 0, // earnings
            refunds: parseFloat(refunds.toFixed(2)),
            netEarned: parseFloat(netEarnedEmpty.toFixed(2)),
          },
          workers,
          message: "No orders found for this truck + city combination",
        };
      }

      // Step 2: Calculate A (sum of all goods/order items amounts for this truck)
      // compute A as sum of price*quantity. detect and correct legacy cases
      // where unit_price was accidentally stored as price_per_unit*50 (old bug).
      // we compare against product.price_per_unit and divide by 50 when matched.
      // Exclude refunded orders
      const Aresult = await this.pool.query(
        `SELECT COALESCE(SUM(
           oi.quantity *
           CASE
             WHEN p.price_per_unit IS NOT NULL
                  AND oi.unit_price IS NOT NULL
                  AND oi.unit_price / NULLIF(p.price_per_unit,0) = 50
             THEN oi.unit_price / 50
             ELSE oi.unit_price
           END
         ), 0) as total
         FROM orders o
         JOIN order_items oi ON o.id = oi.order_id
         LEFT JOIN products p ON oi.product_id = p.id
         WHERE (o.truck_id = $1 OR oi.truck_id = $1)
           AND ($2 = 'ALL' OR o.city = $2 OR o.delivery_city = $2)
           AND o.status IN ('confirmed', 'in_transit', 'delivered', 'completed')
           AND o.payment_status != 'refunded'`,
        [truckId, city],
      );
      const A = parseFloat(Aresult.rows[0].total || 0);

      // Step 2a: count delivered orders and sold items (excluding refunded)
      const soldItemsResult = await this.pool.query(
        `SELECT COALESCE(SUM(oi.quantity),0) as sold_items
         FROM orders o
         JOIN order_items oi ON o.id = oi.order_id
         WHERE (o.truck_id = $1 OR oi.truck_id = $1)
           AND ($2 = 'ALL' OR o.city = $2 OR o.delivery_city = $2)
           AND o.status IN ('confirmed', 'in_transit', 'delivered', 'completed')
           AND o.payment_status != 'refunded'`,
        [truckId, city],
      );
      const soldItems = parseInt(soldItemsResult.rows[0].sold_items) || 0;
      const deliveredOrdersCount = orders.filter(
        (o) => o.status === "delivered" || o.status === "completed",
      ).length;

      // Step 3: Calculate B = A * 0.9
      const B = A * 0.9;

      // Step 4: Calculate V (total sales amount from shift_sales)
      let V = orders.reduce(
        (sum, order) => sum + parseFloat(order.sale_amount || 0),
        0,
      );
      // if there were no shift_sales records, fall back to total goods A
      if (V === 0 && A > 0) {
        V = A;
      }

      // Net earned after refunds (income - refunds)
      const netEarned = V - refunds;

      // Step 5: Calculate E = V - B
      const E = V - B;

      // Additional analytics fields
      const analyticsExtras = {
        soldItems,
        deliveredOrdersCount,
        refundCount: refundsResult ? refundsResult.rows.length : 0,
      };

      // Edge case: if V <= B or V = 0, all results are 0
      if (V <= B || V === 0) {
        // Group unique workers from these orders
        let workers = this._groupWorkerSales(orders);
        // Add all workers from truck even if no sales
        workers = this._mergeAllWorkers(workers, allWorkers);
        return {
          success: true,
          truckId,
          city,
          analytics: {
            A,
            B,
            V,
            E,
            refunds: parseFloat(refunds.toFixed(2)),
            netEarned: parseFloat(netEarned.toFixed(2)),
            soldItems,
            deliveredOrdersCount,
            refundCount: refundsResult ? refundsResult.rows.length : 0,
          },
          workers: workers.map((w) => ({
            ...w,
            Result: 0, // V <= B or V = 0
          })),
          edgeCaseTriggered: true,
          message: "V <= B or V = 0: all commissions set to 0",
        };
      }

      // Step 6: Group workers and calculate commission for each
      let workers = this._groupWorkerSales(orders);
      // Add all workers from truck even if no sales
      workers = this._mergeAllWorkers(workers, allWorkers);

      // Calculate total sales across all workers for this truck+city
      const totalWorkerSales = workers.reduce((sum, w) => sum + w.G, 0);

      if (totalWorkerSales === 0) {
        return {
          success: true,
          truckId,
          city,
          analytics: {
            A,
            B,
            V,
            E,
            refunds: parseFloat(refunds.toFixed(2)),
            netEarned: parseFloat(netEarned.toFixed(2)),
            soldItems,
            deliveredOrdersCount,
            refundCount: refundsResult ? refundsResult.rows.length : 0,
          },
          workers: workers.map((w) => ({
            ...w,
            Result: 0,
          })),
          message: "No worker sales for this truck + city",
        };
      }

      // Apply formula to each worker using manager bonus system
      const fetchBaseManagerPercent = async () => {
        // Получить процент из базы
        const result = await this.pool.query(
          "SELECT value FROM settings WHERE key = 'baseManagerPercent'",
        );
        return result.rows[0] ? parseFloat(result.rows[0].value) / 100 : 0.03;
      };

      let baseManagerPercent = 0.03;
      if (overrideBasePercent != null) {
        baseManagerPercent = overrideBasePercent;
      } else {
        baseManagerPercent = await fetchBaseManagerPercent.call(this);
      }

      const workersWithCommission = workers.map((worker) => {
        // G = worker's sales (already calculated in _groupWorkerSales)
        const G = worker.G;

        // Handle zero sales case
        if (V === 0) {
          return {
            ...worker,
            D: 0, // Manager percent
            Bonus: 0, // Bonus in money
            ManagerPercent: 0, // Percent of truck income
          };
        }

        // K = D × 10 (increase base percent 10x for bonus pool)
        const K = baseManagerPercent * 10; // 0.03 × 10 = 0.3

        // U = E × K (total bonus fund for this truck)
        const U = E * K;

        // L = G / V (manager's share of total sales)
        const L = G / V;

        // Bonus = U × L (manager's bonus payment)
        const Bonus = U * L;

        // ManagerPercent = (Bonus / A) × 100 (percent of truck cost)
        const ManagerPercent = (Bonus / A) * 100;

        return {
          ...worker,
          G: parseFloat(G.toFixed(2)),
          D: parseFloat(baseManagerPercent.toFixed(4)), // Base manager percent (3%)
          K: parseFloat(K.toFixed(4)), // K = D × 10
          L: parseFloat((L * 100).toFixed(2)), // L as percentage (for display)
          U: parseFloat(U.toFixed(2)), // Total bonus pool
          Bonus: parseFloat(Bonus.toFixed(2)), // Manager's bonus in money
          ManagerPercent: parseFloat(ManagerPercent.toFixed(2)), // Percent of truck
          Result: parseFloat(Bonus.toFixed(2)), // Result = Bonus (for backward compatibility)
        };
      });

      return {
        success: true,
        truckId,
        city,
        analytics: {
          A: parseFloat(A.toFixed(2)),
          B: parseFloat(B.toFixed(2)),
          V: parseFloat(V.toFixed(2)),
          E: parseFloat(E.toFixed(2)),
          refunds: parseFloat(refunds.toFixed(2)),
          netEarned: parseFloat(netEarned.toFixed(2)),
          soldItems,
          deliveredOrdersCount,
          refundCount: refundsResult ? refundsResult.rows.length : 0,
        },
        workers: workersWithCommission.sort((a, b) => b.Result - a.Result), // Sort by commission descending
      };
    } catch (error) {
      console.error("Error calculating commission:", error);
      return {
        success: false,
        error: error.message,
        truckId,
        city,
      };
    }
  }

  /**
   * Get commission for a specific worker in a truck + city
   * @param {number} truckId
   * @param {string} city
   * @param {number} workerId
   * @returns {Object} - Commission data for this worker
   */
  async calculateWorkerFuraPercent(truckId, city, workerId) {
    console.log(
      `Calculating commission for worker ${workerId}, truck ${truckId}, city ${city}`,
    );
    const result = await this.calculateTruckCityCommission(truckId, city);
    console.log(
      "Full result from calculateTruckCityCommission:",
      JSON.stringify(result, null, 2),
    );

    if (!result.success) {
      return result;
    }

    // Find the specific worker in results
    const worker = result.workers.find((w) => w.worker_id === workerId);
    console.log(`Worker ${workerId} found in results:`, worker);

    if (!worker) {
      // Get worker name from users table
      const workerResult = await this.pool.query(
        "SELECT name FROM users WHERE id = $1",
        [workerId],
      );
      const workerName = workerResult.rows[0]?.name || "Unknown Worker";
      console.log(`Worker ${workerId} not found, using name: ${workerName}`);

      // Try to find worker's sales separately from orders where he was seller
      const workerOrdersResult = await this.pool.query(
        `
        SELECT
          o.id,
          o.total_amount,
          COALESCE(ss.sale_amount, 0) as sale_amount
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN shift_sales ss ON o.id = ss.order_id
        WHERE (o.truck_id = $1 OR oi.truck_id = $1)
          AND ($2 = 'ALL' OR o.city = $2 OR o.delivery_city = $2)
          AND o.status IN ('confirmed', 'in_transit', 'delivered', 'completed')
          AND o.payment_status != 'refunded'
          AND o.seller_id = $3
        `,
        [truckId, city, workerId],
      );

      const workerOrders = workerOrdersResult.rows;
      console.log(
        `Found ${workerOrders.length} orders for worker ${workerId} as seller`,
      );

      const workerSales = workerOrders.reduce(
        (sum, order) => sum + parseFloat(order.sale_amount || 0),
        0,
      );
      console.log(`Worker ${workerId} sales amount: ${workerSales}`);

      return {
        success: true,
        truckId,
        city,
        analytics: result.analytics,
        workers: [
          {
            worker_id: workerId,
            worker_name: workerName,
            G: parseFloat(workerSales.toFixed(2)),
            D: 0,
            L: 0,
            Result: 0, // Simplified, could calculate properly if needed
          },
        ],
        message:
          workerSales > 0 ? null : "Worker has no sales in this truck + city",
      };
    }

    return {
      success: true,
      truckId,
      city,
      analytics: result.analytics,
      workers: [worker],
    };
  }

  /**
   * Get all trucks with their cities and workers
   * Useful for admin dashboard showing all shifts/commissions
   * @returns {Array} - List of truck+city combinations
   */
  async getAllTruckCityCombinations() {
    const result = await this.pool.query(
      `
      SELECT DISTINCT 
        o.truck_id,
        o.city,
        COUNT(DISTINCT o.id) as order_count,
        COUNT(DISTINCT COALESCE(s.user_id, o.seller_id)) as worker_count,
        SUM(o.total_amount) as total_amount,
        MAX(o.created_at) as last_order_date
      FROM orders o
      LEFT JOIN shift_sales ss ON o.id = ss.order_id
      LEFT JOIN shifts s ON ss.shift_id = s.id
      WHERE o.truck_id IS NOT NULL 
        AND o.city IS NOT NULL
        AND o.status IN ('confirmed', 'in_transit', 'delivered')
      GROUP BY o.truck_id, o.city
      ORDER BY o.truck_id, o.city
    `,
    );

    return result.rows;
  }

  /**
   * Helper: Group worker sales for a list of orders
   * @private
   */
  _groupWorkerSales(orders) {
    const workerMap = new Map();

    orders.forEach((order) => {
      if (!order.worker_id) return; // Skip if no worker

      if (!workerMap.has(order.worker_id)) {
        workerMap.set(order.worker_id, {
          worker_id: order.worker_id,
          worker_name: order.worker_name,
          G: 0, // Worker's total sales
        });
      }

      const worker = workerMap.get(order.worker_id);
      worker.G += parseFloat(order.sale_amount || 0);
    });

    return Array.from(workerMap.values()).map((w) => ({
      ...w,
      G: parseFloat(w.G.toFixed(2)),
    }));
  }

  _mergeAllWorkers(workersWithSales, allWorkers) {
    // Create a map of workers with sales
    const salesMap = new Map();
    workersWithSales.forEach((w) => {
      salesMap.set(w.worker_id, w);
    });

    // Merge: include all workers, with sales data where available
    const mergedWorkers = allWorkers.map((worker) => {
      if (salesMap.has(worker.worker_id)) {
        // Worker has sales
        return salesMap.get(worker.worker_id);
      } else {
        // Worker has no sales for this period
        return {
          worker_id: worker.worker_id,
          worker_name: worker.worker_name,
          G: 0, // No sales
        };
      }
    });

    return mergedWorkers;
  }
}

module.exports = CommissionCalculator;
