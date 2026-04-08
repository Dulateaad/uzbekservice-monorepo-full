/**
 * Server-side OCR via Document AI and Vision API.
 * Uses Application Default Credentials (no API key) — avoids 401/403 from browser.
 */

import { DocumentProcessorServiceClient } from "@google-cloud/documentai";
import { ImageAnnotatorClient } from "@google-cloud/vision";

const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || "";
const location = process.env.DOCAI_LOCATION || "us";
const docProcessorId = process.env.DOCAI_DOC_PROCESSOR_ID || "";
const ocrProcessorId = process.env.DOCAI_OCR_PROCESSOR_ID || "";

export interface OcrResult {
  text: string;
  entities: Array<{ type: string; mentionText: string; confidence: number }>;
  labels: Array<{ description: string; score: number }>;
}

const EMPTY: OcrResult = { text: "", entities: [], labels: [] };

function normMime(mime: string): string {
  if (!mime || mime === "image/jpg") return "image/jpeg";
  return mime;
}

/** Document AI: process document (tech passport, license, etc.) */
async function docAIProcess(base64: string, mimeType: string, processorId: string): Promise<OcrResult> {
  if (!projectId || !processorId) return EMPTY;
  const client = new DocumentProcessorServiceClient();
  const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;
  const [result] = await client.processDocument({
    name,
    rawDocument: {
      content: Buffer.from(base64, "base64"),
      mimeType: normMime(mimeType),
    },
  });
  const doc = result.document;
  if (!doc) return EMPTY;
  const text = (doc.text || "").trim();
  const entities = (doc.entities || []).map((e: any) => ({
    type: e.type || "",
    mentionText: (e.mentionText || "").trim(),
    confidence: e.confidence ?? 0,
  }));
  return { text, entities, labels: [] };
}

/** Vision API: text detection */
async function visionText(base64: string): Promise<string> {
  const client = new ImageAnnotatorClient();
  const [result] = await client.batchAnnotateImages({
    requests: [
      {
        image: { content: Buffer.from(base64, "base64") },
        features: [{ type: "TEXT_DETECTION" as const, maxResults: 1 }],
      },
    ],
  });
  const res = result.responses?.[0];
  const text =
    res?.fullTextAnnotation?.text?.trim() ||
    (res?.textAnnotations?.[0] as any)?.description?.trim() ||
    "";
  return text;
}

/** Vision API: label detection for photos */
async function visionLabels(base64: string): Promise<OcrResult["labels"]> {
  const client = new ImageAnnotatorClient();
  const [result] = await client.batchAnnotateImages({
    requests: [
      {
        image: { content: Buffer.from(base64, "base64") },
        features: [
          { type: "LABEL_DETECTION" as const, maxResults: 20 },
          { type: "OBJECT_LOCALIZATION" as const, maxResults: 10 },
        ],
      },
    ],
  });
  const res = result.responses?.[0];
  const labels: OcrResult["labels"] = (res?.labelAnnotations || []).map((l: any) => ({
    description: (l.description || "").toLowerCase(),
    score: l.score ?? 0,
  }));
  const objects: OcrResult["labels"] = (res?.localizedObjectAnnotations || []).map((o: any) => ({
    description: (o.name || "").toLowerCase(),
    score: o.score ?? 0,
  }));
  return [...labels, ...objects];
}

/**
 * Process verification image (doc or photo).
 * type: techPassport | license | photo
 */
export async function processVerificationImage(
  base64: string,
  mimeType: string,
  type: "techPassport" | "license" | "photo"
): Promise<OcrResult> {
  const mime = normMime(mimeType || "image/jpeg");
  try {
    if (type === "photo") {
      const [textResult, labelResult] = await Promise.all([
        docProcessorId ? docAIProcess(base64, mime, ocrProcessorId || docProcessorId) : Promise.resolve(EMPTY),
        visionLabels(base64),
      ]);
      const text = textResult.text || (await visionText(base64));
      return { text, entities: textResult.entities, labels: labelResult };
    }
    // techPassport or license: try Document AI first, then Vision text
    if (docProcessorId) {
      const docResult = await docAIProcess(base64, mime, docProcessorId);
      if (docResult.text || docResult.entities.length > 0) return { ...docResult, labels: [] };
    }
    const text = await visionText(base64);
    return { text, entities: [], labels: [] };
  } catch (err) {
    console.error("processVerificationImage error:", err);
    return EMPTY;
  }
}
