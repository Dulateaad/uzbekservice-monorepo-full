/**
 * Проверка размера изображений — минимум 800×800px по ТЗ.
 * PNG: размеры в IHDR (bytes 16–23).
 */

const MIN_SIZE = 800;

function getPngDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 24) return null;
  if (buffer[0] !== 0x89 || buffer[1] !== 0x50 || buffer[2] !== 0x4e) return null;
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

function getJpegDimensions(buffer: Buffer): { width: number; height: number } | null {
  let i = 0;
  while (i < buffer.length - 9) {
    if (buffer[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = buffer[i + 1];
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      const height = buffer.readUInt16BE(i + 5);
      const width = buffer.readUInt16BE(i + 7);
      return { width, height };
    }
    if (marker >= 0xd0 && marker <= 0xd9) {
      i += 2;
      continue;
    }
    const len = buffer.readUInt16BE(i + 2);
    i += 2 + len;
  }
  return null;
}

function getWebpDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 30) return null;
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') return null;
  const fmt = buffer.toString('ascii', 12, 16);
  if (fmt === 'VP8 ') {
    const width = buffer.readUInt16LE(26) & 0x3fff;
    const height = buffer.readUInt16LE(28) & 0x3fff;
    return { width, height };
  }
  if (fmt === 'VP8L') {
    const b0 = buffer.readUInt32LE(21);
    const width = (b0 & 0x3fff) + 1;
    const height = ((b0 >> 14) & 0x3fff) + 1;
    return { width, height };
  }
  if (fmt === 'VP8X') {
    const width = (buffer.readUIntLE(24, 3) + 1);
    const height = (buffer.readUIntLE(27, 3) + 1);
    return { width, height };
  }
  return null;
}

export function getImageDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return getPngDimensions(buffer);
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return getJpegDimensions(buffer);
  if (buffer.toString('ascii', 0, 4) === 'RIFF') return getWebpDimensions(buffer);
  return null;
}

export function validateImageDimensions(buffer: Buffer): { valid: boolean; width?: number; height?: number; reason?: string } {
  const dims = getImageDimensions(buffer);
  if (!dims) return { valid: false, reason: 'Неизвестный формат изображения' };
  if (dims.width < MIN_SIZE || dims.height < MIN_SIZE) {
    return {
      valid: false,
      width: dims.width,
      height: dims.height,
      reason: `Изображение ${dims.width}×${dims.height}px. Минимум ${MIN_SIZE}×${MIN_SIZE}px`,
    };
  }
  return { valid: true, width: dims.width, height: dims.height };
}

/**
 * Проверка по URL (для клиента) — загружает изображение и проверяет размеры.
 */
export function validateImageUrl(url: string): Promise<{ valid: boolean; width?: number; height?: number; reason?: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const valid = img.naturalWidth >= MIN_SIZE && img.naturalHeight >= MIN_SIZE;
      resolve({
        valid,
        width: img.naturalWidth,
        height: img.naturalHeight,
        reason: valid ? undefined : `Изображение ${img.naturalWidth}×${img.naturalHeight}px. Минимум ${MIN_SIZE}×${MIN_SIZE}px`,
      });
    };
    img.onerror = () => resolve({ valid: false, reason: 'Не удалось загрузить изображение' });
    img.src = url;
  });
}
