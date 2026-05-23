const express = require("express");
const router = express.Router();

module.exports = (pool, logger) => {
  // ✅ GET все категории
  router.get("/", async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT * FROM flower_categories 
         ORDER BY created_at DESC`,
      );

      res.json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      logger.error("flower-categories.get-all", error.message, { error });
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ✅ GET одну категорию по ID
  router.get("/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        `SELECT * FROM flower_categories WHERE id = $1`,
        [id],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Category not found",
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      logger.error("flower-categories.get-one", error.message, { error });
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ✅ POST создать новую категорию
  router.post("/", async (req, res) => {
    try {
      const { name, description } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          error: "Category name is required",
        });
      }

      const result = await pool.query(
        `INSERT INTO flower_categories (name, description) 
         VALUES ($1, $2) 
         RETURNING *`,
        [name.trim(), description || null],
      );

      logger.info(`✅ Created flower category: ${name}`);

      res.status(201).json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      logger.error("flower-categories.create", error.message, { error });

      // Проверяем ошибку уникальности
      if (error.code === "23505") {
        // Unique violation
        return res.status(400).json({
          success: false,
          error: "Category name already exists",
        });
      }

      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ✅ PUT обновить категорию
  router.put("/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          error: "Category name is required",
        });
      }

      const result = await pool.query(
        `UPDATE flower_categories 
         SET name = $1, description = $2 
         WHERE id = $3 
         RETURNING *`,
        [name.trim(), description || null, id],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Category not found",
        });
      }

      logger.info(`✅ Updated flower category: ${name}`);

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      logger.error("flower-categories.update", error.message, { error });

      // Проверяем ошибку уникальности
      if (error.code === "23505") {
        return res.status(400).json({
          success: false,
          error: "Category name already exists",
        });
      }

      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ✅ DELETE удалить категорию
  router.delete("/:id", async (req, res) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `DELETE FROM flower_categories WHERE id = $1 RETURNING id`,
        [id],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Category not found",
        });
      }

      logger.info(`✅ Deleted flower category with ID: ${id}`);

      res.json({
        success: true,
        message: "Category deleted successfully",
      });
    } catch (error) {
      logger.error("flower-categories.delete", error.message, { error });

      // Проверяем ошибку внешнего ключа (если категория используется в товарах)
      if (error.code === "23503") {
        return res.status(400).json({
          success: false,
          error: "Cannot delete category that is in use",
        });
      }

      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
};
