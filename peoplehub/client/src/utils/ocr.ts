/**
 * PeopleHub AI verification — FULLY AUTOMATIC.
 *
 *  1. Document AI  → year, brand, model from tech passport
 *  2. Vision API   → LABEL_DETECTION for condition check
 *  3. Auto-scoring → tariff by year + model whitelist
 *  4. Auto-approve → no moderator needed
 *
 * Business whitelist loaded from Firestore `config/business_models`
 * so new models can be added without re-deploy.
 */

import { getDoc, doc } from "firebase/firestore";

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || "";
// Document AI требует Project ID (например taxi-eb8b7), не номер (914129232231)
const _gcp = import.meta.env.VITE_GCP_PROJECT_ID || "";
const _fbProject = import.meta.env.VITE_FIREBASE_PROJECT_ID || "";
const GCP_PROJECT = /^\d+$/.test(_gcp) ? _fbProject || _gcp : _gcp || _fbProject;
const DOCAI_LOCATION = import.meta.env.VITE_DOCAI_LOCATION || "us";
const DOCAI_DOC_PROCESSOR = import.meta.env.VITE_DOCAI_DOC_PROCESSOR_ID || "";
const DOCAI_OCR_PROCESSOR = import.meta.env.VITE_DOCAI_OCR_PROCESSOR_ID || "";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DocumentEntity {
  type: string;
  mentionText: string;
  confidence: number;
}

export interface ImageLabel {
  description: string;
  score: number;
}

export interface OcrResult {
  text: string;
  entities: DocumentEntity[];
  labels: ImageLabel[];
}

export type TariffLevel = "narodniy" | "econom" | "comfort" | "business";

export interface ChecklistItem {
  label: string;
  passed: boolean;
  detail: string;
}

export interface VerificationVerdict {
  approved: boolean;
  maxTariff: TariffLevel;
  availableTariffs: TariffLevel[];
  checklist: ChecklistItem[];
  carYear: number | null;
  carBrand: string;
  carModel: string;
}

const EMPTY: OcrResult = { text: "", entities: [], labels: [] };

// ─── Helpers ────────────────────────────────────────────────────────────────

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function mimeType(file: File): string {
  return file.type || "image/jpeg";
}

// ─── Document AI ────────────────────────────────────────────────────────────

async function callDocumentAI(processorId: string, file: File): Promise<OcrResult> {
  if (!API_KEY || !GCP_PROJECT || !processorId) return EMPTY;

  const base64 = await fileToBase64(file);
  const url =
    `https://${DOCAI_LOCATION}-documentai.googleapis.com/v1/projects/${GCP_PROJECT}` +
    `/locations/${DOCAI_LOCATION}/processors/${processorId}:process?key=${API_KEY}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rawDocument: { content: base64, mimeType: mimeType(file) } }),
  });

  if (!res.ok) {
    console.warn("Document AI error:", res.status);
    if (res.status === 401 || res.status === 403) {
      throw new Error("DOC_AI_AUTH: Включите Document AI API и проверьте API ключ в Google Cloud. Используйте Project ID (например taxi-eb8b7), не номер проекта.");
    }
    return EMPTY;
  }

  const data = await res.json();
  const d = data?.document;
  return {
    text: (d?.text || "").trim(),
    entities: (d?.entities || []).map((e: any) => ({
      type: e.type || "",
      mentionText: (e.mentionText || "").trim(),
      confidence: e.confidence ?? 0,
    })),
    labels: [],
  };
}

// ─── Vision API ─────────────────────────────────────────────────────────────

async function callVisionOCR(file: File): Promise<OcrResult> {
  if (!API_KEY) return EMPTY;
  const base64 = await fileToBase64(file);
  const url = `https://vision.googleapis.com/v1/images:annotate?key=${API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [{ image: { content: base64 }, features: [{ type: "TEXT_DETECTION", maxResults: 1 }] }],
    }),
  });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error("VISION_AUTH: Включите Cloud Vision API и добавьте домен приложения в ограничения ключа (или отключите ограничения).");
    }
    return EMPTY;
  }
  const data = await res.json();
  const text = data?.responses?.[0]?.fullTextAnnotation?.text ||
    data?.responses?.[0]?.textAnnotations?.[0]?.description || "";
  return { text: text.trim(), entities: [], labels: [] };
}

async function callVisionLabels(file: File): Promise<ImageLabel[]> {
  if (!API_KEY) return [];
  const base64 = await fileToBase64(file);
  const url = `https://vision.googleapis.com/v1/images:annotate?key=${API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [{
        image: { content: base64 },
        features: [
          { type: "LABEL_DETECTION", maxResults: 20 },
          { type: "OBJECT_LOCALIZATION", maxResults: 10 },
        ],
      }],
    }),
  });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error("VISION_AUTH: Включите Cloud Vision API и проверьте ограничения API ключа.");
    }
    return [];
  }
  const data = await res.json();
  const resp = data?.responses?.[0] || {};
  const labels: ImageLabel[] = (resp.labelAnnotations || []).map((l: any) => ({
    description: (l.description || "").toLowerCase(), score: l.score ?? 0,
  }));
  const objects: ImageLabel[] = (resp.localizedObjectAnnotations || []).map((o: any) => ({
    description: (o.name || "").toLowerCase(), score: o.score ?? 0,
  }));
  return [...labels, ...objects];
}

// ─── Public: process document / photo ───────────────────────────────────────

export async function extractDocument(file: File): Promise<OcrResult> {
  try {
    if (DOCAI_DOC_PROCESSOR) return await callDocumentAI(DOCAI_DOC_PROCESSOR, file);
    return await callVisionOCR(file);
  } catch (err) {
    console.warn("Document OCR failed:", err);
    return EMPTY;
  }
}

/** Водительское удостоверение: Document AI часто не даёт entities, используем Vision TEXT_DETECTION. */
export async function extractDocumentLicense(file: File): Promise<OcrResult> {
  try {
    const vision = await callVisionOCR(file);
    if (vision.text.length > 0) return vision;
    if (DOCAI_DOC_PROCESSOR) return await callDocumentAI(DOCAI_DOC_PROCESSOR, file);
    return vision;
  } catch (err) {
    console.warn("License OCR failed:", err);
    return EMPTY;
  }
}

export async function extractPhoto(file: File): Promise<OcrResult> {
  try {
    const [ocr, labels] = await Promise.all([
      DOCAI_OCR_PROCESSOR ? callDocumentAI(DOCAI_OCR_PROCESSOR, file) : callVisionOCR(file),
      callVisionLabels(file),
    ]);
    return { ...ocr, labels };
  } catch (err) {
    console.warn("Photo analysis failed:", err);
    return EMPTY;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// BUSINESS MODEL WHITELIST
// ═══════════════════════════════════════════════════════════════════════════

interface BrandModels {
  brand: string[];
  models: string[];
}

// Hardcoded fallback (used if Firestore config not available)
const DEFAULT_BUSINESS_WHITELIST: BrandModels[] = [
  // Japan
  { brand: ["toyota"],        models: ["camry 70", "camry 75", "camry xv70", "camry xv75", "avalon"] },
  { brand: ["lexus"],         models: ["es", "gs", "ls", "rx", "nx", "lx"] },
  // Korea
  { brand: ["kia"],           models: ["k5", "stinger", "k8", "k9"] },
  { brand: ["hyundai"],       models: ["grandeur", "azera", "palisade"] },
  { brand: ["genesis"],       models: ["g70", "g80", "g90", "gv70", "gv80", "gv60"] },
  // Germany
  { brand: ["mercedes", "mercedes-benz"], models: ["e-class", "e class", "s-class", "s class", "gle", "gls", "eqe", "eqs", "e200", "e220", "e250", "e300", "e350", "s350", "s400", "s450", "s500", "s560", "s580", "gle300", "gle350", "gle400", "gle450", "gls400", "gls450", "gls580"] },
  { brand: ["bmw"],           models: ["5 series", "7 series", "x5", "x7", "i5", "i7", "ix", "520", "525", "530", "540", "550", "730", "740", "750", "760"] },
  { brand: ["audi"],          models: ["a6", "a7", "a8", "q7", "q8", "e-tron", "e tron"] },
  { brand: ["porsche"],       models: ["panamera", "cayenne", "taycan", "macan"] },
  // UK
  { brand: ["jaguar"],        models: ["xf", "xj", "f-pace", "f pace", "i-pace", "i pace"] },
  { brand: ["land rover", "range rover"], models: ["range rover", "range rover sport", "defender", "velar"] },
  { brand: ["bentley"],       models: ["continental", "flying spur", "bentayga"] },
  { brand: ["rolls-royce", "rolls royce"], models: ["ghost", "phantom", "wraith", "cullinan", "spectre"] },
  // USA
  { brand: ["cadillac"],      models: ["ct5", "ct6", "escalade", "lyriq", "xt6"] },
  { brand: ["lincoln"],       models: ["aviator", "navigator", "continental"] },
  { brand: ["tesla"],         models: ["model s", "model x"] },
  // Sweden
  { brand: ["volvo"],         models: ["s90", "xc90", "xc60", "ex90"] },
  // Italy
  { brand: ["maserati"],      models: ["ghibli", "quattroporte", "levante", "grecale"] },
  // China premium EV
  { brand: ["li auto", "li", "lixiang", "理想"], models: ["l7", "l8", "l9", "mega"] },
  { brand: ["nio", "蔚来"],   models: ["es6", "es7", "es8", "et5", "et7", "ec6", "ec7", "el8"] },
  { brand: ["xpeng", "xpeng motors", "小鹏"], models: ["g9", "p7", "g6", "x9"] },
  { brand: ["zeekr", "极氪"],  models: ["001", "zeekr 001", "x", "zeekr x", "009"] },
  { brand: ["hongqi", "红旗"], models: ["h5", "h7", "h9", "hs5", "hs7", "e-hs9", "ehs9"] },
  { brand: ["voyah", "岚图"],  models: ["free", "dream", "chasing light"] },
  { brand: ["avatr", "阿维塔"], models: ["11", "12", "avatr 11", "avatr 12"] },
  { brand: ["denza", "腾势"],  models: ["d9", "n7"] },
];

let _cachedWhitelist: BrandModels[] | null = null;

/**
 * Load business whitelist from Firestore `config/business_models`.
 * Falls back to hardcoded list if not found.
 * Cached after first load.
 */
export async function loadBusinessWhitelist(db: any): Promise<BrandModels[]> {
  if (_cachedWhitelist) return _cachedWhitelist;

  try {
    const snap = await getDoc(doc(db, "config", "business_models"));
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data?.list) && data.list.length > 0) {
        _cachedWhitelist = data.list as BrandModels[];
        return _cachedWhitelist;
      }
    }
  } catch {}

  _cachedWhitelist = DEFAULT_BUSINESS_WHITELIST;
  return _cachedWhitelist;
}

export function clearWhitelistCache() {
  _cachedWhitelist = null;
}

// ═══════════════════════════════════════════════════════════════════════════
// TARIFF RULES — FULLY AUTOMATIC
// ═══════════════════════════════════════════════════════════════════════════

const DAMAGE_KEYWORDS = [
  "damage", "dent", "scratch", "rust", "broken", "crack", "wreck", "collision",
  "повреждение", "вмятина", "царапина", "ржавчина",
];

function norm(s: string): string {
  return s.toLowerCase().replace(/[-_]/g, " ").trim();
}

function extractCarYear(docs: Record<string, OcrResult>): number | null {
  for (const key of ["techPassport"]) {
    const ocr = docs[key];
    if (!ocr) continue;
    for (const e of ocr.entities) {
      const t = e.type.toLowerCase();
      if (t.includes("year") || t.includes("date") || t.includes("год") || t.includes("выпуск")) {
        const m = e.mentionText.match(/\b(19|20)\d{2}\b/);
        if (m) return parseInt(m[0]);
      }
    }
    const yearMatch = ocr.text.match(/(?:год\s*(?:выпуска)?|year|г\.?\s*в\.?)[^\d]{0,15}((?:19|20)\d{2})/i)
      || ocr.text.match(/\b(20[0-2]\d)\b/);
    if (yearMatch) return parseInt(yearMatch[1]);
  }
  return null;
}

function extractCarBrand(docs: Record<string, OcrResult>): string {
  for (const key of ["techPassport"]) {
    const ocr = docs[key];
    if (!ocr) continue;
    for (const e of ocr.entities) {
      const t = e.type.toLowerCase();
      if (t.includes("make") || t.includes("brand") || t.includes("марка") || t.includes("manufacturer")) {
        return norm(e.mentionText);
      }
    }
    const m = ocr.text.match(/(?:марка|make|brand)[:\s]+([A-Za-zА-Яа-яё-]+)/i);
    if (m) return norm(m[1]);
  }
  return "";
}

function extractCarModel(docs: Record<string, OcrResult>): string {
  for (const key of ["techPassport"]) {
    const ocr = docs[key];
    if (!ocr) continue;
    for (const e of ocr.entities) {
      const t = e.type.toLowerCase();
      if (t.includes("model") || t.includes("модель")) {
        return norm(e.mentionText);
      }
    }
    const m = ocr.text.match(/(?:модель|model)[:\s]+([A-Za-zА-Яа-яё0-9\s-]+)/i);
    if (m) return norm(m[1]);
  }
  return "";
}

function isBusinessModel(brand: string, model: string, whitelist: BrandModels[]): boolean {
  const b = norm(brand);
  const m = norm(model);
  const full = `${b} ${m}`;
  return whitelist.some((entry) => {
    const brandOk = entry.brand.some((eb) => b.includes(eb) || full.includes(eb));
    if (!brandOk) return false;
    return entry.models.some((em) => m.includes(em) || full.includes(em));
  });
}

function hasLabels(allLabels: ImageLabel[], keywords: string[]): boolean {
  return allLabels.some((l) =>
    keywords.some((kw) => l.description.includes(kw) && l.score > 0.6)
  );
}

// ─── Main checklist (called with preloaded whitelist) ───────────────────────

export function runTariffChecklist(
  docs: Record<string, OcrResult>,
  photos: Record<string, OcrResult>,
  businessWhitelist?: BrandModels[],
): VerificationVerdict {
  const wl = businessWhitelist || DEFAULT_BUSINESS_WHITELIST;
  const currentYear = new Date().getFullYear();
  const carYear = extractCarYear(docs);
  const carBrand = extractCarBrand(docs);
  const carModel = extractCarModel(docs);

  const allLabels = Object.values(photos).flatMap((p) => p.labels);
  const hasDamage = hasLabels(allLabels, DAMAGE_KEYWORDS);

  const hasTechPassport = !!(docs.techPassport?.text || docs.techPassport?.entities.length);
  const hasLicense = !!(docs.license && (docs.license.entities?.length > 0 || (docs.license.text && docs.license.text.trim().length >= 10)));
  const allDocsPresent = hasTechPassport && hasLicense;
  const hasPhotos = Object.keys(photos).length >= 7;

  const available: TariffLevel[] = [];

  const narodniyOk = allDocsPresent && hasPhotos;
  if (narodniyOk) available.push("narodniy");

  const economOk = narodniyOk && carYear !== null && carYear >= 2000;
  if (economOk) available.push("econom");

  const comfortOk = economOk && carYear !== null && carYear >= 2008 && !hasDamage;
  if (comfortOk) available.push("comfort");

  const businessModelOk = isBusinessModel(carBrand, carModel, wl);
  const businessOk = comfortOk && carYear !== null && carYear >= 2016 && businessModelOk;
  if (businessOk) available.push("business");

  const maxTariff: TariffLevel = available.length > 0 ? available[available.length - 1] : "narodniy";

  const checklist: ChecklistItem[] = [
    { label: "Техпаспорт", passed: hasTechPassport, detail: hasTechPassport ? "Распознан" : "Не распознан" },
    { label: "Водительские права", passed: hasLicense, detail: hasLicense ? "Распознан" : "Не распознан" },
    { label: "Фото авто (мин. 7)", passed: hasPhotos, detail: `${Object.keys(photos).length}/7` },
    { label: "Год выпуска", passed: carYear !== null, detail: carYear ? `${carYear} г.` : "Не определён" },
    { label: "Марка / Модель", passed: !!carBrand, detail: carBrand ? `${carBrand} ${carModel}`.trim() : "Не определена" },
    { label: "Кузов", passed: !hasDamage, detail: hasDamage ? "Повреждения" : "OK" },
  ];

  if (businessModelOk || maxTariff === "business") {
    checklist.push({ label: "Бизнес-модель", passed: businessModelOk, detail: businessModelOk ? "В списке" : "Не в списке" });
  }

  // FULL AUTO — no moderator
  const approved = narodniyOk;

  return { approved, maxTariff, availableTariffs: available, checklist, carYear, carBrand, carModel };
}

// ─── Exports ────────────────────────────────────────────────────────────────

export function formatEntities(entities: DocumentEntity[]): string {
  if (!entities.length) return "";
  return entities
    .filter((e) => e.confidence > 0.5)
    .map((e) => `${e.type}: ${e.mentionText} (${Math.round(e.confidence * 100)}%)`)
    .join("\n");
}

export const TARIFF_NAMES: Record<TariffLevel, string> = {
  narodniy: "Народный",
  econom: "Эконом",
  comfort: "Комфорт",
  business: "Бизнес",
};
