const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");

// Настройка загрузки файлов
const uploadDir = path.join(__dirname, "../public/uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "inventory-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// Helper: проверить существование файла на диске
const fileExists = (filePath) => {
  if (!filePath) return false;
  try {
    let checkPath = filePath;

    // Если это абсолютный URL (http://... or https://...), извлечем путь
    if (filePath.startsWith("http")) {
      try {
        const { URL } = require("url");
        const urlObj = new URL(filePath);
        checkPath = urlObj.pathname; // e.g., /uploads/inventory-...
      } catch (e) {
        return false;
      }
    }

    // Если это относительный URL вроде /uploads/file, извлечем имя файла
    if (checkPath.startsWith("/uploads/")) {
      checkPath = checkPath.replace("/uploads/", "");
    }

    const fullPath = path.join(uploadDir, checkPath);
    return fs.existsSync(fullPath);
  } catch (e) {
    return false;
  }
};

module.exports = (pool, logger) => {
  // =============================================
  // УПРАВЛЕНИЕ ПОЗИЦИЯМИ ТОВАРОВ В ФУРАХ
  // =============================================

  // Получить доступные категории со складу (только категории, которые есть в товарах)
  router.get("/categories/available", async (req, res) => {
    try {
      // КРИТИЧНО: Только категории товаров которые в наличии (quantity > 0 и product_id IS NOT NULL)
      const result = await pool.query(
        `SELECT DISTINCT category FROM inventory_items 
         WHERE category IS NOT NULL 
         AND category != '' 
         AND quantity > 0 
         AND product_id IS NOT NULL
         ORDER BY category ASC`,
      );

      res.json({
        success: true,
        data: result.rows.map((row) => ({
          name: row.category,
        })),
      });
    } catch (error) {
      logger.error("inventory-items.categories.available", error.message, {
        error,
      });
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Получить все доступные товары со склада (для главной страницы)
  router.get("/all-available", async (req, res) => {
    try {
      // ЗАПРЕТИТЬ КЭШИРОВАНИЕ!
      res.set({
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
      });

      const hostBase =
        process.env.PUBLIC_BASE_URL || req.protocol + "://" + req.get("host");

      // КРИТИЧНО: Только товары которые связаны с products!
      const result = await pool.query(
        `SELECT ii.id, ii.product_id, ii.name, ii.category, ii.price, ii.quantity, ii.photo_url, 
                ii.notes, ii.height, ii.created_at, ii.truck_id,
                COALESCE(p.price_per_unit, ii.price) as price_per_unit,
                COALESCE(p.price_per_box, NULL) as price_per_box,
                COALESCE(p.stock_quantity, ii.quantity) as stock_quantity
         FROM inventory_items ii
         LEFT JOIN products p ON ii.product_id = p.id
         WHERE ii.quantity > 0 AND ii.product_id IS NOT NULL
         ORDER BY ii.created_at DESC`,
      );

      // Преобразуем в формат для фронтенда
      const mapped = result.rows
        .map((r) => {
          // ГЛАВНОЕ: id ВСЕГДА = product_id (для cart API)
          if (!r.product_id) {
            console.warn(`[WARN] Item ${r.id} has no product_id, skipping`);
            return null;
          }
          return {
            id: r.product_id, // *** ОБЯЗАТЕЛЬНО product_id ***
            name: r.name,
            category: r.category,
            price: r.price,
            price_per_unit: r.price_per_unit,
            price_per_box: r.price_per_box,
            quantity: r.quantity,
            stock_quantity: r.stock_quantity,
            photo_url: r.photo_url
              ? r.photo_url.startsWith("http")
                ? r.photo_url
                : hostBase + r.photo_url
              : null,
            notes: r.notes,
            height: r.height,
            created_at: r.created_at,
            truck_id: r.truck_id,
          };
        })
        .filter((x) => x !== null);

      console.log(`[API] Returning ${mapped.length} available items`);
      res.json({
        success: true,
        data: mapped,
      });
    } catch (error) {
      logger.error("inventory-items.all-available", error.message, { error });
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Получить все позиции для фуры (с fallback на изображение из каталога)
  router.get("/truck/:truckId", async (req, res) => {
    try {
      const { truckId } = req.params;

      const result = await pool.query(
        `SELECT ii.id, ii.truck_id, ii.name, ii.variety, ii.price, ii.quantity, ii.photo_url, ii.notes, ii.category, ii.height, ii.created_at, ii.updated_at, COALESCE(ii.photo_url, p.image_url) AS photo_url_fallback
         FROM inventory_items ii
         LEFT JOIN products p ON lower(p.name) = lower(ii.name) AND (p.variety = ii.variety OR (ii.variety IS NULL AND p.variety IS NULL))
         WHERE ii.truck_id = $1 
         ORDER BY ii.created_at DESC`,
        [truckId],
      );

      // Преобразуем относительные photo_url в абсолютные URL; используем fallback из каталога; проверяем наличие файла
      const hostBase =
        process.env.PUBLIC_BASE_URL || req.protocol + "://" + req.get("host");
      const mapped = result.rows.map((r) => {
        let photoUrl = r.photo_url || r.photo_url_fallback;

        // Проверяем существование файла; если не существует - используем fallback из каталога
        if (photoUrl && !fileExists(photoUrl)) {
          logger.warn(
            `⚠️ Photo file not found for item ${r.id}: ${photoUrl}, trying fallback`,
          );
          photoUrl = r.photo_url_fallback;
        }

        // Ещё раз проверяем fallback
        if (photoUrl && !fileExists(photoUrl)) {
          logger.warn(
            `⚠️ Fallback photo also not found for item ${r.id}: ${photoUrl}`,
          );
          photoUrl = null;
        }

        return {
          ...r,
          photo_url: photoUrl
            ? photoUrl.startsWith("http")
              ? photoUrl
              : hostBase + photoUrl
            : null,
        };
      });

      res.json({
        success: true,
        data: mapped,
      });
    } catch (error) {
      logger.error("inventory-items.get", error.message, { error });
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Создать новую позицию
  router.post("/", upload.single("photo"), async (req, res) => {
    try {
      const {
        truck_id,
        name,
        variety,
        price,
        quantity,
        notes,
        category,
        height,
      } = req.body;

      // Temporary debug logging to verify incoming payload (category/height)
      try {
        logger.info("inventory-items.create.incoming", {
          truck_id,
          name,
          variety,
          price,
          quantity,
          notes,
          category,
          height,
          hasFile: !!req.file,
          photo_url_body: req.body.photo_url || null,
        });
      } catch (logErr) {
        // non-fatal
        console.warn("Logging failed:", logErr && logErr.message);
      }

      // Если файл загружен — используем путь к нему, иначе допускаем передачу photo_url в теле (например из каталога)
      let photo_url = null;

      if (req.file) {
        const uploadedPath = `/uploads/${req.file.filename}`;
        // Проверяем, что файл действительно существует на диске
        const fullPath = path.join(uploadDir, req.file.filename);
        if (fs.existsSync(fullPath)) {
          photo_url = uploadedPath;
          logger.info(`✅ Photo uploaded successfully: ${uploadedPath}`);
        } else {
          logger.error(`❌ Uploaded file not found on disk: ${fullPath}`);
          // Удаляем файл из памяти, если это была бы мультипартная загрузка
          if (req.file) {
            fs.unlink(fullPath, (err) => {
              if (err) logger.error("file-delete", err.message);
            });
          }
        }
      } else if (req.body.photo_url && fileExists(req.body.photo_url)) {
        photo_url = req.body.photo_url;
      }

      if (!truck_id || !name || !price) {
        // Do not delete uploaded files on validation error — keep uploads for audit
        if (req.file) {
          logger.info(
            `Uploaded file retained on validation error: /uploads/${req.file.filename}`,
          );
        }
        return res.status(400).json({
          success: false,
          error: "Обязательны: truck_id, name, price",
        });
      }

      // Попробуем найти существующую позицию в той же фуре по имени+виду — если найдена, сделаем merge
      const found = await pool.query(
        `SELECT * FROM inventory_items WHERE truck_id = $1 AND lower(name) = lower($2) AND (variety = $3 OR ($3 IS NULL AND variety IS NULL)) LIMIT 1`,
        [truck_id, name, variety || null],
      );

      let createdItem = null;

      if (found.rows.length > 0) {
        const existing = found.rows[0];
        const addQty = parseInt(quantity) || 0;
        const newQty = (existing.quantity || 0) + addQty;
        const newPrice =
          price !== undefined && price !== null && price !== ""
            ? price
            : existing.price;
        let newPhotoUrl = existing.photo_url;

        if (req.file && photo_url) {
          // Keep old images on disk; mark that photo was replaced in DB but do not delete files
          newPhotoUrl = photo_url;
          logger.info(
            `🔄 Inventory item photo updated (file kept): ${photo_url}`,
          );
        } else if (photo_url && !existing.photo_url) {
          // If photo provided from catalog, use it; do not delete any files
          newPhotoUrl = photo_url;
          logger.info(
            `📸 Inventory item photo added from catalog: ${photo_url}`,
          );
        }

        const updateRes = await pool.query(
          `UPDATE inventory_items SET quantity = $1, price = $2, photo_url = $3, notes = COALESCE($4, notes), category = COALESCE($5, category), height = COALESCE($6, height), updated_at = now() WHERE id = $7 RETURNING *`,
          [
            newQty,
            newPrice,
            newPhotoUrl,
            notes || null,
            category || null,
            height || null,
            existing.id,
          ],
        );

        createdItem = updateRes.rows[0];
      } else {
        const insertRes = await pool.query(
          `INSERT INTO inventory_items (truck_id, name, variety, price, quantity, photo_url, notes, category, height) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
         RETURNING *`,
          [
            truck_id,
            name,
            variety || null,
            price,
            quantity || 0,
            photo_url,
            notes || null,
            category || null,
            height || null,
          ],
        );

        createdItem = insertRes.rows[0];
        logger.info(
          `📦 Inventory item created: id=${createdItem.id}, name=${name}, photo_url=${photo_url || "NONE"}`,
        );
      }

      // Логируем результат для отладки
      if (createdItem) {
        logger.info(
          `✨ Final item state: id=${createdItem.id}, name=${createdItem.name}, photo_url=${createdItem.photo_url || "EMPTY"}`,
        );
      }

      // Попытка добавить/обновить каталог — выполняем и ждём, но не откатываем основную вставку при ошибке
      try {
        const existing = await pool.query(
          `SELECT id FROM products WHERE lower(name) = lower($1) AND (variety = $2 OR ($2 IS NULL AND variety IS NULL)) LIMIT 1`,
          [name, variety || null],
        );

        let productId = null;

        if (existing.rows.length === 0) {
          const prodRes = await pool.query(
            `INSERT INTO products (name, category, price_per_unit, variety, created_at, updated_at) 
               VALUES ($1, $2, $3, $4, now(), now()) RETURNING id`,
            [name, category || "uncategorized", price, variety || null],
          );
          productId = prodRes.rows[0].id;
        } else {
          productId = existing.rows[0].id;
        }

        // Если в запросе пришла категория и в products она пустая или 'uncategorized', обновим её
        if (productId && category) {
          try {
            const cur = await pool.query(
              `SELECT category FROM products WHERE id = $1 LIMIT 1`,
              [productId],
            );
            const existingCat = cur.rows[0] && cur.rows[0].category;
            if (!existingCat || existingCat === "uncategorized") {
              await pool.query(
                `UPDATE products SET category = $1 WHERE id = $2`,
                [category, productId],
              );
            }
          } catch (updErr) {
            logger.warn("product.category.update.failed", updErr.message, {
              err: updErr,
            });
          }
        }

        // Попробуем сохранить image_url в колонку products.image_url если она существует
        if (photo_url && productId) {
          try {
            await pool.query(
              `UPDATE products SET image_url = $1 WHERE id = $2`,
              [photo_url, productId],
            );
          } catch (imgColErr) {
            // Если колонки image_url нет — попытаемся записать в product_images
            try {
              await pool.query(
                `INSERT INTO product_images (product_id, image_url, is_primary, created_at) VALUES ($1, $2, true, now())`,
                [productId, photo_url],
              );
            } catch (imgErr) {
              logger.warn("product_images insert failed", imgErr.message, {
                err: imgErr,
              });
            }
          }
        }
        // Попробуем привязать текущую запись inventory_items к product_id
        try {
          if (productId && createdItem && createdItem.id) {
            await pool.query(
              `UPDATE inventory_items SET product_id = $1 WHERE id = $2`,
              [productId, createdItem.id],
            );
            logger.info(
              `Linked inventory_item id=${createdItem.id} to product id=${productId}`,
            );
          }
        } catch (linkErr) {
          logger.warn(
            "inventory-items.link-to-product.failed",
            linkErr.message,
            { err: linkErr },
          );
        }
      } catch (catErr) {
        logger.warn("Catalog upsert skipped", catErr.message, { err: catErr });
      }

      res.json({ success: true, data: createdItem });
    } catch (error) {
      // Удалить загруженный файл при ошибке
      if (req.file) {
        fs.unlink(path.join(uploadDir, req.file.filename), (err) => {
          if (err) logger.error("file-delete", err.message);
        });
      }
      logger.error("inventory-items.create", error.message, { error });
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Обновить позицию
  router.put("/:itemId", upload.single("photo"), async (req, res) => {
    try {
      const { itemId } = req.params;
      const { name, variety, price, quantity, notes, category, height } =
        req.body;

      // Получить текущие данные
      const currentItem = await pool.query(
        `SELECT * FROM inventory_items WHERE id = $1`,
        [itemId],
      );

      if (currentItem.rows.length === 0) {
        if (req.file) {
          fs.unlink(path.join(uploadDir, req.file.filename), (err) => {
            if (err) logger.error("file-delete", err.message);
          });
        }
        return res
          .status(404)
          .json({ success: false, error: "Позиция не найдена" });
      }

      let photo_url = currentItem.rows[0].photo_url;

      // Если загружено новое фото, удалить старое
      if (req.file) {
        const fullPath = path.join(uploadDir, req.file.filename);
        if (fs.existsSync(fullPath)) {
          // Do not delete existing files; update DB reference and keep files on disk
          photo_url = `/uploads/${req.file.filename}`;
          logger.info(`✅ Photo processed for item ${itemId}: ${photo_url}`);
        } else {
          logger.error(`❌ Uploaded file not found on disk: ${fullPath}`);
          // We cannot delete a non-existent file; just log the condition
        }
      }

      const result = await pool.query(
        `UPDATE inventory_items 
         SET name = COALESCE($1, name), 
             variety = COALESCE($2, variety), 
             price = COALESCE($3, price), 
             quantity = COALESCE($4, quantity), 
             photo_url = COALESCE($5, photo_url),
             notes = COALESCE($6, notes),
             category = COALESCE($7, category),
             height = COALESCE($8, height)
         WHERE id = $9 
         RETURNING *`,
        [
          name || null,
          variety || null,
          price || null,
          quantity || null,
          photo_url,
          notes || null,
          category || null,
          height || null,
          itemId,
        ],
      );

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      if (req.file) {
        fs.unlink(path.join(uploadDir, req.file.filename), (err) => {
          if (err) logger.error("file-delete", err.message);
        });
      }
      logger.error("inventory-items.update", error.message, { error });
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Удалить позицию
  router.delete("/:itemId", async (req, res) => {
    try {
      const { itemId } = req.params;

      // Получить данные для удаления файла
      const item = await pool.query(
        `SELECT photo_url FROM inventory_items WHERE id = $1`,
        [itemId],
      );

      if (item.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, error: "Позиция не найдена" });
      }

      // Do not remove files from uploads on delete — keep files for audit/history
      // Remove DB row linking to the item
      await pool.query(`DELETE FROM inventory_items WHERE id = $1`, [itemId]);

      res.json({ success: true, message: "Позиция удалена" });
    } catch (error) {
      logger.error("inventory-items.delete", error.message, { error });
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get total inventory value for a truck (сумма остатков)
  router.get("/truck/:truckId/total", async (req, res) => {
    try {
      const { truckId } = req.params;

      const result = await pool.query(
        `SELECT COALESCE(SUM(ii.price * ii.quantity), 0) AS total_value,
                COALESCE(SUM(ii.quantity), 0) AS total_items
         FROM inventory_items ii
         WHERE ii.truck_id = $1`,
        [truckId],
      );

      const row = result.rows[0];
      res.json({
        success: true,
        truckId,
        totalValue: parseFloat(row.total_value || 0),
        totalItems: parseInt(row.total_items || 0),
      });
    } catch (error) {
      logger.error("inventory-items.total", error.message, { error });
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get total of all goods that were ever on truck (current inventory + sold items)
  // Получить сумму всех товаров, которые были когда-либо на фуре (текущие остатки + проданные)
  router.get("/truck/:truckId/all-goods-total", async (req, res) => {
    try {
      const { truckId } = req.params;

      // Current inventory value
      const inventoryResult = await pool.query(
        `SELECT COALESCE(SUM(ii.price * ii.quantity), 0) AS total_value
         FROM inventory_items ii
         WHERE ii.truck_id = $1`,
        [truckId],
      );
      const inventoryValue = parseFloat(
        inventoryResult.rows[0].total_value || 0,
      );

      // Sold items value (from delivered orders)
      const soldResult = await pool.query(
        `SELECT COALESCE(SUM(
           oi.quantity *
           CASE
             WHEN p.price_per_unit IS NOT NULL
                  AND oi.unit_price IS NOT NULL
                  AND oi.unit_price / NULLIF(p.price_per_unit,0) = 50
             THEN oi.unit_price / 50
             ELSE oi.unit_price
           END
         ), 0) as sold_value
         FROM orders o
         JOIN order_items oi ON o.id = oi.order_id
         LEFT JOIN products p ON oi.product_id = p.id
         WHERE (o.truck_id = $1 OR oi.truck_id = $1)
           AND o.status = 'delivered'
           AND o.payment_status != 'refunded'`,
        [truckId],
      );
      const soldValue = parseFloat(soldResult.rows[0].sold_value || 0);

      const totalAllGoods = inventoryValue + soldValue;

      res.json({
        success: true,
        truckId,
        currentInventory: inventoryValue,
        soldItems: soldValue,
        allGoodsTotal: totalAllGoods,
      });
    } catch (error) {
      logger.error("inventory-items.all-goods-total", error.message, {
        error,
      });
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get sales analytics for truck items by date range
  // Получить аналитику продаж по позициям фуры за период
  router.get("/truck/:truckId/sales-analytics", async (req, res) => {
    try {
      const { truckId } = req.params;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: "startDate and endDate parameters are required",
        });
      }

      // Get all inventory items for this truck (ever existed, not deleted)
      const itemsResult = await pool.query(
        `SELECT DISTINCT ii.id, ii.name, ii.variety, ii.price, ii.quantity as initial_quantity
         FROM inventory_items ii
         WHERE ii.truck_id = $1
         ORDER BY ii.name, ii.variety`,
        [truckId],
      );

      const analytics = [];

      for (const item of itemsResult.rows) {
        // Total quantity ever on truck (initial + any additions, excluding deletions)
        const totalEverResult = await pool.query(
          `SELECT COALESCE(SUM(quantity), 0) as total_ever
           FROM inventory_items
           WHERE truck_id = $1 AND name = $2 AND (variety = $3 OR (variety IS NULL AND $3 IS NULL))`,
          [truckId, item.name, item.variety],
        );
        const totalEver = parseInt(totalEverResult.rows[0].total_ever || 0);

        // Quantity sold before endDate
        const soldBeforeResult = await pool.query(
          `SELECT COALESCE(SUM(oi.quantity), 0) as sold_before
           FROM orders o
           JOIN order_items oi ON o.id = oi.order_id
           LEFT JOIN products p ON oi.product_id = p.id
           WHERE (o.truck_id = $1 OR oi.truck_id = $1)
             AND p.name = $2
             AND (p.variety = $3 OR (p.variety IS NULL AND $3 IS NULL))
             AND o.status = 'delivered'
             AND o.payment_status != 'refunded'
             AND o.created_at < $4`,
          [truckId, item.name, item.variety, endDate],
        );
        const soldBefore = parseInt(soldBeforeResult.rows[0].sold_before || 0);

        // Calculate sales percentage
        const salesPercentage =
          totalEver > 0 ? (soldBefore / totalEver) * 100 : 0;

        analytics.push({
          item_id: item.id,
          name: item.name,
          variety: item.variety,
          total_ever: totalEver,
          sold_before_date: soldBefore,
          sales_percentage: Math.round(salesPercentage * 100) / 100, // Round to 2 decimal places
        });
      }

      // Calculate average sales percentage
      const avgPercentage =
        analytics.length > 0
          ? analytics.reduce((sum, item) => sum + item.sales_percentage, 0) /
            analytics.length
          : 0;

      res.json({
        success: true,
        truckId,
        startDate,
        endDate,
        items: analytics,
        average_sales_percentage: Math.round(avgPercentage * 100) / 100,
      });
    } catch (error) {
      logger.error("inventory-items.sales-analytics", error.message, { error });
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
};
