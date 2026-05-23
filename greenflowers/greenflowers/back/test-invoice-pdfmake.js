/**
 * Тест генерации PDF с pdfmake - полная поддержка кириллицы
 */

const pdfMake = require("pdfmake");
const fs = require("fs");
const path = require("path");

// Используем встроенные шрифты pdfmake с поддержкой кириллицы
pdfMake.fonts = {
  Courier: {
    normal: "Courier",
    bold: "Courier-Bold",
    italics: "Courier-Oblique",
    bolditalics: "Courier-BoldOblique",
  },
  Helvetica: {
    normal: "Helvetica",
    bold: "Helvetica-Bold",
    italics: "Helvetica-Oblique",
    bolditalics: "Helvetica-BoldOblique",
  },
  Times: {
    normal: "Times-Roman",
    bold: "Times-Bold",
    italics: "Times-Italic",
    bolditalics: "Times-BoldItalic",
  },
  Symbol: {
    normal: "Symbol",
    bold: "Symbol",
    italics: "Symbol",
    bolditalics: "Symbol",
  },
  ZapfDingbats: {
    normal: "ZapfDingbats",
    bold: "ZapfDingbats",
    italics: "ZapfDingbats",
    bolditalics: "ZapfDingbats",
  },
};

// pdfmake встроенные шрифты уже включают поддержку кириллицы
const docDefinition = {
  content: [
    {
      text: "GreenFlowers",
      fontSize: 16,
      bold: true,
      alignment: "left",
      margin: [0, 0, 0, 10],
    },
    {
      text: "НАКЛАДНАЯ",
      fontSize: 20,
      bold: true,
      alignment: "left",
      margin: [0, 0, 0, 20],
    },

    {
      columns: [
        {
          width: "*",
          text: `Номер заказа: #55\nДата: 16.02.2026\nСтатус: pending`,
        },
      ],
      margin: [0, 0, 0, 20],
    },

    {
      text: "Информация о клиенте",
      fontSize: 12,
      bold: true,
      margin: [0, 0, 0, 10],
    },
    {
      text: `Имя: Иван Петров\nТелефон: +7 708 235 4533\nEmail: admin@greenflowers.kz\nГород: Алматы\nАдрес: Проспект Независимости, 22\nДата доставки: 22.02.2026`,
      margin: [0, 0, 0, 20],
    },

    {
      text: "Товары",
      fontSize: 11,
      bold: true,
      margin: [0, 0, 0, 10],
    },
    {
      table: {
        headerRows: 1,
        widths: [200, 80, 100, 100],
        body: [
          [
            { text: "Название товара", bold: true },
            { text: "Кол-во", bold: true },
            { text: "Цена", bold: true },
            { text: "Сумма", bold: true },
          ],
          ["Red Roses Premium", "3", "45.00 ₸", "135.00 ₸"],
        ],
      },
      margin: [0, 0, 0, 20],
    },

    {
      columns: [
        {
          width: "*",
          text: "",
        },
        {
          width: 200,
          text: `Итого к оплате:\n\n135.00 ₸`,
          bold: true,
          alignment: "right",
        },
      ],
      margin: [0, 0, 0, 30],
    },

    {
      text: "Спасибо за заказ!",
      fontSize: 11,
      alignment: "center",
      margin: [0, 20, 0, 0],
    },
  ],
  defaultStyle: {
    font: "Helvetica",
    fontSize: 10,
  },
};

// Генерируем PDF с использованием стандартных шрифтов
const outputPath = path.join(__dirname, "test-invoice-pdfmake.pdf");

pdfMake.createPdf(docDefinition).getBuffer((err, buffer) => {
  if (err) {
    console.error("✗ Ошибка при генерации PDF:", err);
    process.exit(1);
  }

  fs.writeFileSync(outputPath, buffer);
  console.log("✓ PDF успешно создан!");
  console.log(`📄 Файл: ${outputPath}`);
  console.log("\n✓ Проверьте файл - кириллица должна отображаться корректно!");
});
