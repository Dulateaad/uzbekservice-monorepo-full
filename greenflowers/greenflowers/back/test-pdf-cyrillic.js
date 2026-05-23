/**
 * Тестовый скрипт для проверки генерации PDF с кириллицей
 * Запуск: node test-pdf-cyrillic.js
 */

const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const fontPath = path.join(__dirname, "fonts/DejaVuSans.ttf");
const fontBoldPath = path.join(__dirname, "fonts/DejaVuSans-Bold.ttf");

// Проверяем наличие шрифтов
if (!fs.existsSync(fontPath)) {
  console.error("✗ Ошибка: Шрифт DejaVuSans.ttf не найден в папке fonts/");
  process.exit(1);
}

if (!fs.existsSync(fontBoldPath)) {
  console.error("✗ Ошибка: Шрифт DejaVuSans-Bold.ttf не найден в папке fonts/");
  process.exit(1);
}

console.log("✓ Шрифты найдены");

// Создаем PDF документ
const doc = new PDFDocument();
const outputPath = path.join(__dirname, "test-output-cyrillic.pdf");
const stream = fs.createWriteStream(outputPath);

doc.pipe(stream);

// Регистрируем шрифты
doc.registerFont("DejaVuSans", fontPath);
doc.registerFont("DejaVuSans-Bold", fontBoldPath);

console.log("✓ Шрифты зарегистрированы");

// Пишем тестовый текст на русском
doc
  .fontSize(16)
  .font("DejaVuSans-Bold")
  .text("Тест генерации PDF с кириллицей", 50, 50);

doc.fontSize(12).font("DejaVuSans");
doc.text("Это текст на русском языке", 50, 100);
doc.text("НАКЛАДНАЯ", 50, 130);
doc.text("Номер заказа: #123", 50, 160);
doc.text("Дата: 18 февраля 2026 г.", 50, 190);

doc.fontSize(11).font("DejaVuSans-Bold");
doc.text("Информация о клиенте", 50, 230);

doc.fontSize(10).font("DejaVuSans");
doc.text("Имя: Иван Петров", 50, 260);
doc.text("Город: Алматы", 50, 285);
doc.text("Адрес: улица Тхемисис, дом 100", 50, 310);

doc.fontSize(10).font("DejaVuSans-Bold");
doc.text("Товары", 50, 350);

doc.fontSize(9).font("DejaVuSans");
doc.text("Название товара", 50, 375);
doc.text("Кол-во: 5", 50, 400);
doc.text("Цена: 1000 ₸", 50, 425);

doc.fontSize(12).font("DejaVuSans-Bold");
doc.text("Спасибо за заказ!", 50, 480);

doc.end();

stream.on("finish", () => {
  console.log("✓ PDF успешно создан!");
  console.log(`📄 Файл сохранен: ${outputPath}`);
  console.log("\nПроверьте файл в PDF-читалке:");
  console.log("- Должна отображаться кириллица без кракозябр");
  console.log("- Текст должен быть четким и читаемым");
  console.log("- Специальные символы (₸) должны отображаться корректно");
});

stream.on("error", (err) => {
  console.error("✗ Ошибка при создании PDF:", err);
});
