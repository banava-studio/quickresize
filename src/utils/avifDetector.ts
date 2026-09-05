/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

let _avifEncodingSupported: boolean | null = null;
let _avifDecodingSupported: boolean | null = null;

/**
 * Detect whether the current browser supports encoding to image/avif via Canvas.toBlob
 */
export async function checkAvifEncodingSupport(): Promise<boolean> {
  if (_avifEncodingSupported !== null) return _avifEncodingSupported;
  if (typeof document === 'undefined') return false;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 2;
    const blob = await new Promise<Blob | null>((resolve) => {
      try {
        canvas.toBlob(
          (b) => resolve(b),
          'image/avif',
          0.8
        );
      } catch {
        resolve(null);
      }
    });

    _avifEncodingSupported = blob !== null && blob.type === 'image/avif';
  } catch {
    _avifEncodingSupported = false;
  }
  return _avifEncodingSupported;
}

/**
 * Detect whether the current browser can decode AVIF images
 */
export async function checkAvifDecodingSupport(): Promise<boolean> {
  if (_avifDecodingSupported !== null) return _avifDecodingSupported;
  if (typeof Image === 'undefined') return false;

  try {
    // 1x1 transparent AVIF image data URL
    const avifDataUrl = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAG1pZjFhdmlmAAACAG1ldGEAAAAAAAAAIWhkbHIAAAAAAAAAAHBpY3QAAAAAAAAAAAAAAAAAAAAAACRpdG1zAAAAABdkaXNtAAAAAXBpY3QAAAAAc2l6ZQAAAAEA';
    const img = new Image();
    const isSupported = await new Promise<boolean>((resolve) => {
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = avifDataUrl;
    });
    _avifDecodingSupported = isSupported;
  } catch {
    _avifDecodingSupported = false;
  }
  return _avifDecodingSupported;
}
