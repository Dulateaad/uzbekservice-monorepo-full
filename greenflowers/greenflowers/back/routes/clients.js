module.exports = (pool, logger) => {
  const express = require("express");
  const router = express.Router();

  // Получить список клиентов с поиском, пагинацией и сортировкой
  router.get("/", async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        search = "",
        sortBy = "id",
        sortDir = "desc",
      } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      // Простой поиск по имени, телефону, email
      const searchQ = `%${String(search).trim()}%`;

      const q = `SELECT id, name, phone, email, address, comment, balance, last_activity, total_orders, total_profit, created_at
        FROM clients
        WHERE (name ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1)
        ORDER BY ${sortBy === "name" ? "name" : sortBy === "phone" ? "phone" : sortBy === "total_orders" ? "total_orders" : "id"} ${sortDir === "asc" ? "ASC" : "DESC"}
        LIMIT $2 OFFSET $3`;

      const result = await pool.query(q, [
        searchQ,
        Number(limit),
        Number(offset),
      ]);
      const countRes = await pool.query(
        `SELECT COUNT(*) as total FROM clients WHERE (name ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1)`,
        [searchQ],
      );

      res.json({
        success: true,
        clients: result.rows,
        total: Number(countRes.rows[0].total),
      });
    } catch (error) {
      console.error("Clients list error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Получить одного клиента
  router.get("/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query(`SELECT * FROM clients WHERE id = $1`, [
        id,
      ]);
      if (result.rows.length === 0)
        return res
          .status(404)
          .json({ success: false, error: "Client not found" });
      res.json({ success: true, client: result.rows[0] });
    } catch (error) {
      console.error("Get client error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Создать клиента
  router.post("/", async (req, res) => {
    try {
      const { name, phone, email, address, comment } = req.body;
      const result = await pool.query(
        `INSERT INTO clients (name, phone, email, address, comment, balance, created_at)
         VALUES ($1,$2,$3,$4,$5,0,now()) RETURNING *`,
        [
          name || null,
          phone || null,
          email || null,
          address || null,
          comment || null,
        ],
      );
      res.status(201).json({ success: true, client: result.rows[0] });
    } catch (error) {
      console.error("Create client error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Обновить клиента
  router.put("/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, phone, email, address, comment, balance } = req.body;
      const result = await pool.query(
        `UPDATE clients SET name=$1, phone=$2, email=$3, address=$4, comment=$5, balance=$6, last_activity=now() WHERE id=$7 RETURNING *`,
        [
          name || null,
          phone || null,
          email || null,
          address || null,
          comment || null,
          balance || 0,
          id,
        ],
      );
      if (result.rows.length === 0)
        return res
          .status(404)
          .json({ success: false, error: "Client not found" });
      res.json({ success: true, client: result.rows[0] });
    } catch (error) {
      console.error("Update client error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Удалить клиента
  router.delete("/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const del = await pool.query(
        `DELETE FROM clients WHERE id=$1 RETURNING id`,
        [id],
      );
      if (del.rows.length === 0)
        return res
          .status(404)
          .json({ success: false, error: "Client not found" });
      res.json({ success: true, deletedId: del.rows[0].id });
    } catch (error) {
      console.error("Delete client error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
};
