const express = require("express");
const router = express.Router();
const baseManagerPercentRouter = require("./base-manager-percent");

// Middleware: проверка роли admin или worker
function requireAdminOrWorker(req, res, next) {
  const { role } = req.query;
  if (role === "admin" || role === "worker") {
    return next();
  }
  return res.status(403).json({ error: "Access denied" });
}

module.exports = (pool) => {
  router.use(requireAdminOrWorker);

  router.use("/base-manager-percent", baseManagerPercentRouter(pool));

  // 1. GET /api/admin/city-stats
  // Статистика заказов по городам (список всех городов)
  router.get("/city-stats", async (req, res) => {
    try {
      const query = `
        SELECT DISTINCT delivery_city as city, COUNT(*) AS orders
        FROM orders
        WHERE delivery_city IS NOT NULL
        GROUP BY delivery_city
        ORDER BY orders DESC
      `;
      const result = await pool.query(query);
      res.json(result.rows);
    } catch (err) {
      console.error("City stats error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // 1.5. GET /api/admin/city-analytics
  // Аналитика для выбранного города: количество товара и сумма
  router.get("/city-analytics", async (req, res) => {
    try {
      const { city, startDate, endDate } = req.query;

      if (!city) {
        return res.status(400).json({ error: "City parameter is required" });
      }

      // validate date strings (should be YYYY-MM-DD)
      const isValidYMD = (s) =>
        typeof s === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(s) &&
        !isNaN(new Date(s).getTime());

      if (startDate && !isValidYMD(startDate)) {
        return res.status(400).json({ error: "Invalid startDate format" });
      }
      if (endDate && !isValidYMD(endDate)) {
        return res.status(400).json({ error: "Invalid endDate format" });
      }

      let query = `
        SELECT
          o.delivery_city as city,
          COUNT(DISTINCT o.id) as orders_count,
          COALESCE(SUM(oi.quantity), 0) as total_quantity,
          COALESCE(SUM(oi.quantity * oi.unit_price), 0) as total_revenue,
          COALESCE(SUM(o.discount_amount), 0) as total_discounts,
          COALESCE(SUM(CASE WHEN o.payment_status = 'refunded' THEN o.total_amount ELSE 0 END), 0) as total_returns
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE (
          LOWER(o.delivery_city) = LOWER($1)
          OR LOWER(o.city) = LOWER($1)
        )
      `;

      const params = [city];
      let paramIndex = 2;

      // Add date range filtering if provided
      if (startDate) {
        query += ` AND o.created_at >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        // Add one day to endDate to include the entire end day
        query += ` AND o.created_at < $${paramIndex}`;
        const endDateObj = new Date(endDate);
        endDateObj.setDate(endDateObj.getDate() + 1);
        params.push(endDateObj.toISOString().split("T")[0]);
        paramIndex++;
      }

      query += ` GROUP BY o.delivery_city`;

      const result = await pool.query(query, params);
      const data = result.rows[0] || {
        city,
        orders_count: 0,
        total_quantity: 0,
        total_revenue: 0,
        total_discounts: 0,
        total_returns: 0,
      };

      // Calculate total sum (revenue - discounts - returns)
      data.total_sum =
        data.total_revenue - data.total_discounts - data.total_returns;

      res.json(data);
    } catch (err) {
      console.error("City analytics error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // 2. GET /api/admin/supply-stats
  // Статистика поставок по поставщикам
  router.get("/supply-stats", async (req, res) => {
    try {
      const query = `
        SELECT supplier_name AS supplier, COUNT(*) AS deliveries
        FROM inventory_batches
        WHERE supplier_name IS NOT NULL
        GROUP BY supplier_name
        ORDER BY deliveries DESC
      `;
      const result = await pool.query(query);
      res.json(result.rows);
    } catch (err) {
      console.error("Supply stats error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // 3. GET /api/admin/managers
  // Список всех менеджеров (работников)
  router.get("/managers", async (req, res) => {
    try {
      const query = `
        SELECT id, name, email
        FROM users
        WHERE role = 'worker' AND is_active = true
        ORDER BY name ASC
      `;
      const result = await pool.query(query);
      res.json(result.rows);
    } catch (err) {
      console.error("Managers list error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // 4. PUT /api/admin/managers/:id
  // Редактирование менеджера (работника)
  router.put("/managers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email } = req.body;

      if (!name || !email) {
        return res.status(400).json({ error: "Name and email are required" });
      }

      const query = `
        UPDATE users
        SET name = $1, email = $2
        WHERE id = $3 AND role = 'worker' AND is_active = true
        RETURNING id, name, email
      `;
      const result = await pool.query(query, [name, email, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Manager not found" });
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Update manager error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // 5. DELETE /api/admin/managers/:id
  // Удаление менеджера (деактивация работника)
  router.delete("/managers/:id", async (req, res) => {
    try {
      const { id } = req.params;

      const query = `
        UPDATE users
        SET is_active = false
        WHERE id = $1 AND role = 'worker' AND is_active = true
        RETURNING id
      `;
      const result = await pool.query(query, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Manager not found" });
      }

      res.json({ success: true, deactivated_id: id });
    } catch (err) {
      console.error("Delete manager error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
