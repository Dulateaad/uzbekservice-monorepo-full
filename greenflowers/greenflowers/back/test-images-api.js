#!/usr/bin/env node
/**
 * Тест API: проверить что изображения товаров загружаются правильно
 */

const API_URL = "http://localhost:5000/api";

async function testProductsAPI() {
  console.log("🧪 Testing Products API Image URLs\n");
  console.log(`API URL: ${API_URL}\n`);

  try {
    // 1. Получить все товары
    console.log("📍 Test 1: GET /products");
    const productsRes = await fetch(`${API_URL}/products`);
    const productsData = await productsRes.json();

    if (!productsData.success) {
      console.log("❌ API returned error:", productsData.error);
      return;
    }

    const products = productsData.products || [];
    console.log(`✅ Got ${products.length} products\n`);

    // 2. Проверить каждый товар
    console.log("📍 Test 2: Check image URLs for each product\n");
    let withImages = 0;
    let withoutImages = 0;
    let invalidUrls = 0;

    for (const product of products.slice(0, 5)) {
      // Показать первые 5
      console.log(`Product ID: ${product.id}, Name: ${product.name}`);

      if (product.image_url) {
        withImages++;
        console.log(`  ✅ Image URL: ${product.image_url}`);

        // Проверить что URL доступен
        try {
          const imgRes = await fetch(product.image_url, { method: "HEAD" });
          if (imgRes.ok) {
            console.log(`  ✅ Image is accessible (HTTP ${imgRes.status})`);
          } else {
            console.log(
              `  ❌ Image returned HTTP ${imgRes.status} (Not Found)`,
            );
            invalidUrls++;
          }
        } catch (e) {
          console.log(`  ❌ Image fetch failed: ${e.message}`);
          invalidUrls++;
        }
      } else {
        withoutImages++;
        console.log(`  ⚠️  No image_url`);
      }
      console.log("");
    }

    // 3. Статистика
    console.log("📊 Statistics:");
    console.log(`   Total products: ${products.length}`);
    console.log(`   With images: ${withImages}`);
    console.log(`   Without images: ${withoutImages}`);
    console.log(`   Invalid URLs: ${invalidUrls}`);

    if (products.length > 0) {
      const percentageWithImages = Math.round(
        (withImages / Math.min(5, products.length)) * 100,
      );
      console.log(`   Success rate: ${percentageWithImages}%`);
    }

    // 4. Тест отдельного товара
    if (products.length > 0) {
      console.log("\n📍 Test 3: GET /products/:id");
      const productId = products[0].id;
      const singleRes = await fetch(`${API_URL}/products/${productId}`);
      const singleData = await singleRes.json();

      if (singleData.success) {
        const product = singleData.product;
        console.log(`✅ Got product: ${product.name}`);
        console.log(`   image_url: ${product.image_url || "(none)"}`);

        if (product.image_url && product.image_url.startsWith("http")) {
          console.log(`   ✅ URL is absolute (correct format)`);
        }
      }
    }

    console.log("\n✅ Test completed!");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

testProductsAPI();
