/**
 * Заглушки для маршрутов, ещё не перенесённых с PostgreSQL.
 * Чтобы фронт не падал на 404; админ-функции постепенно переносятся в Firestore.
 */
function registerApiStubs(app) {
  const empty = (obj) => (req, res) => res.json({ success: true, ...obj });
  const notImpl = (req, res) =>
    res.status(501).json({
      success: false,
      error: "Маршрут ещё не перенесён на Firestore",
    });

  app.get("/api/logs", empty({ logs: [] }));
  app.get("/api/logs/stats", empty({ stats: {} }));
  app.post("/api/logs/clean", notImpl);

  app.get("/api/flowers", empty({ flowers: [] }));
  app.get("/api/flowers/:id", (req, res) =>
    res.status(404).json({ error: "Не найдено" }),
  );
  app.post("/api/flowers", notImpl);
  app.put("/api/flowers/:flowerId", notImpl);
  app.delete("/api/flowers/:flowerId", notImpl);

  app.get("/api/flower-categories", empty({ categories: [] }));

  app.get("/api/inventory/batches", empty({ batches: [] }));
  app.get("/api/inventory/batches/:id", (req, res) =>
    res.status(404).json({ error: "Не найдено" }),
  );
  app.post("/api/inventory/batches", notImpl);
  app.put("/api/inventory/batches/:id", notImpl);
  app.delete("/api/inventory/batches/:id", notImpl);
  app.get("/api/inventory/export/csv", (req, res) =>
    res.type("text/csv").send(""),
  );
  app.get("/api/inventory/export/json", empty({ data: [] }));

  app.get("/api/inventory-items", empty({ items: [] }));

  app.get("/api/shifts/current/:userId", empty({ shift: null }));
  app.get("/api/shifts", empty({ shifts: [] }));
  app.get("/api/shifts/:id", (req, res) =>
    res.status(404).json({ error: "Не найдено" }),
  );
  app.post("/api/shifts/open", notImpl);
  app.post("/api/shifts/close", notImpl);
  app.post("/api/shifts/sale", notImpl);
  app.put("/api/shifts/sales/:saleId", notImpl);
  app.delete("/api/shifts/sales/:saleId", notImpl);
  app.get("/api/shifts/seller/:sellerId/active-orders", empty({ orders: [] }));
  app.get("/api/shifts/analytics/by-day", empty({ data: [] }));
  app.get("/api/shifts/export/csv", (req, res) =>
    res.type("text/csv").send(""),
  );
  app.get("/api/shifts/available-orders", empty({ orders: [] }));
  app.post("/api/shifts/accept-order/:orderId/:sellerId", notImpl);

  app.get("/api/calendar/events", empty({ events: [] }));
  app.get("/api/calendar/events/month/:year/:month", empty({ events: [] }));
  app.post("/api/calendar/events", notImpl);
  app.put("/api/calendar/events/:id", notImpl);
  app.post("/api/calendar/events/:id/read", notImpl);
  app.delete("/api/calendar/events/:id", notImpl);
  app.get("/api/calendar/thresholds", empty({ thresholds: [] }));
  app.put("/api/calendar/thresholds/:type", notImpl);
  app.get("/api/calendar/summary", empty({ summary: {} }));
  app.get("/api/calendar/top-products", empty({ products: [] }));

  app.get("/api/catalog", empty({ products: [] }));

  app.get("/api/trucks", empty({ trucks: [] }));

  app.get("/api/commissions", empty({ commissions: [] }));

  app.get("/api/permissions", empty({ permissions: [] }));

  app.get("/api/admin/city-stats", empty({ cities: [] }));
  app.get("/api/admin/managers", empty({ managers: [] }));
  app.get("/api/admin/base-manager-percent", empty({ value: 0 }));

  app.get("/api/clients", empty({ clients: [] }));
  app.get("/api/clients/:id", (req, res) =>
    res.status(404).json({ error: "Не найдено" }),
  );
  app.post("/api/clients", notImpl);
  app.put("/api/clients/:id", notImpl);
  app.delete("/api/clients/:id", notImpl);

  app.get("/api/preorders/user/:userId", empty({ preorders: [] }));
  app.get("/api/preorders/all", empty({ preorders: [] }));
}

module.exports = { registerApiStubs };
