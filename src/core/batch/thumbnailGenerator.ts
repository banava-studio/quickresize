/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Generate a tiny lightweight thumbnail data URL (JPEG/WebP) for queue UI cards
 * This ensures that a batch of 50-100+ large raw photos does not consume hundreds of MBs in memory.
 */
export async function createThumbnailDataUrl(
  fileOrBlob: File | Blob,
  maxDimension = 120
): Promise<string> {
  // Method 1: Fast native createImageBitmap with hardware downscaling if supported
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(fileOrBlob);
      const naturalW = bitmap.width || 100;
      const naturalH = bitmap.height || 100;

      let targetW = naturalW;
      let targetH = naturalH;
      if (targetW > maxDimension || targetH > maxDimension) {
        const scale = Math.min(maxDimension / targetW, maxDimension / targetH);
        targetW = Math.max(16, Math.round(targetW * scale));
        targetH = Math.max(16, Math.round(targetH * scale));
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'medium';
        ctx.drawImage(bitmap, 0, 0, targetW, targetH);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
        canvas.width = 0;
        canvas.height = 0;
        bitmap.close();
        return dataUrl;
      }
      bitmap.close();
    } catch {
      // Fall through to HTMLImageElement method
    }
  }

  // Method 2: HTMLImageElement fallback
  const url = URL.createObjectURL(fileOrBlob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image for thumbnail'));
      img.src = url;
    });

    const naturalW = img.naturalWidth || img.width || 100;
    const naturalH = img.naturalHeight || img.height || 100;

    let targetW = naturalW;
    let targetH = naturalH;

    if (targetW > maxDimension || targetH > maxDimension) {
      const scale = Math.min(maxDimension / targetW, maxDimension / targetH);
      targetW = Math.max(16, Math.round(targetW * scale));
      targetH = Math.max(16, Math.round(targetH * scale));
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return '';
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'medium';
    ctx.drawImage(img, 0, 0, targetW, targetH);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
    canvas.width = 0;
    canvas.height = 0;

    return dataUrl;
  } catch (err) {
    console.warn('Thumbnail generation fallback failed:', err);
    return '';
  } finally {
    URL.revokeObjectURL(url);
  }
}
