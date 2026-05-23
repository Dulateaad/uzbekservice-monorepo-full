/**
 * Каталог: партии, категории, витрина — данные из Firestore collection `products`.
 * Обработчики без express.Router: только (req, res) + { db, admin }.
 */

const { tsToIso } = require("./userUtils");

function publicBase(req) {
  return (
    process.env.PUBLIC_BASE_URL ||
    `${req.protocol}://${req.get("host") || "localhost"}`
  );
}

function absImage(hostBase, image_url) {
  if (!image_url) return null;
  if (String(image_url).startsWith("http")) return image_url;
  if (String(image_url).startsWith("/")) return hostBase + image_url;
  return image_url;
}

function mapDocToProduct(d, docId, req) {
  const hostBase = publicBase(req);
  return {
    id: d.id != null ? d.id : Number(docId),
    name: d.name ?? "",
    category: d.category ?? null,
    color: d.color ?? null,
    variety: d.variety ?? null,
    description: d.description ?? null,
    price_per_unit: d.price_per_unit ?? null,
    price_per_box: d.price_per_box ?? null,
    stock_quantity: d.stock_quantity ?? 0,
    min_order_quantity: d.min_order_quantity ?? 1,
    stem_length: d.stem_length ?? null,
    height: d.stem_length ?? d.height ?? null,
    packaging_type: d.packaging_type ?? null,
    image_url: absImage(hostBase, d.image_url),
    next_delivery_date: d.next_delivery_date ?? null,
    batch_date: d.next_delivery_date ?? null,
    created_at: tsToIso(d.created_at) || d.created_at || null,
    product_id: d.id != null ? d.id : Number(docId),
  };
}

function mapDocToBatchItem(d, docId, req) {
  const hostBase = publicBase(req);
  const price = d.price_per_unit ?? d.price_per_box ?? 0;
  const img = absImage(hostBase, d.image_url);
  return {
    id: d.id != null ? d.id : Number(docId),
    name: d.name ?? "",
    variety: d.variety ?? null,
    quantity: d.stock_quantity ?? 0,
    selling_price: Number(price) || 0,
    photo_url: img,
    color: d.color ?? null,
    category: d.category ?? null,
    packaging_type: d.packaging_type ?? null,
    stem_length: d.stem_length != null ? String(d.stem_length) : null,
    height: d.stem_length ?? d.height ?? null,
  };
}

async function loadProducts(db) {
  const snap = await db.collection("products").get();
  return snap.docs.map((doc) => ({ doc, data: doc.data() }));
}

/**
 * GET /api/catalog/batches
 */
async function getCatalogBatches(req, res, { db }) {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const rows = await loadProducts(db);
    const items = rows.map(({ doc, data }) => mapDocToBatchItem(data, doc.id, req));

    const today = new Date().toISOString().slice(0, 10);
    const batch = {
      id: "catalog",
      batch_date: today,
      supplier_name: "Spray Flowers",
      total_items: items.length,
      age_days: 0,
      is_fresh: true,
      is_new: true,
      status: "active",
      items,
    };

    const batches = [batch];
    const sliced = batches.slice(offset, offset + limit);

    return res.json({
      success: true,
      batches: sliced,
      total: batches.length,
    });
  } catch (error) {
    console.error("getCatalogBatches:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Ошибка каталога",
    });
  }
}

/**
 * GET /api/inventory-items/categories/available
 */
async function getCategoriesAvailable(req, res, { db }) {
  try {
    const rows = await loadProducts(db);
    const names = new Set();
    for (const { data } of rows) {
      const c = data.category;
      if (c != null && String(c).trim() !== "") {
        names.add(String(c).trim());
      }
    }
    const sorted = [...names].sort((a, b) => a.localeCompare(b, "ru"));
    return res.json({
      success: true,
      data: sorted.map((name) => ({ name })),
    });
  } catch (error) {
    console.error("getCategoriesAvailable:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Ошибка категорий",
    });
  }
}

/**
 * GET /api/inventory-items/all-available
 */
async function getAllAvailable(req, res, { db }) {
  try {
    const rows = await loadProducts(db);
    const data = rows.map(({ doc, data: d }) => mapDocToProduct(d, doc.id, req));
    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("getAllAvailable:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Ошибка загрузки товаров",
    });
  }
}

module.exports = {
  getCatalogBatches,
  getCategoriesAvailable,
  getAllAvailable,
};
