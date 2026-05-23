const express = require("express");
const router = express.Router();

module.exports = (pool) => {
  // ============ USER ROUTES ============

  // Создать заказ
  router.post("/", async (req, res) => {
    const client = await pool.connect();
    try {
      const {
        user_id,
        items,
        delivery_city,
        delivery_address,
        delivery_date,
        delivery_time,
        payment_method,
        notes,
        customer_name,
        customer_phone,
        customer_email,
        total_amount,
        status,
        payment_status,
        seller_id, // ID продавца (может отличаться от user_id для клиента)
      } = req.body;

      // Базовая валидация
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Пустой заказ (нет позиций)" });
      }
      if (typeof total_amount !== "number" || total_amount <= 0) {
        return res.status(400).json({ error: "Неверная сумма заказа" });
      }
      if (!customer_name || !customer_phone) {
        return res
          .status(400)
          .json({ error: "Отсутствует имя или телефон клиента" });
      }
      if (!delivery_city || !delivery_address) {
        return res.status(400).json({ error: "Отсутствует адрес доставки" });
      }

      // Если есть user_id, проверяем что пользователь существует
      if (user_id) {
        const userCheck = await client.query(
          "SELECT id FROM users WHERE id = $1",
          [user_id],
        );
        if (userCheck.rows.length === 0) {
          return res.status(404).json({ error: "Пользователь не найден" });
        }
      }

      await client.query("BEGIN");

      // Создание заказа
      const orderResult = await client.query(
        `INSERT INTO orders 
         (user_id, customer_name, customer_phone, customer_email, 
          total_amount, delivery_city, delivery_address, delivery_date, delivery_time,
          payment_method, payment_status, notes, status, seller_id, assigned_to) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) 
         RETURNING *`,
        [
          user_id || null,
          customer_name,
          customer_phone,
          customer_email || null,
          total_amount,
          delivery_city,
          delivery_address,
          delivery_date || new Date().toISOString(),
          delivery_time || null,
          payment_method || "cash",
          payment_status || "pending",
          notes || "",
          status || "new",
          seller_id || null,
          null, // assigned_to назначается при изменении статуса с new
        ],
      );

      const orderId = orderResult.rows[0].id;

      // Добавление позиций заказа и уменьшение количества товара
      for (const item of items) {
        if (
          !item.product_id ||
          !item.quantity ||
          item.unit_price === undefined
        ) {
          throw new Error(
            `Некорректная позиция товара: product_id=${item.product_id}, quantity=${item.quantity}, unit_price=${item.unit_price}`,
          );
        }

        // Добавляем позицию заказа с truck_id
        await client.query(
          "INSERT INTO order_items (order_id, product_id, quantity, unit_price, truck_id) VALUES ($1, $2, $3, $4, $5)",
          [
            orderId,
            item.product_id,
            item.quantity,
            item.unit_price,
            item.truck_id || null,
          ],
        );

        // Если есть truck_id, уменьшаем количество товара в inventory_items
        if (item.truck_id) {
          // Проверяем текущее количество
          const currentQtyResult = await client.query(
            "SELECT quantity FROM inventory_items WHERE product_id = $1 AND truck_id = $2",
            [item.product_id, item.truck_id],
          );

          if (currentQtyResult.rows.length > 0) {
            const currentQty = parseInt(currentQtyResult.rows[0].quantity) || 0;
            const newQty = Math.max(0, currentQty - parseInt(item.quantity));

            // Обновляем количество (но не ниже 0)
            await client.query(
              "UPDATE inventory_items SET quantity = $1 WHERE product_id = $2 AND truck_id = $3",
              [newQty, item.product_id, item.truck_id],
            );

            console.log(
              `[Orders] Product ${item.product_id} in truck ${item.truck_id}: ${currentQty} -> ${newQty}`,
            );
          }
        }
      }

      // Устанавливаем truck_id для заказа на основе первого элемента с truck_id
      const firstItemWithTruck = items.find((item) => item.truck_id);
      if (firstItemWithTruck && !orderResult.rows[0].truck_id) {
        await client.query("UPDATE orders SET truck_id = $1 WHERE id = $2", [
          firstItemWithTruck.truck_id,
          orderId,
        ]);
      }

      // Если есть seller_id, проверяем есть ли открытая смена
      if (seller_id) {
        const shiftCheck = await client.query(
          "SELECT id FROM shifts WHERE user_id = $1 AND status = $2",
          [seller_id, "open"],
        );

        if (shiftCheck.rows.length > 0) {
          const shiftId = shiftCheck.rows[0].id;

          // Добавляем продажу в смену
          await client.query(
            `INSERT INTO shift_sales (shift_id, order_id, sale_amount, discount_amount, payment_method)
             VALUES ($1, $2, $3, $4, $5)`,
            [shiftId, orderId, total_amount, 0, payment_method || "cash"],
          );

          // Обновляем статистику смены
          await client.query(
            `UPDATE shifts 
             SET total_sales = total_sales + $1, total_orders = total_orders + 1
             WHERE id = $2`,
            [total_amount, shiftId],
          );
        }
      }

      await client.query("COMMIT");

      res.status(201).json({
        success: true,
        message: "Заказ успешно создан",
        order: orderResult.rows[0],
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Create order error:", error);
      // вернём сообщение из ошибки, если есть
      const msg =
        error && error.message ? error.message : "Ошибка при создании заказа";
      res.status(500).json({ error: msg });
    } finally {
      client.release();
    }
  });

  // Получить заказы пользователя
  router.get("/user/:userId", async (req, res) => {
    const { userId } = req.params;

    try {
      const result = await pool.query(
        `SELECT o.*, 
                array_agg(json_build_object(
                  'product_id', oi.product_id,
                  'product_name', p.name,
                  'quantity', oi.quantity,
                  'unit_price', oi.unit_price
                )) as items
         FROM orders o
         LEFT JOIN order_items oi ON o.id = oi.order_id
         LEFT JOIN products p ON oi.product_id = p.id
         WHERE o.user_id = $1
         GROUP BY o.id
         ORDER BY o.created_at DESC`,
        [userId],
      );

      res.json({ success: true, orders: result.rows });
    } catch (error) {
      console.error("Get user orders error:", error);
      res.status(500).json({ error: "Ошибка при получении заказов" });
    }
  });

  // ============ WORKER ROUTES ============

  // Получить все заказы для менеджера/админа
  router.get("/all", async (req, res) => {
    const { userId } = req.query;

    try {
      // Проверка прав
      const userCheck = await pool.query(
        "SELECT role FROM users WHERE id = $1",
        [userId],
      );
      if (
        userCheck.rows.length === 0 ||
        !["admin", "worker", "manager"].includes(userCheck.rows[0].role)
      ) {
        return res.status(403).json({ error: "Доступ запрещен" });
      }

      // Если админ — возвращаем все заказы
      if (userCheck.rows[0].role === "admin") {
        const resultAll = await pool.query(
          `SELECT o.*, 
                  u.name as user_name,
                  u.email as user_email,
                  u.phone as user_phone,
                  array_agg(json_build_object(
                    'product_id', oi.product_id,
                    'product_name', p.name,
                    'quantity', oi.quantity,
                    'unit_price', oi.unit_price,
                    'truck_id', oi.truck_id,
                    'truck_identifier', t_item.identifier,
                    'truck_arrival_date', t_item.arrival_date
                  )) as items
           FROM orders o
           LEFT JOIN users u ON o.user_id = u.id
           LEFT JOIN order_items oi ON o.id = oi.order_id
           LEFT JOIN products p ON oi.product_id = p.id
           LEFT JOIN trucks t_item ON oi.truck_id = t_item.id
           GROUP BY o.id, u.name, u.email, u.phone
           ORDER BY o.created_at DESC`,
        );
        return res.json({ success: true, orders: resultAll.rows });
      }

      // Для менеджеров/сотрудников — показываем только новые (new/pending) без назначения или свои назначенные
      // Заказы назначенные другим видны быть НЕ должны
      const result = await pool.query(
        `SELECT o.*, 
                u.name as user_name,
                u.email as user_email,
                u.phone as user_phone,
                array_agg(json_build_object(
                  'product_id', oi.product_id,
                  'product_name', p.name,
                  'quantity', oi.quantity,
                  'unit_price', oi.unit_price,
                  'truck_id', oi.truck_id,
                  'truck_identifier', t_item.identifier,
                  'truck_arrival_date', t_item.arrival_date
                )) as items
         FROM orders o
         LEFT JOIN users u ON o.user_id = u.id
         LEFT JOIN order_items oi ON o.id = oi.order_id
         LEFT JOIN products p ON oi.product_id = p.id
         LEFT JOIN trucks t_item ON oi.truck_id = t_item.id
         WHERE (o.status IN ('new', 'pending') AND o.assigned_to IS NULL) OR o.assigned_to = $1
         GROUP BY o.id, u.name, u.email, u.phone
         ORDER BY o.created_at DESC`,
        [userId],
      );

      res.json({ success: true, orders: result.rows });
    } catch (error) {
      console.error("Get all orders error:", error);
      res.status(500).json({ error: "Ошибка при получении заказов" });
    }
  });

  // Взять заказ в работу вручную
  router.post("/:orderId/take", async (req, res) => {
    const { orderId } = req.params;
    const { userId } = req.body;

    try {
      const userCheck = await pool.query(
        "SELECT role FROM users WHERE id = $1",
        [userId],
      );
      if (
        userCheck.rows.length === 0 ||
        !["admin", "worker", "manager"].includes(userCheck.rows[0].role)
      ) {
        return res.status(403).json({ error: "Доступ запрещен" });
      }

      const orderRes = await pool.query(
        "SELECT status, assigned_to FROM orders WHERE id = $1",
        [orderId],
      );
      if (orderRes.rows.length === 0) {
        return res.status(404).json({ error: "Заказ не найден" });
      }

      const currentStatus = orderRes.rows[0].status;
      const assignedTo = orderRes.rows[0].assigned_to;

      // ❌ Защита: заказ со статусом "delivered" нельзя взять
      if (currentStatus === "delivered") {
        return res.status(403).json({
          error: "Доставленный заказ нельзя изменять",
        });
      }

      // Если заказ уже назначен другому — запрет для не-админов
      if (
        assignedTo &&
        assignedTo !== userId &&
        userCheck.rows[0].role !== "admin"
      ) {
        return res
          .status(403)
          .json({ error: "Этот заказ уже назначен другому сотруднику" });
      }

      // Пытаемся атомарно назначить текущего пользователя, если заказ не назначен или уже назначен ему
      const result = await pool.query(
        "UPDATE orders SET assigned_to = $1 WHERE id = $2 AND (assigned_to IS NULL OR assigned_to = $1) RETURNING *",
        [userId, orderId],
      );

      if (result.rows.length === 0) {
        // Кто-то успел назначить заказ другому
        const current = await pool.query(
          "SELECT assigned_to FROM orders WHERE id = $1",
          [orderId],
        );
        const currentAssigned = current.rows[0] && current.rows[0].assigned_to;
        if (currentAssigned && currentAssigned !== userId) {
          return res
            .status(403)
            .json({ error: "Этот заказ уже назначен другому сотруднику" });
        }
        return res.status(400).json({ error: "Не удалось назначить заказ" });
      }

      res.json({ success: true, order: result.rows[0] });
    } catch (error) {
      console.error("Take order error:", error);
      res.status(500).json({ error: "Ошибка при взятии заказа" });
    }
  });

  // Подтвердить заказ (worker и admin) плюс взять в работу
  router.put("/:orderId/confirm", async (req, res) => {
    const { orderId } = req.params;
    const { userId } = req.body;

    try {
      const userCheck = await pool.query(
        "SELECT role FROM users WHERE id = $1",
        [userId],
      );
      if (
        userCheck.rows.length === 0 ||
        !["admin", "worker", "manager"].includes(userCheck.rows[0].role)
      ) {
        return res.status(403).json({ error: "Доступ запрещен" });
      }

      // проверяем текущего назначенного
      const orderRes = await pool.query(
        "SELECT status, assigned_to FROM orders WHERE id = $1",
        [orderId],
      );
      if (orderRes.rows.length === 0) {
        return res.status(404).json({ error: "Заказ не найден" });
      }

      const currentStatus = orderRes.rows[0].status;
      const assignedTo = orderRes.rows[0].assigned_to;

      // ❌ Защита: заказ со статусом "delivered" нельзя подтверждать
      if (currentStatus === "delivered") {
        return res.status(403).json({
          error: "Доставленный заказ нельзя изменять",
        });
      }

      if (
        assignedTo &&
        assignedTo !== userId &&
        userCheck.rows[0].role === "worker"
      ) {
        return res.status(403).json({
          error:
            "Этот заказ закреплён за другим сотрудником. Только он может его подтвердить",
        });
      }

      // Если статус ожидания и сотрудник его подтверждает, назначаем ему заказ
      let updateQuery;
      let params;

      if (["new", "pending"].includes(currentStatus)) {
        updateQuery =
          "UPDATE orders SET status = $1, assigned_to = $2 WHERE id = $3 RETURNING *";
        params = ["confirmed", userId, orderId];
      } else {
        // Если статус уже не ожидание, только обновляем статус
        updateQuery = "UPDATE orders SET status = $1 WHERE id = $2 RETURNING *";
        params = ["confirmed", orderId];
      }

      const result = await pool.query(updateQuery, params);

      res.json({
        success: true,
        message: "Заказ успешно подтвержден",
        order: result.rows[0],
      });
    } catch (error) {
      console.error("Confirm order error:", error);
      res.status(500).json({ error: "Ошибка при подтверждении заказа" });
    }
  });

  // Изменить статус заказа (worker и admin) и захватить, если свободен
  router.put("/:orderId/status", async (req, res) => {
    const { orderId } = req.params;
    const { userId, status } = req.body;

    const validStatuses = [
      "new",
      "pending",
      "confirmed",
      "processing",
      "shipped",
      "in_transit",
      "delivered",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Недопустимый статус" });
    }

    try {
      const userCheck = await pool.query(
        "SELECT role FROM users WHERE id = $1",
        [userId],
      );
      if (
        userCheck.rows.length === 0 ||
        !["admin", "worker", "manager"].includes(userCheck.rows[0].role)
      ) {
        return res.status(403).json({ error: "Доступ запрещен" });
      }

      const orderRes = await pool.query(
        "SELECT status, assigned_to FROM orders WHERE id = $1",
        [orderId],
      );
      if (orderRes.rows.length === 0) {
        return res.status(404).json({ error: "Заказ не найден" });
      }

      const currentStatus = orderRes.rows[0].status;
      const assignedTo = orderRes.rows[0].assigned_to;

      // Заказ со статусом "delivered" теперь можно изменять –
      // при откате статуса мы будем удалять связанную запись в shift_sales
      // чтобы G-метрика корректно уменьшалась.
      // (раньше мы запрещали любые изменения для доставленных заказов)

      // Логика проверки прав доступа и назначения
      let updatedOrder;

      if (
        ["new", "pending"].includes(currentStatus) &&
        status !== currentStatus
      ) {
        // Переход из состояния ожидания
        // Только назначаем заказ, если он еще не был кому-то назначен
        if (!assignedTo) {
          // Заказ не назначен - назначаем текущему пользователю
          const result = await pool.query(
            "UPDATE orders SET status = $1, assigned_to = $2 WHERE id = $3 RETURNING *",
            [status, userId, orderId],
          );
          updatedOrder = result.rows[0];
        } else {
          // Заказ уже назначен - только обновляем статус, сохраняя assigned_to
          const result = await pool.query(
            "UPDATE orders SET status = $1 WHERE id = $2 RETURNING *",
            [status, orderId],
          );
          updatedOrder = result.rows[0];
        }
      } else {
        // Если заказ уже назначен
        if (assignedTo) {
          // Только назначенный пользователь может менять статус
          if (assignedTo !== userId && userCheck.rows[0].role === "worker") {
            return res.status(403).json({
              error:
                "Этот заказ назначен другому сотруднику. Только он может менять его статус.",
            });
          }
          // Админы могут менять, но не могут переназначить
          if (assignedTo !== userId && userCheck.rows[0].role === "admin") {
            // Админы могут просмотреть для контроля, но не рекомендуется менять
            // В рабочей системе можно добавить отдельную проверку для админов
          }
        }

        // Обновляем только статус (assigned_to остается неизменным)
        const result = await pool.query(
          "UPDATE orders SET status = $1 WHERE id = $2 RETURNING *",
          [status, orderId],
        );
        updatedOrder = result.rows[0];
      }

      // Снимаем запись shift_sales, если заказ перестал быть доставленным
      if (currentStatus === "delivered" && status !== "delivered") {
        try {
          await pool.query("DELETE FROM shift_sales WHERE order_id = $1", [
            orderId,
          ]);
        } catch (cleanupError) {
          console.error(
            "Error removing shift_sales for order when status changed away from delivered:",
            cleanupError,
          );
        }
      }

      // Если статус изменен на "delivered", создаем записи комиссий
      if (status === "delivered" && currentStatus !== "delivered") {
        try {
          console.log(
            `[DEBUG] Creating shift_sales for order ${orderId}:`,
            `currentStatus=${currentStatus}`,
            `status=${status}`,
            `updatedOrder.assigned_to=${updatedOrder.assigned_to}`,
            `assignedTo=${assignedTo}`,
          );

          // Берем пользователя, кому назначен заказ (реальный продавец/работник)
          // ВАЖНО: используем updatedOrder.assigned_to (актуальное значение после обновления)
          let sellerId = updatedOrder.assigned_to;

          // Если заказ не назначен никому, используем user_id из заказа
          if (!sellerId) {
            const orderData = await pool.query(
              "SELECT user_id FROM orders WHERE id = $1",
              [orderId],
            );
            if (orderData.rows[0]?.user_id) {
              sellerId = orderData.rows[0].user_id;
            }
          }

          // Если есть seller_id, создаем shift_sales
          if (sellerId) {
            // Проверяем, есть ли уже открытая смена для этого продавца
            let shiftResult = await pool.query(
              "SELECT id FROM shifts WHERE user_id = $1 AND status = 'open'",
              [sellerId],
            );

            let shiftId;
            if (shiftResult.rows.length === 0) {
              // Создаем новую смену
              const shiftInsert = await pool.query(
                `INSERT INTO shifts (user_id, shift_date, started_at, status, opening_cash, total_sales)
                 VALUES ($1, $2, $3, 'open', 0, 0) RETURNING id`,
                [sellerId, new Date().toISOString().split("T")[0], new Date()],
              );
              shiftId = shiftInsert.rows[0].id;
            } else {
              shiftId = shiftResult.rows[0].id;
            }

            // Проверяем, нет ли уже записи shift_sales для этого заказа
            const existingSale = await pool.query(
              "SELECT id FROM shift_sales WHERE order_id = $1",
              [orderId],
            );

            if (existingSale.rows.length === 0) {
              // Создаем запись продажи с суммой заказа
              await pool.query(
                `INSERT INTO shift_sales (shift_id, order_id, sale_amount, discount_amount, sale_time)
                 VALUES ($1, $2, $3, 0, $4)`,
                [shiftId, orderId, updatedOrder.total_amount, new Date()],
              );
            }

            // Обновляем seller_id в заказе
            await pool.query("UPDATE orders SET seller_id = $1 WHERE id = $2", [
              sellerId,
              orderId,
            ]);
            updatedOrder.seller_id = sellerId;
          }
        } catch (commissionError) {
          console.error("Error creating commission data:", commissionError);
          // Не прерываем основной процесс из-за ошибки комиссий
        }
      }

      res.json({
        success: true,
        message: "Статус заказа успешно обновлен",
        order: updatedOrder,
      });
    } catch (error) {
      console.error("Update order status error:", error);
      res.status(500).json({ error: "Ошибка при обновлении статуса" });
    }
  });

  // Получить один заказ по ID (должен быть после /all)
  router.get("/:orderId", async (req, res) => {
    const { orderId } = req.params;
    const { userId } = req.query;

    try {
      const result = await pool.query(
        `SELECT o.*, 
                o.assigned_to,
                array_agg(json_build_object(
                  'product_id', oi.product_id,
                  'product_name', p.name,
                  'quantity', oi.quantity,
                  'unit_price', oi.unit_price
                )) as items
         FROM orders o
         LEFT JOIN order_items oi ON o.id = oi.order_id
         LEFT JOIN products p ON oi.product_id = p.id
         WHERE o.id = $1
         GROUP BY o.id`,
        [orderId],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Заказ не найден" });
      }

      const order = result.rows[0];

      // Если запрошен non-admin пользователь — проверяем видимость
      if (userId) {
        const userCheck = await pool.query(
          "SELECT role FROM users WHERE id = $1",
          [userId],
        );
        if (
          userCheck.rows.length === 0 ||
          !["admin", "worker", "manager"].includes(userCheck.rows[0].role)
        ) {
          return res.status(403).json({ error: "Доступ запрещен" });
        }

        // Админ видит всё
        if (userCheck.rows[0].role !== "admin") {
          // Менеджер/работник видит заказ только если он незназначен и в ожидании,
          // или если он назначен лично ему
          const isWaiting =
            (order.status === "new" || order.status === "pending") &&
            order.assigned_to === null;
          const isAssignedToUser = order.assigned_to === Number(userId);
          if (!isWaiting && !isAssignedToUser) {
            return res.status(403).json({ error: "Этот заказ не доступен" });
          }
        }
      }

      res.json({ success: true, order });
    } catch (error) {
      console.error("Get order error:", error);
      res.status(500).json({ error: "Ошибка при получении заказа" });
    }
  });

  // Удалить заказы (по массиву ID)
  router.delete("/", async (req, res) => {
    const client = await pool.connect();
    try {
      const { ids, user_id } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "Требуется массив IDs заказов" });
      }

      console.log("[Delete Orders] Deleting IDs:", ids, "user_id:", user_id);

      await client.query("BEGIN");

      // Удаляем order_items сначала (внешний ключ)
      await client.query(`DELETE FROM order_items WHERE order_id = ANY($1)`, [
        ids,
      ]);

      // Удаляем заказы
      let deleteQuery = "DELETE FROM orders WHERE id = ANY($1)";
      let params = [ids];

      // Если есть user_id, убеждаемся что удаляем только свои заказы
      if (user_id) {
        deleteQuery += " AND user_id = $2";
        params.push(user_id);
        console.log("[Delete Orders] Restricting delete to user_id:", user_id);
      } else {
        console.log(
          "[Delete Orders] No user_id restriction, deleting all selected orders",
        );
      }

      const result = await client.query(deleteQuery, params);
      console.log("[Delete Orders] Deleted rows:", result.rowCount);

      await client.query("COMMIT");

      res.json({
        success: true,
        message: `Удалено ${result.rowCount} заказов`,
        deleted_count: result.rowCount,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Delete orders error:", error);
      res.status(500).json({ error: "Ошибка при удалении заказов" });
    } finally {
      client.release();
    }
  });

  // Скачать PDF накладную заказа
  router.get("/:orderId/invoice", async (req, res) => {
    const { orderId } = req.params;
    const { userId } = req.query;

    try {
      // Проверка прав (должен быть админ/работник)
      if (userId) {
        const userCheck = await pool.query(
          "SELECT role FROM users WHERE id = $1",
          [userId],
        );
        if (
          userCheck.rows.length === 0 ||
          !["admin", "worker", "manager"].includes(userCheck.rows[0].role)
        ) {
          return res.status(403).json({ error: "Доступ запрещен" });
        }
      }

      // Получаем заказ и его товары
      const orderResult = await pool.query(
        `SELECT o.*, 
                array_agg(json_build_object(
                  'product_id', oi.product_id,
                  'product_name', p.name,
                  'quantity', oi.quantity,
                  'unit_price', oi.unit_price,
                  'total', oi.quantity * oi.unit_price
                )) as items
         FROM orders o
         LEFT JOIN order_items oi ON o.id = oi.order_id
         LEFT JOIN products p ON oi.product_id = p.id
         WHERE o.id = $1
         GROUP BY o.id`,
        [orderId],
      );

      if (orderResult.rows.length === 0) {
        return res.status(404).json({ error: "Заказ не найден" });
      }

      const order = orderResult.rows[0];

      // Генерируем PDF через HTML с полной поддержкой кириллицы
      const pdf = require("html-pdf");

      // Формируем данные для таблицы
      const items = order.items.filter((item) => item.product_id !== null);

      let itemsHtml = "";
      items.forEach((item) => {
        itemsHtml += `
          <tr>
            <td>${item.product_name || "N/A"}</td>
            <td align="center">${item.quantity}</td>
            <td align="right">${Number(item.unit_price).toFixed(2)} ₸</td>
            <td align="right">${(item.quantity * item.unit_price).toFixed(2)} ₸</td>
          </tr>
        `;
      });

      // HTML шаблон с поддержкой кириллицы
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              color: #333;
            }
            .header {
              border-bottom: 2px solid #000;
              margin-bottom: 20px;
              padding-bottom: 10px;
            }
            .title {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .subtitle {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 20px;
            }
            .info-row {
              margin-bottom: 5px;
              font-size: 12px;
            }
            .section-title {
              font-size: 14px;
              font-weight: bold;
              margin-top: 20px;
              margin-bottom: 10px;
              border-bottom: 1px solid #ccc;
              padding-bottom: 5px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            th {
              background-color: #f0f0f0;
              border: 1px solid #999;
              padding: 8px;
              text-align: left;
              font-weight: bold;
              font-size: 12px;
            }
            td {
              border: 1px solid #999;
              padding: 8px;
              font-size: 11px;
            }
            .total {
              margin-top: 20px;
              text-align: right;
              font-weight: bold;
              font-size: 14px;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 12px;
              color: #666;
            }
            .company-name {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 5px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">SprayFlowers</div>
            <div class="title">НАКЛАДНАЯ</div>
          </div>

          <div class="info-row"><strong>Номер заказа:</strong> #${order.id}</div>
          <div class="info-row"><strong>Дата:</strong> ${new Date(order.created_at).toLocaleDateString("ru-RU")}</div>
          <div class="info-row"><strong>Статус:</strong> ${order.status}</div>

          <div class="section-title">Информация о клиенте</div>
          <div class="info-row"><strong>Имя:</strong> ${order.customer_name || "N/A"}</div>
          <div class="info-row"><strong>Телефон:</strong> ${order.customer_phone || "N/A"}</div>
          <div class="info-row"><strong>Email:</strong> ${order.customer_email || "N/A"}</div>
          <div class="info-row"><strong>Город:</strong> ${order.delivery_city || "N/A"}</div>
          <div class="info-row"><strong>Адрес:</strong> ${order.delivery_address || "N/A"}</div>
          <div class="info-row"><strong>Дата доставки:</strong> ${new Date(order.delivery_date).toLocaleDateString("ru-RU")}</div>

          <div class="section-title">Товары</div>
          <table>
            <thead>
              <tr>
                <th>Название товара</th>
                <th width="80">Кол-во</th>
                <th width="100">Цена</th>
                <th width="100">Сумма</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="total">
            Итого к оплате: ${Number(order.total_amount).toFixed(2)} ₸
          </div>

          <div class="footer">
            <p>Спасибо за заказ!</p>
          </div>
        </body>
        </html>
      `;

      // Генерируем PDF через pdfkit и встраиваем системный TTF шрифт
      const PDFDocument = require("pdfkit");
      const fs = require("fs");
      const path = require("path");

      // Ищем подходящие системные шрифты (Windows / Linux)
      const possibleRegular = [
        path.join(process.env.WINDIR || "C:\\Windows", "Fonts", "arial.ttf"),
        path.join(process.env.WINDIR || "C:\\Windows", "Fonts", "Tahoma.ttf"),
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        path.join(__dirname, "../fonts/DejaVuSans.ttf"),
      ];
      const possibleBold = [
        path.join(process.env.WINDIR || "C:\\Windows", "Fonts", "arialbd.ttf"),
        path.join(
          process.env.WINDIR || "C:\\Windows",
          "Fonts",
          "Tahoma Bold.ttf",
        ),
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        path.join(__dirname, "../fonts/DejaVuSans-Bold.ttf"),
      ];

      let regularFont = null;
      for (const p of possibleRegular) {
        if (p && fs.existsSync(p)) {
          regularFont = p;
          break;
        }
      }

      let boldFont = null;
      for (const p of possibleBold) {
        if (p && fs.existsSync(p)) {
          boldFont = p;
          break;
        }
      }

      const doc = new PDFDocument({ size: "A4", margin: 50 });

      if (regularFont) doc.registerFont("Custom", regularFont);
      if (boldFont) doc.registerFont("Custom-Bold", boldFont);

      const fontNormal = regularFont ? "Custom" : "Helvetica";
      const fontBold = boldFont ? "Custom-Bold" : "Helvetica-Bold";

      // Заголовок
      doc.fontSize(16).font(fontBold).text("SprayFlowers", 50, 50);
      doc.fontSize(20).font(fontBold).text("НАКЛАДНАЯ", 50, 80);

      doc.fontSize(10).font(fontNormal);
      doc.text(`Номер заказа: #${order.id}`, 50, 120);
      doc.text(
        `Дата: ${new Date(order.created_at).toLocaleDateString("ru-RU")}`,
        50,
        135,
      );
      doc.text(`Статус: ${order.status}`, 50, 150);

      // Информация о клиенте
      doc.fontSize(12).font(fontBold).text("Информация о клиенте", 50, 180);
      doc.fontSize(10).font(fontNormal);
      doc.text(`Имя: ${order.customer_name || "N/A"}`, 50, 200);
      doc.text(`Телефон: ${order.customer_phone || "N/A"}`, 50, 215);
      doc.text(`Email: ${order.customer_email || "N/A"}`, 50, 230);
      doc.text(`Город: ${order.delivery_city || "N/A"}`, 50, 245);
      doc.text(`Адрес: ${order.delivery_address || "N/A"}`, 50, 260);
      doc.text(
        `Дата доставки: ${new Date(order.delivery_date).toLocaleDateString("ru-RU")}`,
        50,
        275,
      );

      // Таблица товаров
      const startY = 310;
      doc.fontSize(11).font(fontBold);
      doc.text("Товары", 50, startY);

      // Заголовки таблицы
      const headerY = startY + 20;
      doc.fontSize(10).font(fontBold);
      doc.text("Название", 50, headerY);
      doc.text("Кол-во", 250, headerY);
      doc.text("Цена", 320, headerY);
      doc.text("Сумма", 400, headerY);

      // Строки таблицы
      let currentY = headerY + 15;
      const itemsArr = order.items.filter((item) => item.product_id !== null);

      if (itemsArr.length === 0) {
        doc.fontSize(9).font(fontNormal).text("Нет товаров", 50, currentY);
        currentY += 15;
      } else {
        doc.fontSize(9).font(fontNormal);
        itemsArr.forEach((item) => {
          doc.text(item.product_name || "N/A", 50, currentY);
          doc.text(item.quantity.toString(), 250, currentY);
          doc.text(`${Number(item.unit_price).toFixed(2)} ₸`, 320, currentY);
          doc.text(
            `${(item.quantity * item.unit_price).toFixed(2)} ₸`,
            400,
            currentY,
          );
          currentY += 15;
        });
      }

      // Итого
      const totalY = currentY + 15;
      doc.fontSize(12).font(fontBold);
      doc.text("Итого к оплате:", 50, totalY);
      doc.text(`${Number(order.total_amount).toFixed(2)} ₸`, 400, totalY);

      // Спасибо
      doc
        .fontSize(11)
        .font(fontNormal)
        .text("Спасибо за заказ!", 50, totalY + 50);

      // Установка headers для скачивания
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="invoice_${orderId}.pdf"`,
      );

      // Отправляем PDF
      doc.pipe(res);
      doc.end();
    } catch (error) {
      console.error("Generate invoice error:", error);
      res.status(500).json({ error: "Ошибка при генерации накладной" });
    }
  });

  // Пометить заказ как возврат / refund order
  router.put("/:orderId/refund", async (req, res) => {
    try {
      const { orderId } = req.params;
      const { userId } = req.body;

      // Проверка доступа
      const userCheck = await pool.query(
        "SELECT role FROM users WHERE id = $1",
        [userId],
      );
      if (
        userCheck.rows.length === 0 ||
        !["admin", "worker", "manager"].includes(userCheck.rows[0].role)
      ) {
        return res.status(403).json({ error: "Доступ запрещен" });
      }

      // Обновляем payment_status на 'refunded'
      const result = await pool.query(
        "UPDATE orders SET payment_status = $1 WHERE id = $2 RETURNING id, status, payment_status",
        ["refunded", orderId],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Заказ не найден" });
      }

      res.json({
        success: true,
        message: "Заказ помечен как возврат",
        order: result.rows[0],
      });
    } catch (error) {
      console.error("Refund order error:", error);
      res.status(500).json({ error: "Ошибка при обработке возврата" });
    }
  });

  return router;
};
