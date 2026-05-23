import "./popup.css";
import * as XLSX from "xlsx";
import {
  MAX_CELL_LEN,
  STORAGE_KEY,
  type ItemRow,
  type ScrapeResponse,
} from "../types";

const elStatus = document.getElementById("status")!;
const elCount = document.getElementById("count")!;

function setStatus(text: string, isError = false) {
  elStatus.textContent = text;
  elStatus.classList.toggle("error", isError);
}

const ALLOWED = [
  /^https:\/\/(www\.)?wildberries\.ru\//,
  /^https:\/\/(www\.)?ozon\.ru\//,
  /^https:\/\/(www\.)?lamoda\.ru\//,
];

function isAllowedUrl(url: string): boolean {
  return ALLOWED.some((re) => re.test(url));
}

async function loadItems(): Promise<ItemRow[]> {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  const raw = data[STORAGE_KEY];
  return Array.isArray(raw) ? raw : [];
}

async function saveItems(items: ItemRow[]) {
  await chrome.storage.local.set({ [STORAGE_KEY]: items });
}

function clipCell(s: string): string {
  if (s.length <= MAX_CELL_LEN) return s;
  return s.slice(0, MAX_CELL_LEN - 3) + "[…]";
}

function rowForSheet(r: ItemRow): Record<string, string> {
  return {
    source_url: clipCell(r.source_url),
    title: clipCell(r.title),
    description: clipCell(r.description),
    price_current: clipCell(r.price_current),
    price_old: clipCell(r.price_old),
    currency: clipCell(r.currency),
    brand: clipCell(r.brand),
    sku: clipCell(r.sku),
    size_grid: clipCell(r.size_grid),
    image_urls: clipCell(r.image_urls),
    category_path: clipCell(r.category_path),
    scraped_at: clipCell(r.scraped_at),
  };
}

async function refreshCount() {
  const items = await loadItems();
  elCount.textContent = String(items.length);
}

async function scrapeActiveTab() {
  setStatus("Сбор…");
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    setStatus("Не удалось определить вкладку.", true);
    return;
  }
  const url = tab.url ?? "";
  if (!url.startsWith("http")) {
    setStatus("Откройте обычную страницу (https), не служебную вкладку браузера.", true);
    return;
  }
  if (!isAllowedUrl(url)) {
    setStatus("Площадка не поддерживается (WB / Ozon / Lamoda).", true);
    return;
  }

  let res: ScrapeResponse;
  try {
    res = (await chrome.tabs.sendMessage(tab.id, {
      type: "SCRAPE",
    })) as ScrapeResponse;
  } catch {
    setStatus(
      "Нет связи со страницей. Перезагрузите вкладку после установки расширения и попробуйте снова.",
      true,
    );
    return;
  }

  if (!res || typeof res !== "object" || !("ok" in res)) {
    setStatus("Пустой ответ. Перезагрузите страницу товара.", true);
    return;
  }
  if (!res.ok) {
    setStatus(res.error, true);
    return;
  }

  const row = res.row;
  if (!row.title && !row.image_urls) {
    setStatus(
      "Мало данных на странице. Откройте именно карточку товара или обновите страницу.",
      true,
    );
    return;
  }

  const items = await loadItems();
  items.push(row);
  await saveItems(items);
  await refreshCount();
  setStatus("Строка добавлена в буфер.");
}

async function exportExcel() {
  const items = await loadItems();
  if (!items.length) {
    setStatus("Буфер пуст — сначала нажмите «Собрать».", true);
    return;
  }

  const sheetRows = items.map(rowForSheet);
  const ws = XLSX.utils.json_to_sheet(sheetRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Items");
  const ab = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  const blob = new Blob([ab], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const objectUrl = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = `marketplace-items-${stamp}.xlsx`;
  a.click();
  URL.revokeObjectURL(objectUrl);
  setStatus(`Сохранено ${items.length} строк в файл.`);
}

async function clearBuffer() {
  await saveItems([]);
  await refreshCount();
  setStatus("Буфер очищен.");
}

document.getElementById("btn-scrape")!.addEventListener("click", () => {
  void scrapeActiveTab();
});
document.getElementById("btn-export")!.addEventListener("click", () => {
  void exportExcel();
});
document.getElementById("btn-clear")!.addEventListener("click", () => {
  void clearBuffer();
});

void refreshCount();
