const express = require('express');
const router = express.Router();

module.exports = (pool) => {
  // Получить предзаказы пользователя
  router.get('/user/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
      const result = await pool.query(
        `SELECT p.*, pr.name as product_name
         FROM preorders p
         LEFT JOIN products pr ON p.product_id = pr.id
         WHERE p.user_id = $1
         ORDER BY p.created_at DESC`,
        [userId]
      );

      res.json({ success: true, preorders: result.rows });
    } catch (error) {
      console.error('Get user preorders error:', error);
      res.status(500).json({ error: 'Ошибка при получении предзаказов' });
    }
  });

  // Получить все предзаказы (для admin и worker)
  router.get('/all', async (req, res) => {
    const { userId } = req.query;

    try {
      // Проверка прав
      const userCheck = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
      if (userCheck.rows.length === 0 || !['admin', 'worker'].includes(userCheck.rows[0].role)) {
        return res.status(403).json({ error: 'Доступ запрещен' });
      }

      const result = await pool.query(
        `SELECT p.*, 
                u.name as user_name,
                u.email as user_email,
                u.phone as user_phone,
                pr.name as product_name
         FROM preorders p
         LEFT JOIN users u ON p.user_id = u.id
         LEFT JOIN products pr ON p.product_id = pr.id
         ORDER BY p.created_at DESC`
      );

      res.json({ success: true, preorders: result.rows });
    } catch (error) {
      console.error('Get all preorders error:', error);
      res.status(500).json({ error: 'Ошибка при получении предзаказов' });
    }
  });

  // Создать предзаказ
  router.post('/', async (req, res) => {
    const { 
      userId, 
      product_id, 
      quantity, 
      desired_delivery_date,
      order_type,
      holiday_type,
      notes 
    } = req.body;

    try {
      const result = await pool.query(
        `INSERT INTO preorders (
          user_id, product_id, quantity, desired_delivery_date, 
          order_type, holiday_type, notes, status
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending') 
        RETURNING *`,
        [userId, product_id, quantity, desired_delivery_date, order_type, holiday_type, notes]
      );

      res.status(201).json({ 
        success: true, 
        message: 'Предзаказ успешно создан',
        preorder: result.rows[0] 
      });
    } catch (error) {
      console.error('Create preorder error:', error);
      res.status(500).json({ error: 'Ошибка при создании предзаказа' });
    }
  });

  // Обновить статус предзаказа (admin и worker)
  router.put('/:preorderId/status', async (req, res) => {
    const { preorderId } = req.params;
    const { userId, status } = req.body;

    try {
      // Проверка прав
      const userCheck = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
      if (userCheck.rows.length === 0 || !['admin', 'worker'].includes(userCheck.rows[0].role)) {
        return res.status(403).json({ error: 'Доступ запрещен' });
      }

      const result = await pool.query(
        'UPDATE preorders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [status, preorderId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Предзаказ не найден' });
      }

      res.json({ 
        success: true, 
        message: 'Статус предзаказа обновлен',
        preorder: result.rows[0] 
      });
    } catch (error) {
      console.error('Update preorder status error:', error);
      res.status(500).json({ error: 'Ошибка при обновлении статуса' });
    }
  });

  // Удалить предзаказ (admin)
  router.delete('/:preorderId', async (req, res) => {
    const { preorderId } = req.params;
    const { adminId } = req.query;

    try {
      // Проверка прав админа
      const adminCheck = await pool.query('SELECT role FROM users WHERE id = $1', [adminId]);
      if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') {
        return res.status(403).json({ error: 'Доступ запрещен' });
      }

      const result = await pool.query('DELETE FROM preorders WHERE id = $1 RETURNING *', [preorderId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Предзаказ не найден' });
      }

      res.json({ success: true, message: 'Предзаказ удален' });
    } catch (error) {
      console.error('Delete preorder error:', error);
      res.status(500).json({ error: 'Ошибка при удалении предзаказа' });
    }
  });

  return router;
};
