const express = require('express');
const router = express.Router();

module.exports = (pool, logger) => {
  
  // =============================================
  // ПАРТИИ ПОСТАВОК (Inventory Batches)
  // =============================================

  // Получить все партии поставок
  router.get('/batches', async (req, res) => {
    try {
      const { userId, startDate, endDate, status } = req.query;
      
      // Проверка прав (только admin и worker)
      if (userId) {
        const userCheck = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
        if (!userCheck.rows[0] || !['admin', 'worker'].includes(userCheck.rows[0].role)) {
          return res.status(403).json({ success: false, error: 'Доступ запрещен' });
        }
      }

      let query = `
        SELECT 
          ib.*,
          u.name as created_by_name,
          COUNT(ii.id) as items_count
        FROM inventory_batches ib
        LEFT JOIN users u ON ib.created_by = u.id
        LEFT JOIN inventory_items ii ON ib.id = ii.batch_id
      `;
      
      const conditions = [];
      const params = [];
      
      if (startDate) {
        params.push(startDate);
        conditions.push(`ib.batch_date >= $${params.length}`);
      }
      if (endDate) {
        params.push(endDate);
        conditions.push(`ib.batch_date <= $${params.length}`);
      }
      if (status) {
        params.push(status);
        conditions.push(`ib.status = $${params.length}`);
      }
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      
      query += ' GROUP BY ib.id, u.name ORDER BY ib.batch_date DESC';
      
      const result = await pool.query(query, params);
      
      res.json({ success: true, batches: result.rows });
    } catch (error) {
      console.error('Error fetching inventory batches:', error);
      res.status(500).json({ success: false, error: 'Ошибка при загрузке партий' });
    }
  });

  // Получить одну партию с товарами
  router.get('/batches/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      const batchResult = await pool.query(`
        SELECT ib.*, u.name as created_by_name
        FROM inventory_batches ib
        LEFT JOIN users u ON ib.created_by = u.id
        WHERE ib.id = $1
      `, [id]);
      
      if (batchResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Партия не найдена' });
      }
      
      const itemsResult = await pool.query(`
        SELECT ii.*, p.name as linked_product_name
        FROM inventory_items ii
        LEFT JOIN products p ON ii.product_id = p.id
        WHERE ii.batch_id = $1
        ORDER BY ii.id
      `, [id]);
      
      res.json({
        success: true,
        batch: batchResult.rows[0],
        items: itemsResult.rows
      });
    } catch (error) {
      console.error('Error fetching batch:', error);
      res.status(500).json({ success: false, error: 'Ошибка при загрузке партии' });
    }
  });

  // Создать новую партию поставки
  router.post('/batches', async (req, res) => {
    const client = await pool.connect();
    try {
      const { userId, batchDate, supplierName, notes, items } = req.body;
      
      // Проверка прав
      const userCheck = await client.query('SELECT role FROM users WHERE id = $1', [userId]);
      if (!userCheck.rows[0] || !['admin', 'worker'].includes(userCheck.rows[0].role)) {
        return res.status(403).json({ success: false, error: 'Доступ запрещен' });
      }
      
      await client.query('BEGIN');
      
      // Создаем партию
      const batchResult = await client.query(`
        INSERT INTO inventory_batches (batch_date, supplier_name, notes, created_by, status)
        VALUES ($1, $2, $3, $4, 'draft')
        RETURNING *
      `, [batchDate || new Date(), supplierName, notes, userId]);
      
      const batchId = batchResult.rows[0].id;
      let totalItems = 0;
      let totalCost = 0;
      
      // Добавляем товары
      if (items && items.length > 0) {
        for (const item of items) {
          await client.query(`
            INSERT INTO inventory_items (
              batch_id, product_id, product_name, category, color, variety,
              quantity, purchase_price, selling_price, stem_length,
              packaging_type, plantation_country, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          `, [
            batchId, item.productId || null, item.productName, item.category,
            item.color, item.variety, item.quantity, item.purchasePrice,
            item.sellingPrice, item.stemLength, item.packagingType,
            item.plantationCountry, item.notes
          ]);
          
          totalItems += item.quantity;
          totalCost += item.purchasePrice * item.quantity;
        }
        
        // Обновляем итоги партии
        await client.query(`
          UPDATE inventory_batches 
          SET total_items = $1, total_cost = $2
          WHERE id = $3
        `, [totalItems, totalCost, batchId]);
      }
      
      await client.query('COMMIT');
      
      // Логирование
      if (logger) {
        await logger.log(userId, 'inventory_batch_created', 'inventory_batch', batchId, 
          `Создана партия поставки на ${batchDate}: ${totalItems} единиц на сумму ${totalCost}`);
      }
      
      res.json({
        success: true,
        message: 'Партия поставки создана',
        batchId,
        totalItems,
        totalCost
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating batch:', error);
      res.status(500).json({ success: false, error: 'Ошибка при создании партии' });
    } finally {
      client.release();
    }
  });

  // Обновить партию поставки
  router.put('/batches/:id', async (req, res) => {
    const client = await pool.connect();
    try {
      const { id } = req.params;
      const { userId, batchDate, supplierName, notes, status, items } = req.body;
      
      // Проверка прав
      const userCheck = await client.query('SELECT role FROM users WHERE id = $1', [userId]);
      if (!userCheck.rows[0] || !['admin', 'worker'].includes(userCheck.rows[0].role)) {
        return res.status(403).json({ success: false, error: 'Доступ запрещен' });
      }
      
      await client.query('BEGIN');
      
      // Обновляем партию
      await client.query(`
        UPDATE inventory_batches 
        SET batch_date = COALESCE($1, batch_date),
            supplier_name = COALESCE($2, supplier_name),
            notes = COALESCE($3, notes),
            status = COALESCE($4, status)
        WHERE id = $5
      `, [batchDate, supplierName, notes, status, id]);
      
      // Если переданы товары - обновляем их
      if (items && items.length > 0) {
        // Удаляем старые товары
        await client.query('DELETE FROM inventory_items WHERE batch_id = $1', [id]);
        
        let totalItems = 0;
        let totalCost = 0;
        
        // Добавляем новые
        for (const item of items) {
          await client.query(`
            INSERT INTO inventory_items (
              batch_id, product_id, product_name, category, color, variety,
              quantity, purchase_price, selling_price, stem_length,
              packaging_type, plantation_country, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          `, [
            id, item.productId || null, item.productName, item.category,
            item.color, item.variety, item.quantity, item.purchasePrice,
            item.sellingPrice, item.stemLength, item.packagingType,
            item.plantationCountry, item.notes
          ]);
          
          totalItems += item.quantity;
          totalCost += item.purchasePrice * item.quantity;
        }
        
        // Обновляем итоги
        await client.query(`
          UPDATE inventory_batches 
          SET total_items = $1, total_cost = $2
          WHERE id = $3
        `, [totalItems, totalCost, id]);
      }
      
      // Если статус меняется на "received" - обновляем остатки товаров
      if (status === 'received') {
        const itemsToUpdate = await client.query(
          'SELECT product_id, quantity FROM inventory_items WHERE batch_id = $1 AND product_id IS NOT NULL',
          [id]
        );
        
        for (const item of itemsToUpdate.rows) {
          await client.query(
            'UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2',
            [item.quantity, item.product_id]
          );
        }
      }
      
      await client.query('COMMIT');
      
      res.json({ success: true, message: 'Партия обновлена' });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating batch:', error);
      res.status(500).json({ success: false, error: 'Ошибка при обновлении партии' });
    } finally {
      client.release();
    }
  });

  // Удалить партию
  router.delete('/batches/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { userId } = req.query;
      
      // Проверка прав (только admin)
      const userCheck = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
      if (!userCheck.rows[0] || userCheck.rows[0].role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Только администратор может удалять партии' });
      }
      
      await pool.query('DELETE FROM inventory_batches WHERE id = $1', [id]);
      
      res.json({ success: true, message: 'Партия удалена' });
    } catch (error) {
      console.error('Error deleting batch:', error);
      res.status(500).json({ success: false, error: 'Ошибка при удалении партии' });
    }
  });

  // =============================================
  // АНАЛИТИКА ПОСТАВОК
  // =============================================

  // Сравнение цен между партиями
  router.get('/analytics/price-comparison', async (req, res) => {
    try {
      const { productName, startDate, endDate } = req.query;
      
      let query = `
        SELECT 
          ii.product_name,
          ii.category,
          ib.batch_date,
          ii.purchase_price,
          ii.selling_price,
          ii.quantity,
          LAG(ii.purchase_price) OVER (PARTITION BY ii.product_name ORDER BY ib.batch_date) as prev_purchase_price,
          LAG(ii.selling_price) OVER (PARTITION BY ii.product_name ORDER BY ib.batch_date) as prev_selling_price
        FROM inventory_items ii
        JOIN inventory_batches ib ON ii.batch_id = ib.id
        WHERE ib.status IN ('received', 'processed')
      `;
      
      const params = [];
      
      if (productName) {
        params.push(`%${productName}%`);
        query += ` AND ii.product_name ILIKE $${params.length}`;
      }
      if (startDate) {
        params.push(startDate);
        query += ` AND ib.batch_date >= $${params.length}`;
      }
      if (endDate) {
        params.push(endDate);
        query += ` AND ib.batch_date <= $${params.length}`;
      }
      
      query += ' ORDER BY ii.product_name, ib.batch_date DESC';
      
      const result = await pool.query(query, params);
      
      // Вычисляем изменения цен
      const dataWithChanges = result.rows.map(row => ({
        ...row,
        price_change: row.prev_purchase_price 
          ? ((row.purchase_price - row.prev_purchase_price) / row.prev_purchase_price * 100).toFixed(2)
          : null,
        selling_price_change: row.prev_selling_price
          ? ((row.selling_price - row.prev_selling_price) / row.prev_selling_price * 100).toFixed(2)
          : null
      }));
      
      res.json({ success: true, data: dataWithChanges });
    } catch (error) {
      console.error('Error in price comparison:', error);
      res.status(500).json({ success: false, error: 'Ошибка при анализе цен' });
    }
  });

  // Статистика по категориям
  router.get('/analytics/by-category', async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      let query = `
        SELECT 
          ii.category,
          COUNT(DISTINCT ii.product_name) as products_count,
          SUM(ii.quantity) as total_quantity,
          SUM(ii.purchase_price * ii.quantity) as total_cost,
          AVG(ii.purchase_price) as avg_purchase_price,
          MIN(ii.purchase_price) as min_price,
          MAX(ii.purchase_price) as max_price
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
      
      query += ' GROUP BY ii.category ORDER BY total_cost DESC';
      
      const result = await pool.query(query, params);
      
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error in category analytics:', error);
      res.status(500).json({ success: false, error: 'Ошибка при анализе по категориям' });
    }
  });

  // Экспорт данных в CSV формате
  router.get('/export/csv', async (req, res) => {
    try {
      const { batchId, startDate, endDate } = req.query;
      
      let query = `
        SELECT 
          ib.batch_date as "Дата поставки",
          ib.supplier_name as "Поставщик",
          ii.product_name as "Наименование",
          ii.category as "Категория",
          ii.color as "Цвет",
          ii.variety as "Сорт",
          ii.quantity as "Количество",
          ii.purchase_price as "Закупочная цена",
          ii.selling_price as "Продажная цена",
          ii.stem_length as "Длина стебля",
          ii.packaging_type as "Упаковка",
          ii.plantation_country as "Страна"
        FROM inventory_items ii
        JOIN inventory_batches ib ON ii.batch_id = ib.id
      `;
      
      const params = [];
      const conditions = [];
      
      if (batchId) {
        params.push(batchId);
        conditions.push(`ib.id = $${params.length}`);
      }
      if (startDate) {
        params.push(startDate);
        conditions.push(`ib.batch_date >= $${params.length}`);
      }
      if (endDate) {
        params.push(endDate);
        conditions.push(`ib.batch_date <= $${params.length}`);
      }
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      
      query += ' ORDER BY ib.batch_date DESC, ii.category, ii.product_name';
      
      const result = await pool.query(query, params);
      
      // Формируем CSV
      if (result.rows.length === 0) {
        return res.json({ success: true, csv: '', message: 'Нет данных для экспорта' });
      }
      
      const headers = Object.keys(result.rows[0]);
      let csv = headers.join(';') + '\n';
      
      for (const row of result.rows) {
        const values = headers.map(h => {
          const val = row[h];
          if (val === null || val === undefined) return '';
          if (typeof val === 'string' && val.includes(';')) return `"${val}"`;
          return val;
        });
        csv += values.join(';') + '\n';
      }
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=inventory_export.csv');
      res.send('\uFEFF' + csv); // BOM для правильного отображения в Excel
    } catch (error) {
      console.error('Error exporting CSV:', error);
      res.status(500).json({ success: false, error: 'Ошибка при экспорте' });
    }
  });

  // Экспорт данных в JSON (для дальнейшего преобразования в Excel на фронте)
  router.get('/export/json', async (req, res) => {
    try {
      const { batchId, startDate, endDate } = req.query;
      
      let query = `
        SELECT 
          ib.id as batch_id,
          ib.batch_date,
          ib.supplier_name,
          ib.total_items,
          ib.total_cost,
          json_agg(json_build_object(
            'product_name', ii.product_name,
            'category', ii.category,
            'color', ii.color,
            'variety', ii.variety,
            'quantity', ii.quantity,
            'purchase_price', ii.purchase_price,
            'selling_price', ii.selling_price,
            'stem_length', ii.stem_length,
            'packaging_type', ii.packaging_type,
            'plantation_country', ii.plantation_country
          )) as items
        FROM inventory_batches ib
        LEFT JOIN inventory_items ii ON ib.id = ii.batch_id
      `;
      
      const params = [];
      const conditions = [];
      
      if (batchId) {
        params.push(batchId);
        conditions.push(`ib.id = $${params.length}`);
      }
      if (startDate) {
        params.push(startDate);
        conditions.push(`ib.batch_date >= $${params.length}`);
      }
      if (endDate) {
        params.push(endDate);
        conditions.push(`ib.batch_date <= $${params.length}`);
      }
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      
      query += ' GROUP BY ib.id ORDER BY ib.batch_date DESC';
      
      const result = await pool.query(query, params);
      
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error exporting JSON:', error);
      res.status(500).json({ success: false, error: 'Ошибка при экспорте' });
    }
  });

  return router;
};
