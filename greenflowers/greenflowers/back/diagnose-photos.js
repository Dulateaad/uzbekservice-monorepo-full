#!/usr/bin/env node
/**
 * Диагностический скрипт: проверка соответствия файлов на диске и в БД
 */

const fs = require("fs");
const path = require("path");
require("dotenv").config();

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

async function diagnosePhotoProblem() {
  console.log("🔍 Starting photo diagnostics...\n");

  try {
    // 1. Показать все файлы на диске
    console.log("📁 Files on disk:");
    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir);
      console.log(`   Found ${files.length} files:`);
      files.forEach((file) => {
        const stats = fs.statSync(path.join(uploadDir, file));
        console.log(`   - ${file} (${stats.size} bytes)`);
      });
    } else {
      console.log("   ⚠️  Upload directory does not exist!");
    }

    // 2. Показать все photo_url в inventory_items
    console.log("\n📦 Inventory items with photos:");
    const inventoryItems = await pool.query(
      `SELECT id, truck_id, name, photo_url FROM inventory_items WHERE photo_url IS NOT NULL AND photo_url != '' ORDER BY truck_id, id`,
    );
    console.log(`   Found ${inventoryItems.rows.length} items:`);
    inventoryItems.rows.forEach((item) => {
      const filename = path.basename(item.photo_url);
      const diskPath = path.join(uploadDir, filename);
      const fileExists = fs.existsSync(diskPath);
      const status = fileExists ? "✅" : "❌";
      console.log(
        `   ${status} Truck ${item.truck_id}, Item ${item.id} (${item.name}): ${item.photo_url}`,
      );
    });

    // 3. Показать все image_url в products
    console.log("\n📚 Products with images:");
    const products = await pool.query(
      `SELECT id, name, image_url FROM products WHERE image_url IS NOT NULL AND image_url != '' ORDER BY id`,
    );
    console.log(`   Found ${products.rows.length} products:`);
    products.rows.forEach((product) => {
      const filename = path.basename(product.image_url);
      const diskPath = path.join(uploadDir, filename);
      const fileExists = fs.existsSync(diskPath);
      const status = fileExists ? "✅" : "❌";
      console.log(
        `   ${status} Product ${product.id} (${product.name}): ${product.image_url}`,
      );
    });

    // 4. Файлы на диске которых нет в БД
    console.log("\n🗑️  Files on disk not referenced in DB:");
    const referencedFiles = new Set();
    inventoryItems.rows.forEach((item) => {
      if (item.photo_url) {
        referencedFiles.add(path.basename(item.photo_url));
      }
    });
    products.rows.forEach((product) => {
      if (product.image_url) {
        referencedFiles.add(path.basename(product.image_url));
      }
    });

    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir);
      const orphanedFiles = files.filter((file) => !referencedFiles.has(file));
      if (orphanedFiles.length > 0) {
        console.log(`   Found ${orphanedFiles.length} orphaned files:`);
        orphanedFiles.forEach((file) => {
          const stats = fs.statSync(path.join(uploadDir, file));
          console.log(`   - ${file} (${stats.size} bytes)`);
        });
      } else {
        console.log("   ✅ No orphaned files found");
      }
    }

    // 5. Статистика
    console.log("\n📊 Statistics:");
    console.log(
      `   Disk files: ${fs.existsSync(uploadDir) ? fs.readdirSync(uploadDir).length : 0}`,
    );
    console.log(
      `   DB references: ${inventoryItems.rows.length + products.rows.length}`,
    );
    console.log(
      `   Missing files: ${
        [...inventoryItems.rows, ...products.rows].filter((item) => {
          const diskPath = path.join(
            uploadDir,
            path.basename(item.photo_url || item.image_url),
          );
          return !fs.existsSync(diskPath);
        }).length
      }`,
    );
  } catch (error) {
    console.error("❌ Diagnosis failed:", error.message);
  } finally {
    await pool.end();
  }
}

diagnosePhotoProblem();
