const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const axios = require("axios");

// Простое in-memory хранилище кодов SMS (для demo)
const smsCodes = new Map();

module.exports = (pool, logger) => {
  // ============ AUTHENTICATION ============

  const normalizePhone = (phone) => {
    if (!phone || typeof phone !== "string") return "";
    let digits = phone.replace(/\D/g, "");
    if (digits.length === 10) digits = "7" + digits;
    if (digits.length === 11 && digits.startsWith("8")) {
      digits = "7" + digits.slice(1);
    }
    return digits;
  };

  // Отправка SMS-кода по телефону
  router.post("/send-sms-code", async (req, res) => {
    const { phone } = req.body;
    const normalizedPhone = normalizePhone(phone);

    if (!normalizedPhone || normalizedPhone.length < 11) {
      return res.status(400).json({ error: "Неверный формат номера телефона" });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = Date.now() + 5 * 60 * 1000;
    smsCodes.set(normalizedPhone, { code, expiresAt });

    console.log(`SMS code for ${normalizedPhone}: ${code} (expires in 5 min)`);

    // Отправка SMS через SMSC.KZ
    let providerResult = {
      provider: "smsc",
      success: false,
      raw: null,
      status: null,
      error: null,
    };

    try {
      if (process.env.SMSC_LOGIN && process.env.SMSC_PASSWORD) {
        // SMSC.KZ принимает номер без плюса (просто 11+ цифр, начиная с 7)
        const phoneForSMSC = normalizedPhone.replace(/^\+/, ""); // Убираем плюс если есть
        const message = `Ваш код: ${code}`;

        const smsUrl = `https://smsc.kz/sys/send.php?login=${encodeURIComponent(process.env.SMSC_LOGIN)}&psw=${encodeURIComponent(process.env.SMSC_PASSWORD)}&phones=${phoneForSMSC}&mes=${encodeURIComponent(message)}&charset=utf-8&fmt=1`;

        console.log(
          "SMSC URL:",
          smsUrl.replace(process.env.SMSC_PASSWORD, "***"),
        );

        const response = await axios.get(smsUrl, {
          timeout: 10000,
          headers: { "User-Agent": "greenflowers-app" },
        });
        const responseText = String(response.data).trim();
        providerResult.raw = responseText;

        console.log("SMSC response:", responseText);

        // Ответ SMSC: "id,status" (например: "25,0" или "25,3")
        const [idStr, statusStr] = responseText.split(",");
        const status = statusStr?.trim();
        providerResult.status = status;
        providerResult.id = idStr;

        if (status === "0") {
          providerResult.success = true;
          console.log(`✓ SMS успешно отправлена. ID: ${idStr}`);
        } else if (status === "1") {
          providerResult.success = true;
          console.log(`✓ SMS в очереди. ID: ${idStr}`);
        } else if (
          status === "3" ||
          status === "-3" ||
          responseText.includes("balance")
        ) {
          providerResult.error = "no_balance";
          console.error(
            "⚠️  SMSC: Недостаточно средств. Пополните баланс в личном кабинете SMSC.KZ",
          );
          console.log(
            "✓ DEV MODE: Код отправляется в ответе API для локального тестирования",
          );
        } else if (status === "-4" || responseText.includes("permission")) {
          providerResult.error = "auth_failed";
          console.error(
            "❌ SMSC: Ошибка аутентификации (проверьте SMSC_LOGIN/SMSC_PASSWORD)",
          );
        } else {
          providerResult.error = "unknown_response";
          console.warn(`⚠️  SMSC: Неожиданный ответ (статус ${statusStr})`);
          console.log("Полный ответ:", responseText);
        }
      } else {
        providerResult.error = "missing_credentials";
        console.warn(
          "⚠️  SMSC credentials not configured in .env - используется DEV режим",
        );
      }
    } catch (error) {
      providerResult.error = "request_failed";
      providerResult.errorMessage = error?.message;
      console.error("SMS request failed:", error?.message || error);
      console.warn("⚠️  SMS delivery failed - используется DEV режим");
    }

    const response = {
      success: true,
      message: "Код отправлен",
      provider: providerResult,
    };

    if (process.env.DEV_MODE === "true") {
      response.code = code; // Для dev-режима показываем код в ответе
    }

    return res.json(response);
  });

  // Вход/регистрация по телефону + SMS-коду
  router.post("/login-phone", async (req, res) => {
    const { phone, code, name, city } = req.body;
    const normalizedPhone = normalizePhone(phone);

    if (!normalizedPhone || normalizedPhone.length < 11) {
      return res.status(400).json({ error: "Неверный формат номера телефона" });
    }

    if (!code) {
      return res.status(400).json({ error: "Код SMS обязателен" });
    }

    const stored = smsCodes.get(normalizedPhone);
    if (!stored || stored.code !== String(code)) {
      return res.status(401).json({ error: "Неверный код" });
    }

    if (stored.expiresAt < Date.now()) {
      smsCodes.delete(normalizedPhone);
      return res.status(401).json({ error: "Срок действия кода истек" });
    }

    smsCodes.delete(normalizedPhone);

    try {
      let result = await pool.query(
        "SELECT * FROM users WHERE phone = $1 AND is_active = true",
        [normalizedPhone],
      );

      let user = result.rows[0];

      if (!user) {
        // Создаем пользователя с автоматической почтой и случайным паролем
        const fakeEmail = `${normalizedPhone}@sms.sprayflowers.local`;
        const randomPassword = Math.random().toString(36).slice(-12);
        const passwordHash = await bcrypt.hash(randomPassword, 10);

        const insert = await pool.query(
          `INSERT INTO users (email, password_hash, name, phone, city, role, is_active)
             VALUES ($1, $2, $3, $4, $5, 'user', true)
             RETURNING id, email, name, phone, role, city, company_name, is_active, created_at`,
          [
            fakeEmail,
            passwordHash,
            name || normalizedPhone,
            normalizedPhone,
            city || "Алматы",
          ],
        );

        user = insert.rows[0];
      }

      const { password_hash, ...userWithoutPassword } = user;

      await logger.logLogin(
        user.id,
        user.email || normalizedPhone,
        req.ip,
        req.get("user-agent"),
        true,
      );

      return res.json({
        success: true,
        message: "Успешный вход",
        user: userWithoutPassword,
      });
    } catch (error) {
      console.error("Login-phone error:", error);
      return res.status(500).json({ error: "Ошибка при авторизации" });
    }
  });

  // Регистрация нового пользователя (только по телефону и SMS)
  router.post("/register", async (req, res) => {
    return res.status(400).json({
      error:
        "Регистрация по email/паролю отключена, используйте /users/login-phone",
    });
  });

  // Авторизация по телефону + SMS; старый метод отключен
  router.post("/login", async (req, res) => {
    return res.status(400).json({
      error:
        "Авторизация по email/паролю отключена, используйте /users/login-phone",
    });
  });

  // ============ ADMIN ROUTES ============

  // Получить всех пользователей (только для admin)
  router.get("/admin/users", async (req, res) => {
    const { adminId } = req.query;

    try {
      // Проверка прав админа
      const adminCheck = await pool.query(
        "SELECT role FROM users WHERE id = $1",
        [adminId],
      );
      if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== "admin") {
        return res
          .status(403)
          .json({ error: "Доступ запрещен. Требуются права администратора" });
      }

      const result = await pool.query(
        `SELECT id, email, name, phone, role, city, company_name, is_active, created_at 
         FROM users ORDER BY created_at DESC`,
      );

      res.json({ success: true, users: result.rows });
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ error: "Ошибка при получении пользователей" });
    }
  });

  // Получить контрагентов для работника (worker) — показываем не-admin пользователей
  router.get("/worker/users", async (req, res) => {
    const { workerId } = req.query;

    try {
      // Проверка роли: разрешаем access для worker или admin
      const roleCheck = await pool.query(
        "SELECT role FROM users WHERE id = $1",
        [workerId],
      );
      if (roleCheck.rows.length === 0) {
        return res.status(403).json({ error: "Доступ запрещен" });
      }
      const role = roleCheck.rows[0].role;
      if (role !== "worker" && role !== "admin") {
        return res.status(403).json({ error: "Доступ запрещен" });
      }

      // Возвращаем всех пользователей кроме админов — это список контрагентов
      const result = await pool.query(
        `SELECT id, email, name, phone, role, city, company_name, is_active, created_at 
         FROM users WHERE role != 'admin' ORDER BY created_at DESC`,
      );

      res.json({ success: true, users: result.rows });
    } catch (error) {
      console.error("Get worker users error:", error);
      res.status(500).json({ error: "Ошибка при получении контрагентов" });
    }
  });

  // Изменить роль пользователя (только для admin)
  router.put("/admin/users/:userId/role", async (req, res) => {
    const { userId } = req.params;
    const { adminId, newRole } = req.body;

    if (!["user", "worker", "admin"].includes(newRole)) {
      return res.status(400).json({ error: "Недопустимая роль" });
    }

    try {
      // Проверка прав админа
      const adminCheck = await pool.query(
        "SELECT role FROM users WHERE id = $1",
        [adminId],
      );
      if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== "admin") {
        return res.status(403).json({ error: "Доступ запрещен" });
      }

      const result = await pool.query(
        "UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, name, role",
        [newRole, userId],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Пользователь не найден" });
      }

      res.json({
        success: true,
        message: "Роль успешно изменена",
        user: result.rows[0],
      });
    } catch (error) {
      console.error("Update role error:", error);
      res.status(500).json({ error: "Ошибка при изменении роли" });
    }
  });

  // Удалить пользователя (только для admin)
  router.delete("/admin/users/:userId", async (req, res) => {
    const { userId } = req.params;
    const { adminId } = req.query;

    try {
      // Проверка прав админа
      const adminCheck = await pool.query(
        "SELECT role FROM users WHERE id = $1",
        [adminId],
      );
      if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== "admin") {
        return res.status(403).json({ error: "Доступ запрещен" });
      }

      // Нельзя удалить самого себя
      if (userId === adminId) {
        return res
          .status(400)
          .json({ error: "Невозможно удалить собственную учетную запись" });
      }

      const result = await pool.query(
        "DELETE FROM users WHERE id = $1 RETURNING email",
        [userId],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Пользователь не найден" });
      }

      res.json({
        success: true,
        message: `Пользователь ${result.rows[0].email} успешно удален`,
      });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ error: "Ошибка при удалении пользователя" });
    }
  });

  // Редактировать пользователя (только для admin)
  router.put("/admin/users/:userId", async (req, res) => {
    const { userId } = req.params;
    const { adminId, name, phone, email, city, company_name, is_active } =
      req.body;

    try {
      // Проверка прав админа
      const adminCheck = await pool.query(
        "SELECT role FROM users WHERE id = $1",
        [adminId],
      );
      if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== "admin") {
        return res.status(403).json({ error: "Доступ запрещен" });
      }

      // Проверка email на уникальность (если меняется)
      if (email) {
        const emailCheck = await pool.query(
          "SELECT id FROM users WHERE email = $1 AND id != $2",
          [email, userId],
        );
        if (emailCheck.rows.length > 0) {
          return res
            .status(400)
            .json({ error: "Email уже используется другим пользователем" });
        }
      }

      const result = await pool.query(
        `UPDATE users SET 
          name = COALESCE($1, name),
          phone = COALESCE($2, phone),
          email = COALESCE($3, email),
          city = COALESCE($4, city),
          company_name = COALESCE($5, company_name),
          is_active = COALESCE($6, is_active)
         WHERE id = $7 
         RETURNING id, email, name, phone, role, city, company_name, is_active, created_at`,
        [name, phone, email, city, company_name, is_active, userId],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Пользователь не найден" });
      }

      res.json({
        success: true,
        message: "Пользователь успешно обновлен",
        user: result.rows[0],
      });
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ error: "Ошибка при обновлении пользователя" });
    }
  });

  // Изменить пароль пользователя (только для admin)
  router.put("/admin/users/:userId/password", async (req, res) => {
    const { userId } = req.params;
    const { adminId, newPassword } = req.body;

    try {
      // Проверка прав админа
      const adminCheck = await pool.query(
        "SELECT role FROM users WHERE id = $1",
        [adminId],
      );
      if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== "admin") {
        return res.status(403).json({ error: "Доступ запрещен" });
      }

      // Хеширование нового пароля
      const passwordHash = await bcrypt.hash(newPassword, 10);

      const result = await pool.query(
        "UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING email",
        [passwordHash, userId],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Пользователь не найден" });
      }

      res.json({
        success: true,
        message: `Пароль для ${result.rows[0].email} успешно изменен`,
      });
    } catch (error) {
      console.error("Update password error:", error);
      res.status(500).json({ error: "Ошибка при изменении пароля" });
    }
  });

  // ============ USER PROFILE ============

  // Обновить профиль пользователя
  router.put("/profile/:userId", async (req, res) => {
    const { userId } = req.params;
    const { name, phone, city, company_name } = req.body;

    try {
      const result = await pool.query(
        `UPDATE users 
         SET name = $1, phone = $2, city = $3, company_name = $4, updated_at = CURRENT_TIMESTAMP
         WHERE id = $5
         RETURNING id, email, name, phone, role, city, company_name, created_at`,
        [name, phone, city, company_name, userId],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Пользователь не найден" });
      }

      res.json({
        success: true,
        message: "Профиль успешно обновлен",
        user: result.rows[0],
      });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ error: "Ошибка при обновлении профиля" });
    }
  });

  // Получить статистику пользователя
  router.get("/profile/:userId/stats", async (req, res) => {
    const { userId } = req.params;

    try {
      // Получить количество заказов и общую сумму
      const ordersStats = await pool.query(
        `SELECT 
          COUNT(*) as total_orders,
          COUNT(*) FILTER (WHERE status IN ('pending', 'confirmed', 'in_transit')) as active_orders,
          COALESCE(SUM(total_amount), 0) as total_spent
         FROM orders 
         WHERE user_id = $1`,
        [userId],
      );

      // Получить количество предзаказов
      const preordersStats = await pool.query(
        `SELECT COUNT(*) as total_preorders
         FROM preorders 
         WHERE user_id = $1`,
        [userId],
      );

      res.json({
        success: true,
        stats: {
          totalOrders: parseInt(ordersStats.rows[0].total_orders) || 0,
          activeOrders: parseInt(ordersStats.rows[0].active_orders) || 0,
          totalSpent: parseFloat(ordersStats.rows[0].total_spent) || 0,
          totalPreorders: parseInt(preordersStats.rows[0].total_preorders) || 0,
        },
      });
    } catch (error) {
      console.error("Get profile stats error:", error);
      res.status(500).json({ error: "Ошибка при получении статистики" });
    }
  });

  // Обновить профиль пользователя
  router.put("/profile", async (req, res) => {
    const { id, name, phone, address } = req.body;

    if (!id) {
      return res.status(400).json({ error: "ID пользователя не указан" });
    }

    // Валидация обязательных полей
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Имя обязательно" });
    }

    if (!address || !address.trim()) {
      return res.status(400).json({ error: "Адрес доставки обязателен" });
    }

    try {
      // Проверка что пользователь существует
      const userCheck = await pool.query("SELECT id FROM users WHERE id = $1", [
        id,
      ]);
      if (userCheck.rows.length === 0) {
        return res.status(404).json({ error: "Пользователь не найден" });
      }

      // Обновление профиля
      const result = await pool.query(
        `UPDATE users 
         SET name = $1, phone = $2, address = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4 
         RETURNING id, email, name, phone, address, city, role, created_at`,
        [name.trim(), phone ? phone.trim() : null, address.trim(), id],
      );

      res.json({
        success: true,
        message: "Профиль успешно обновлен",
        user: result.rows[0],
      });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ error: "Ошибка при обновлении профиля" });
    }
  });

  return router;
};
