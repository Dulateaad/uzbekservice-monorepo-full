/**
 * Скрипт загрузки DejaVuSans шрифта с поддержкой кириллицы
 * Используем rawgit для доступа к файлам GitHub
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

const fonts = [
  {
    name: "DejaVuSans.ttf",
    url: "https://raw.githubusercontent.com/dejavu-fonts/dejavu-fonts/refs/heads/master/ttf/DejaVuSans.ttf",
  },
  {
    name: "DejaVuSans-Bold.ttf",
    url: "https://raw.githubusercontent.com/dejavu-fonts/dejavu-fonts/refs/heads/master/ttf/DejaVuSans-Bold.ttf",
  },
];

const fontsDir = path.join(__dirname, "fonts");

// Проверяем, существует ли папка
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

function downloadFont(font) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(fontsDir, font.name);

    console.log(`Загружаем ${font.name} с ${font.url}...`);

    const file = fs.createWriteStream(filePath);
    let fileSize = 0;

    https
      .get(font.url, { timeout: 30000 }, (response) => {
        if (response.statusCode !== 200) {
          reject(
            new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`),
          );
          file.destroy();
          fs.unlinkSync(filePath);
          return;
        }

        response.on("data", (chunk) => {
          fileSize += chunk.length;
        });

        response.pipe(file);

        file.on("finish", () => {
          file.close();
          if (fileSize > 10000) {
            console.log(
              `✓ ${font.name} успешно загружен (${Math.round(fileSize / 1024)} KB)`,
            );
            resolve();
          } else {
            console.error(
              `✗ ${font.name} загружен но файл слишком маленький (${fileSize} байт)`,
            );
            reject(new Error("Файл шрифта поврежден или неполный"));
          }
        });
      })
      .on("error", (err) => {
        fs.unlink(filePath, () => {});
        reject(err);
      });
  });
}

async function downloadAllFonts() {
  console.log("Начинаем загрузку шрифтов с поддержкой кириллицы...\n");

  for (const font of fonts) {
    try {
      await downloadFont(font);
    } catch (error) {
      console.error(`✗ Ошибка при загрузке ${font.name}:`);
      console.error(`  ${error.message}`);
    }
  }

  console.log("\n✓ Процесс загрузки завершен!");
}

downloadAllFonts().catch(console.error);
