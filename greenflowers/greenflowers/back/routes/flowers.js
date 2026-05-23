const express = require('express');
const router = express.Router();

module.exports = (pool, logger) => {
  // ============ PUBLIC ROUTES ============

  // Получить все цветы (доступно всем)
  router.get('/', async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT id, name, category, color, variety, description, price_per_unit, 
                price_per_box, stock_quantity, min_order_quantity, stem_length, 
                packaging_type, image_url, next_delivery_date, created_at 
         FROM products 
         ORDER BY created_at DESC`
      );

      res.json({ success: true, products: result.rows });
    } catch (error) {
      console.error('Get products error:', error);
      res.status(500).json({ error: 'Ошибка при получении каталога' });
    }
  });

  // Получить один цветок по ID
  router.get('/:id', async (req, res) => {
    const { id } = req.params;

    try {
      const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Товар не найден' });
      }

      res.json({ success: true, product: result.rows[0] });
    } catch (error) {
      console.error('Get product error:', error);
      res.status(500).json({ error: 'Ошибка при получении товара' });
    }
  });

  // ============ ADMIN & WORKER ROUTES ============

  // Добавить новый цветок (admin или worker)
  router.post('/', async (req, res) => {
    const { 
      userId, name, category, color, variety, description, 
      price_per_unit, price_per_box, stock_quantity, 
      min_order_quantity, stem_length, packaging_type, 
      image_url, next_delivery_date 
    } = req.body;

    try {
      // Проверка прав (admin или worker)
      const userCheck = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
      if (userCheck.rows.length === 0 || !['admin', 'worker'].includes(userCheck.rows[0].role)) {
        return res.status(403).json({ error: 'Доступ запрещен. Требуются права администратора или работника' });
      }

      const result = await pool.query(
        `INSERT INTO products 
         (name, category, color, variety, description, price_per_unit, price_per_box, 
          stock_quantity, min_order_quantity, stem_length, packaging_type, image_url, next_delivery_date) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) 
         RETURNING *`,
        [name, category, color, variety, description, price_per_unit, price_per_box, 
         stock_quantity, min_order_quantity, stem_length, packaging_type, image_url, next_delivery_date]
      );

      await logger.logProductCreate(userId, result.rows[0].id, name, true);

      res.status(201).json({ 
        success: true, 
        message: 'Товар успешно добавлен',
        product: result.rows[0] 
      });
    } catch (error) {
      console.error('Add product error:', error);
      await logger.logProductCreate(userId, null, name, false, error.message);
      res.status(500).json({ error: 'Ошибка при добавлении товара' });
    }
  });

  // Редактировать цветок (admin или worker)
  router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { 
      userId, name, category, color, variety, description, 
      price_per_unit, price_per_box, stock_quantity, 
      min_order_quantity, stem_length, packaging_type, 
      image_url, next_delivery_date 
    } = req.body;

    try {
      // Проверка прав
      const userCheck = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
      if (userCheck.rows.length === 0 || !['admin', 'worker'].includes(userCheck.rows[0].role)) {
        return res.status(403).json({ error: 'Доступ запрещен' });
      }

      const result = await pool.query(
        `UPDATE products 
         SET name = $1, category = $2, color = $3, variety = $4, description = $5,
             price_per_unit = $6, price_per_box = $7, stock_quantity = $8,
             min_order_quantity = $9, stem_length = $10, packaging_type = $11,
             image_url = $12, next_delivery_date = $13
         WHERE id = $14 
         RETURNING *`,
        [name, category, color, variety, description, price_per_unit, price_per_box, 
         stock_quantity, min_order_quantity, stem_length, packaging_type, 
         image_url, next_delivery_date, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Товар не найден' });
      }

      await logger.logProductUpdate(userId, id, name, true);

      res.json({ 
        success: true, 
        message: 'Товар успешно обновлен',
        product: result.rows[0] 
      });
    } catch (error) {
      console.error('Update product error:', error);
      await logger.logProductUpdate(userId, id, name, false, error.message);
      res.status(500).json({ error: 'Ошибка при обновлении товара' });
    }
  });

  // Удалить цветок (admin или worker)
  router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const { adminId } = req.query;

    try {
      // Проверка прав (admin или worker)
      const userCheck = await pool.query('SELECT role FROM users WHERE id = $1', [adminId]);
      if (userCheck.rows.length === 0 || !['admin', 'worker'].includes(userCheck.rows[0].role)) {
        return res.status(403).json({ error: 'Доступ запрещен. Требуются права администратора или работника' });
      }

      const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING name', [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Товар не найден' });
      }

      await logger.logProductDelete(adminId, id, result.rows[0].name, true);

      res.json({ 
        success: true, 
        message: `Товар "${result.rows[0].name}" успешно удален` 
      });
    } catch (error) {
      console.error('Delete product error:', error);
      await logger.logProductDelete(adminId, id, '', false, error.message);
      res.status(500).json({ error: 'Ошибка при удалении товара' });
    }
  });

  return router;
};
