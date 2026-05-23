const express = require("express");
const router = express.Router();

module.exports = (pool, logger) => {
  // =============================================
  // УПРАВЛЕНИЕ СМЕНАМИ
  // =============================================

  // Получить текущую открытую смену пользователя
  router.get("/current/:userId", async (req, res) => {
    try {
      const { userId } = req.params;

      const result = await pool.query(
        `
        SELECT s.*, u.name as user_name
        FROM shifts s
        JOIN users u ON s.user_id = u.id
        WHERE s.user_id = $1 AND s.status = 'open'
        ORDER BY s.started_at DESC
        LIMIT 1
      `,
        [userId]
      );

      if (result.rows.length === 0) {
        return res.json({
          success: true,
          shift: null,
          message: "Нет открытой смены",
        });
      }

      // Получаем продажи за эту смену
      const salesResult = await pool.query(
        `
        SELECT 
          COUNT(*) as sales_count,
          COALESCE(SUM(sale_amount), 0) as total_sales,
          COALESCE(SUM(discount_amount), 0) as total_discounts
        FROM shift_sales
        WHERE shift_id = $1
      `,
        [result.rows[0].id]
      );

      res.json({
        success: true,
        shift: {
          ...result.rows[0],
          current_sales: salesResult.rows[0].total_sales,
          current_discounts: salesResult.rows[0].total_discounts,
          sales_count: parseInt(salesResult.rows[0].sales_count),
        },
      });
    } catch (error) {
      console.error("Error fetching current shift:", error);
      res
        .status(500)
        .json({ success: false, error: "Ошибка при загрузке смены" });
    }
  });

  // Получить все смены (для админа)
  router.get("/", async (req, res) => {
    try {
      const { userId, startDate, endDate, sellerId, status } = req.query;

      // Проверка прав
      if (userId) {
        const userCheck = await pool.query(
          "SELECT role FROM users WHERE id = $1",
          [userId]
        );
        if (
          !userCheck.rows[0] ||
          !["admin", "worker"].includes(userCheck.rows[0].role)
        ) {
          return res
            .status(403)
            .json({ success: false, error: "Доступ запрещен" });
        }
      }

      let query = `
        SELECT 
          s.*,
          u.name as user_name,
          u.email as user_email,
          (SELECT COUNT(*) FROM shift_sales WHERE shift_id = s.id) as sales_count
        FROM shifts s
        JOIN users u ON s.user_id = u.id
      `;

      const conditions = [];
      const params = [];

      if (startDate) {
        params.push(startDate);
        conditions.push(`s.shift_date >= $${params.length}`);
      }
      if (endDate) {
        params.push(endDate);
        conditions.push(`s.shift_date <= $${params.length}`);
      }
      if (sellerId) {
        params.push(sellerId);
        conditions.push(`s.user_id = $${params.length}`);
      }
      if (status) {
        params.push(status);
        conditions.push(`s.status = $${params.length}`);
      }

      if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
      }

      query += " ORDER BY s.started_at DESC";

      const result = await pool.query(query, params);

      res.json({ success: true, shifts: result.rows });
    } catch (error) {
      console.error("Error fetching shifts:", error);
      res
        .status(500)
        .json({ success: false, error: "Ошибка при загрузке смен" });
    }
  });

  // =============================================
  // ПОЛУЧЕНИЕ ДОСТУПНЫХ ЗАКАЗОВ ДЛЯ ПРИНЯТИЯ
  // =============================================

  // Получить заказы без смены (доступные для принятия)
  router.get("/available-orders", async (req, res) => {
    try {
      // Используем только существующие колонки из таблицы orders
      const orders = await pool.query(`
        SELECT 
          o.id,
          o.user_id,
          o.delivery_city,
          o.delivery_address,
          o.delivery_date,
          o.total_amount,
          o.status,
          o.notes,
          o.created_at,
          u.name as customer_name,
          u.email as customer_email,
          u.phone as customer_phone
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        WHERE o.seller_id IS NULL 
          AND o.status IN ('pending', 'confirmed')
        ORDER BY o.created_at DESC
      `);

      // Для каждого заказа получаем товары
      const ordersWithItems = await Promise.all(
        orders.rows.map(async (order) => {
          const items = await pool.query(
            `
            SELECT 
              oi.product_id,
              p.name as product_name,
              oi.quantity,
              oi.unit_price
            FROM order_items oi
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = $1
            ORDER BY oi.id
          `,
            [order.id]
          );

          return {
            ...order,
            items: items.rows,
          };
        })
      );

      res.json({
        success: true,
        orders: ordersWithItems,
      });
    } catch (error) {
      console.error("Error fetching available orders:", error);
      res
        .status(500)
        .json({
          success: false,
          error: "Ошибка при загрузке доступных заказов",
        });
    }
  });

  // Принять заказ (привязать к текущей смене продавца)
  router.post("/accept-order/:orderId/:sellerId", async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const { orderId, sellerId } = req.params;

      // Получаем открытую смену продавца
      const shiftResult = await client.query(
        "SELECT id, total_sales, total_orders FROM shifts WHERE user_id = $1 AND status = $2",
        [sellerId, "open"]
      );

      if (shiftResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          success: false,
          error: "Нет открытой смены. Сначала откройте смену.",
        });
      }

      const shiftId = shiftResult.rows[0].id;

      // Получаем информацию о заказе
      const orderResult = await client.query(
        "SELECT total_amount FROM orders WHERE id = $1",
        [orderId]
      );

      if (orderResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res
          .status(404)
          .json({ success: false, error: "Заказ не найден" });
      }

      const orderAmount = orderResult.rows[0].total_amount;

      // Обновляем заказ - привязываем к смене и продавцу
      await client.query(
        "UPDATE orders SET seller_id = $1, shift_id = $2 WHERE id = $3",
        [sellerId, shiftId, orderId]
      );

      // Создаем запись о продаже в смене
      const saleResult = await client.query(
        `
        INSERT INTO shift_sales (shift_id, order_id, sale_amount, discount_amount)
        VALUES ($1, $2, $3, 0)
        RETURNING id
      `,
        [shiftId, orderId, orderAmount]
      );

      // Обновляем статистику смены
      await client.query(
        `
        UPDATE shifts 
        SET total_sales = total_sales + $1,
            total_orders = total_orders + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `,
        [orderAmount, shiftId]
      );

      await client.query("COMMIT");

      res.json({
        success: true,
        message: "Заказ успешно принят!",
        sale_id: saleResult.rows[0].id,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error accepting order:", error);
      res
        .status(500)
        .json({ success: false, error: "Ошибка при принятии заказа" });
    } finally {
      client.release();
    }
  });

  // Получить детали смены
  router.get("/:id", async (req, res) => {
    try {
      const { id } = req.params;

      const shiftResult = await pool.query(
        `
        SELECT s.*, u.name as user_name, u.email as user_email
        FROM shifts s
        JOIN users u ON s.user_id = u.id
        WHERE s.id = $1
      `,
        [id]
      );

      if (shiftResult.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, error: "Смена не найдена" });
      }

      // Получаем продажи за смену
      const salesResult = await pool.query(
        `
        SELECT 
          ss.*,
          o.id as order_number,
          o.delivery_city,
          o.total_amount as order_total
        FROM shift_sales ss
        LEFT JOIN orders o ON ss.order_id = o.id
        WHERE ss.shift_id = $1
        ORDER BY ss.sale_time DESC
      `,
        [id]
      );

      res.json({
        success: true,
        shift: shiftResult.rows[0],
        sales: salesResult.rows,
      });
    } catch (error) {
      console.error("Error fetching shift details:", error);
      res
        .status(500)
        .json({ success: false, error: "Ошибка при загрузке деталей смены" });
    }
  });

  // Открыть смену
  router.post("/open", async (req, res) => {
    try {
      const { userId, openingCash, notes } = req.body;

      // Проверяем, есть ли уже открытая смена
      const existingShift = await pool.query(
        "SELECT id FROM shifts WHERE user_id = $1 AND status = $2",
        [userId, "open"]
      );

      if (existingShift.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: "У вас уже есть открытая смена",
          shiftId: existingShift.rows[0].id,
        });
      }

      const now = new Date();
      const shiftDate = now.toISOString().split("T")[0];

      const result = await pool.query(
        `
        INSERT INTO shifts (user_id, shift_date, started_at, opening_cash, notes, status)
        VALUES ($1, $2, $3, $4, $5, 'open')
        RETURNING *
      `,
        [userId, shiftDate, now, openingCash || 0, notes]
      );

      // Логирование
      if (logger) {
        await logger.log(
          userId,
          "shift_opened",
          "shift",
          result.rows[0].id,
          `Открыта смена. Начальная касса: ${openingCash || 0} тг`
        );
      }

      res.json({
        success: true,
        message: "Смена открыта",
        shift: result.rows[0],
      });
    } catch (error) {
      console.error("Error opening shift:", error);
      res
        .status(500)
        .json({ success: false, error: "Ошибка при открытии смены" });
    }
  });

  // Закрыть смену
  router.post("/close", async (req, res) => {
    const client = await pool.connect();
    try {
      const { userId, shiftId, closingCash, notes } = req.body;

      await client.query("BEGIN");

      // Проверяем смену
      const shiftCheck = await client.query(
        "SELECT * FROM shifts WHERE id = $1 AND user_id = $2 AND status = $3",
        [shiftId, userId, "open"]
      );

      if (shiftCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          success: false,
          error: "Смена не найдена или уже закрыта",
        });
      }

      // Подсчитываем итоги
      const salesSummary = await client.query(
        `
        SELECT 
          COALESCE(SUM(sale_amount), 0) as total_sales,
          COALESCE(SUM(discount_amount), 0) as total_discounts,
          COUNT(*) as total_orders
        FROM shift_sales
        WHERE shift_id = $1
      `,
        [shiftId]
      );

      const { total_sales, total_discounts, total_orders } =
        salesSummary.rows[0];

      // Закрываем смену
      const now = new Date();
      await client.query(
        `
        UPDATE shifts 
        SET status = 'closed',
            ended_at = $1,
            closing_cash = $2,
            total_sales = $3,
            total_discounts = $4,
            total_orders = $5,
            notes = COALESCE(notes, '') || $6
        WHERE id = $7
      `,
        [
          now,
          closingCash,
          total_sales,
          total_discounts,
          total_orders,
          notes ? "\n" + notes : "",
          shiftId,
        ]
      );

      // Автоматически создаем событие в календаре если продажи необычные
      const thresholds = await client.query(
        "SELECT threshold_type, threshold_value FROM analytics_thresholds WHERE is_active = true"
      );

      const thresholdMap = {};
      thresholds.rows.forEach((t) => {
        thresholdMap[t.threshold_type] = parseFloat(t.threshold_value);
      });

      // Проверяем на высокие/низкие продажи
      if (total_sales >= (thresholdMap.high_sales_daily || 500000)) {
        await client.query(
          `
          INSERT INTO calendar_events (event_date, event_type, title, description, priority, related_entity_type, related_entity_id, is_auto_generated)
          VALUES ($1, 'high_sales', 'Высокие продажи', $2, 'high', 'shift', $3, true)
        `,
          [
            now.toISOString().split("T")[0],
            `Продажи за смену: ${total_sales} тг`,
            shiftId,
          ]
        );
      } else if (
        total_sales > 0 &&
        total_sales <= (thresholdMap.low_sales_daily || 50000)
      ) {
        await client.query(
          `
          INSERT INTO calendar_events (event_date, event_type, title, description, priority, related_entity_type, related_entity_id, is_auto_generated)
          VALUES ($1, 'low_sales', 'Низкие продажи', $2, 'medium', 'shift', $3, true)
        `,
          [
            now.toISOString().split("T")[0],
            `Продажи за смену: ${total_sales} тг`,
            shiftId,
          ]
        );
      }

      // Проверяем на большие скидки
      const discountPercent =
        total_sales > 0 ? (total_discounts / total_sales) * 100 : 0;
      if (discountPercent >= (thresholdMap.large_discount_percent || 20)) {
        await client.query(
          `
          INSERT INTO calendar_events (event_date, event_type, title, description, priority, related_entity_type, related_entity_id, is_auto_generated)
          VALUES ($1, 'large_discount', 'Большие скидки', $2, 'high', 'shift', $3, true)
        `,
          [
            now.toISOString().split("T")[0],
            `Скидки ${discountPercent.toFixed(
              1
            )}% от продаж (${total_discounts} тг)`,
            shiftId,
          ]
        );
      }

      await client.query("COMMIT");

      // Логирование
      if (logger) {
        await logger.log(
          userId,
          "shift_closed",
          "shift",
          shiftId,
          `Закрыта смена. Продажи: ${total_sales} тг, Скидки: ${total_discounts} тг, Заказов: ${total_orders}`
        );
      }

      res.json({
        success: true,
        message: "Смена закрыта",
        summary: {
          shiftId,
          totalSales: parseFloat(total_sales),
          totalDiscounts: parseFloat(total_discounts),
          totalOrders: parseInt(total_orders),
          closingCash: parseFloat(closingCash),
          discountPercent: discountPercent.toFixed(2),
        },
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error closing shift:", error);
      res
        .status(500)
        .json({ success: false, error: "Ошибка при закрытии смены" });
    } finally {
      client.release();
    }
  });

  // Добавить продажу к смене
  router.post("/sale", async (req, res) => {
    try {
      const {
        shiftId,
        orderId,
        saleAmount,
        discountAmount,
        paymentMethod,
        notes,
      } = req.body;

      // Проверяем что смена открыта
      const shiftCheck = await pool.query(
        "SELECT status FROM shifts WHERE id = $1",
        [shiftId]
      );

      if (
        shiftCheck.rows.length === 0 ||
        shiftCheck.rows[0].status !== "open"
      ) {
        return res.status(400).json({
          success: false,
          error: "Смена не найдена или закрыта",
        });
      }

      const result = await pool.query(
        `
        INSERT INTO shift_sales (shift_id, order_id, sale_amount, discount_amount, payment_method, notes)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `,
        [
          shiftId,
          orderId,
          saleAmount,
          discountAmount || 0,
          paymentMethod,
          notes,
        ]
      );

      // Обновляем связь заказа со сменой
      if (orderId) {
        await pool.query("UPDATE orders SET shift_id = $1 WHERE id = $2", [
          shiftId,
          orderId,
        ]);
      }

      res.json({
        success: true,
        message: "Продажа добавлена",
        sale: result.rows[0],
      });
    } catch (error) {
      console.error("Error adding sale:", error);
      res
        .status(500)
        .json({ success: false, error: "Ошибка при добавлении продажи" });
    }
  });

  // =============================================
  // АНАЛИТИКА СМЕН
  // =============================================

  // Статистика по продавцам
  router.get("/analytics/by-seller", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      let query = `
        SELECT 
          u.id as user_id,
          u.name as user_name,
          COUNT(s.id) as shifts_count,
          COALESCE(SUM(s.total_sales), 0) as total_sales,
          COALESCE(SUM(s.total_discounts), 0) as total_discounts,
          COALESCE(SUM(s.total_orders), 0) as total_orders,
          COALESCE(AVG(s.total_sales), 0) as avg_sales_per_shift
        FROM users u
        LEFT JOIN shifts s ON u.id = s.user_id AND s.status = 'closed'
      `;

      const params = [];
      const conditions = ["u.role IN ('worker', 'admin')"];

      if (startDate) {
        params.push(startDate);
        conditions.push(`s.shift_date >= $${params.length}`);
      }
      if (endDate) {
        params.push(endDate);
        conditions.push(`s.shift_date <= $${params.length}`);
      }

      query += " WHERE " + conditions.join(" AND ");
      query += " GROUP BY u.id, u.name ORDER BY total_sales DESC";

      const result = await pool.query(query, params);

      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error("Error in seller analytics:", error);
      res
        .status(500)
        .json({ success: false, error: "Ошибка при анализе по продавцам" });
    }
  });

  // Статистика по дням
  router.get("/analytics/by-day", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      let query = `
        SELECT 
          s.shift_date,
          COUNT(s.id) as shifts_count,
          COALESCE(SUM(s.total_sales), 0) as total_sales,
          COALESCE(SUM(s.total_discounts), 0) as total_discounts,
          COALESCE(SUM(s.total_orders), 0) as total_orders
        FROM shifts s
        WHERE s.status = 'closed'
      `;

      const params = [];

      if (startDate) {
        params.push(startDate);
        query += ` AND s.shift_date >= $${params.length}`;
      }
      if (endDate) {
        params.push(endDate);
        query += ` AND s.shift_date <= $${params.length}`;
      }

      query += " GROUP BY s.shift_date ORDER BY s.shift_date DESC";

      const result = await pool.query(query, params);

      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error("Error in daily analytics:", error);
      res
        .status(500)
        .json({ success: false, error: "Ошибка при анализе по дням" });
    }
  });

  // Экспорт смен в CSV
  router.get("/export/csv", async (req, res) => {
    try {
      const { startDate, endDate, sellerId } = req.query;

      let query = `
        SELECT 
          s.shift_date as "Дата",
          u.name as "Продавец",
          s.started_at as "Начало",
          s.ended_at as "Окончание",
          s.opening_cash as "Касса на начало",
          s.closing_cash as "Касса на конец",
          s.total_sales as "Продажи",
          s.total_discounts as "Скидки",
          s.total_orders as "Заказов",
          s.notes as "Примечания"
        FROM shifts s
        JOIN users u ON s.user_id = u.id
        WHERE s.status = 'closed'
      `;

      const params = [];

      if (startDate) {
        params.push(startDate);
        query += ` AND s.shift_date >= $${params.length}`;
      }
      if (endDate) {
        params.push(endDate);
        query += ` AND s.shift_date <= $${params.length}`;
      }
      if (sellerId) {
        params.push(sellerId);
        query += ` AND s.user_id = $${params.length}`;
      }

      query += " ORDER BY s.shift_date DESC, s.started_at DESC";

      const result = await pool.query(query, params);

      if (result.rows.length === 0) {
        return res.json({
          success: true,
          csv: "",
          message: "Нет данных для экспорта",
        });
      }

      const headers = Object.keys(result.rows[0]);
      let csv = headers.join(";") + "\n";

      for (const row of result.rows) {
        const values = headers.map((h) => {
          let val = row[h];
          if (val === null || val === undefined) return "";
          // Преобразуем значения в строку правильно
          if (val instanceof Date) {
            val = val.toLocaleString("ru-RU");
          } else if (typeof val === "object") {
            val = JSON.stringify(val);
          } else {
            val = String(val);
          }
          if (val.includes(";") || val.includes('"') || val.includes("\n"))
            return `"${val.replace(/"/g, '""')}"`;
          return val;
        });
        csv += values.join(";") + "\n";
      }

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=shifts_export.csv"
      );
      res.send("\uFEFF" + csv);
    } catch (error) {
      console.error("Error exporting shifts CSV:", error);
      res.status(500).json({ success: false, error: "Ошибка при экспорте" });
    }
  });

  // =============================================
  // ЭКСПОРТ СМЕНЫ В EXCEL
  // =============================================

  router.get("/export/excel/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const ExcelJS = require("exceljs");

      // Получаем данные смены и продаж
      const shiftResult = await pool.query(
        `
        SELECT s.*, u.name as user_name, u.email as user_email, u.phone as user_phone
        FROM shifts s
        JOIN users u ON s.user_id = u.id
        WHERE s.id = $1
      `,
        [id]
      );

      if (shiftResult.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, error: "Смена не найдена" });
      }

      const shift = shiftResult.rows[0];

      // Получаем продажи за смену
      const salesResult = await pool.query(
        `
        SELECT 
          ss.*,
          o.id as order_id,
          o.delivery_city,
          o.total_amount as order_total,
          o.customer_name
        FROM shift_sales ss
        LEFT JOIN orders o ON ss.order_id = o.id
        WHERE ss.shift_id = $1
        ORDER BY ss.sale_time
      `,
        [id]
      );

      // Создаем Excel книгу
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Отчет смены");

      // Стили
      const headerStyle = {
        fill: {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF568a56" },
        },
        font: { bold: true, color: { argb: "FFFFFFFF" } },
        alignment: { horizontal: "center", vertical: "center" },
      };

      const titleStyle = {
        font: { size: 14, bold: true, color: { argb: "FF568a56" } },
        alignment: { horizontal: "left" },
      };

      const summaryStyle = {
        font: { bold: true },
        fill: {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE8F5E9" },
        },
      };

      const currencyFormat =
        '_("₸"* #,##0.00_);_("₸"* (#,##0.00);_("₸"* "-"??_);_(@_)';

      // Заголовок
      worksheet.mergeCells("A1:H1");
      const titleCell = worksheet.getCell("A1");
      titleCell.value = "ОТЧЕТ О ЗАКРЫТИИ СМЕНЫ";
      titleCell.style = titleStyle;
      worksheet.getRow(1).height = 25;

      // Информация о смене
      worksheet.mergeCells("A3:H3");
      worksheet.getCell("A3").value = `Смена ${shift.id} от ${new Date(
        shift.shift_date
      ).toLocaleDateString("ru-RU")}`;
      worksheet.getCell("A3").style = titleStyle;

      // Данные продавца
      let row = 5;
      worksheet.getCell(`A${row}`).value = "Продавец:";
      worksheet.getCell(`A${row}`).font = { bold: true };
      worksheet.getCell(`B${row}`).value = shift.user_name;
      row++;

      worksheet.getCell(`A${row}`).value = "Email:";
      worksheet.getCell(`A${row}`).font = { bold: true };
      worksheet.getCell(`B${row}`).value = shift.user_email;
      row++;

      worksheet.getCell(`A${row}`).value = "Телефон:";
      worksheet.getCell(`A${row}`).font = { bold: true };
      worksheet.getCell(`B${row}`).value = shift.user_phone;
      row++;

      worksheet.getCell(`A${row}`).value = "Время открытия:";
      worksheet.getCell(`A${row}`).font = { bold: true };
      worksheet.getCell(`B${row}`).value = new Date(
        shift.started_at
      ).toLocaleString("ru-RU");
      row++;

      worksheet.getCell(`A${row}`).value = "Время закрытия:";
      worksheet.getCell(`A${row}`).font = { bold: true };
      worksheet.getCell(`B${row}`).value = shift.ended_at
        ? new Date(shift.ended_at).toLocaleString("ru-RU")
        : "-";
      row++;

      // Сводка
      row += 1;
      worksheet.mergeCells(`A${row}:H${row}`);
      worksheet.getCell(`A${row}`).value = "СВОДКА";
      worksheet.getCell(`A${row}`).style = titleStyle;
      row++;

      const summaryData = [
        ["Начальная касса:", shift.opening_cash],
        ["Всего продаж:", shift.total_sales],
        ["Всего скидок:", shift.total_discounts],
        ["Количество заказов:", shift.total_orders],
        ["Закрывающая касса:", shift.closing_cash || 0],
      ];

      summaryData.forEach(([label, value]) => {
        worksheet.getCell(`A${row}`).value = label;
        worksheet.getCell(`A${row}`).font = { bold: true };
        worksheet.getCell(`B${row}`).value = value;
        worksheet.getCell(`B${row}`).numFmt =
          typeof value === "number" && value !== shift.total_orders
            ? currencyFormat
            : "0";
        worksheet.getCell(`B${row}`).style = summaryStyle;
        row++;
      });

      // Таблица продаж
      row += 2;
      const headers = [
        "№",
        "Время",
        "Номер заказа",
        "Клиент",
        "Город",
        "Сумма заказа",
        "Скидка",
        "Способ оплаты",
      ];
      const headerRow = worksheet.getRow(row);

      headers.forEach((header, index) => {
        const cell = headerRow.getCell(index + 1);
        cell.value = header;
        cell.style = headerStyle;
      });

      worksheet.getRow(row).height = 20;
      row++;

      // Данные продаж
      salesResult.rows.forEach((sale, index) => {
        worksheet.getCell(`A${row}`).value = index + 1;
        worksheet.getCell(`B${row}`).value = new Date(
          sale.sale_time
        ).toLocaleTimeString("ru-RU");
        worksheet.getCell(`C${row}`).value = sale.order_id || "-";
        worksheet.getCell(`D${row}`).value = sale.customer_name || "-";
        worksheet.getCell(`E${row}`).value = sale.delivery_city || "-";
        worksheet.getCell(`F${row}`).value = sale.sale_amount;
        worksheet.getCell(`G${row}`).value = sale.discount_amount;
        worksheet.getCell(`H${row}`).value = sale.payment_method || "-";

        // Форматирование чисел
        worksheet.getCell(`F${row}`).numFmt = currencyFormat;
        worksheet.getCell(`G${row}`).numFmt = currencyFormat;

        row++;
      });

      // Итого по таблице
      if (salesResult.rows.length > 0) {
        worksheet.getCell(`A${row}`).value = "ИТОГО:";
        worksheet.getCell(`A${row}`).style = summaryStyle;
        worksheet.getCell(`F${row}`).value = `=SUM(F${
          row - salesResult.rows.length
        }:F${row - 1})`;
        worksheet.getCell(`F${row}`).numFmt = currencyFormat;
        worksheet.getCell(`F${row}`).style = summaryStyle;
        worksheet.getCell(`G${row}`).value = `=SUM(G${
          row - salesResult.rows.length
        }:G${row - 1})`;
        worksheet.getCell(`G${row}`).numFmt = currencyFormat;
        worksheet.getCell(`G${row}`).style = summaryStyle;
      }

      // Устанавливаем ширину колонок
      worksheet.columns = [
        { width: 5 },
        { width: 12 },
        { width: 12 },
        { width: 20 },
        { width: 12 },
        { width: 15 },
        { width: 12 },
        { width: 15 },
      ];

      // Отправляем файл
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="Shift_${shift.id}_${
          new Date(shift.shift_date).toISOString().split("T")[0]
        }.xlsx"`
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("Error exporting shift to Excel:", error);
      res
        .status(500)
        .json({ success: false, error: "Ошибка при экспорте в Excel" });
    }
  });

  // =============================================
  // РЕДАКТИРОВАНИЕ ПРОДАЖ В СМЕНЕ
  // =============================================

  // Обновить продажу (сумму, скидку)
  router.put("/sales/:saleId", async (req, res) => {
    try {
      const { saleId } = req.params;
      const { saleAmount, discountAmount, paymentMethod, notes } = req.body;

      // Получаем текущую продажу
      const currentSale = await pool.query(
        "SELECT shift_id, sale_amount, discount_amount FROM shift_sales WHERE id = $1",
        [saleId]
      );

      if (currentSale.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, error: "Продажа не найдена" });
      }

      const oldSaleAmount = currentSale.rows[0].sale_amount;
      const oldDiscountAmount = currentSale.rows[0].discount_amount;
      const shiftId = currentSale.rows[0].shift_id;

      // Обновляем продажу
      await pool.query(
        `UPDATE shift_sales 
         SET sale_amount = COALESCE($1, sale_amount),
             discount_amount = COALESCE($2, discount_amount),
             payment_method = COALESCE($3, payment_method),
             notes = COALESCE($4, notes)
         WHERE id = $5`,
        [saleAmount, discountAmount, paymentMethod, notes, saleId]
      );

      // Обновляем статистику смены
      const saleDiff = (saleAmount || oldSaleAmount) - oldSaleAmount;
      const discountDiff =
        (discountAmount || oldDiscountAmount) - oldDiscountAmount;

      await pool.query(
        `UPDATE shifts 
         SET total_sales = total_sales + $1,
             total_discounts = total_discounts + $2
         WHERE id = $3`,
        [saleDiff, discountDiff, shiftId]
      );

      res.json({
        success: true,
        message: "Продажа обновлена",
      });
    } catch (error) {
      console.error("Error updating sale:", error);
      res
        .status(500)
        .json({ success: false, error: "Ошибка при обновлении продажи" });
    }
  });

  // Удалить продажу из смены
  router.delete("/sales/:saleId", async (req, res) => {
    try {
      const { saleId } = req.params;

      // Получаем текущую продажу
      const sale = await pool.query(
        "SELECT shift_id, sale_amount, discount_amount FROM shift_sales WHERE id = $1",
        [saleId]
      );

      if (sale.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, error: "Продажа не найдена" });
      }

      const { shift_id, sale_amount, discount_amount } = sale.rows[0];

      // Удаляем продажу
      await pool.query("DELETE FROM shift_sales WHERE id = $1", [saleId]);

      // Обновляем статистику смены
      await pool.query(
        `UPDATE shifts 
         SET total_sales = total_sales - $1,
             total_discounts = total_discounts - $2,
             total_orders = CASE WHEN total_orders > 0 THEN total_orders - 1 ELSE 0 END
         WHERE id = $3`,
        [sale_amount, discount_amount, shift_id]
      );

      res.json({
        success: true,
        message: "Продажа удалена",
      });
    } catch (error) {
      console.error("Error deleting sale:", error);
      res
        .status(500)
        .json({ success: false, error: "Ошибка при удалении продажи" });
    }
  });

  // Получить все заказы продавца с открытой сменой
  router.get("/seller/:sellerId/active-orders", async (req, res) => {
    try {
      const { sellerId } = req.params;

      // Получаем открытую смену продавца
      const shift = await pool.query(
        "SELECT id FROM shifts WHERE user_id = $1 AND status = $2",
        [sellerId, "open"]
      );

      if (shift.rows.length === 0) {
        return res.json({
          success: true,
          shift: null,
          orders: [],
          sales: [],
        });
      }

      const shiftId = shift.rows[0].id;

      // Получаем все продажи в этой смене с деталями заказов
      const sales = await pool.query(
        `
        SELECT 
          ss.id as sale_id,
          ss.sale_amount,
          ss.discount_amount,
          ss.payment_method,
          ss.notes,
          ss.sale_time,
          o.id as order_id,
          o.customer_name,
          o.customer_email,
          o.customer_phone,
          o.delivery_city,
          o.delivery_date,
          o.total_amount,
          array_agg(json_build_object(
            'product_id', oi.product_id,
            'product_name', p.name,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price
          )) as items
        FROM shift_sales ss
        LEFT JOIN orders o ON ss.order_id = o.id
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE ss.shift_id = $1
        GROUP BY ss.id, ss.sale_amount, ss.discount_amount, ss.payment_method, ss.notes, ss.sale_time,
                 o.id, o.customer_name, o.customer_email, o.customer_phone, o.delivery_city, 
                 o.delivery_date, o.total_amount
        ORDER BY ss.sale_time DESC
      `,
        [shiftId]
      );

      res.json({
        success: true,
        shift: { id: shiftId },
        sales: sales.rows,
      });
    } catch (error) {
      console.error("Error fetching seller active orders:", error);
      res
        .status(500)
        .json({ success: false, error: "Ошибка при загрузке заказов" });
    }
  });

  return router;
};
