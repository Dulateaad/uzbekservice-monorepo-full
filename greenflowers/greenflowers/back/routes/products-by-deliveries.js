const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");

module.exports = (pool, logger) => {
  // Helper: проверить существование файла на диске
  const fileExists = (filePath) => {
    if (!filePath) return false;
    try {
      let checkPath = filePath;

      if (filePath.startsWith("http")) {
        try {
          const { URL } = require("url");
          const urlObj = new URL(filePath);
          checkPath = urlObj.pathname;
        } catch (e) {
          return false;
        }
      }

      if (checkPath.startsWith("/uploads/")) {
        checkPath = checkPath.replace("/uploads/", "");
      }

      const uploadDir = path.join(__dirname, "../public/uploads");
      const fullPath = path.join(uploadDir, checkPath);
      return fs.existsSync(fullPath);
    } catch (e) {
      return false;
    }
  };

  // Helper: преобразовать URL в абсолютный
  const getAbsoluteImageUrl = (imageUrl, req) => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith("http")) return imageUrl;

    const hostBase =
      process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`;
    const absoluteUrl = `${hostBase}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;

    return absoluteUrl;
  };

  // =============================================
  // API: Получить товары, сгруппированные по датам поставок (партиям)
  // =============================================

  /**
   * GET /catalog/batches
   * Возвращает список партий поставок с товарами внутри каждой партии
   * Синхронизировано со складом (inventory_batches, inventory_items)
   *
   * Query params:
   * - limit: количество партий для отображения (default: 10)
   * - offset: смещение (для пагинации)
   * - sortBy: "date" | "date_desc" (default: "date_desc")
   * - includeFresh: boolean (показать ли только "свежие" поставки, default: false)
   *
   * Response:
   * {
   *   success: true,
   *   batches: [
   *     {
   *       id: 1,
   *       batch_date: "2026-02-22",
   *       delivery_date: "2026-02-22",
   *       supplier_name: "Поставщик",
   *       total_items: 120,
   *       is_recent: true (новая партия),
   *       age_days: 0,
   *       status: "received",
   *       items: [
   *         {
   *           id: 1,
   *           name: "Роза",
   *           variety: "Red Deep",
   *           quantity: 50,
   *           selling_price: 120.00,
   *           photo_url: "http://...",
   *           color: "red"
   *         }
   *       ]
   *     }
   *   ],
   *   total_count: 25,
   *   today: "2026-02-22"
   * }
   */
  router.get("/batches", async (req, res) => {
    try {
      const {
        limit = 10,
        offset = 0,
        sortBy = "date_desc",
        includeFresh,
      } = req.query;
      const parsedLimit = Math.min(parseInt(limit) || 10, 50);
      const parsedOffset = parseInt(offset) || 0;

      // Получить текущую дату на сервере
      const todayResult = await pool.query(
        "SELECT CURRENT_DATE::text as today",
      );
      const today =
        todayResult.rows[0]?.today || new Date().toISOString().split("T")[0];

      // Получить все truck (партии доставки) с количеством товаров
      let batchQuery = `
        SELECT 
          t.id,
          t.arrival_date as batch_date,
          t.identifier as supplier_name,
          t.status,
          t.notes,
          COUNT(ii.id) as total_items,
          (CURRENT_DATE - DATE(t.arrival_date)) as age_days
        FROM trucks t
        LEFT JOIN inventory_items ii ON t.id = ii.truck_id
        WHERE t.status IS NOT NULL
      `;

      // Если указан флаг includeFresh, показать только новые (последние 3 дня)
      if (includeFresh === "true") {
        batchQuery += ` AND (CURRENT_DATE - DATE(t.arrival_date)) <= 3`;
      }

      batchQuery += ` GROUP BY t.id, t.arrival_date, t.identifier, t.status, t.notes`;

      // Сортировка
      if (sortBy === "date_asc") {
        batchQuery += ` ORDER BY t.arrival_date ASC`;
      } else {
        batchQuery += ` ORDER BY t.arrival_date DESC`;
      }

      batchQuery += ` LIMIT $1 OFFSET $2`;

      const batchResult = await pool.query(batchQuery, [
        parsedLimit,
        parsedOffset,
      ]);

      // Теперь получить товары для каждого truck
      const batchesWithItems = await Promise.all(
        batchResult.rows.map(async (batch) => {
          // Получить товары этой поставки
          // ВАЖНО: Используем product_id как id (для совместимости с cart API)
          const itemsResult = await pool.query(
            `SELECT 
              COALESCE(ii.product_id, ii.id) as id,
              ii.product_id,
              ii.truck_id,
              ii.name as product_name,
              ii.name,
              ii.variety,
              ii.category,
              ii.quantity,
              ii.price as selling_price,
              ii.photo_url,
              ii.height
            FROM inventory_items ii
            WHERE ii.truck_id = $1 AND ii.quantity > 0 AND ii.product_id IS NOT NULL
            ORDER BY ii.name ASC`,
            [batch.id],
          );

          // Преобразовать относительные URL в абсолютные
          const items = itemsResult.rows.map((item) => ({
            ...item,
            photo_url: getAbsoluteImageUrl(item.photo_url, req),
            selling_price: parseFloat(item.selling_price || 0),
            quantity: parseInt(item.quantity || 0),
            height: item.height ?? null,
          }));

          // Определить, является ли партия "свежей" (0-3 дня)
          const ageDays = parseInt(batch.age_days || 0);
          const isFresh = ageDays <= 3;
          const isNew = ageDays <= 1;

          return {
            id: batch.id,
            batch_date: batch.batch_date,
            supplier_name: batch.supplier_name || "Поставка",
            total_items: parseInt(batch.total_items || 0),
            age_days: ageDays,
            is_fresh: isFresh,
            is_new: isNew,
            status: batch.status,
            notes: batch.notes,
            items: items,
          };
        }),
      );

      // Получить общее количество партий
      const countResult = await pool.query(
        "SELECT COUNT(*) as total FROM trucks WHERE status IS NOT NULL",
      );
      const totalCount = parseInt(countResult.rows[0].total || 0);

      res.json({
        success: true,
        batches: batchesWithItems,
        total_count: totalCount,
        today: today,
        pagination: {
          limit: parsedLimit,
          offset: parsedOffset,
          has_more: parsedOffset + parsedLimit < totalCount,
        },
      });
    } catch (error) {
      logger.error("products-by-deliveries.batches", error.message, { error });
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * GET /catalog/batch/:batchId
   * Получить одну партию со всеми товарами
   */
  router.get("/batch/:batchId", async (req, res) => {
    try {
      const { batchId } = req.params;

      const batchResult = await pool.query(
        `SELECT 
          t.*,
          COUNT(ii.id) as total_items
        FROM trucks t
        LEFT JOIN inventory_items ii ON t.id = ii.truck_id
        WHERE t.id = $1
        GROUP BY t.id`,
        [batchId],
      );

      if (batchResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Партия не найдена",
        });
      }

      const batch = batchResult.rows[0];

      // Получить товары
      // ВАЖНО: Используем product_id как id (для совместимости с cart API)
      const itemsResult = await pool.query(
        `SELECT 
          COALESCE(ii.product_id, ii.id) as id,
          ii.product_id,
          ii.truck_id,
          ii.name,
          ii.variety,
          ii.category,
          ii.quantity,
          ii.price as selling_price,
          ii.photo_url,
          ii.height
        FROM inventory_items ii
        WHERE ii.truck_id = $1 AND ii.quantity > 0 AND ii.product_id IS NOT NULL
        ORDER BY ii.name ASC`,
        [batchId],
      );

      const items = itemsResult.rows.map((item) => ({
        ...item,
        photo_url: getAbsoluteImageUrl(item.photo_url, req),
        selling_price: parseFloat(item.selling_price || 0),
        quantity: parseInt(item.quantity || 0),
        height: item.height ?? null,
      }));

      const ageDays = Math.floor(
        (new Date() - new Date(batch.arrival_date)) / (1000 * 60 * 60 * 24),
      );

      res.json({
        success: true,
        batch: {
          id: batch.id,
          batch_date: batch.arrival_date,
          supplier_name: batch.identifier || "Поставка",
          total_items: parseInt(batch.total_items || 0),
          age_days: ageDays,
          is_fresh: ageDays <= 3,
          is_new: ageDays <= 1,
          status: batch.status,
          notes: batch.notes,
          items: items,
        },
      });
    } catch (error) {
      logger.error("products-by-deliveries.batch", error.message, { error });
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * GET /catalog/today-deliveries
   * Получить партии, поступившие в текущий день
   */
  router.get("/today-deliveries", async (req, res) => {
    try {
      const batchResult = await pool.query(
        `SELECT 
          t.id,
          t.arrival_date as batch_date,
          t.identifier as supplier_name,
          t.status,
          COUNT(ii.id) as total_items
        FROM trucks t
        LEFT JOIN inventory_items ii ON t.id = ii.truck_id
        WHERE DATE(t.arrival_date) = CURRENT_DATE AND t.status IS NOT NULL
        GROUP BY t.id, t.arrival_date, t.identifier, t.status
        ORDER BY t.arrival_date DESC`,
      );

      const batchesWithItems = await Promise.all(
        batchResult.rows.map(async (batch) => {
          const itemsResult = await pool.query(
            `SELECT 
              ii.id,
              ii.name,
              ii.variety,
              ii.category,
              ii.quantity,
              ii.price as selling_price,
              ii.photo_url,
              ii.height
            FROM inventory_items ii
            WHERE ii.truck_id = $1 AND ii.quantity > 0`,
            [batch.id],
          );

          const items = itemsResult.rows.map((item) => ({
            ...item,
            photo_url: getAbsoluteImageUrl(item.photo_url, req),
            height: item.height ?? null,
          }));

          return {
            ...batch,
            total_items: parseInt(batch.total_items),
            items,
          };
        }),
      );

      res.json({
        success: true,
        batches: batchesWithItems,
        count: batchesWithItems.length,
      });
    } catch (error) {
      logger.error("products-by-deliveries.today", error.message, { error });
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  return router;
};
