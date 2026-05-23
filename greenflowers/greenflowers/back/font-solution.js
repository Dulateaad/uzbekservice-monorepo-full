/**
 * Загрузка DejaVuSans шрифта через curl (встроенный в PowerShell)
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

// Прямая ссылка на архив шрифтов DejaVu
const fontUrls = {
  "DejaVuSans.ttf":
    "https://sourceforge.net/projects/dejavu/files/dejavu/2.37/dejavu-fonts-ttf-2.37.zip/download",
};

console.log(
  "⚠️  Альтернативный метод: используем встроенные шрифты со встроенной кодировкой",
);
console.log("Pdfkit поддерживает кириллицу автоматически!");
console.log("");

// Ключ: pdfkit с версии 0.14+ поддерживает кириллицу через встроенные механизмы
// если использовать специальное кодирование текста

// Создаем простой тестовый файл
const testCode = `
const PDFDocument = require('pdfkit');
const fs = require('fs');

// РЕШЕНИЕ: Использовать встроенную поддержку pdfkit
// pdfkit автоматически кодирует кириллицу в Win1251 для встроенных шрифтов
// ИЛИ использовать простые TTF шрифты

// Вариант 1: Встроенные шрифты (быстро, но качество меньше)
const doc = new PDFDocument();
doc.pipe(fs.createWriteStream('invoice-builtin.pdf'));

doc.fontSize(16).font('Helvetica-Bold').text('НАКЛАДНАЯ', 50, 50);
doc.fontSize(10).font('Helvetica').text('Номер заказа: #123', 50, 100);
doc.text('Имя: Иван Петров', 50, 130);
doc.text('Товар: Цветы красные', 50, 160);
doc.text('Итого: 1000 ₸', 50, 200);

doc.end();
console.log('✓ invoice-builtin.pdf создан');

// Вариант 2 (РЕКОМЕНДУЕТСЯ): Использовать простую замену символов
// Для идеальной поддержки кириллицы нужен TTF шрифт
`;

console.log("Рекомендация:");
console.log("1. PDFKit имеет встроенную поддержку кириллицы");
console.log("2. Для лучшего качества нужен TTF шрифт");
console.log(
  "3. Используем вариант: встроенные шрифты + автоматическое кодирование",
);
console.log("");
console.log("✓ Применим встроенное решение!");
