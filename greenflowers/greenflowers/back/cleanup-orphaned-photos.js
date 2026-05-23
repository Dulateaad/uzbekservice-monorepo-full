#!/usr/bin/env node
/**
 * Скрипт очистки "мертвых" ссылок на изображения в inventory_items и products
 * Удаляет photo_url/image_url если файл не существует на диске
 */

const fs = require("fs");
const path = require("path");
require("dotenv").config();

const { URL } = require("url");

const dbConfig = {
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "greenflowers",
  password: process.env.DB_PASSWORD || "posyposypsy",
  port: process.env.DB_PORT || 5432,
};

const { Pool } = require("pg");
const pool = new Pool(dbConfig);

const uploadDir = path.join(__dirname, "public/uploads");

const fileExists = (filePath) => {
  if (!filePath) return false;
  try {
    let checkPath = filePath;

    // Если это абсолютный URL (http://... or https://...), извлечем имя файла
    if (filePath.startsWith("http")) {
      const urlObj = new URL(filePath);
      const urlPath = urlObj.pathname; // e.g., /uploads/inventory-...
      checkPath = urlPath;
    }

    // Если это относительный URL вроде /uploads/file, извлечем имя файла
    if (checkPath.startsWith("/uploads/")) {
      checkPath = checkPath.replace("/uploads/", "");
    }

    const fullPath = path.join(uploadDir, checkPath);
    return fs.existsSync(fullPath);
  } catch (e) {
    return false;
  }
};

async function cleanupOrphanedPhotos() {
  console.log("🧹 Starting cleanup of orphaned photo references...");

  try {
    // 1. Проверить inventory_items
    console.log("\n📦 Checking inventory_items...");
    const inventoryItems = await pool.query(
      `SELECT id, photo_url FROM inventory_items WHERE photo_url IS NOT NULL AND photo_url != ''`,
    );

    let inventoryCleanedCount = 0;
    for (const item of inventoryItems.rows) {
      if (!fileExists(item.photo_url)) {
        console.log(
          `  ⚠️  Item ${item.id}: Photo not found - ${item.photo_url}`,
        );
        await pool.query(
          `UPDATE inventory_items SET photo_url = NULL WHERE id = $1`,
          [item.id],
        );
        inventoryCleanedCount++;
      }
    }
    console.log(
      `  ✅ Cleaned ${inventoryCleanedCount} orphaned photos from inventory_items`,
    );

    // 2. Проверить products
    console.log("\n📚 Checking products...");
    const products = await pool.query(
      `SELECT id, image_url FROM products WHERE image_url IS NOT NULL AND image_url != ''`,
    );

    let productsCleanedCount = 0;
    for (const product of products.rows) {
      if (!fileExists(product.image_url)) {
        console.log(
          `  ⚠️  Product ${product.id}: Image not found - ${product.image_url}`,
        );
        await pool.query(`UPDATE products SET image_url = NULL WHERE id = $1`, [
          product.id,
        ]);
        productsCleanedCount++;
      }
    }
    console.log(
      `  ✅ Cleaned ${productsCleanedCount} orphaned images from products`,
    );

    // 3. Проверить product_images (если таблица существует)
    console.log("\n🖼️  Checking product_images...");
    let productImagesCleanedCount = 0;
    try {
      const productImages = await pool.query(
        `SELECT id, image_url FROM product_images WHERE image_url IS NOT NULL AND image_url != ''`,
      );

      for (const pi of productImages.rows) {
        if (!fileExists(pi.image_url)) {
          console.log(
            `  ⚠️  ProductImage ${pi.id}: Image not found - ${pi.image_url}`,
          );
          await pool.query(`DELETE FROM product_images WHERE id = $1`, [pi.id]);
          productImagesCleanedCount++;
        }
      }
      console.log(
        `  ✅ Cleaned ${productImagesCleanedCount} orphaned images from product_images`,
      );
    } catch (err) {
      console.log(`  ⚠️  Skipped (table may not exist): ${err.message}`);
    }

    console.log(`\n🎉 Cleanup complete!`);
    console.log(
      `   Total cleaned: ${inventoryCleanedCount + productsCleanedCount + productImagesCleanedCount}`,
    );
  } catch (error) {
    console.error("❌ Cleanup failed:", error.message);
  } finally {
    await pool.end();
  }
}

cleanupOrphanedPhotos();
