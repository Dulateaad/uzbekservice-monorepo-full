const express = require("express");
const { tsToIso } = require("./userUtils");

module.exports = function createProductsRouter({ db, admin }) {
  const router = express.Router();

  function mapProduct(d, id, req) {
    const hostBase =
      process.env.PUBLIC_BASE_URL ||
      `${req.protocol}://${req.get("host") || "localhost"}`;
    let image_url = d.image_url ?? null;
    if (image_url && image_url.startsWith("/")) image_url = hostBase + image_url;
    return {
      id: d.id != null ? d.id : Number(id),
      name: d.name,
      category: d.category ?? null,
      color: d.color ?? null,
      variety: d.variety ?? null,
      description: d.description ?? null,
      price_per_unit: d.price_per_unit ?? null,
      price_per_box: d.price_per_box ?? null,
      stock_quantity: d.stock_quantity ?? 0,
      min_order_quantity: d.min_order_quantity ?? 1,
      stem_length: d.stem_length ?? null,
      height: d.stem_length ?? null,
      packaging_type: d.packaging_type ?? null,
      image_url,
      next_delivery_date: d.next_delivery_date ?? null,
      created_at: tsToIso(d.created_at) || d.created_at,
    };
  }

  router.get("/", async (req, res) => {
    try {
      const snap = await db.collection("products").get();
      const products = snap.docs
        .map((doc) => mapProduct(doc.data(), doc.id, req))
        .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
      return res.json({ success: true, products });
    } catch (error) {
      console.error("Get products error:", error);
      return res.status(500).json({ error: "Ошибка при получении каталога" });
    }
  });

  router.get("/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const ref = db.collection("products").doc(String(id));
      const snap = await ref.get();
      if (!snap.exists) {
        return res.status(404).json({ error: "Товар не найден" });
      }
      const row = mapProduct(snap.data(), id, req);
      return res.json({ success: true, product: row });
    } catch (error) {
      console.error("Get product error:", error);
      return res.status(500).json({ error: "Ошибка при получении товара" });
    }
  });

  router.post("/", async (req, res) => {
    return res.status(501).json({
      success: false,
      error: "Создание товара через консоль Firestore или импорт; REST позже",
    });
  });

  router.put("/:productId", async (req, res) => {
    return res.status(501).json({ success: false, error: "Используйте консоль Firestore" });
  });

  router.delete("/:productId", async (req, res) => {
    return res.status(501).json({ success: false, error: "Используйте консоль Firestore" });
  });

  return router;
};
