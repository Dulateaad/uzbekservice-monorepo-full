/**
 * Тест генерации PDF с html-pdf - полная поддержка кириллицы
 */

const pdf = require("html-pdf");
const fs = require("fs");
const path = require("path");

const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body {
        font-family: Arial, sans-serif;
        padding: 20px;
        color: #333;
      }
      .header {
        border-bottom: 2px solid #000;
        margin-bottom: 20px;
        padding-bottom: 10px;
      }
      .title {
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 10px;
      }
      .subtitle {
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 20px;
      }
      .info-row {
        margin-bottom: 5px;
        font-size: 12px;
      }
      .section-title {
        font-size: 14px;
        font-weight: bold;
        margin-top: 20px;
        margin-bottom: 10px;
        border-bottom: 1px solid #ccc;
        padding-bottom: 5px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 10px;
      }
      th {
        background-color: #f0f0f0;
        border: 1px solid #999;
        padding: 8px;
        text-align: left;
        font-weight: bold;
        font-size: 12px;
      }
      td {
        border: 1px solid #999;
        padding: 8px;
        font-size: 11px;
      }
      .total {
        margin-top: 20px;
        text-align: right;
        font-weight: bold;
        font-size: 14px;
      }
      .footer {
        margin-top: 30px;
        text-align: center;
        font-size: 12px;
        color: #666;
      }
      .company-name {
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 5px;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="company-name">GreenFlowers</div>
      <div class="title">НАКЛАДНАЯ</div>
    </div>

    <div class="info-row"><strong>Номер заказа:</strong> #55</div>
    <div class="info-row"><strong>Дата:</strong> 16.02.2026</div>
    <div class="info-row"><strong>Статус:</strong> pending</div>

    <div class="section-title">Информация о клиенте</div>
    <div class="info-row"><strong>Имя:</strong> Иван Петров</div>
    <div class="info-row"><strong>Телефон:</strong> +7 708 235 4533</div>
    <div class="info-row"><strong>Email:</strong> admin@greenflowers.kz</div>
    <div class="info-row"><strong>Город:</strong> Алматы</div>
    <div class="info-row"><strong>Адрес:</strong> Проспект Независимости, 22</div>
    <div class="info-row"><strong>Дата доставки:</strong> 22.02.2026</div>

    <div class="section-title">Товары</div>
    <table>
      <thead>
        <tr>
          <th>Название товара</th>
          <th width="80">Кол-во</th>
          <th width="100">Цена</th>
          <th width="100">Сумма</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Red Roses Premium</td>
          <td align="center">3</td>
          <td align="right">45.00 ₸</td>
          <td align="right">135.00 ₸</td>
        </tr>
      </tbody>
    </table>

    <div class="total">
      Итого к оплате: 135.00 ₸
    </div>

    <div class="footer">
      <p>Спасибо за заказ!</p>
    </div>
  </body>
  </html>
`;

const options = {
  format: "A4",
  margin: "10mm",
  timeout: 30000,
  charset: "utf-8",
  header: {
    height: "0mm",
  },
  footer: {
    height: "0mm",
  },
};

const outputPath = path.join(__dirname, "test-html-pdf.pdf");

pdf.create(html, options).toFile(outputPath, (err, res) => {
  if (err) {
    console.error("✗ Ошибка при генерации PDF:", err);
    process.exit(1);
  }
  console.log("✓ PDF успешно создан!");
  console.log(`📄 Файл: ${outputPath}`);
  console.log("\n✓ Проверьте файл - кириллица должна отображаться корректно!");
});
