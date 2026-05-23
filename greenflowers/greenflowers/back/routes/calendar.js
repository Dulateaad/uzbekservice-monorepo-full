const express = require("express");
const router = express.Router();

module.exports = (pool, logger) => {
  // =============================================
  // СОБЫТИЯ КАЛЕНДАРЯ
  // =============================================

  // Получить события за период
  router.get("/events", async (req, res) => {
    try {
      const { startDate, endDate, eventType, priority, isRead } = req.query;

      let query = `
        SELECT 
          ce.*,
          u.name as created_by_name
        FROM calendar_events ce
        LEFT JOIN users u ON ce.created_by = u.id
      `;

      const conditions = [];
      const params = [];

      if (startDate) {
        params.push(startDate);
        conditions.push(`ce.event_date >= $${params.length}`);
      }
      if (endDate) {
        params.push(endDate);
        conditions.push(`ce.event_date <= $${params.length}`);
      }
      if (eventType) {
        params.push(eventType);
        conditions.push(`ce.event_type = $${params.length}`);
      }
      if (priority) {
        params.push(priority);
        conditions.push(`ce.priority = $${params.length}`);
      }
      if (isRead !== undefined) {
        params.push(isRead === "true");
        conditions.push(`ce.is_read = $${params.length}`);
      }

      if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
      }

      query += " ORDER BY ce.event_date DESC, ce.priority DESC";

      const result = await pool.query(query, params);

      res.json({ success: true, events: result.rows });
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      res
        .status(500)
        .json({ success: false, error: "Ошибка при загрузке событий" });
    }
  });

  // Получить события для месяца (оптимизировано для календаря)
  router.get("/events/month/:year/:month", async (req, res) => {
    try {
      const { year, month } = req.params;

      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      // Правильно вычисляем последний день месяца в локальном времени
      const monthNum = parseInt(month);
      const lastDayOfMonth = new Date(parseInt(year), monthNum, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, "0")}-${String(
        lastDayOfMonth
      ).padStart(2, "0")}`;

      const result = await pool.query(
        `
        SELECT 
          event_date::text as event_date,
          json_agg(json_build_object(
            'id', id,
            'event_type', event_type,
            'title', title,
            'description', description,
            'priority', priority,
            'is_auto_generated', is_auto_generated,
            'is_read', is_read
          ) ORDER BY priority DESC) as events
        FROM calendar_events
        WHERE event_date >= $1 AND event_date <= $2
        GROUP BY event_date
        ORDER BY event_date
      `,
        [startDate, endDate]
      );

      // Преобразуем в удобный формат для календаря
      const eventsMap = {};
      result.rows.forEach((row) => {
        eventsMap[row.event_date] = row.events;
      });

      res.json({ success: true, events: eventsMap });
    } catch (error) {
      console.error("Error fetching month events:", error);
      res
        .status(500)
        .json({ success: false, error: "Ошибка при загрузке событий" });
    }
  });

  // Создать событие вручную
  router.post("/events", async (req, res) => {
    try {
      const { userId, eventDate, eventType, title, description, priority } =
        req.body;

      // Убедимся, что дата в формате YYYY-MM-DD
      const formattedDate =
        eventDate instanceof Date
          ? eventDate.toISOString().split("T")[0]
          : eventDate;

      const result = await pool.query(
        `
        INSERT INTO calendar_events (event_date, event_type, title, description, priority, created_by, is_auto_generated)
        VALUES ($1::date, $2, $3, $4, $5, $6, false)
        RETURNING id, event_date::text as event_date, event_type, title, description, priority, created_by, is_auto_generated, is_read, created_at
      `,
        [
          formattedDate,
          eventType || "custom",
          title,
          description,
          priority || "medium",
          userId,
        ]
      );

      res.json({
        success: true,
        message: "Событие создано",
        event: result.rows[0],
      });
    } catch (error) {
      console.error("Error creating event:", error);
      res
        .status(500)
        .json({ success: false, error: "Ошибка при создании события" });
    }
  });

  // Обновить событие
  router.put("/events/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { title, description, priority, isRead } = req.body;

      await pool.query(
        `
        UPDATE calendar_events 
        SET title = COALESCE($1, title),
            description = COALESCE($2, description),
            priority = COALESCE($3, priority),
            is_read = COALESCE($4, is_read)
        WHERE id = $5
      `,
        [title, description, priority, isRead, id]
      );

      res.json({ success: true, message: "Событие обновлено" });
    } catch (error) {
      console.error("Error updating event:", error);
      res
        .status(500)
        .json({ success: false, error: "Ошибка при обновлении события" });
    }
  });

  // Отметить событие как прочитанное
  router.post("/events/:id/read", async (req, res) => {
    try {
      const { id } = req.params;

      await pool.query(
        "UPDATE calendar_events SET is_read = true WHERE id = $1",
        [id]
      );

      res.json({ success: true, message: "Событие отмечено как прочитанное" });
    } catch (error) {
      console.error("Error marking event as read:", error);
      res.status(500).json({ success: false, error: "Ошибка" });
    }
  });

  // Удалить событие
  router.delete("/events/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { userId } = req.query;

      // Проверка прав (только admin)
      const userCheck = await pool.query(
        "SELECT role FROM users WHERE id = $1",
        [userId]
      );
      if (!userCheck.rows[0] || userCheck.rows[0].role !== "admin") {
        return res.status(403).json({
          success: false,
          error: "Только администратор может удалять события",
        });
      }

      await pool.query("DELETE FROM calendar_events WHERE id = $1", [id]);

      res.json({ success: true, message: "Событие удалено" });
    } catch (error) {
      console.error("Error deleting event:", error);
      res
        .status(500)
        .json({ success: false, error: "Ошибка при удалении события" });
    }
  });

  // =============================================
  // ПОРОГОВЫЕ ЗНАЧЕНИЯ ДЛЯ АНАЛИЗА
  // =============================================

  // Получить пороговые значения
  router.get("/thresholds", async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT at.*, u.name as updated_by_name
        FROM analytics_thresholds at
        LEFT JOIN users u ON at.updated_by = u.id
        ORDER BY at.threshold_type
      `);

      res.json({ success: true, thresholds: result.rows });
    } catch (error) {
      console.error("Error fetching thresholds:", error);
      res.status(500).json({
        success: false,
        error: "Ошибка при загрузке пороговых значений",
      });
    }
  });

  // Обновить пороговое значение
  router.put("/thresholds/:type", async (req, res) => {
    try {
      const { type } = req.params;
      const { userId, value, isActive } = req.body;

      // Проверка прав (только admin)
      const userCheck = await pool.query(
        "SELECT role FROM users WHERE id = $1",
        [userId]
      );
      if (!userCheck.rows[0] || userCheck.rows[0].role !== "admin") {
        return res.status(403).json({
          success: false,
          error: "Только администратор может изменять настройки",
        });
      }

      await pool.query(
        `
        UPDATE analytics_thresholds 
        SET threshold_value = COALESCE($1, threshold_value),
            is_active = COALESCE($2, is_active),
            updated_by = $3,
            updated_at = NOW()
        WHERE threshold_type = $4
      `,
        [value, isActive, userId, type]
      );

      res.json({ success: true, message: "Пороговое значение обновлено" });
    } catch (error) {
      console.error("Error updating threshold:", error);
      res.status(500).json({ success: false, error: "Ошибка при обновлении" });
    }
  });

  // =============================================
  // ОБЩАЯ АНАЛИТИКА
  // =============================================

  // Сводная статистика за период
  router.get("/summary", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      const start =
        startDate ||
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0];
      const end = endDate || new Date().toISOString().split("T")[0];

      // Статистика по сменам
      const shiftsStats = await pool.query(
        `
        SELECT 
          COUNT(*) as total_shifts,
          COALESCE(SUM(total_sales), 0) as total_sales,
          COALESCE(SUM(total_discounts), 0) as total_discounts,
          COALESCE(SUM(total_orders), 0) as total_orders,
          COALESCE(AVG(total_sales), 0) as avg_sales_per_shift
        FROM shifts
        WHERE status = 'closed' AND shift_date >= $1 AND shift_date <= $2
      `,
        [start, end]
      );

      // Статистика по поставкам
      const inventoryStats = await pool.query(
        `
        SELECT 
          COUNT(*) as total_batches,
          COALESCE(SUM(total_items), 0) as total_items,
          COALESCE(SUM(total_cost), 0) as total_cost
        FROM inventory_batches
        WHERE status IN ('received', 'processed') AND batch_date >= $1 AND batch_date <= $2
      `,
        [start, end]
      );

      // Количество событий по типам
      const eventsStats = await pool.query(
        `
        SELECT 
          event_type,
          COUNT(*) as count
        FROM calendar_events
        WHERE event_date >= $1 AND event_date <= $2
        GROUP BY event_type
      `,
        [start, end]
      );

      // Непрочитанные важные события
      const unreadEvents = await pool.query(`
        SELECT COUNT(*) as count
        FROM calendar_events
        WHERE is_read = false AND priority IN ('high', 'critical')
      `);

      res.json({
        success: true,
        period: { start, end },
        shifts: shiftsStats.rows[0],
        inventory: inventoryStats.rows[0],
        events: eventsStats.rows,
        unreadImportantEvents: parseInt(unreadEvents.rows[0].count),
      });
    } catch (error) {
      console.error("Error fetching summary:", error);
      res
        .status(500)
        .json({ success: false, error: "Ошибка при загрузке сводки" });
    }
  });

  // Топ товаров по поставкам
  router.get("/top-products", async (req, res) => {
    try {
      const { startDate, endDate, limit } = req.query;

      let query = `
        SELECT 
          ii.product_name,
          ii.category,
          SUM(ii.quantity) as total_quantity,
          AVG(ii.purchase_price) as avg_purchase_price,
          COUNT(DISTINCT ib.id) as batches_count
        FROM inventory_items ii
        JOIN inventory_batches ib ON ii.batch_id = ib.id
        WHERE ib.status IN ('received', 'processed')
      `;

      const params = [];

      if (startDate) {
        params.push(startDate);
        query += ` AND ib.batch_date >= $${params.length}`;
      }
      if (endDate) {
        params.push(endDate);
        query += ` AND ib.batch_date <= $${params.length}`;
      }

      query +=
        " GROUP BY ii.product_name, ii.category ORDER BY total_quantity DESC";

      if (limit) {
        params.push(parseInt(limit));
        query += ` LIMIT $${params.length}`;
      } else {
        query += " LIMIT 20";
      }

      const result = await pool.query(query, params);

      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error("Error fetching top products:", error);
      res
        .status(500)
        .json({ success: false, error: "Ошибка при загрузке топ товаров" });
    }
  });

  // Генерация автоматических событий (можно вызывать по расписанию)
  router.post("/generate-events", async (req, res) => {
    const client = await pool.connect();
    try {
      const { userId } = req.body;

      // Проверка прав
      const userCheck = await client.query(
        "SELECT role FROM users WHERE id = $1",
        [userId]
      );
      if (!userCheck.rows[0] || userCheck.rows[0].role !== "admin") {
        return res.status(403).json({
          success: false,
          error: "Только администратор может генерировать события",
        });
      }

      await client.query("BEGIN");

      const today = new Date().toISOString().split("T")[0];
      let eventsCreated = 0;

      // Получаем пороговые значения
      const thresholds = await client.query(
        "SELECT threshold_type, threshold_value FROM analytics_thresholds WHERE is_active = true"
      );
      const thresholdMap = {};
      thresholds.rows.forEach((t) => {
        thresholdMap[t.threshold_type] = parseFloat(t.threshold_value);
      });

      // Проверяем низкие остатки товаров
      const lowStock = await client.query(
        `
        SELECT id, name, stock_quantity 
        FROM products 
        WHERE stock_quantity <= $1 AND stock_quantity > 0
      `,
        [thresholdMap.stock_alert_quantity || 50]
      );

      for (const product of lowStock.rows) {
        // Проверяем, нет ли уже такого события за сегодня
        const existing = await client.query(
          `
          SELECT id FROM calendar_events 
          WHERE event_date = $1 AND event_type = 'stock_alert' AND related_entity_id = $2
        `,
          [today, product.id]
        );

        if (existing.rows.length === 0) {
          await client.query(
            `
            INSERT INTO calendar_events (event_date, event_type, title, description, priority, related_entity_type, related_entity_id, is_auto_generated)
            VALUES ($1, 'stock_alert', 'Низкий остаток', $2, 'high', 'product', $3, true)
          `,
            [
              today,
              `${product.name}: осталось ${product.stock_quantity} шт`,
              product.id,
            ]
          );
          eventsCreated++;
        }
      }

      // Проверяем значительные изменения цен в последних поставках
      const priceChanges = await client.query(
        `
        WITH price_history AS (
          SELECT 
            ii.product_name,
            ii.purchase_price,
            ib.batch_date,
            LAG(ii.purchase_price) OVER (PARTITION BY ii.product_name ORDER BY ib.batch_date) as prev_price
          FROM inventory_items ii
          JOIN inventory_batches ib ON ii.batch_id = ib.id
          WHERE ib.batch_date >= CURRENT_DATE - INTERVAL '30 days'
        )
        SELECT 
          product_name,
          purchase_price,
          prev_price,
          batch_date,
          ROUND(((purchase_price - prev_price) / prev_price * 100)::numeric, 2) as change_percent
        FROM price_history
        WHERE prev_price IS NOT NULL 
          AND ABS((purchase_price - prev_price) / prev_price * 100) >= $1
          AND batch_date = CURRENT_DATE
      `,
        [thresholdMap.price_change_percent || 15]
      );

      for (const change of priceChanges.rows) {
        const direction = change.change_percent > 0 ? "выросла" : "упала";
        await client.query(
          `
          INSERT INTO calendar_events (event_date, event_type, title, description, priority, is_auto_generated)
          VALUES ($1, 'price_change', 'Изменение цены', $2, 'medium', true)
        `,
          [
            today,
            `${change.product_name}: цена ${direction} на ${Math.abs(
              change.change_percent
            )}%`,
          ]
        );
        eventsCreated++;
      }

      await client.query("COMMIT");

      res.json({
        success: true,
        message: `Создано ${eventsCreated} событий`,
        eventsCreated,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error generating events:", error);
      res
        .status(500)
        .json({ success: false, error: "Ошибка при генерации событий" });
    } finally {
      client.release();
    }
  });

  return router;
};
