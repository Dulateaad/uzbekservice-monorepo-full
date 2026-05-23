/**
 * Routes for managing user permissions
 * GET /api/admin/user-permissions/:userId - Get user permissions
 * POST /api/admin/user-permissions/:userId - Save user permissions
 */

const express = require("express");

module.exports = (pool) => {
  const router = express.Router();

  /**
   * GET /api/admin/user-permissions/:userId
   * Get permissions for a specific user
   * - Any user can read their own permissions
   * - Admin can read any user's permissions
   */
  router.get("/user-permissions/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const { role, currentUserId } = req.query;

      // Check if user is reading own permissions or if they're admin
      const isReadingOwn = currentUserId && currentUserId == userId;
      const isAdmin = role === "admin";

      if (!isReadingOwn && !isAdmin) {
        console.log(
          `[PERM] GET Denied: userId=${userId}, currentUserId=${currentUserId}, isAdmin=${isAdmin}`,
        );
        return res.status(403).json({ error: "Can only read own permissions" });
      }

      console.log(
        `[PERM] GET Allowed: userId=${userId}, currentUserId=${currentUserId}, isAdmin=${isAdmin}`,
      );

      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      // Try to get from user_permissions table
      const result = await pool.query(
        `SELECT 
          create_product, 
          create_batch, 
          edit_truck, 
          edit_position, 
          can_view_analytics,
          can_manage_users
        FROM user_permissions 
        WHERE user_id = $1`,
        [userId],
      );

      if (result.rows.length > 0) {
        // Return saved permissions
        return res.json({
          success: true,
          permissions: result.rows[0],
        });
      }

      // If no record, return default permissions (all enabled)
      return res.json({
        success: true,
        permissions: {
          create_product: true,
          create_batch: true,
          edit_truck: true,
          edit_position: true,
          can_view_analytics: true,
          can_manage_users: false,
        },
      });
    } catch (error) {
      console.error("Error getting user permissions:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/admin/user-permissions/:userId
   * Save permissions for a specific user
   * Only admin role allowed
   */
  router.post("/user-permissions/:userId", async (req, res) => {
    try {
      const { role } = req.query;

      // Only admin can modify permissions
      if (role !== "admin") {
        console.log(`[PERM] POST Denied: not admin role. role=${role}`);
        return res
          .status(403)
          .json({ error: "Access denied - admin required" });
      }

      const { userId } = req.params;
      const {
        create_product,
        create_batch,
        edit_truck,
        edit_position,
        can_view_analytics,
        can_manage_users,
      } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      console.log(`[PERM] POST Allowed: admin post request for user ${userId}`);

      // Upsert: insert if not exists, update if exists
      const result = await pool.query(
        `INSERT INTO user_permissions 
        (user_id, create_product, create_batch, edit_truck, edit_position, can_view_analytics, can_manage_users)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (user_id) DO UPDATE SET
          create_product = $2,
          create_batch = $3,
          edit_truck = $4,
          edit_position = $5,
          can_view_analytics = $6,
          can_manage_users = $7,
          updated_at = NOW()
        RETURNING *`,
        [
          userId,
          create_product ?? true,
          create_batch ?? true,
          edit_truck ?? true,
          edit_position ?? true,
          can_view_analytics ?? true,
          can_manage_users ?? false,
        ],
      );

      return res.json({
        success: true,
        message: "Permissions saved successfully",
        permissions: result.rows[0],
      });
    } catch (error) {
      console.error("Error saving user permissions:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  return router;
};
