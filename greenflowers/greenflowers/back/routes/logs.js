const express = require('express');
const router = express.Router();

module.exports = (pool, logger) => {
  // Получить логи (только admin)
  router.get('/', async (req, res) => {
    const { 
      adminId, 
      userId, 
      action, 
      entityType, 
      startDate, 
      endDate, 
      status, 
      limit = 100, 
      offset = 0 
    } = req.query;

    try {
      // Проверка прав админа
      const adminCheck = await pool.query('SELECT role FROM users WHERE id = $1', [adminId]);
      if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') {
        return res.status(403).json({ error: 'Доступ запрещен. Требуются права администратора' });
      }

      const logs = await logger.getLogs({
        userId,
        action,
        entityType,
        startDate,
        endDate,
        status,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      // Получить общее количество логов
      const countResult = await pool.query('SELECT COUNT(*) FROM system_logs');
      const totalCount = parseInt(countResult.rows[0].count);

      res.json({ 
        success: true, 
        logs,
        pagination: {
          total: totalCount,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: (parseInt(offset) + logs.length) < totalCount
        }
      });
    } catch (error) {
      console.error('Get logs error:', error);
      res.status(500).json({ error: 'Ошибка при получении логов' });
    }
  });

  // Получить статистику по логам (только admin)
  router.get('/stats', async (req, res) => {
    const { adminId } = req.query;

    try {
      // Проверка прав админа
      const adminCheck = await pool.query('SELECT role FROM users WHERE id = $1', [adminId]);
      if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') {
        return res.status(403).json({ error: 'Доступ запрещен' });
      }

      // Статистика по действиям
      const actionStats = await pool.query(`
        SELECT action, COUNT(*) as count 
        FROM system_logs 
        GROUP BY action 
        ORDER BY count DESC
      `);

      // Статистика по статусам
      const statusStats = await pool.query(`
        SELECT status, COUNT(*) as count 
        FROM system_logs 
        GROUP BY status
      `);

      // Последние ошибки
      const recentErrors = await pool.query(`
        SELECT l.*, u.email as user_email 
        FROM system_logs l
        LEFT JOIN users u ON l.user_id = u.id
        WHERE l.status = 'error'
        ORDER BY l.created_at DESC
        LIMIT 10
      `);

      // Активность по дням (последние 7 дней)
      const dailyActivity = await pool.query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count
        FROM system_logs
        WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `);

      res.json({
        success: true,
        stats: {
          byAction: actionStats.rows,
          byStatus: statusStats.rows,
          recentErrors: recentErrors.rows,
          dailyActivity: dailyActivity.rows
        }
      });
    } catch (error) {
      console.error('Get logs stats error:', error);
      res.status(500).json({ error: 'Ошибка при получении статистики' });
    }
  });

  // Очистить старые логи (только admin)
  router.delete('/clean', async (req, res) => {
    const { adminId, days = 90 } = req.body;

    try {
      // Проверка прав админа
      const adminCheck = await pool.query('SELECT role FROM users WHERE id = $1', [adminId]);
      if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') {
        return res.status(403).json({ error: 'Доступ запрещен' });
      }

      const result = await pool.query(
        `DELETE FROM system_logs 
         WHERE created_at < CURRENT_DATE - INTERVAL '${parseInt(days)} days'
         RETURNING id`
      );

      await logger.log({
        userId: adminId,
        action: 'logs_cleanup',
        description: `Удалено ${result.rowCount} старых логов (старше ${days} дней)`,
        status: 'success'
      });

      res.json({
        success: true,
        message: `Удалено ${result.rowCount} старых логов`
      });
    } catch (error) {
      console.error('Clean logs error:', error);
      res.status(500).json({ error: 'Ошибка при очистке логов' });
    }
  });

  return router;
};
