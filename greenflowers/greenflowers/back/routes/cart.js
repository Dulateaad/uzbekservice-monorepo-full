const express = require("express");
const router = express.Router();

module.exports = (pool) => {
  // Получить корзину пользователя
  router.get("/user/:userId", async (req, res) => {
    const userId = parseInt(req.params.userId, 10);

    if (isNaN(userId)) {
      return res.status(400).json({ error: "Неверный userId" });
    }

    try {
      const result = await pool.query(
        `SELECT ci.*, 
                COALESCE(p.name, 'Удалённый товар') as name,
                p.price_per_box, p.color, 
                p.variety, p.stem_length, p.packaging_type, 
                COALESCE(p.image_url, '') as image_url,
                p.min_order_quantity,
                t.arrival_date, t.identifier as truck_identifier,
                COALESCE(ci.unit_price, p.price_per_unit) as price_per_unit,
                (p.id IS NULL) as product_missing
         FROM cart_items ci
         LEFT JOIN products p ON ci.product_id = p.id
         LEFT JOIN trucks t ON ci.truck_id = t.id
         WHERE ci.user_id = $1
         ORDER BY ci.created_at DESC`,
        [userId],
      );

      // Ensure image URLs are absolute (point to API server) when they are relative
      const hostBase =
        process.env.PUBLIC_BASE_URL || req.protocol + "://" + req.get("host");
      const cartRows = result.rows.map((r) => ({
        ...r,
        image_url:
          r.image_url && r.image_url.startsWith("/")
            ? hostBase + r.image_url
            : r.image_url,
      }));

      res.json({ success: true, cart: cartRows });
    } catch (error) {
      console.error("Get cart error:", error);
      res.status(500).json({ error: "Ошибка при получении корзины" });
    }
  });

  // Добавить товар в корзину
  router.post("/", async (req, res) => {
    let {
      userId,
      product_id,
      quantity,
      truck_id,
      unit_price: incoming_unit_price,
    } = req.body;

    userId = parseInt(userId, 10);
    product_id = parseInt(product_id, 10);
    quantity = parseInt(quantity, 10) || 1;

    if (isNaN(userId) || isNaN(product_id)) {
      return res.status(400).json({ error: "Неверные параметры" });
    }

    try {
      // Получаем цену товара из products таблицы
      const productData = await pool.query(
        "SELECT price_per_unit, price_per_box FROM products WHERE id = $1",
        [product_id],
      );

      if (productData.rows.length === 0) {
        return res.status(404).json({ error: "Товар не найден" });
      }

      // choose a sensible price: incoming override, then per-unit, then per-box
      const dbPrice =
        productData.rows[0].price_per_unit ?? productData.rows[0].price_per_box ?? 0;
      const unit_price =
        incoming_unit_price !== undefined && incoming_unit_price !== null
          ? incoming_unit_price
          : dbPrice;

      // Если передан truck_id, получаем batch_date для отображения
      let batch_date = null;
      if (truck_id) {
        const truckData = await pool.query(
          "SELECT arrival_date FROM trucks WHERE id = $1",
          [truck_id],
        );
        if (truckData.rows.length > 0) {
          batch_date = truckData.rows[0].arrival_date;
        }
      }

      // Проверяем есть ли уже этот товар в корзине (с учётом truck_id)
      const existing = await pool.query(
        "SELECT * FROM cart_items WHERE user_id = $1 AND product_id = $2 AND (truck_id = $3 OR (truck_id IS NULL AND $3 IS NULL))",
        [userId, product_id, truck_id || null],
      );

      if (existing.rows.length > 0) {
        // Обновляем количество
        const result = await pool.query(
          `UPDATE cart_items 
           SET quantity = quantity + $1, updated_at = CURRENT_TIMESTAMP 
           WHERE user_id = $2 AND product_id = $3 AND (truck_id = $4 OR (truck_id IS NULL AND $4 IS NULL))
           RETURNING *`,
          [quantity, userId, product_id, truck_id || null],
        );

        res.json({
          success: true,
          message: "Количество обновлено",
          item: result.rows[0],
        });
      } else {
        // Добавляем новый товар с сохранением unit_price
        const result = await pool.query(
          `INSERT INTO cart_items (user_id, product_id, quantity, truck_id, batch_date, unit_price) 
           VALUES ($1, $2, $3, $4, $5, $6) 
           RETURNING *`,
          [
            userId,
            product_id,
            quantity,
            truck_id || null,
            batch_date,
            unit_price,
          ],
        );

        res.json({
          success: true,
          message: "Товар добавлен в корзину",
          item: result.rows[0],
        });
      }
    } catch (error) {
      console.error("Add to cart error:", error);
      res.status(500).json({ error: "Ошибка при добавлении в корзину" });
    }
  });

  // Обновить количество товара
  router.put("/:itemId", async (req, res) => {
    let { itemId } = req.params;
    let { quantity, userId } = req.body;

    itemId = parseInt(itemId, 10);
    userId = parseInt(userId, 10);
    quantity = parseInt(quantity, 10) || 0;

    if (isNaN(itemId) || isNaN(userId)) {
      return res.status(400).json({ error: "Неверные параметры" });
    }

    try {
      if (quantity <= 0) {
        // Удаляем если количество 0
        await pool.query(
          "DELETE FROM cart_items WHERE id = $1 AND user_id = $2",
          [itemId, userId],
        );
        res.json({ success: true, message: "Товар удален из корзины" });
      } else {
        // Обновляем количество
        const result = await pool.query(
          `UPDATE cart_items 
           SET quantity = $1, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $2 AND user_id = $3 
           RETURNING *`,
          [quantity, itemId, userId],
        );

        res.json({
          success: true,
          message: "Количество обновлено",
          item: result.rows[0],
        });
      }
    } catch (error) {
      console.error("Update cart error:", error);
      res.status(500).json({ error: "Ошибка при обновлении корзины" });
    }
  });

  // Удалить товар из корзины
  router.delete("/:itemId", async (req, res) => {
    let { itemId } = req.params;
    let { userId } = req.query;

    itemId = parseInt(itemId, 10);
    userId = parseInt(userId, 10);

    if (isNaN(itemId) || isNaN(userId)) {
      return res.status(400).json({ error: "Неверные параметры" });
    }

    try {
      await pool.query(
        "DELETE FROM cart_items WHERE id = $1 AND user_id = $2",
        [itemId, userId],
      );

      res.json({ success: true, message: "Товар удален из корзины" });
    } catch (error) {
      console.error("Delete cart item error:", error);
      res.status(500).json({ error: "Ошибка при удалении товара" });
    }
  });

  // Очистить корзину
  router.delete("/user/:userId/clear", async (req, res) => {
    let { userId } = req.params;

    userId = parseInt(userId, 10);

    if (isNaN(userId)) {
      return res.status(400).json({ error: "Неверный userId" });
    }

    try {
      await pool.query("DELETE FROM cart_items WHERE user_id = $1", [userId]);
      res.json({ success: true, message: "Корзина очищена" });
    } catch (error) {
      console.error("Clear cart error:", error);
      res.status(500).json({ error: "Ошибка при очистке корзины" });
    }
  });

  return router;
};
