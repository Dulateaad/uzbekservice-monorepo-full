// Logger module для записи всех действий в БД

class Logger {
  constructor(pool) {
    this.pool = pool;
  }

  async log(data) {
    const {
      userId = null,
      action,
      entityType = null,
      entityId = null,
      description = "",
      ipAddress = null,
      userAgent = null,
      status = "success",
      errorMessage = null,
    } = data;

    try {
      await this.pool.query(
        `INSERT INTO system_logs 
         (user_id, action, entity_type, entity_id, description, ip_address, user_agent, status, error_message) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          userId,
          action,
          entityType,
          entityId,
          description,
          ipAddress,
          userAgent,
          status,
          errorMessage,
        ],
      );

      console.log(`[LOG] ${action} - ${status} - ${description}`);
    } catch (error) {
      console.error("Error writing log to database:", error);
    }
  }

  // Специфичные методы для разных типов действий
  async logRegistration(
    userId,
    email,
    ipAddress,
    userAgent,
    success = true,
    error = null,
  ) {
    await this.log({
      userId,
      action: "user_registration",
      entityType: "user",
      entityId: userId,
      description: `Регистрация пользователя: ${email}`,
      ipAddress,
      userAgent,
      status: success ? "success" : "error",
      errorMessage: error,
    });
  }

  async logLogin(
    userId,
    email,
    ipAddress,
    userAgent,
    success = true,
    error = null,
  ) {
    await this.log({
      userId,
      action: "user_login",
      entityType: "user",
      entityId: userId,
      description: `Вход пользователя: ${email}`,
      ipAddress,
      userAgent,
      status: success ? "success" : "error",
      errorMessage: error,
    });
  }

  async logProductCreate(
    userId,
    productId,
    productName,
    success = true,
    error = null,
  ) {
    await this.log({
      userId,
      action: "product_create",
      entityType: "product",
      entityId: productId,
      description: `Создан товар: ${productName}`,
      status: success ? "success" : "error",
      errorMessage: error,
    });
  }

  async logProductUpdate(
    userId,
    productId,
    productName,
    success = true,
    error = null,
  ) {
    await this.log({
      userId,
      action: "product_update",
      entityType: "product",
      entityId: productId,
      description: `Обновлен товар: ${productName}`,
      status: success ? "success" : "error",
      errorMessage: error,
    });
  }

  async logProductDelete(
    userId,
    productId,
    productName,
    success = true,
    error = null,
  ) {
    await this.log({
      userId,
      action: "product_delete",
      entityType: "product",
      entityId: productId,
      description: `Удален товар: ${productName}`,
      status: success ? "success" : "error",
      errorMessage: error,
    });
  }

  async logOrderCreate(
    userId,
    orderId,
    totalAmount,
    success = true,
    error = null,
  ) {
    await this.log({
      userId,
      action: "order_create",
      entityType: "order",
      entityId: orderId,
      description: `Создан заказ на сумму: ${totalAmount} KZT`,
      status: success ? "success" : "error",
      errorMessage: error,
    });
  }

  async logOrderStatusChange(
    userId,
    orderId,
    newStatus,
    success = true,
    error = null,
  ) {
    await this.log({
      userId,
      action: "order_status_change",
      entityType: "order",
      entityId: orderId,
      description: `Изменен статус заказа на: ${newStatus}`,
      status: success ? "success" : "error",
      errorMessage: error,
    });
  }

  async logRoleChange(
    adminId,
    targetUserId,
    newRole,
    success = true,
    error = null,
  ) {
    await this.log({
      userId: adminId,
      action: "user_role_change",
      entityType: "user",
      entityId: targetUserId,
      description: `Изменена роль пользователя на: ${newRole}`,
      status: success ? "success" : "error",
      errorMessage: error,
    });
  }

  async logUserDelete(
    adminId,
    targetUserId,
    email,
    success = true,
    error = null,
  ) {
    await this.log({
      userId: adminId,
      action: "user_delete",
      entityType: "user",
      entityId: targetUserId,
      description: `Удален пользователь: ${email}`,
      status: success ? "success" : "error",
      errorMessage: error,
    });
  }

  // Получить логи с фильтрацией
  async getLogs(filters = {}) {
    const {
      userId,
      action,
      entityType,
      startDate,
      endDate,
      status,
      limit = 100,
      offset = 0,
    } = filters;

    let query = `
      SELECT l.*, u.email as user_email, u.name as user_name
      FROM system_logs l
      LEFT JOIN users u ON l.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (userId) {
      query += ` AND l.user_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }

    if (action) {
      query += ` AND l.action = $${paramIndex}`;
      params.push(action);
      paramIndex++;
    }

    if (entityType) {
      query += ` AND l.entity_type = $${paramIndex}`;
      params.push(entityType);
      paramIndex++;
    }

    if (status) {
      query += ` AND l.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (startDate) {
      query += ` AND l.created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND l.created_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    query += ` ORDER BY l.created_at DESC LIMIT $${paramIndex} OFFSET $${
      paramIndex + 1
    }`;
    params.push(limit, offset);

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async info(action, description) {
    // Support both info(action, description) and info(message)
    if (description === undefined) {
      await this.log({
        action: "info",
        description: String(action),
        status: "info",
      });
    } else {
      await this.log({
        action,
        description,
        status: "info",
      });
    }
  }

  async warn(messageOrAction, description) {
    if (description === undefined) {
      await this.log({
        action: "warn",
        description: String(messageOrAction),
        status: "warn",
      });
    } else {
      await this.log({
        action: messageOrAction,
        description,
        status: "warn",
      });
    }
  }

  async debug(messageOrAction, description) {
    if (description === undefined) {
      await this.log({
        action: "debug",
        description: String(messageOrAction),
        status: "debug",
      });
    } else {
      await this.log({
        action: messageOrAction,
        description,
        status: "debug",
      });
    }
  }

  async error(action, description, context = {}) {
    await this.log({
      action,
      description,
      status: "error",
      errorMessage: JSON.stringify(context),
    });
  }
}

module.exports = Logger;
