const express = require("express");
const { nextId } = require("./counters");
const { tsToIso } = require("./userUtils");

module.exports = function createCartRouter({ db, admin }) {
  const router = express.Router();

  async function getProduct(productId) {
    const snap = await db.collection("products").doc(String(productId)).get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
  }

  function hostBase(req) {
    return process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host") || "localhost"}`;
  }

  router.get("/user/:userId", async (req, res) => {
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ error: "Неверный userId" });
    }
    try {
      const snap = await db
        .collection("cart_items")
        .where("user_id", "==", userId)
        .get();
      const rows = [];
      for (const doc of snap.docs) {
        const ci = doc.data();
        const p = await getProduct(ci.product_id);
        const hb = hostBase(req);
        let image_url = p?.image_url || "";
        if (image_url && image_url.startsWith("/")) image_url = hb + image_url;
        rows.push({
          id: ci.id,
          user_id: ci.user_id,
          product_id: ci.product_id,
          quantity: ci.quantity,
          truck_id: ci.truck_id ?? null,
          unit_price: ci.unit_price,
          batch_date: ci.batch_date ?? null,
          created_at: tsToIso(ci.created_at),
          updated_at: tsToIso(ci.updated_at),
          name: p?.name || "Удалённый товар",
          price_per_box: p?.price_per_box ?? null,
          color: p?.color ?? null,
          variety: p?.variety ?? null,
          stem_length: p?.stem_length ?? null,
          packaging_type: p?.packaging_type ?? null,
          image_url,
          min_order_quantity: p?.min_order_quantity ?? 1,
          arrival_date: ci.arrival_date ?? null,
          truck_identifier: ci.truck_identifier ?? null,
          price_per_unit: ci.unit_price ?? p?.price_per_unit,
          product_missing: !p,
        });
      }
      rows.sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
      return res.json({ success: true, cart: rows });
    } catch (error) {
      console.error("Get cart error:", error);
      return res.status(500).json({ error: "Ошибка при получении корзины" });
    }
  });

  router.post("/", async (req, res) => {
    let { userId, product_id, quantity, truck_id, unit_price: incoming_unit_price } = req.body;
    userId = parseInt(userId, 10);
    product_id = parseInt(product_id, 10);
    quantity = parseInt(quantity, 10) || 1;
    if (isNaN(userId) || isNaN(product_id)) {
      return res.status(400).json({ error: "Неверные параметры" });
    }
    try {
      const productData = await getProduct(product_id);
      if (!productData) {
        return res.status(404).json({ error: "Товар не найден" });
      }
      const dbPrice =
        productData.price_per_unit ?? productData.price_per_box ?? 0;
      const unit_price =
        incoming_unit_price !== undefined && incoming_unit_price !== null
          ? incoming_unit_price
          : dbPrice;

      const existingQ = await db
        .collection("cart_items")
        .where("user_id", "==", userId)
        .where("product_id", "==", product_id)
        .get();
      const wantTruck = truck_id ?? null;
      const doc = existingQ.docs.find((d) => {
        const t = d.data().truck_id ?? null;
        return t === wantTruck;
      });

      if (doc) {
        const cur = doc.data();
        const newQty = (cur.quantity || 0) + quantity;
        await doc.ref.update({
          quantity: newQty,
          unit_price,
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
        const updated = await doc.ref.get();
        return res.json({
          success: true,
          message: "Количество обновлено",
          item: { id: updated.data().id, ...updated.data() },
        });
      }

      const itemId = await nextId(db, "CartItemId");
      const payload = {
        id: itemId,
        user_id: userId,
        product_id,
        quantity,
        truck_id: truck_id ?? null,
        unit_price,
        batch_date: null,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      };
      await db.collection("cart_items").doc(String(itemId)).set(payload);
      return res.json({
        success: true,
        message: "Товар добавлен в корзину",
        item: payload,
      });
    } catch (error) {
      console.error("Add to cart error:", error);
      return res.status(500).json({ error: "Ошибка при добавлении в корзину" });
    }
  });

  router.put("/:itemId", async (req, res) => {
    let { itemId } = req.params;
    let { quantity, userId } = req.body;
    itemId = parseInt(itemId, 10);
    userId = parseInt(userId, 10);
    quantity = parseInt(quantity, 10) || 0;
    if (isNaN(itemId) || isNaN(userId)) {
      return res.status(400).json({ error: "Неверные параметры" });
    }
    try {
      const ref = db.collection("cart_items").doc(String(itemId));
      const snap = await ref.get();
      if (!snap.exists || snap.data().user_id !== userId) {
        return res.status(404).json({ error: "Позиция не найдена" });
      }
      if (quantity <= 0) {
        await ref.delete();
        return res.json({ success: true, message: "Товар удален из корзины" });
      }
      await ref.update({
        quantity,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
      const updated = await ref.get();
      return res.json({
        success: true,
        message: "Количество обновлено",
        item: { id: updated.data().id, ...updated.data() },
      });
    } catch (error) {
      console.error("Update cart error:", error);
      return res.status(500).json({ error: "Ошибка при обновлении корзины" });
    }
  });

  router.delete("/:itemId", async (req, res) => {
    let { itemId } = req.params;
    let { userId } = req.query;
    itemId = parseInt(itemId, 10);
    userId = parseInt(userId, 10);
    if (isNaN(itemId) || isNaN(userId)) {
      return res.status(400).json({ error: "Неверные параметры" });
    }
    try {
      const ref = db.collection("cart_items").doc(String(itemId));
      const snap = await ref.get();
      if (!snap.exists || snap.data().user_id !== userId) {
        return res.status(404).json({ error: "Не найдено" });
      }
      await ref.delete();
      return res.json({ success: true, message: "Товар удален из корзины" });
    } catch (error) {
      console.error("Delete cart item error:", error);
      return res.status(500).json({ error: "Ошибка при удалении товара" });
    }
  });

  router.delete("/user/:userId/clear", async (req, res) => {
    let { userId } = req.params;
    userId = parseInt(userId, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ error: "Неверный userId" });
    }
    try {
      const snap = await db.collection("cart_items").where("user_id", "==", userId).get();
      const batch = db.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      return res.json({ success: true, message: "Корзина очищена" });
    } catch (error) {
      console.error("Clear cart error:", error);
      return res.status(500).json({ error: "Ошибка при очистке корзины" });
    }
  });

  return router;
};
