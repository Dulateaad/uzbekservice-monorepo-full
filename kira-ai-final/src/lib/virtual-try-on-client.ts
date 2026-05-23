/**
 * Виртуальная примерка через Gemini REST API (браузер).
 * Ключ берётся из NEXT_PUBLIC_GOOGLE_GENAI_API_KEY — ограничьте его по referrer в Google AI Studio.
 */

const TRY_ON_MODEL = "gemini-3-pro-image-preview";

const TRY_ON_PROMPT =
  "Take the clothing item from the second image and place it realistically on the person in the first image. The person should be clearly visible wearing the clothing. The background should be clean and simple, like a studio photo. The final image should only contain the person wearing the new clothing.";

function parseDataUri(dataUri: string): { mime_type: string; data: string } {
  const trimmed = dataUri.trim();
  const m = /^data:([^;,]+);base64,(.+)$/i.exec(trimmed);
  if (!m) {
    throw new Error("Неверный формат фото (ожидается data URL в base64).");
  }
  return { mime_type: m[1], data: m[2].replace(/\s/g, "") };
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function toInlinePart(imageDataUriOrUrl: string): Promise<{
  inline_data: { mime_type: string; data: string };
}> {
  if (imageDataUriOrUrl.startsWith("data:")) {
    const { mime_type, data } = parseDataUri(imageDataUriOrUrl);
    return { inline_data: { mime_type, data } };
  }
  const res = await fetch(imageDataUriOrUrl, { mode: "cors" });
  if (!res.ok) {
    throw new Error("Не удалось загрузить изображение товара (CORS или сеть).");
  }
  const blob = await res.blob();
  const mime = blob.type || "image/jpeg";
  const b64 = arrayBufferToBase64(await blob.arrayBuffer());
  return { inline_data: { mime_type: mime, data: b64 } };
}

function readInlineImageFromPart(part: Record<string, unknown>): string | null {
  const inline =
    (part.inlineData as Record<string, string> | undefined) ||
    (part.inline_data as Record<string, string> | undefined);
  if (!inline?.data) return null;
  const mime = inline.mimeType || inline.mime_type || "image/png";
  return `data:${mime};base64,${inline.data}`;
}

export async function runVirtualTryOnClient(
  userPhotoDataUri: string,
  clothingImageUrlOrDataUri: string,
  apiKey: string
): Promise<{ url?: string; error?: string }> {
  try {
    const userPart = await toInlinePart(userPhotoDataUri);
    const clothingPart = await toInlinePart(clothingImageUrlOrDataUri);

    const body = {
      contents: [
        {
          role: "user",
          parts: [userPart, clothingPart, { text: TRY_ON_PROMPT }],
        },
      ],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    };

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${TRY_ON_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      const errObj = json.error as { message?: string } | undefined;
      const msg = errObj?.message || `Gemini API: ${res.status}`;
      return { error: msg };
    }

    const candidates = json.candidates as Array<Record<string, unknown>> | undefined;
    const parts = candidates?.[0]?.content as { parts?: Array<Record<string, unknown>> } | undefined;
    if (!parts?.parts?.length) {
      return { error: "Пустой ответ модели. Попробуйте другое фото." };
    }

    for (const part of parts.parts) {
      const url = readInlineImageFromPart(part);
      if (url) return { url };
    }

    return { error: "Модель не вернула изображение. Попробуйте ещё раз." };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Неизвестная ошибка.";
    return { error: message };
  }
}
