const express = require("express");
const router = express.Router();

module.exports = (pool, logger) => {
  // =============================================
  // УПРАВЛЕНИЕ ФУРАМИ (ГРУЗОВИКАМИ)
  // =============================================

  // Получить аналитику по фурам (MUST be before /:id route)
  router.get("/analytics/summary", async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(*)::INTEGER as total_trucks,
          COUNT(CASE WHEN status = 'delivered' THEN 1 END)::INTEGER as delivered,
          COUNT(CASE WHEN status = 'in_transit' THEN 1 END)::INTEGER as in_transit,
          COUNT(CASE WHEN status = 'delayed' THEN 1 END)::INTEGER as delayed,
          COALESCE(AVG(CAST(metrics->>'quantity' AS NUMERIC)), 0)::NUMERIC as avg_quantity,
          COALESCE(SUM(CAST(metrics->>'quantity' AS NUMERIC)), 0)::NUMERIC as total_quantity
        FROM trucks
      `);

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      logger.error("trucks.analytics", error.message, { error });
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Получить все фуры с фильтрацией и пагинацией
  router.get("/", async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        identifier,
        dateFrom,
        dateTo,
        status,
        sortBy = "arrival_date",
        order = "DESC",
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      let whereConditions = [];
      const countParams = [];
      let paramIndex = 1;

      if (identifier) {
        whereConditions.push(`identifier ILIKE $${paramIndex}`);
        countParams.push(`%${identifier}%`);
        paramIndex++;
      }

      if (dateFrom) {
        whereConditions.push(`arrival_date >= $${paramIndex}`);
        countParams.push(dateFrom);
        paramIndex++;
      }

      if (dateTo) {
        whereConditions.push(`arrival_date <= $${paramIndex}`);
        countParams.push(dateTo);
        paramIndex++;
      }

      if (status) {
        whereConditions.push(`status = $${paramIndex}`);
        countParams.push(status);
        paramIndex++;
      }

      const whereClause =
        whereConditions.length > 0
          ? `WHERE ${whereConditions.join(" AND ")}`
          : "";

      // Get total count
      const countResult = await pool.query(
        `SELECT COUNT(*) as total FROM trucks ${whereClause}`,
        countParams
      );

      const total = parseInt(countResult.rows[0].total);
      const pages = Math.ceil(total / parseInt(limit));

      // Get sorted and paginated results
      const queryParams = [...countParams, parseInt(limit), offset];

      const result = await pool.query(
        `SELECT * FROM trucks ${whereClause} ORDER BY ${sortBy} ${order} LIMIT $${paramIndex} OFFSET $${
          paramIndex + 1
        }`,
        queryParams
      );

      res.json({
        success: true,
        data: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages,
        },
      });
    } catch (error) {
      logger.error("trucks.get", error.message, { error });
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Получить одну фуру по ID
  router.get("/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query("SELECT * FROM trucks WHERE id = $1", [
        id,
      ]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Truck not found",
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      logger.error("trucks.getById", error.message, {
        error,
        id: req.params.id,
      });
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Создать новую фуру
  router.post("/", async (req, res) => {
    try {
      const { identifier, arrival_date, status, notes, metrics } = req.body;

      if (!identifier || !arrival_date || !status) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: identifier, arrival_date, status",
        });
      }

      const result = await pool.query(
        `INSERT INTO trucks (identifier, arrival_date, status, notes, metrics, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING id, identifier, arrival_date, status, notes, metrics, created_at, updated_at`,
        [
          identifier,
          arrival_date,
          status,
          notes || null,
          JSON.stringify(metrics || []),
        ]
      );

      res.status(201).json({
        success: true,
        message: "Truck created successfully",
        data: {
          id: result.rows[0].id,
          ...result.rows[0],
        },
      });

      logger.info("trucks.create", `Truck created: ${identifier}`);
    } catch (error) {
      // Handle unique constraint violation
      if (error.code === "23505") {
        const message = error.detail?.includes("identifier")
          ? `Фура с идентификатором "${
              req.body?.identifier || "unknown"
            }" уже существует`
          : "Нарушено уникальное ограничение";
        logger.error("trucks.create", message, { error, body: req.body });
        return res.status(400).json({ success: false, error: message });
      }
      logger.error("trucks.create", error.message, { error, body: req.body });
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Обновить фуру
  router.put("/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { identifier, arrival_date, status, notes, metrics } = req.body;

      if (!identifier || !arrival_date || !status) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: identifier, arrival_date, status",
        });
      }

      const result = await pool.query(
        `UPDATE trucks 
         SET identifier = $1, arrival_date = $2, status = $3, notes = $4, metrics = $5, updated_at = NOW()
         WHERE id = $6
         RETURNING id, identifier, arrival_date, status, notes, metrics, created_at, updated_at`,
        [
          identifier,
          arrival_date,
          status,
          notes || null,
          JSON.stringify(metrics || []),
          id,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Truck not found",
        });
      }

      res.json({
        success: true,
        message: "Truck updated successfully",
        data: result.rows[0],
      });

      logger.info("trucks.update", `Truck updated: ${identifier}`);
    } catch (error) {
      logger.error("trucks.update", error.message, {
        error,
        id: req.params.id,
      });
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Удалить фуру
  router.delete("/:id", async (req, res) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        "DELETE FROM trucks WHERE id = $1 RETURNING id, identifier",
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Truck not found",
        });
      }

      res.json({
        success: true,
        message: "Truck deleted successfully",
        data: result.rows[0],
      });

      logger.info(
        "trucks.delete",
        `Truck deleted: ${result.rows[0].identifier}`
      );
    } catch (error) {
      logger.error("trucks.delete", error.message, {
        error,
        id: req.params.id,
      });
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Export to Excel
  router.get("/export/excel", async (req, res) => {
    try {
      const { identifier, dateFrom, dateTo, status } = req.query;

      let query = "SELECT * FROM trucks WHERE 1=1";
      const params = [];
      let paramIndex = 1;

      if (identifier) {
        query += ` AND identifier ILIKE $${paramIndex}`;
        params.push(`%${identifier}%`);
        paramIndex++;
      }
      if (dateFrom) {
        query += ` AND arrival_date >= $${paramIndex}`;
        params.push(dateFrom);
        paramIndex++;
      }
      if (dateTo) {
        query += ` AND arrival_date <= $${paramIndex}`;
        params.push(dateTo);
        paramIndex++;
      }
      if (status) {
        query += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      query += " ORDER BY arrival_date DESC";

      const result = await pool.query(query, params);
      const trucks = result.rows;

      // Create workbook
      const ExcelJS = require("exceljs");
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Trucks");

      // Add headers
      worksheet.columns = [
        { header: "ID", key: "id", width: 36 },
        { header: "Идентификатор", key: "identifier", width: 20 },
        { header: "Дата прибытия", key: "arrival_date", width: 15 },
        { header: "Статус", key: "status", width: 15 },
        { header: "Примечания", key: "notes", width: 30 },
        { header: "Создано", key: "created_at", width: 20 },
        { header: "Обновлено", key: "updated_at", width: 20 },
      ];

      // Add rows
      trucks.forEach((truck) => {
        worksheet.addRow({
          id: truck.id,
          identifier: truck.identifier,
          arrival_date: new Date(truck.arrival_date)
            .toLocaleDateString("ru-RU")
            .split(".")
            .reverse()
            .join("-"),
          status: truck.status,
          notes: truck.notes || "",
          created_at: new Date(truck.created_at).toLocaleString("ru-RU"),
          updated_at: new Date(truck.updated_at).toLocaleString("ru-RU"),
        });
      });

      // Format headers
      worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4472C4" },
      };

      // Set response headers
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="trucks-${
          new Date().toISOString().split("T")[0]
        }.xlsx"`
      );

      // Write to response
      await workbook.xlsx.write(res);
      res.end();

      logger.info(
        "trucks.export",
        `Excel export: ${trucks.length} trucks exported`
      );
    } catch (error) {
      logger.error("trucks.export", error.message, { error });
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Admin: Clear all trucks (development only)
  router.delete("/admin/clear", async (req, res) => {
    try {
      console.log("🧹 Clearing all trucks...");
      const result = await pool.query("DELETE FROM trucks");
      console.log(`✅ Deleted ${result.rowCount} trucks`);

      res.status(200).json({
        success: true,
        message: `Cleared ${result.rowCount} trucks`,
        deletedCount: result.rowCount,
      });

      logger.info("trucks.admin.clear", `Cleared ${result.rowCount} trucks`);
    } catch (error) {
      logger.error("trucks.admin.clear", error.message, { error });
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
};
