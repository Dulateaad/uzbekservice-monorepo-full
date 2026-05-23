const express = require("express");
const router = express.Router();

module.exports = (pool) => {
  // Получить базовый процент менеджера
  router.get("/base-manager-percent", async (req, res) => {
    try {
      const result = await pool.query(
        "SELECT value FROM settings WHERE key = 'baseManagerPercent'",
      );
      const percent = result.rows[0]?.value || "3.0";
      res.json({ baseManagerPercent: parseFloat(percent) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Изменить базовый процент менеджера
  router.put("/base-manager-percent", async (req, res) => {
    try {
      const { percent } = req.body;
      if (typeof percent !== "number" || percent < 0 || percent > 100) {
        return res.status(400).json({ error: "Некорректный процент" });
      }
      await pool.query(
        "INSERT INTO settings (key, value) VALUES ('baseManagerPercent', $1) ON CONFLICT (key) DO UPDATE SET value = $1",
        [percent.toString()],
      );
      res.json({ success: true, baseManagerPercent: percent });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
