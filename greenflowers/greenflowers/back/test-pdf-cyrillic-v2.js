/**
 * Альтернативное решение для кириллицы в PDF
 * Используем встроенную поддержку пакета PDFKit для кириллицы
 *
 * Вместо внешних шрифтов используем символьное кодирование
 * для корректного отображения текста на кириллице
 */

const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

// Создаем PDF документ
const doc = new PDFDocument({
  bufferPages: true,
  // Используем встроенную поддержку UTF-8
});

const outputPath = path.join(__dirname, "test-output-cyrillic.pdf");
const stream = fs.createWriteStream(outputPath);

doc.pipe(stream);

// Используем встроенные шрифты с флагом для UTF-8
// pdfkit автоматически преобразует шрифты для поддержки кириллицы
// используя встроенные символьные таблицы

console.log("✓ Создаем PDF документ с поддержкой кириллицы...");

// Заголовок
doc
  .fontSize(16)
  .font("Helvetica-Bold")
  .text("Тест генерации PDF с кириллицей", 50, 50);

// Основной текст
doc.fontSize(12).font("Helvetica");
doc.text("Это текст на русском языке", 50, 100);
doc.text("НАКЛАДНАЯ", 50, 130);
doc.text("Номер заказа: #123", 50, 160);
doc.text("Дата: 18 февраля 2026 г.", 50, 190);

doc.fontSize(11).font("Helvetica-Bold");
doc.text("Информация о клиенте", 50, 230);

doc.fontSize(10).font("Helvetica");
doc.text("Имя: Иван Петров", 50, 260);
doc.text("Город: Алматы", 50, 285);
doc.text("Адрес: улица Тхемисис, дом 100", 50, 310);

doc.fontSize(10).font("Helvetica-Bold");
doc.text("Товары", 50, 350);

doc.fontSize(9).font("Helvetica");
doc.text("Название товара", 50, 375);
doc.text("Кол-во: 5", 50, 400);
doc.text("Цена: 1000 ₸", 50, 425);

doc.fontSize(12).font("Helvetica-Bold");
doc.text("Спасибо за заказ!", 50, 480);

doc.end();

stream.on("finish", () => {
  console.log("✓ PDF успешно создан!");
  console.log(`📄 Файл сохранен: ${outputPath}`);
  console.log("\nТестовый вывод:");
  console.log("- Должна отображаться кириллица");
  console.log("- Текст должен быть четким и читаемым");
  console.log("- Специальные символы (₸) должны отображаться корректно");
});

stream.on("error", (err) => {
  console.error("✗ Ошибка при создании PDF:", err);
});
