const express = require("express");
const { nextId } = require("./counters");
const { normalizePhone, tsToIso } = require("./userUtils");

/** Firestore отклоняет значения undefined в полях документа. */
function forFirestoreDoc(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

function clientIp(req) {
  const xff =
    typeof req.get === "function"
      ? req.get("x-forwarded-for")
      : req.headers?.["x-forwarded-for"];
  if (xff) return String(xff).split(",")[0].trim() || null;
  const ip = req.ip;
  return ip != null && ip !== "" ? String(ip) : null;
}

function userAgent(req) {
  if (req && typeof req.get === "function") {
    const u = req.get("user-agent");
    return u != null && u !== "" ? String(u) : null;
  }
  const h = req.headers?.["user-agent"] || req.headers?.["User-Agent"];
  return h != null && h !== "" ? String(h) : null;
}

/** Только JSON-совместимые значения (без Firestore Timestamp в ответе). */
function safeMetaTime(v) {
  if (v == null || v === "") return null;
  const iso = tsToIso(v);
  if (iso) return iso;
  if (typeof v === "string" || typeof v === "number") return v;
  return null;
}

async function appendLoginLogSafe(db, admin, loginLog) {
  try {
    await db.collection("login_logs").add(forFirestoreDoc(loginLog));
  } catch (err) {
    console.error("login_logs write skipped:", err?.message || err);
  }
}

/** Числовой id для API; Firestore не допускает NaN в документах (логи, счётчики). */
function resolveUserNumericId(data, docId) {
  if (data?.id != null) {
    const n = Number(data.id);
    if (Number.isFinite(n)) return n;
  }
  const fromDoc = Number(String(docId).trim());
  if (Number.isFinite(fromDoc)) return fromDoc;
  return null;
}

function userDocToApi(data, docId) {
  if (!data) return null;
  const resolved = resolveUserNumericId(data, docId);
  return {
    id: resolved != null ? resolved : 0,
    email: data.email ?? null,
    name: data.name ?? null,
    phone: data.phone ?? null,
    role: data.role ?? "user",
    city: data.city ?? null,
    company_name: data.company_name ?? null,
    address: data.address ?? null,
    is_active: data.is_active !== false,
    created_at: safeMetaTime(data.created_at),
    updated_at: safeMetaTime(data.updated_at),
  };
}

function expiresAtMs(v) {
  if (v == null) return 0;
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "object" && typeof v.toMillis === "function") return v.toMillis();
  return 0;
}

module.exports = function createUsersRouter({ db, admin, bcrypt, axios, requireAuth }) {
  const router = express.Router();

  async function findUserByPhone(phone) {
    const q = await db.collection("users").where("phone", "==", phone).limit(1).get();
    if (q.empty) return null;
    const doc = q.docs[0];
    return { ref: doc.ref, data: doc.data(), id: doc.id };
  }

  function normalizeEmail(email) {
    return String(email || "")
      .trim()
      .toLowerCase();
  }

  async function findUserByEmail(email) {
    const e = normalizeEmail(email);
    if (!e) return null;
    const q = await db.collection("users").where("email", "==", e).limit(1).get();
    if (q.empty) return null;
    const doc = q.docs[0];
    return { ref: doc.ref, data: doc.data(), id: doc.id };
  }

  router.post("/send-sms-code", async (req, res) => {
    const { phone } = req.body || {};
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone || normalizedPhone.length < 11) {
      return res.status(400).json({ error: "Неверный формат номера телефона" });
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = Date.now() + 5 * 60 * 1000;
    await db.collection("sms_codes").doc(normalizedPhone).set({
      code,
      expiresAt,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const providerResult = {
      provider: "smsc",
      success: false,
      raw: null,
      status: null,
      error: null,
    };

    try {
      if (process.env.SMSC_LOGIN && process.env.SMSC_PASSWORD) {
        const phoneForSMSC = normalizedPhone.replace(/^\+/, "");
        const message = `Ваш код: ${code}`;
        const smsUrl = `https://smsc.kz/sys/send.php?login=${encodeURIComponent(process.env.SMSC_LOGIN)}&psw=${encodeURIComponent(process.env.SMSC_PASSWORD)}&phones=${phoneForSMSC}&mes=${encodeURIComponent(message)}&charset=utf-8&fmt=1`;
        const response = await axios.get(smsUrl, {
          timeout: 10000,
          headers: { "User-Agent": "greenflowers-app" },
        });
        const responseText = String(response.data).trim();
        providerResult.raw = responseText;
        const [, statusStr] = responseText.split(",");
        const status = statusStr?.trim();
        providerResult.status = status;
        if (status === "0" || status === "1") providerResult.success = true;
        else providerResult.error = "unknown_response";
      } else {
        providerResult.error = "missing_credentials";
      }
    } catch (error) {
      providerResult.error = "request_failed";
      providerResult.errorMessage = error?.message;
    }

    const out = {
      success: true,
      message: "Код отправлен",
      provider: providerResult,
    };
    if (process.env.DEV_MODE === "true") out.code = code;
    return res.json(out);
  });

  router.post("/login-phone", async (req, res) => {
    const body = req.body || {};
    const { phone, name, city } = body;
    const codeRaw = body.code;
    const code =
      codeRaw == null || codeRaw === ""
        ? ""
        : String(codeRaw).trim().replace(/\s/g, "");
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone || normalizedPhone.length < 11) {
      return res.status(400).json({ error: "Неверный формат номера телефона" });
    }
    if (!code) {
      return res.status(400).json({ error: "Код SMS обязателен" });
    }

    const smsRef = db.collection("sms_codes").doc(normalizedPhone);
    const smsSnap = await smsRef.get();
    if (!smsSnap.exists) {
      return res.status(401).json({ error: "Неверный код" });
    }
    const stored = smsSnap.data();
    if (String(stored.code).trim() !== String(code)) {
      return res.status(401).json({ error: "Неверный код" });
    }
    if (expiresAtMs(stored.expiresAt) < Date.now()) {
      await smsRef.delete();
      return res.status(401).json({ error: "Срок действия кода истек" });
    }
    await smsRef.delete();

    try {
      let existing = await findUserByPhone(normalizedPhone);
      let userData;
      let docId;

      if (!existing) {
        const uid = await nextId(db, "UserId");
        const fakeEmail = `${normalizedPhone}@sms.sprayflowers.local`;
        const randomPassword = Math.random().toString(36).slice(-12);
        const passwordHash = await bcrypt.hash(randomPassword, 10);
        docId = String(uid);
        userData = {
          id: uid,
          email: fakeEmail,
          password_hash: passwordHash,
          name: name || normalizedPhone,
          phone: normalizedPhone,
          city: city || "Алматы",
          role: "user",
          is_active: true,
          created_at: admin.firestore.FieldValue.serverTimestamp(),
        };
        await db.collection("users").doc(docId).set(userData);
      } else {
        docId = existing.id;
        userData = existing.data;
      }

      const full = await db.collection("users").doc(docId).get();
      const row = full.data();
      if (!row) {
        return res.status(500).json({ error: "Профиль пользователя не найден" });
      }
      const { password_hash, ...rest } = row;
      const apiUser = userDocToApi({ ...rest, id: row.id }, docId);
      const logUid = resolveUserNumericId(row, docId);
      const loginLog = {
        email: apiUser.email || normalizedPhone,
        ip: clientIp(req),
        userAgent: userAgent(req),
        ok: true,
        method: "phone",
        at: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (logUid != null) loginLog.userId = logUid;
      else loginLog.userDocId = String(docId);
      await appendLoginLogSafe(db, admin, loginLog);

      return res.json({
        success: true,
        message: "Успешный вход",
        user: apiUser,
      });
    } catch (error) {
      console.error("Login-phone error:", error);
      return res.status(500).json({
        error: "Ошибка при авторизации",
        details: error?.message || String(error),
      });
    }
  });

  router.post("/register", (req, res) => {
    return res.status(400).json({
      error: "Регистрация по email/паролю отключена, используйте /users/login-phone",
    });
  });

  router.post("/login", async (req, res) => {
    const { email, password } = req.body || {};
    const e = normalizeEmail(email);
    const pwd = typeof password === "string" ? password : "";

    if (!e || !pwd) {
      return res.status(400).json({ error: "Укажите email и пароль" });
    }

    try {
      const found = await findUserByEmail(e);
      if (!found) {
        return res.status(401).json({ error: "Неверный email или пароль" });
      }
      const row = found.data;
      if (row.is_active === false) {
        return res.status(403).json({ error: "Учётная запись отключена" });
      }
      const hashRaw = row.password_hash;
      if (hashRaw == null || hashRaw === "") {
        return res.status(401).json({ error: "Неверный email или пароль" });
      }
      const hash = String(hashRaw);
      let ok = false;
      try {
        ok = await bcrypt.compare(pwd, hash);
      } catch (cmpErr) {
        console.error("bcrypt.compare:", cmpErr);
        return res.status(401).json({ error: "Неверный email или пароль" });
      }
      if (!ok) {
        return res.status(401).json({ error: "Неверный email или пароль" });
      }

      const docId = found.id;
      const full = await db.collection("users").doc(docId).get();
      const fullRow = full.data();
      if (!fullRow) {
        return res.status(500).json({ error: "Профиль пользователя не найден" });
      }
      const { password_hash, ...rest } = fullRow;
      const apiUser = userDocToApi({ ...rest, id: fullRow.id }, docId);

      const logUid = resolveUserNumericId(fullRow, docId);
      const loginLog = {
        email: apiUser.email || e,
        ip: clientIp(req),
        userAgent: userAgent(req),
        ok: true,
        method: "email",
        at: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (logUid != null) loginLog.userId = logUid;
      else loginLog.userDocId = String(docId);
      await appendLoginLogSafe(db, admin, loginLog);

      return res.json({
        success: true,
        message: "Успешный вход",
        user: apiUser,
      });
    } catch (error) {
      console.error("Login email error:", error);
      const msg = error && typeof error === "object" && "message" in error ? error.message : String(error);
      return res.status(500).json({
        error: "Ошибка при авторизации",
        details: msg || "unknown",
      });
    }
  });

  async function requireAdmin(adminId) {
    const n = Number(adminId);
    if (!Number.isFinite(n)) return null;
    const snap = await db.collection("users").doc(String(n)).get();
    if (!snap.exists || snap.data().role !== "admin") return null;
    return snap.data();
  }

  router.get("/admin/users", async (req, res) => {
    const { adminId } = req.query;
    try {
      if (!(await requireAdmin(adminId))) {
        return res.status(403).json({ error: "Доступ запрещен. Требуются права администратора" });
      }
      const all = await db.collection("users").get();
      const users = all.docs
        .map((d) => userDocToApi(d.data(), d.id))
        .filter(Boolean)
        .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
      return res.json({ success: true, users });
    } catch (error) {
      console.error("Get users error:", error);
      return res.status(500).json({ error: "Ошибка при получении пользователей" });
    }
  });

  router.get("/worker/users", async (req, res) => {
    const { workerId } = req.query;
    try {
      const snap = await db.collection("users").doc(String(workerId)).get();
      if (!snap.exists) return res.status(403).json({ error: "Доступ запрещен" });
      const role = snap.data().role;
      if (role !== "worker" && role !== "admin") {
        return res.status(403).json({ error: "Доступ запрещен" });
      }
      const all = await db.collection("users").get();
      const users = all.docs
        .map((d) => userDocToApi(d.data(), d.id))
        .filter((u) => u && u.role !== "admin")
        .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
      return res.json({ success: true, users });
    } catch (error) {
      console.error("Get worker users error:", error);
      return res.status(500).json({ error: "Ошибка при получении контрагентов" });
    }
  });

  router.put("/admin/users/:userId/role", async (req, res) => {
    const { userId } = req.params;
    const { adminId, newRole } = req.body;
    if (!["user", "worker", "admin"].includes(newRole)) {
      return res.status(400).json({ error: "Недопустимая роль" });
    }
    try {
      if (!(await requireAdmin(adminId))) {
        return res.status(403).json({ error: "Доступ запрещен" });
      }
      const ref = db.collection("users").doc(String(userId));
      const snap = await ref.get();
      if (!snap.exists) return res.status(404).json({ error: "Пользователь не найден" });
      await ref.update({ role: newRole });
      const u = userDocToApi((await ref.get()).data(), userId);
      return res.json({ success: true, message: "Роль успешно изменена", user: u });
    } catch (error) {
      console.error("Update role error:", error);
      return res.status(500).json({ error: "Ошибка при изменении роли" });
    }
  });

  router.delete("/admin/users/:userId", async (req, res) => {
    const { userId } = req.params;
    const { adminId } = req.query;
    try {
      if (!(await requireAdmin(adminId))) {
        return res.status(403).json({ error: "Доступ запрещен" });
      }
      if (String(userId) === String(adminId)) {
        return res.status(400).json({ error: "Невозможно удалить собственную учетную запись" });
      }
      const ref = db.collection("users").doc(String(userId));
      const snap = await ref.get();
      if (!snap.exists) return res.status(404).json({ error: "Пользователь не найден" });
      const email = snap.data().email;
      await ref.delete();
      return res.json({ success: true, message: `Пользователь ${email} успешно удален` });
    } catch (error) {
      console.error("Delete user error:", error);
      return res.status(500).json({ error: "Ошибка при удалении пользователя" });
    }
  });

  router.put("/admin/users/:userId", async (req, res) => {
    const { userId } = req.params;
    const { adminId, name, phone, email, city, company_name, is_active } = req.body;
    try {
      if (!(await requireAdmin(adminId))) {
        return res.status(403).json({ error: "Доступ запрещен" });
      }
      const ref = db.collection("users").doc(String(userId));
      if (!(await ref.get()).exists) {
        return res.status(404).json({ error: "Пользователь не найден" });
      }
      if (email) {
        const dup = await db.collection("users").where("email", "==", email).limit(2).get();
        const other = dup.docs.find((d) => d.id !== String(userId));
        if (other) return res.status(400).json({ error: "Email уже используется другим пользователем" });
      }
      const patch = {};
      if (name !== undefined) patch.name = name;
      if (phone !== undefined) patch.phone = phone;
      if (email !== undefined) patch.email = email;
      if (city !== undefined) patch.city = city;
      if (company_name !== undefined) patch.company_name = company_name;
      if (is_active !== undefined) patch.is_active = is_active;
      patch.updated_at = admin.firestore.FieldValue.serverTimestamp();
      await ref.update(patch);
      const u = userDocToApi((await ref.get()).data(), userId);
      return res.json({ success: true, message: "Пользователь успешно обновлен", user: u });
    } catch (error) {
      console.error("Update user error:", error);
      return res.status(500).json({ error: "Ошибка при обновлении пользователя" });
    }
  });

  router.put("/admin/users/:userId/password", async (req, res) => {
    const { userId } = req.params;
    const { adminId, newPassword } = req.body;
    try {
      if (!(await requireAdmin(adminId))) {
        return res.status(403).json({ error: "Доступ запрещен" });
      }
      const ref = db.collection("users").doc(String(userId));
      const snap = await ref.get();
      if (!snap.exists) return res.status(404).json({ error: "Пользователь не найден" });
      const passwordHash = await bcrypt.hash(newPassword, 10);
      await ref.update({ password_hash: passwordHash });
      return res.json({
        success: true,
        message: `Пароль для ${snap.data().email} успешно изменен`,
      });
    } catch (error) {
      console.error("Update password error:", error);
      return res.status(500).json({ error: "Ошибка при изменении пароля" });
    }
  });

  router.put("/profile/:userId", async (req, res) => {
    const { userId } = req.params;
    const { name, phone, city, company_name } = req.body;
    try {
      const ref = db.collection("users").doc(String(userId));
      const snap = await ref.get();
      if (!snap.exists) return res.status(404).json({ error: "Пользователь не найден" });
      await ref.update({
        name,
        phone,
        city,
        company_name,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
      const u = userDocToApi((await ref.get()).data(), userId);
      return res.json({ success: true, message: "Профиль успешно обновлен", user: u });
    } catch (error) {
      console.error("Update profile error:", error);
      return res.status(500).json({ error: "Ошибка при обновлении профиля" });
    }
  });

  router.get("/profile/:userId/stats", async (req, res) => {
    const { userId } = req.params;
    try {
      const uid = Number(userId);
      const ordersSnap = await db.collection("orders").where("user_id", "==", uid).get();
      let totalOrders = 0;
      let activeOrders = 0;
      let totalSpent = 0;
      ordersSnap.forEach((doc) => {
        const o = doc.data();
        totalOrders += 1;
        if (["pending", "confirmed", "in_transit"].includes(o.status)) activeOrders += 1;
        totalSpent += Number(o.total_amount) || 0;
      });
      return res.json({
        success: true,
        stats: {
          totalOrders,
          activeOrders,
          totalSpent,
          totalPreorders: 0,
        },
      });
    } catch (error) {
      console.error("Get profile stats error:", error);
      return res.status(500).json({ error: "Ошибка при получении статистики" });
    }
  });

  router.put("/profile", async (req, res) => {
    const { id, name, phone, address } = req.body;
    if (!id) return res.status(400).json({ error: "ID пользователя не указан" });
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: "Имя обязательно" });
    }
    if (!address || !String(address).trim()) {
      return res.status(400).json({ error: "Адрес доставки обязателен" });
    }
    try {
      const ref = db.collection("users").doc(String(id));
      if (!(await ref.get()).exists) {
        return res.status(404).json({ error: "Пользователь не найден" });
      }
      await ref.update({
        name: name.trim(),
        phone: phone ? phone.trim() : null,
        address: address.trim(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
      const u = userDocToApi((await ref.get()).data(), String(id));
      return res.json({ success: true, message: "Профиль успешно обновлен", user: u });
    } catch (error) {
      console.error("Update profile error:", error);
      return res.status(500).json({ error: "Ошибка при обновлении профиля" });
    }
  });

  router.post("/me", requireAuth, async (req, res) => {
    try {
      const uid = req.user.uid;
      const { name, city, phone } = req.body || {};
      const ref = db.collection("users_by_uid").doc(uid);
      const payload = {
        firebaseUid: uid,
        email: req.user.email || null,
        phone: phone || req.user.phone_number || null,
        name: name || null,
        city: city || null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      const existing = await ref.get();
      if (!existing.exists) {
        payload.createdAt = admin.firestore.FieldValue.serverTimestamp();
        payload.role = "user";
      }
      await ref.set(payload, { merge: true });
      const doc = await ref.get();
      return res.json({ success: true, user: { id: doc.id, ...doc.data() } });
    } catch (error) {
      console.error("users/me:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
};
