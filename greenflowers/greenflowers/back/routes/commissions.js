const express = require("express");
const router = express.Router();
const CommissionCalculator = require("../services/commission-calculator");

module.exports = (pool) => {
  const calculator = new CommissionCalculator(pool);

  // =============================================
  // WORKER COMMISSION/BONUS ENDPOINTS
  // =============================================

  /**
   * GET /api/shifts/commission/truck/:truckId/:city
   * Get commission analytics for a specific truck + city combination
   * For admins: shows all workers
   * For workers: shows own commission if userId is provided
   */
  router.get("/commission/truck/:truckId/:city", async (req, res) => {
    try {
      const { truckId, city } = req.params;
      const { userId, role, basePercent } = req.query;

      if (!truckId || !city) {
        return res
          .status(400)
          .json({ success: false, error: "truckId and city are required" });
      }

      // truckId is now a UUID (string), don't parse it as integer
      const truckIdValue = truckId; // Keep as string for UUID

      // Check user role
      const overrideBase = basePercent ? parseFloat(basePercent) / 100 : null;
      if (userId && role !== "admin") {
        // Non-admin users can only see their own commission
        const result = await calculator.calculateWorkerFuraPercent(
          truckIdValue,
          city,
          parseInt(userId, 10),
          overrideBase,
        );
        return res.json(result);
      }

      // Admin sees all workers for this truck + city
      const result = await calculator.calculateTruckCityCommission(
        truckIdValue,
        city,
        null,
        overrideBase,
      );
      return res.json(result);
    } catch (error) {
      console.error("Error fetching commission data:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch commission data",
        details: error.message,
      });
    }
  });

  /**
   * GET /api/shifts/commission/all
   * Get all truck + city combinations with summary data
   * Admin only
   */
  router.get("/commission/all", async (req, res) => {
    try {
      const { role } = req.query;

      if (role !== "admin") {
        return res
          .status(403)
          .json({ success: false, error: "Admin access required" });
      }

      const combinations = await calculator.getAllTruckCityCombinations();

      // For each combination, fetch analytics
      const withAnalytics = await Promise.all(
        combinations.map(async (combo) => {
          const result = await calculator.calculateTruckCityCommission(
            combo.truck_id,
            combo.city,
          );
          return {
            ...combo,
            analytics: result.analytics,
            workerCount: result.workers.length,
            totalCommission: result.workers.reduce(
              (sum, w) => sum + w.Result,
              0,
            ),
          };
        }),
      );

      return res.json({
        success: true,
        combinations: withAnalytics,
        total: withAnalytics.length,
      });
    } catch (error) {
      console.error("Error fetching all commissions:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch commission data",
        details: error.message,
      });
    }
  });

  /**
   * GET /api/shifts/commission/worker/:workerId/:truckId/:city
   * Get specific worker's commission for a truck + city
   */
  router.get(
    "/commission/worker/:workerId/:truckId/:city",
    async (req, res) => {
      try {
        const { workerId, truckId, city } = req.params;
        const { userId, role } = req.query;

        // Check authorization
        if (
          role !== "admin" &&
          parseInt(userId, 10) !== parseInt(workerId, 10)
        ) {
          return res.status(403).json({
            success: false,
            error: "Can only view own commission",
          });
        }

        const result = await calculator.calculateWorkerFuraPercent(
          parseInt(truckId, 10),
          city,
          parseInt(workerId, 10),
        );

        return res.json(result);
      } catch (error) {
        console.error("Error fetching worker commission:", error);
        res.status(500).json({
          success: false,
          error: "Failed to fetch worker commission",
          details: error.message,
        });
      }
    },
  );

  /**
   * GET /api/commissions/truck/:truckId/delivered-sales/:city
   * Get total sales for completed orders (confirmed, in_transit, delivered) of a truck + city combination
   */
  router.get("/truck/:truckId/delivered-sales/:city", async (req, res) => {
    try {
      const { truckId, city } = req.params;

      if (!truckId || !city) {
        return res.status(400).json({
          success: false,
          error: "truckId and city are required",
        });
      }

      // Get sum of completed orders for this truck + city (confirmed, in_transit, delivered, excluding refunded)
      const result = await pool.query(
        `SELECT COALESCE(SUM(
           oi.quantity *
           CASE
             WHEN p.price_per_unit IS NOT NULL
                  AND oi.unit_price IS NOT NULL
                  AND oi.unit_price / NULLIF(p.price_per_unit,0) = 50
             THEN oi.unit_price / 50
             ELSE oi.unit_price
           END
         ), 0) as total_sales,
                COALESCE(COUNT(DISTINCT o.id), 0) as order_count
         FROM orders o
         JOIN order_items oi ON o.id = oi.order_id
         LEFT JOIN products p ON oi.product_id = p.id
         WHERE (o.truck_id = $1 OR oi.truck_id = $1)
           AND ($2 = 'ALL' OR o.city = $2 OR o.delivery_city = $2)
           AND o.status IN ('confirmed', 'in_transit', 'delivered')
           AND o.payment_status != 'refunded'`,
        [truckId, city],
      );

      const row = result.rows[0];
      res.json({
        success: true,
        truckId,
        city,
        totalSales: parseFloat(row.total_sales || 0),
        orderCount: parseInt(row.order_count || 0),
      });
    } catch (error) {
      console.error("Error fetching delivered orders total:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch delivered orders total",
        details: error.message,
      });
    }
  });

  /**
   * GET /api/commissions/truck/:truckId/refunds/:city
   * Get total refunds (returned orders) for a truck + city combination
   */
  router.get("/truck/:truckId/refunds/:city", async (req, res) => {
    try {
      const { truckId, city } = req.params;

      if (!truckId || !city) {
        return res.status(400).json({
          success: false,
          error: "truckId and city are required",
        });
      }

      // Get sum of refunded orders for this truck + city
      const result = await pool.query(
        `SELECT COALESCE(SUM(
           oi.quantity *
           CASE
             WHEN p.price_per_unit IS NOT NULL
                  AND oi.unit_price IS NOT NULL
                  AND oi.unit_price / NULLIF(p.price_per_unit,0) = 50
             THEN oi.unit_price / 50
             ELSE oi.unit_price
           END
         ), 0) as refund_amount
         FROM orders o
         JOIN order_items oi ON o.id = oi.order_id
         LEFT JOIN products p ON oi.product_id = p.id
         WHERE (o.truck_id = $1 OR oi.truck_id = $1)
           AND ($2 = 'ALL' OR o.city = $2 OR o.delivery_city = $2)
           AND o.status = 'delivered'
           AND o.payment_status = 'refunded'`,
        [truckId, city],
      );

      const row = result.rows[0];
      res.json({
        success: true,
        truckId,
        city,
        refundAmount: parseFloat(row.refund_amount || 0),
      });
    } catch (error) {
      console.error("Error fetching refunds total:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch refunds total",
        details: error.message,
      });
    }
  });

  return router;
};
