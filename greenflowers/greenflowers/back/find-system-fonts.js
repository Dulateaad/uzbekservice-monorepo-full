/**
 * Найти и скопировать DejaVuSans из системных папок Windows
 */

const fs = require("fs");
const path = require("path");

// Возможные пути к папкам со шрифтами в Windows
const fontPaths = [
  "C:\\Windows\\Fonts",
  "C:\\Program Files\\Common Files\\Adobe\\Fonts",
  process.env.APPDATA
    ? path.join(process.env.APPDATA, "..\\Local\\Microsoft\\Windows\\Fonts")
    : null,
];

const targetDir = path.join(__dirname, "fonts");

// Создаем папку если её нет
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

console.log("Ищем DejaVuSans в системных папках...\n");

let found = false;

for (const fontPath of fontPaths) {
  if (!fontPath) continue;

  if (!fs.existsSync(fontPath)) {
    console.log(`⚠ Папка не найдена: ${fontPath}`);
    continue;
  }

  console.log(`🔍 Поиск в: ${fontPath}`);

  try {
    const files = fs.readdirSync(fontPath);
    const dejaVuFiles = files.filter(
      (f) =>
        f.toLowerCase().includes("dejavu") &&
        (f.endsWith(".ttf") || f.endsWith(".otf")),
    );

    if (dejaVuFiles.length > 0) {
      console.log(`✓ Найдены файлы: ${dejaVuFiles.join(", ")}`);

      for (const file of dejaVuFiles) {
        const src = path.join(fontPath, file);
        const dest = path.join(targetDir, file);

        try {
          fs.copyFileSync(src, dest);
          console.log(`  ✓ Скопирован: ${file}`);
          found = true;
        } catch (err) {
          console.error(`  ✗ Ошибка при копировании ${file}: ${err.message}`);
        }
      }
    }
  } catch (err) {
    console.error(`✗ Ошибка при чтении ${fontPath}: ${err.message}`);
  }
}

if (!found) {
  console.log(
    "\n⚠ DejaVuSans не найден в системе. Используем встроенные шрифты...",
  );
}
