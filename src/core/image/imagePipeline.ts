/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  TransformState, 
  CropRect, 
  ResizeConfig, 
  ImageAdjustments, 
  AspectRatioType 
} from '../../types';
import { compressToExactKB, CompressionResult } from '../compression/compressionEngine';

export interface RenderPipelineResult {
  blob: Blob;
  url: string;
  width: number;
  height: number;
  size: number;
  format: string;
  compressionResult?: CompressionResult;
  processingTimeMs: number;
  requestId?: string;
}

export interface PipelineRenderOptions {
  isPreview?: boolean;
  maxPreviewDimension?: number;
  signal?: AbortSignal;
  requestId?: string;
  backgroundColor?: string;
}

/**
 * Load an image from a File, Blob, or URL safely
 */
export async function loadImageElement(
  source: File | Blob | string
): Promise<{ img: HTMLImageElement; width: number; height: number; cleanup: () => void }> {
  let url = '';
  let shouldRevoke = false;

  if (typeof source === 'string') {
    url = source;
  } else {
    url = URL.createObjectURL(source);
    shouldRevoke = true;
  }

  const img = new Image();
  if (url.startsWith('http://') || url.startsWith('https://')) {
    img.crossOrigin = 'anonymous';
  }

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to decode image data'));
    img.src = url;
  });

  return {
    img,
    width: img.naturalWidth || img.width,
    height: img.naturalHeight || img.height,
    cleanup: () => {
      if (shouldRevoke) {
        URL.revokeObjectURL(url);
      }
    },
  };
}

/**
 * Get dimensions after rotation
 */
export function getRotatedDimensions(
  width: number,
  height: number,
  rotation: number
): { width: number; height: number } {
  const is90or270 = rotation === 90 || rotation === 270;
  return {
    width: is90or270 ? height : width,
    height: is90or270 ? width : height,
  };
}

/**
 * Apply 3x3 unsharp convolution sharpening
 */
export function applySharpenToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  strengthPct = 25
): void {
  if (strengthPct <= 0) return;
  try {
    const strength = Math.min(1.0, Math.max(0.05, (strengthPct / 100) * 0.6));
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const buffer = new Uint8ClampedArray(data);
    const a = strength;
    const b = 1 + 4 * a;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i = (y * width + x) * 4;
        for (let c = 0; c < 3; c++) {
          const current = buffer[i + c];
          const top = buffer[i - width * 4 + c];
          const bottom = buffer[i + width * 4 + c];
          const left = buffer[i - 4 + c];
          const right = buffer[i + 4 + c];

          let val = b * current - a * (top + bottom + left + right);
          if (val < 0) val = 0;
          if (val > 255) val = 255;
          data[i + c] = val;
        }
      }
    }
    ctx.putImageData(imageData, 0, 0);
  } catch (err) {
    console.warn('Canvas sharpen operation skipped:', err);
  }
}

/**
 * Calculate the aspect ratio numeric multiplier from ratio type
 */
export function getAspectRatioMultiplier(
  ratioType: AspectRatioType,
  custom?: { width: number; height: number }
): number | null {
  switch (ratioType) {
    case '1:1':
      return 1.0;
    case '4:5':
      return 4 / 5;
    case '3:4':
      return 3 / 4;
    case '16:9':
      return 16 / 9;
    case '9:16':
      return 9 / 16;
    case 'a4':
      return 1 / 1.4142; // ISO 216 1:sqrt(2)
    case 'passport':
      return 35 / 45;
    case 'custom':
      if (custom && custom.width > 0 && custom.height > 0) {
        return custom.width / custom.height;
      }
      return null;
    case 'free':
    default:
      return null;
  }
}

/**
 * Convert normalized or pixel crop coordinates into absolute source pixel coordinates
 */
export function getAbsoluteCropCoordinates(
  crop: CropRect | null,
  sourceWidth: number,
  sourceHeight: number
): { x: number; y: number; width: number; height: number } {
  if (!crop) {
    return { x: 0, y: 0, width: sourceWidth, height: sourceHeight };
  }

  let x = crop.x;
  let y = crop.y;
  let w = crop.width;
  let h = crop.height;

  if (crop.isNormalized) {
    x = crop.x * sourceWidth;
    y = crop.y * sourceHeight;
    w = crop.width * sourceWidth;
    h = crop.height * sourceHeight;
  }

  // Constrain inside bounds
  x = Math.max(0, Math.min(sourceWidth - 1, x));
  y = Math.max(0, Math.min(sourceHeight - 1, y));
  w = Math.max(1, Math.min(sourceWidth - x, w));
  h = Math.max(1, Math.min(sourceHeight - y, h));

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(w),
    height: Math.round(h),
  };
}

/**
 * Calculate final resize dimensions based on resize config
 */
export function calculateResizeOutputDimensions(
  cropWidth: number,
  cropHeight: number,
  resize: ResizeConfig
): { targetWidth: number; targetHeight: number } {
  const cropRatio = cropWidth / cropHeight;

  // 1. Check percentage scaling
  if (resize.percentage && resize.percentage !== 100) {
    const scale = resize.percentage / 100;
    return {
      targetWidth: Math.max(1, Math.round(cropWidth * scale)),
      targetHeight: Math.max(1, Math.round(cropHeight * scale)),
    };
  }

  // 2. Check max dimension constraint mode
  if (resize.maxDimension && resize.maxDimension > 0) {
    if (resize.maxDimensionType === 'width' && cropWidth > resize.maxDimension) {
      const scale = resize.maxDimension / cropWidth;
      return {
        targetWidth: resize.maxDimension,
        targetHeight: Math.max(1, Math.round(cropHeight * scale)),
      };
    } else if (resize.maxDimensionType === 'height' && cropHeight > resize.maxDimension) {
      const scale = resize.maxDimension / cropHeight;
      return {
        targetWidth: Math.max(1, Math.round(cropWidth * scale)),
        targetHeight: resize.maxDimension,
      };
    } else if (resize.maxDimensionType === 'none' || !resize.maxDimensionType) {
      const maxSide = Math.max(cropWidth, cropHeight);
      if (maxSide > resize.maxDimension) {
        const scale = resize.maxDimension / maxSide;
        return {
          targetWidth: Math.max(1, Math.round(cropWidth * scale)),
          targetHeight: Math.max(1, Math.round(cropHeight * scale)),
        };
      }
    }
  }

  // 3. Explicit width / height configuration
  let targetW = resize.width || cropWidth;
  let targetH = resize.height || cropHeight;

  if (resize.maintainAspectRatio) {
    if (resize.width && !resize.height) {
      targetH = Math.max(1, Math.round(resize.width / cropRatio));
    } else if (!resize.width && resize.height) {
      targetW = Math.max(1, Math.round(resize.height * cropRatio));
    } else if (resize.width && resize.height) {
      // Respect resize mode (fit / contain / cover / fill)
      if (resize.mode === 'fit' || resize.mode === 'contain') {
        const scale = Math.min(resize.width / cropWidth, resize.height / cropHeight);
        targetW = Math.max(1, Math.round(cropWidth * scale));
        targetH = Math.max(1, Math.round(cropHeight * scale));
      } else if (resize.mode === 'cover') {
        const scale = Math.max(resize.width / cropWidth, resize.height / cropHeight);
        targetW = Math.max(1, Math.round(cropWidth * scale));
        targetH = Math.max(1, Math.round(cropHeight * scale));
      } else {
        // Fill ignores aspect ratio lock
        targetW = resize.width;
        targetH = resize.height;
      }
    }
  }

  return {
    targetWidth: Math.max(1, Math.round(targetW)),
    targetHeight: Math.max(1, Math.round(targetH)),
  };
}

/**
 * Generate CSS / Canvas filter string from adjustments
 */
export function buildFilterString(adjustments: ImageAdjustments): string {
  const filters: string[] = [];

  if (adjustments.brightness !== 0) {
    // -100..+100 maps to 0%..200%
    const b = Math.max(0, 100 + adjustments.brightness);
    filters.push(`brightness(${b}%)`);
  }

  if (adjustments.contrast !== 0) {
    // -100..+100 maps to 0%..200%
    const c = Math.max(0, 100 + adjustments.contrast);
    filters.push(`contrast(${c}%)`);
  }

  if (adjustments.saturation !== 0) {
    // -100..+100 maps to 0%..200%
    const s = Math.max(0, 100 + adjustments.saturation);
    filters.push(`saturate(${s}%)`);
  }

  if (adjustments.grayscale) {
    filters.push('grayscale(100%)');
  }

  return filters.join(' ');
}

/**
 * UNIFIED IMAGE PROCESSING PIPELINE
 * 
 * Executes full chain:
 * Source -> Rotation & Flip -> Crop -> Resize -> Adjustments -> Sharpness -> Exact KB Compression / Export
 */
export async function processImagePipeline(
  fileOrSource: File | Blob | HTMLImageElement,
  state: TransformState,
  options: PipelineRenderOptions = {}
): Promise<RenderPipelineResult> {
  const startTime = performance.now();

  if (options.signal?.aborted) {
    throw new DOMException('Pipeline operation aborted', 'AbortError');
  }

  // 1. Obtain image element and natural dimensions
  let img: HTMLImageElement;
  let sourceWidth = 0;
  let sourceHeight = 0;
  let cleanupImg: () => void = () => {};

  if (fileOrSource instanceof HTMLImageElement) {
    img = fileOrSource;
    sourceWidth = img.naturalWidth || img.width;
    sourceHeight = img.naturalHeight || img.height;
  } else {
    const loaded = await loadImageElement(fileOrSource);
    img = loaded.img;
    sourceWidth = loaded.width;
    sourceHeight = loaded.height;
    cleanupImg = loaded.cleanup;
  }

  try {
    if (options.signal?.aborted) {
      throw new DOMException('Pipeline operation aborted', 'AbortError');
    }

    // 2. STAGE 1: Apply Orientation (Rotation & Flip) to an intermediate buffer
    const isRotated90 = state.rotation === 90 || state.rotation === 270;
    const rotatedW = isRotated90 ? sourceHeight : sourceWidth;
    const rotatedH = isRotated90 ? sourceWidth : sourceHeight;

    const orientCanvas = document.createElement('canvas');
    orientCanvas.width = rotatedW;
    orientCanvas.height = rotatedH;
    const orientCtx = orientCanvas.getContext('2d', { alpha: true });
    if (!orientCtx) throw new Error('Could not get 2D canvas context for orientation');

    orientCtx.imageSmoothingEnabled = true;
    orientCtx.imageSmoothingQuality = 'high';

    orientCtx.translate(rotatedW / 2, rotatedH / 2);
    if (state.rotation) {
      orientCtx.rotate((state.rotation * Math.PI) / 180);
    }
    const scaleX = state.flipH ? -1 : 1;
    const scaleY = state.flipV ? -1 : 1;
    orientCtx.scale(scaleX, scaleY);

    orientCtx.drawImage(img, -sourceWidth / 2, -sourceHeight / 2, sourceWidth, sourceHeight);

    // 3. STAGE 2: Calculate Crop Coordinates on the Rotated Buffer
    const cropAbs = getAbsoluteCropCoordinates(state.crop, rotatedW, rotatedH);

    // 4. STAGE 3: Calculate Target Resize Dimensions
    const { targetWidth, targetHeight } = calculateResizeOutputDimensions(
      cropAbs.width,
      cropAbs.height,
      state.resize
    );

    // If preview mode, scale down target canvas for instant UI performance
    let renderW = targetWidth;
    let renderH = targetHeight;
    if (options.isPreview && options.maxPreviewDimension) {
      const maxDim = options.maxPreviewDimension;
      if (renderW > maxDim || renderH > maxDim) {
        const scale = Math.min(maxDim / renderW, maxDim / renderH);
        renderW = Math.max(1, Math.round(renderW * scale));
        renderH = Math.max(1, Math.round(renderH * scale));
      }
    }

    // 5. STAGE 4: Render Cropped & Resized image onto Output Canvas with Adjustments
    const outCanvas = document.createElement('canvas');
    outCanvas.width = renderW;
    outCanvas.height = renderH;
    const outCtx = outCanvas.getContext('2d', { alpha: true });
    if (!outCtx) throw new Error('Could not get 2D canvas context for output');

    outCtx.imageSmoothingEnabled = true;
    outCtx.imageSmoothingQuality = 'high';

    // Handle background fill if JPEG or custom background specified
    const mimeType = state.format === 'png' 
      ? 'image/png' 
      : state.format === 'webp' 
        ? 'image/webp' 
        : state.format === 'avif'
          ? 'image/avif'
          : 'image/jpeg';
    if (mimeType === 'image/jpeg' || options.backgroundColor) {
      outCtx.fillStyle = options.backgroundColor || '#FFFFFF';
      outCtx.fillRect(0, 0, renderW, renderH);
    }

    // Color Filters
    const filterString = buildFilterString(state.adjustments);
    if (filterString) {
      outCtx.filter = filterString;
    }

    // Draw cropped region from oriented canvas scaled onto output canvas
    outCtx.drawImage(
      orientCanvas,
      cropAbs.x,
      cropAbs.y,
      cropAbs.width,
      cropAbs.height,
      0,
      0,
      renderW,
      renderH
    );

    // Clean intermediate orientation canvas buffer
    orientCanvas.width = 0;
    orientCanvas.height = 0;

    // Reset filter for convolution sharpening
    outCtx.filter = 'none';

    // Apply Sharpness
    if (state.adjustments.sharpness > 0) {
      applySharpenToCanvas(outCtx, renderW, renderH, state.adjustments.sharpness);
    }

    // 6. STAGE 5: Encode or Compress
    let finalBlob: Blob;
    let compResult: CompressionResult | undefined;

    // If exact target KB is requested AND not preview mode, connect directly to Round 1 Exact KB Engine!
    if (state.targetSizeKB && state.targetSizeKB > 0 && !options.isPreview) {
      // Export base full-quality blob first to feed the Round 1 compression engine
      const baseBlob = await new Promise<Blob>((resolve, reject) => {
        outCanvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Canvas export failed'))),
          mimeType,
          0.95
        );
      });

      compResult = await compressToExactKB(baseBlob, {
        targetSizeKB: state.targetSizeKB,
        format: state.format,
        maintainAspectRatio: state.resize.maintainAspectRatio,
        signal: options.signal,
        requestId: options.requestId,
      });

      finalBlob = compResult.blob;
      renderW = compResult.width;
      renderH = compResult.height;
    } else {
      // Standard Quality Export
      const exportQuality = Math.min(1.0, Math.max(0.1, state.quality || 0.85));
      finalBlob = await new Promise<Blob>((resolve, reject) => {
        outCanvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Canvas export failed'))),
          mimeType,
          exportQuality
        );
      });
    }

    // Free output canvas memory
    outCanvas.width = 0;
    outCanvas.height = 0;

    const url = URL.createObjectURL(finalBlob);
    const processingTimeMs = Math.round(performance.now() - startTime);

    return {
      blob: finalBlob,
      url,
      width: renderW,
      height: renderH,
      size: finalBlob.size,
      format: mimeType,
      compressionResult: compResult,
      processingTimeMs,
      requestId: options.requestId,
    };
  } finally {
    cleanupImg();
  }
}
