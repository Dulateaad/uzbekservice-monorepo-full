const express = require("express");
const router = express.Router();

module.exports = (pool, logger) => {
  // Helper: преобразовать относительный путь в абсолютный URL с логированием
  const getAbsoluteImageUrl = (imageUrl, req) => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith("http")) return imageUrl;

    const hostBase =
      process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`;
    const absoluteUrl = `${hostBase}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;

    console.log(`🖼️  Image URL converted: "${imageUrl}" → "${absoluteUrl}"`);
    return absoluteUrl;
  };

  // ============ PUBLIC ROUTES ============

  // Получить все цветы (доступно всем)
  router.get("/", async (req, res) => {
    try {
      // Попытка выбрать основной image либо из колонки products.image_url, либо из product_images
      try {
        const result = await pool.query(
          `SELECT p.id, p.name, p.category, p.color, p.variety, p.description, p.price_per_unit,
                  p.price_per_box, p.stock_quantity, p.min_order_quantity, p.stem_length,
                  p.packaging_type, COALESCE(p.image_url, pi.image_url) AS image_url, p.next_delivery_date, p.created_at
           FROM products p
           LEFT JOIN (
             SELECT product_id, image_url FROM product_images WHERE is_primary = true
           ) pi ON pi.product_id = p.id
           ORDER BY p.created_at DESC`,
        );

        // Преобразуем относительные пути изображений в абсолютные URL
        // и добавляем поле `height` для совместимости с фронтендом (в базе хранится `stem_length`)
        const mapped = result.rows.map((r) => ({
          ...r,
          image_url: getAbsoluteImageUrl(r.image_url, req),
          height: r.stem_length || null,
        }));

        console.log(`📦 Returning ${mapped.length} products with images`);
        return res.json({ success: true, products: mapped });
      } catch (innerErr) {
        console.warn(
          "Products query with images failed, falling back:",
          innerErr.message,
        );
        // Фоллбек — вернуть товары без join (если таблицы нет)
        const fallback = await pool.query(
          `SELECT id, name, category, color, variety, description, price_per_unit,
                  price_per_box, stock_quantity, min_order_quantity, stem_length,
                  packaging_type, image_url, next_delivery_date, created_at
           FROM products
           ORDER BY created_at DESC`,
        );

        const mappedFallback = fallback.rows.map((r) => ({
          ...r,
          image_url: getAbsoluteImageUrl(r.image_url, req),
          height: r.stem_length || null,
        }));

        console.log(
          `📦 Returning ${mappedFallback.length} products (fallback mode) with images`,
        );
        return res.json({ success: true, products: mappedFallback });
      }
    } catch (error) {
      console.error("❌ Get products error:", error);
      res.status(500).json({ error: "Ошибка при получении каталога" });
    }
  });

  // Получить один цветок по ID
  router.get("/:id", async (req, res) => {
    const { id } = req.params;

    try {
      try {
        const result = await pool.query(
          `SELECT p.*, COALESCE(p.image_url, pi.image_url) AS image_url
           FROM products p
           LEFT JOIN (
             SELECT product_id, image_url FROM product_images WHERE is_primary = true
           ) pi ON pi.product_id = p.id
           WHERE p.id = $1`,
          [id],
        );

        if (result.rows.length === 0) {
          return res.status(404).json({ error: "Товар не найден" });
        }

        const row = result.rows[0];
        row.image_url = getAbsoluteImageUrl(row.image_url, req);
        // Add height alias for frontend
        row.height = row.stem_length || null;
        console.log(`🖼️  Product ${id}: image_url = ${row.image_url}`);
        return res.json({ success: true, product: row });
      } catch (innerErr) {
        console.warn(
          "Product by id query with images failed, falling back:",
          innerErr.message,
        );
        const fallback = await pool.query(
          `SELECT * FROM products WHERE id = $1`,
          [id],
        );
        if (fallback.rows.length === 0) {
          return res.status(404).json({ error: "Товар не найден" });
        }
        const row = fallback.rows[0];
        row.image_url = getAbsoluteImageUrl(row.image_url, req);
        console.log(
          `🖼️  Product ${id} (fallback): image_url = ${row.image_url}`,
        );
        return res.json({ success: true, product: row });
      }
    } catch (error) {
      console.error("❌ Get product error:", error);
      res.status(500).json({ error: "Ошибка при получении товара" });
    }
  });

  // ============ ADMIN & WORKER ROUTES ============

  // Добавить новый цветок (admin или worker)
  router.post("/", async (req, res) => {
    const {
      userId,
      name,
      category,
      color,
      variety,
      description,
      price_per_unit,
      price_per_box,
      stock_quantity,
      min_order_quantity,
      stem_length,
      height,
      packaging_type,
      image_url,
      next_delivery_date,
    } = req.body;

    // Accept both `stem_length` and `height` from frontend; prefer `stem_length` when provided
    const finalStemLength = stem_length ?? height ?? null;

    try {
      // Проверка прав (admin или worker)
      const userCheck = await pool.query(
        "SELECT role FROM users WHERE id = $1",
        [userId],
      );
      if (
        userCheck.rows.length === 0 ||
        !["admin", "worker"].includes(userCheck.rows[0].role)
      ) {
        return res.status(403).json({
          error:
            "Доступ запрещен. Требуются права администратора или работника",
        });
      }

      const result = await pool.query(
        `INSERT INTO products 
         (name, category, color, variety, description, price_per_unit, price_per_box, 
          stock_quantity, min_order_quantity, stem_length, packaging_type, image_url, next_delivery_date) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) 
         RETURNING *`,
        [
          name,
          category,
          color,
          variety,
          description,
          price_per_unit,
          price_per_box,
          stock_quantity,
          min_order_quantity,
          finalStemLength,
          packaging_type,
          image_url,
          next_delivery_date,
        ],
      );

      // Ensure returned product contains `height` for frontend convenience
      const product = result.rows[0];
      product.height = product.stem_length || null;

      res.status(201).json({
        success: true,
        message: "Товар успешно добавлен",
        product,
      });
    } catch (error) {
      console.error("Add product error:", error);
      res.status(500).json({ error: "Ошибка при добавлении товара" });
    }
  });

  // Редактировать цветок (admin или worker)
  router.put("/:id", async (req, res) => {
    const { id } = req.params;
    const {
      userId,
      name,
      category,
      color,
      variety,
      description,
      price_per_unit,
      price_per_box,
      stock_quantity,
      min_order_quantity,
      stem_length,
      height,
      packaging_type,
      image_url,
      next_delivery_date,
    } = req.body;

    const finalStemLength = stem_length ?? height ?? null;

    try {
      // Проверка прав
      const userCheck = await pool.query(
        "SELECT role FROM users WHERE id = $1",
        [userId],
      );
      if (
        userCheck.rows.length === 0 ||
        !["admin", "worker"].includes(userCheck.rows[0].role)
      ) {
        return res.status(403).json({ error: "Доступ запрещен" });
      }

      const result = await pool.query(
        `UPDATE products 
         SET name = $1, category = $2, color = $3, variety = $4, description = $5,
             price_per_unit = $6, price_per_box = $7, stock_quantity = $8,
             min_order_quantity = $9, stem_length = $10, packaging_type = $11,
             image_url = $12, next_delivery_date = $13
         WHERE id = $14 
         RETURNING *`,
        [
          name,
          category,
          color,
          variety,
          description,
          price_per_unit,
          price_per_box,
          stock_quantity,
          min_order_quantity,
          finalStemLength,
          packaging_type,
          image_url,
          next_delivery_date,
          id,
        ],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Товар не найден" });
      }

      const product = result.rows[0];
      product.height = product.stem_length || null;

      res.json({
        success: true,
        message: "Товар успешно обновлен",
        product,
      });
    } catch (error) {
      console.error("Update product error:", error);
      res.status(500).json({ error: "Ошибка при обновлении товара" });
    }
  });

  // Удалить цветок (admin или worker)
  router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    const { adminId } = req.query;
    console.log(`DELETE /products/${id} called by adminId=${adminId}`);

    try {
      // Проверка прав (admin или worker)
      const userCheck = await pool.query(
        "SELECT role FROM users WHERE id = $1",
        [adminId],
      );
      if (
        userCheck.rows.length === 0 ||
        !["admin", "worker"].includes(userCheck.rows[0].role)
      ) {
        return res.status(403).json({
          error:
            "Доступ запрещен. Требуются права администратора или работника",
        });
      }

      // Безопасное удаление: разорвать все FK связи ПЕРЕД удалением товара
      // Каждый UPDATE выполняется в отдельной транзакции (вне явного BEGIN/COMMIT)
      // это безопаснее чем one big transaction с try/catch
      console.log(`[DELETE] Starting delete for product ${id}`);

      // 1. Обновить order_items (разорвать FK связь)
      try {
        const orderResult = await pool.query(
          "UPDATE order_items SET product_id = NULL WHERE product_id = $1",
          [id],
        );
        console.log(
          `[DELETE] Updated ${orderResult.rowCount} rows in order_items`,
        );
      } catch (err) {
        console.error("[DELETE] Failed to update order_items:", err.message);
        // Критичная ошибка - таблица должна существовать
        // но продолжаем попытку удалить остальные связи
      }

      // 2. Обновить preorders (разорвать FK связь)
      try {
        const preorderResult = await pool.query(
          "UPDATE preorders SET product_id = NULL WHERE product_id = $1",
          [id],
        );
        console.log(
          `[DELETE] Updated ${preorderResult.rowCount} rows in preorders`,
        );
      } catch (err) {
        console.error("[DELETE] Failed to update preorders:", err.message);
        // Таблица может не использоваться, продолжить
      }

      // 3. Обновить cart_items (разорвать FK связь)
      try {
        const cartResult = await pool.query(
          "UPDATE cart_items SET product_id = NULL WHERE product_id = $1",
          [id],
        );
        console.log(
          `[DELETE] Updated ${cartResult.rowCount} rows in cart_items`,
        );
      } catch (err) {
        console.error("[DELETE] Failed to update cart_items:", err.message);
        // Таблица может не использоваться
      }

      // 4. Обновить inventory_items (разорвать FK связь)
      try {
        const inventoryResult = await pool.query(
          "UPDATE inventory_items SET product_id = NULL WHERE product_id = $1",
          [id],
        );
        console.log(
          `[DELETE] Updated ${inventoryResult.rowCount} rows in inventory_items`,
        );
      } catch (err) {
        console.error(
          "[DELETE] Failed to update inventory_items:",
          err.message,
        );
      }

      // 5. Удалить product_images если существует
      try {
        const imgResult = await pool.query(
          "DELETE FROM product_images WHERE product_id = $1",
          [id],
        );
        console.log(
          `[DELETE] Deleted ${imgResult.rowCount} rows from product_images`,
        );
      } catch (err) {
        console.warn(
          "[DELETE] product_images delete failed (table may not exist):",
          err.message,
        );
      }

      // 6. Теперь удалить сам товар (все FK связи должны быть разорваны)
      const result = await pool.query(
        "DELETE FROM products WHERE id = $1 RETURNING name",
        [id],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Товар не найден" });
      }

      console.log(
        `[DELETE] Successfully deleted product: ${result.rows[0].name}`,
      );

      res.json({
        success: true,
        message: `Товар "${result.rows[0].name}" успешно удален`,
      });
    } catch (error) {
      console.error("Delete product error:", error);
      const errorMsg = error.message || "Неизвестная ошибка";

      // Если ошибка FK constraint, значит какая-то связь не разорвана
      if (errorMsg.includes("constraint") || errorMsg.includes("fkey")) {
        console.error(
          "[DELETE] FK constraint violation - some relationship not cleared",
          errorMsg,
        );
        return res.status(409).json({
          error: "Не удалось удалить товар: есть связанные данные",
          detail: errorMsg,
        });
      }

      res.status(500).json({
        error: "Ошибка при удалении товара",
        detail: errorMsg,
      });
    }
  });

  return router;
};
