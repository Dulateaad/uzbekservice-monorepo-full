const express = require("express");
const { nextId } = require("./counters");
const { tsToIso } = require("./userUtils");

module.exports = function createOrdersRouter({ db, admin }) {
  const router = express.Router();

  async function getUserRole(userId) {
    const snap = await db.collection("users").doc(String(userId)).get();
    if (!snap.exists) return null;
    return snap.data().role;
  }

  function mapOrder(doc) {
    const o = doc.data();
    const items = Array.isArray(o.items) ? o.items : [];
    return {
      ...o,
      id: o.id ?? Number(doc.id),
      created_at: tsToIso(o.created_at) || o.created_at,
      items,
    };
  }

  router.post("/", async (req, res) => {
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
      seller_id,
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Пустой заказ (нет позиций)" });
    }
    if (typeof total_amount !== "number" || total_amount <= 0) {
      return res.status(400).json({ error: "Неверная сумма заказа" });
    }
    if (!customer_name || !customer_phone) {
      return res.status(400).json({ error: "Отсутствует имя или телефон клиента" });
    }
    if (!delivery_city || !delivery_address) {
      return res.status(400).json({ error: "Отсутствует адрес доставки" });
    }

    try {
      if (user_id) {
        const u = await db.collection("users").doc(String(user_id)).get();
        if (!u.exists) return res.status(404).json({ error: "Пользователь не найден" });
      }

      const orderNumericId = await nextId(db, "OrderId");
      const lineItems = [];
      for (const item of items) {
        if (
          !item.product_id ||
          !item.quantity ||
          item.unit_price === undefined
        ) {
          return res.status(400).json({
            error: `Некорректная позиция: product_id=${item.product_id}`,
          });
        }
        let product_name = item.product_name;
        if (!product_name) {
          const p = await db.collection("products").doc(String(item.product_id)).get();
          product_name = p.exists ? p.data().name : "Товар";
        }
        lineItems.push({
          product_id: item.product_id,
          product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          truck_id: item.truck_id || null,
        });
      }

      const firstTruck = items.find((i) => i.truck_id);
      const orderPayload = {
        id: orderNumericId,
        user_id: user_id || null,
        customer_name,
        customer_phone,
        customer_email: customer_email || null,
        total_amount,
        delivery_city,
        delivery_address,
        delivery_date: delivery_date || new Date().toISOString(),
        delivery_time: delivery_time || null,
        payment_method: payment_method || "cash",
        payment_status: payment_status || "pending",
        notes: notes || "",
        status: status || "new",
        seller_id: seller_id || null,
        assigned_to: null,
        truck_id: firstTruck?.truck_id || null,
        items: lineItems,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
      };

      await db.collection("orders").doc(String(orderNumericId)).set(orderPayload);

      return res.status(201).json({
        success: true,
        message: "Заказ успешно создан",
        order: {
          ...orderPayload,
          created_at: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Create order error:", error);
      return res.status(500).json({
        error: error.message || "Ошибка при создании заказа",
      });
    }
  });

  router.get("/user/:userId", async (req, res) => {
    const { userId } = req.params;
    try {
      const snap = await db
        .collection("orders")
        .where("user_id", "==", Number(userId))
        .get();
      const orders = snap.docs.map(mapOrder).sort((a, b) => {
        const ca = a.created_at || "";
        const cb = b.created_at || "";
        return String(cb).localeCompare(String(ca));
      });
      return res.json({ success: true, orders });
    } catch (error) {
      console.error("Get user orders error:", error);
      return res.status(500).json({ error: "Ошибка при получении заказов" });
    }
  });

  router.get("/all", async (req, res) => {
    const { userId } = req.query;
    try {
      const role = await getUserRole(userId);
      if (!role || !["admin", "worker", "manager"].includes(role)) {
        return res.status(403).json({ error: "Доступ запрещен" });
      }
      const snap = await db.collection("orders").get();
      let orders = snap.docs.map(mapOrder);
      orders.sort((a, b) =>
        String(b.created_at || "").localeCompare(String(a.created_at || "")),
      );
      return res.json({ success: true, orders });
    } catch (error) {
      console.error("Get all orders error:", error);
      return res.status(500).json({ error: "Ошибка при получении заказов" });
    }
  });

  router.get("/:orderId", async (req, res) => {
    const { orderId } = req.params;
    if (orderId === "all" || orderId === "user") {
      return res.status(404).json({ error: "Не найдено" });
    }
    try {
      const snap = await db.collection("orders").doc(String(orderId)).get();
      if (!snap.exists) {
        return res.status(404).json({ error: "Заказ не найден" });
      }
      return res.json({ success: true, order: mapOrder(snap) });
    } catch (error) {
      console.error("Get order error:", error);
      return res.status(500).json({ error: "Ошибка при получении заказа" });
    }
  });

  router.post("/:orderId/confirm", async (req, res) => {
    return res.status(501).json({ error: "Обновление статуса — в разработке (Firestore)" });
  });
  router.put("/:orderId/status", async (req, res) => {
    return res.status(501).json({ error: "Обновление статуса — в разработке (Firestore)" });
  });
  router.post("/:orderId/take", async (req, res) => {
    return res.status(501).json({ error: "В разработке (Firestore)" });
  });
  router.post("/:orderId/refund", async (req, res) => {
    return res.status(501).json({ error: "В разработке (Firestore)" });
  });

  return router;
};
