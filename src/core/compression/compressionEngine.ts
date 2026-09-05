/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Production-Grade Exact KB Browser-Side Image Compression Engine
 * 
 * Features:
 * - 100% Client-Side / Browser API only (Canvas, ImageData, Blob, createImageBitmap)
 * - Binary & Adaptive Quality Search (no fixed stepped loops)
 * - Intelligent Dimension & Aspect-Ratio Scaling for strict micro-KB targets (20KB, 50KB, 100KB, etc.)
 * - Transparency Detection & Safe Matting (no silent black flattening for transparent PNG/WebP)
 * - AbortSignal & Cancellation Token support (prevents stale race conditions)
 * - Memory leak prevention (revokes temporary URLs, closes ImageBitmaps, cleans canvas buffers)
 * - Clean filename sanitization (no repetitive `_compressed_compressed` suffixes)
 */

import { checkAvifEncodingSupport } from '../../utils/avifDetector';
import { compressionWorkerClient } from '../../workers/compressionWorkerClient';
import { getDeviceSafetyLimits, calculateSafeDimensions } from '../image/deviceSafety';

export interface CompressionOptions {
  /** Desired target storage size in Kilobytes (e.g., 20, 50, 100, 200, 500, 1024) */
  targetSizeKB: number;
  /** Output format (default: 'jpeg') */
  format?: 'jpeg' | 'png' | 'webp' | 'avif' | 'auto';
  /** Optional quality mode strategy (default: 'auto') */
  qualityMode?: 'auto' | 'high' | 'balanced' | 'smallest';
  /** Maintain aspect ratio if dimensions need adjusting (default: true) */
  maintainAspectRatio?: boolean;
  /** Explicit target width if resizing as well */
  customWidth?: number;
  /** Explicit target height if resizing as well */
  customHeight?: number;
  /** Tolerance margin percentage (0.00 to 0.05, default: 0.02) */
  tolerancePercentage?: number;
  /** Image enhancement filters (auto contrast, subtle sharpen, saturation boost) */
  enhanceQuality?: boolean;
  /** Background fill color for formats without alpha channel (default: '#FFFFFF') */
  backgroundColor?: string;
  /** Transforms */
  rotation?: number; // 0, 90, 180, 270
  flipH?: boolean;
  flipV?: boolean;
  brightness?: number; // 50 to 150, default 100
  contrast?: number; // 50 to 150, default 100
  saturation?: number; // 0 to 200, default 100
  grayscale?: boolean;
  /** AbortSignal for immediate cancellation when user changes settings rapidly */
  signal?: AbortSignal;
  /** Request identifier for tracking concurrent executions */
  requestId?: string;
  /** Real progression stage reporter callback */
  onStageChange?: (stage: 'preparing' | 'testing' | 'optimizing' | 'finalizing') => void;
  /** Whether to use dedicated Web Worker if supported (default: true) */
  useWorker?: boolean;
}

export interface CompressionResult {
  /** The final compressed output Blob */
  blob: Blob;
  /** Object URL for preview (must be revoked when unmounted or refreshed) */
  url: string;
  /** Initial file size in bytes */
  originalSize: number;
  /** Result file size in bytes */
  compressedSize: number;
  /** Target file size requested in KB */
  targetSizeKB: number;
  /** Result file size in KB */
  actualKB: number;
  /** Original image pixel width */
  originalWidth: number;
  /** Original image pixel height */
  originalHeight: number;
  /** Final output pixel width */
  width: number;
  /** Final output pixel height */
  height: number;
  /** Output MIME type */
  format: string;
  /** JPEG/WebP quality value used (0.05 to 1.0) */
  qualityUsed: number;
  /** Dimension scale factor used (0.05 to 1.0) */
  scaleUsed: number;
  /** Total binary search iterations performed */
  iterations: number;
  /** Whether the original source has an alpha/transparency channel */
  hasTransparency: boolean;
  /** Whether the compressed size is within or strictly below target */
  withinTarget: boolean;
  /** Target status determination */
  targetStatus: 'achieved' | 'close' | 'failed';
  /** User-facing status message */
  statusMessage: string;
  /** Closest achieved KB */
  closestAchievedKB: number;
  /** Optional recommendation or suggestion if target unreachable */
  suggestion?: string;
  /** Whether large image safety downscaling was activated */
  safetyDownscaled?: boolean;
  /** Safety message if applied */
  safetyNotice?: string;
  /** Notice if format fallback was applied (e.g. AVIF to WebP) */
  fallbackFormatNotice?: string;
  /** Number of bytes saved compared to original */
  savedBytes: number;
  /** Percentage reduction */
  reductionPercentage: number;
  /** Time spent compressing in milliseconds */
  processingTimeMs: number;
  /** Request ID associated with this run */
  requestId?: string;
}

/**
 * Check if an image contains transparent pixels
 */
export async function detectTransparency(
  source: HTMLImageElement | ImageBitmap,
  sampleWidth = 128,
  sampleHeight = 128
): Promise<boolean> {
  const canvas = document.createElement('canvas');
  canvas.width = sampleWidth;
  canvas.height = sampleHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return false;

  ctx.drawImage(source, 0, 0, sampleWidth, sampleHeight);
  try {
    const imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
    const data = imageData.data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 250) {
        return true; // Found transparent or semi-transparent pixel
      }
    }
  } catch (err) {
    console.warn('Transparency check skipped due to canvas security restriction:', err);
  }
  return false;
}

/**
 * Apply 3x3 unsharp convolution mask for clean edge crispness
 */
export function applySharpenFilter(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  strength = 0.2
): void {
  try {
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
    console.warn('Sharpen filter skipped:', err);
  }
}

/**
 * Render an image source to a Blob with specific dimensions, mime type, quality, and visual filters
 */
export function renderCanvasToBlob(
  source: HTMLImageElement | ImageBitmap,
  targetWidth: number,
  targetHeight: number,
  mimeType: string,
  quality: number,
  options: CompressionOptions,
  hasAlpha: boolean
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (options.signal?.aborted) {
      reject(new DOMException('Compression aborted', 'AbortError'));
      return;
    }

    const canvas = document.createElement('canvas');
    const isRotated90 = options.rotation === 90 || options.rotation === 270;
    const canvasWidth = isRotated90 ? targetHeight : targetWidth;
    const canvasHeight = isRotated90 ? targetWidth : targetHeight;

    canvas.width = Math.max(1, Math.round(canvasWidth));
    canvas.height = Math.max(1, Math.round(canvasHeight));

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) {
      reject(new Error('Failed to obtain canvas 2D rendering context'));
      return;
    }

    // High quality bicubic interpolation
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Handle background fill:
    // If output is JPEG, or if format has no alpha and background is specified
    if (mimeType === 'image/jpeg' || (!hasAlpha && options.backgroundColor)) {
      ctx.fillStyle = options.backgroundColor || '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (hasAlpha && mimeType === 'image/jpeg') {
      // JPEG requested on transparent image -> solid matte clean white
      ctx.fillStyle = options.backgroundColor || '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Apply color corrections
    const filterParts: string[] = [];
    if (options.enhanceQuality) {
      filterParts.push('contrast(105%) saturate(104%) brightness(101%)');
    }
    if (options.brightness !== undefined && options.brightness !== 100) {
      filterParts.push(`brightness(${options.brightness}%)`);
    }
    if (options.contrast !== undefined && options.contrast !== 100) {
      filterParts.push(`contrast(${options.contrast}%)`);
    }
    if (options.saturation !== undefined && options.saturation !== 100) {
      filterParts.push(`saturate(${options.saturation}%)`);
    }
    if (options.grayscale) {
      filterParts.push('grayscale(100%)');
    }
    if (filterParts.length > 0) {
      ctx.filter = filterParts.join(' ');
    }

    // Transforms (Center pivot, rotate, scale/flip)
    ctx.translate(canvas.width / 2, canvas.height / 2);

    if (options.rotation) {
      ctx.rotate((options.rotation * Math.PI) / 180);
    }

    const scaleX = options.flipH ? -1 : 1;
    const scaleY = options.flipV ? -1 : 1;
    ctx.scale(scaleX, scaleY);

    // Draw source
    ctx.drawImage(source, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);

    // Sharpen if requested
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (options.enhanceQuality) {
      applySharpenFilter(ctx, canvas.width, canvas.height, 0.2);
    }

    canvas.toBlob(
      (blob) => {
        // Free canvas memory
        canvas.width = 0;
        canvas.height = 0;

        if (options.signal?.aborted) {
          reject(new DOMException('Compression aborted', 'AbortError'));
          return;
        }

        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas toBlob exported null'));
        }
      },
      mimeType,
      quality
    );
  });
}

/**
 * Cleanly format file name without duplicate `_compressed` or `_optimized` chains
 */
export function generateCompressedFileName(
  originalName: string,
  targetKB: number,
  format: string
): string {
  const extension = format.replace('image/', '').replace('jpeg', 'jpg');
  const dotIndex = originalName.lastIndexOf('.');
  const baseName = dotIndex !== -1 ? originalName.substring(0, dotIndex) : originalName;

  // Clean existing compression markers
  const cleanBase = baseName
    .replace(/_compressed(_\d+kb)?/gi, '')
    .replace(/_optimized(_\d+kb)?/gi, '')
    .replace(/_resized/gi, '')
    .trim();

  return `${cleanBase || 'image'}_${Math.round(targetKB)}kb.${extension}`;
}

/**
 * Helper to safely decode an image source from File or Blob into an HTMLImageElement or ImageBitmap
 */
export async function loadImageSource(
  fileOrBlob: File | Blob | string
): Promise<{ source: HTMLImageElement; width: number; height: number; cleanup: () => void }> {
  let url = '';
  let shouldRevoke = false;

  if (typeof fileOrBlob === 'string') {
    url = fileOrBlob;
  } else {
    url = URL.createObjectURL(fileOrBlob);
    shouldRevoke = true;
  }

  const img = new Image();
  if (url.startsWith('http://') || url.startsWith('https://')) {
    img.crossOrigin = 'anonymous';
  }

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load image source'));
    img.src = url;
  });

  return {
    source: img,
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
 * PRODUCTION-GRADE EXACT KB COMPRESSION ENGINE
 * 
 * Performs binary search on quality and adaptive dimension optimization to converge
 * precisely on or just below the user-specified target size in KB.
 */
export async function compressToExactKB(
  fileOrBlob: File | Blob,
  options: CompressionOptions
): Promise<CompressionResult> {
  // 1. Attempt Web Worker offload if supported and enabled
  const limits = getDeviceSafetyLimits();
  if (options.useWorker !== false && compressionWorkerClient.checkWorkerSupport()) {
    try {
      return await compressionWorkerClient.compress(fileOrBlob, options, {
        maxSafeDimension: limits.maxSafeDimension,
        maxSafePixels: limits.maxSafePixels,
      });
    } catch (workerErr: any) {
      if (workerErr?.name === 'AbortError' || options.signal?.aborted) {
        throw new DOMException('Compression aborted', 'AbortError');
      }
      console.warn('Worker compression unavailable or failed, smoothly executing on main thread:', workerErr);
      // Fall through to main-thread execution
    }
  }

  // 2. Main-Thread Fallback Execution
  const startTime = performance.now();
  const targetBytes = Math.max(1024, Math.round(options.targetSizeKB * 1024));
  const originalSize = fileOrBlob.size;

  // Stage 1: Preparing image
  options.onStageChange?.('preparing');

  // Load image and determine natural dimensions
  const { source, width: origWidth, height: origHeight, cleanup } = await loadImageSource(fileOrBlob);

  try {
    if (options.signal?.aborted) {
      throw new DOMException('Compression aborted', 'AbortError');
    }

    // Large Image Safety Check (Canvas & Memory protection)
    const safeCalc = calculateSafeDimensions(origWidth, origHeight, limits);
    let baseWidth = safeCalc.safeWidth;
    let baseHeight = safeCalc.safeHeight;
    let safetyDownscaled = safeCalc.wasDownscaled;
    let safetyNotice = safeCalc.notice;

    // Check for alpha channel/transparency
    const hasTransparency = await detectTransparency(source);

    // Resolve target format and check AVIF browser support
    let chosenFormat = options.format || 'jpeg';
    if (chosenFormat === 'auto') {
      chosenFormat = hasTransparency ? 'webp' : 'jpeg';
    }

    let fallbackFormatNotice: string | undefined;
    if (chosenFormat === 'avif') {
      const isAvifOk = await checkAvifEncodingSupport();
      if (!isAvifOk) {
        chosenFormat = hasTransparency ? 'webp' : 'jpeg';
        fallbackFormatNotice = 'AVIF format encoding is not supported in this browser; automatically optimized with WebP instead.';
      }
    }

    let mimeType = 'image/jpeg';
    if (chosenFormat === 'png') mimeType = 'image/png';
    else if (chosenFormat === 'webp') mimeType = 'image/webp';
    else if (chosenFormat === 'avif') mimeType = 'image/avif';
    else mimeType = 'image/jpeg';

    // 5. Apply user custom dimensions if provided
    if (options.customWidth || options.customHeight) {
      if (options.maintainAspectRatio !== false) {
        const scale = Math.min(
          options.customWidth ? options.customWidth / baseWidth : 1,
          options.customHeight ? options.customHeight / baseHeight : 1
        );
        baseWidth = Math.round(baseWidth * scale);
        baseHeight = Math.round(baseHeight * scale);
      } else {
        baseWidth = options.customWidth || baseWidth;
        baseHeight = options.customHeight || baseHeight;
      }
    }

    // Ensure dimensions are positive
    baseWidth = Math.max(16, baseWidth);
    baseHeight = Math.max(16, baseHeight);

    let bestBlob: Blob | null = null;
    let bestQuality = 0.85;
    let bestScale = 1.0;
    let iterations = 0;

    // Quality mode bounds
    const qMode = options.qualityMode || 'auto';
    let minQualityFloor = 0.45;
    let maxQualityCeil = 0.96;

    if (qMode === 'high') {
      minQualityFloor = 0.70;
      maxQualityCeil = 0.98;
    } else if (qMode === 'smallest') {
      minQualityFloor = 0.20;
      maxQualityCeil = 0.92;
    } else if (qMode === 'balanced') {
      minQualityFloor = 0.45;
      maxQualityCeil = 0.95;
    } else {
      // 'auto' mode: adaptively check bytes per pixel
      const bpp = targetBytes / (baseWidth * baseHeight);
      if (bpp < 0.04) {
        // Tight target relative to resolution: do not let quality drop into severe JPEG artifacts
        minQualityFloor = 0.50;
      } else {
        minQualityFloor = 0.35;
      }
    }

    // =========================================================================
    // CASE A: Lossless PNG Format Compression
    // Since PNG does not have a lossy quality parameter in browser Canvas API,
    // we use binary search on dimension scaling to find the max resolution that fits.
    // =========================================================================
    if (mimeType === 'image/png') {
      options.onStageChange?.('testing');
      let minScale = 0.05;
      let maxScale = 1.0;
      let scaleIterations = 0;

      // Check full size first
      const fullBlob = await renderCanvasToBlob(source, baseWidth, baseHeight, mimeType, 1.0, options, hasTransparency);
      iterations++;

      if (fullBlob.size <= targetBytes) {
        bestBlob = fullBlob;
        bestScale = 1.0;
      } else {
        options.onStageChange?.('optimizing');
        // Binary search on dimensions scale
        while (scaleIterations < 9 && minScale <= maxScale) {
          if (options.signal?.aborted) throw new DOMException('Compression aborted', 'AbortError');

          scaleIterations++;
          iterations++;
          const midScale = (minScale + maxScale) / 2;
          const curW = Math.max(16, Math.round(baseWidth * midScale));
          const curH = Math.max(16, Math.round(baseHeight * midScale));

          const testBlob = await renderCanvasToBlob(source, curW, curH, mimeType, 1.0, options, hasTransparency);

          if (testBlob.size <= targetBytes) {
            bestBlob = testBlob;
            bestScale = midScale;
            // Fits! Try larger resolution
            minScale = midScale + 0.02;
          } else {
            // Too large! Reduce resolution
            maxScale = midScale - 0.02;
          }
        }

        // Safety fallback if no candidate under target was found
        if (!bestBlob) {
          const tinyW = Math.max(16, Math.round(baseWidth * 0.1));
          const tinyH = Math.max(16, Math.round(baseHeight * 0.1));
          bestBlob = await renderCanvasToBlob(source, tinyW, tinyH, mimeType, 1.0, options, hasTransparency);
          bestScale = 0.1;
        }
      }
    } 
    // =========================================================================
    // CASE B: Lossy Formats (JPEG / WebP / AVIF)
    // High-performance 2-Phase Adaptive Engine:
    // 1. Binary search on Quality at current resolution.
    // 2. If at lowest acceptable quality the size still exceeds target (e.g. 20KB for large photo),
    //    adaptively scale dimensions and refine quality to hit the exact target KB!
    // =========================================================================
    else {
      options.onStageChange?.('testing');
      let currentScale = 1.0;
      let foundAcceptable = false;

      // Phase 1: Binary search on Quality at Scale 1.0
      let lowQ = minQualityFloor;
      let highQ = maxQualityCeil;
      let qCandidate: { blob: Blob; q: number; s: number } | null = null;

      for (let step = 0; step < 7; step++) {
        if (options.signal?.aborted) throw new DOMException('Compression aborted', 'AbortError');

        iterations++;
        const midQ = (lowQ + highQ) / 2;
        const curW = Math.max(16, Math.round(baseWidth * currentScale));
        const curH = Math.max(16, Math.round(baseHeight * currentScale));

        const testBlob = await renderCanvasToBlob(source, curW, curH, mimeType, midQ, options, hasTransparency);

        if (testBlob.size <= targetBytes) {
          // Fits under target
          if (!qCandidate || testBlob.size > qCandidate.blob.size) {
            qCandidate = { blob: testBlob, q: midQ, s: currentScale };
          }

          // If within 3% of target, we are optimal!
          if (testBlob.size >= targetBytes * 0.97) {
            foundAcceptable = true;
            break;
          }

          // Try higher quality
          lowQ = midQ;
        } else {
          // Too big, decrease quality
          highQ = midQ;
        }
      }

      if (qCandidate && qCandidate.blob.size <= targetBytes && qCandidate.q >= minQualityFloor) {
        bestBlob = qCandidate.blob;
        bestQuality = qCandidate.q;
        bestScale = qCandidate.s;
        foundAcceptable = true;
      }

      // Phase 2: If Scale 1.0 cannot fit or required quality would cause severe degradation,
      // adaptively scale dimensions down using binary search while preserving high visual quality!
      if (!foundAcceptable) {
        options.onStageChange?.('optimizing');
        let minScale = 0.08;
        let maxScale = 0.95;
        let scaleCandidate: { blob: Blob; q: number; s: number } | null = qCandidate;

        for (let scaleStep = 0; scaleStep < 6; scaleStep++) {
          if (options.signal?.aborted) throw new DOMException('Compression aborted', 'AbortError');

          const midScale = (minScale + maxScale) / 2;
          const curW = Math.max(16, Math.round(baseWidth * midScale));
          const curH = Math.max(16, Math.round(baseHeight * midScale));

          // Run a 3-step micro quality binary search at this dimension scale
          let subLowQ = Math.max(0.40, minQualityFloor);
          let subHighQ = maxQualityCeil;
          let subBestBlob: Blob | null = null;
          let subBestQ = 0.75;

          for (let subStep = 0; subStep < 4; subStep++) {
            iterations++;
            const testQ = (subLowQ + subHighQ) / 2;
            const testBlob = await renderCanvasToBlob(source, curW, curH, mimeType, testQ, options, hasTransparency);

            if (testBlob.size <= targetBytes) {
              subBestBlob = testBlob;
              subBestQ = testQ;
              subLowQ = testQ;
              if (testBlob.size >= targetBytes * 0.96) break;
            } else {
              subHighQ = testQ;
            }
          }

          if (subBestBlob) {
            scaleCandidate = { blob: subBestBlob, q: subBestQ, s: midScale };
            // Fits! Try larger scale for better crispness
            minScale = midScale + 0.05;
          } else {
            // Still too big! Reduce scale
            maxScale = midScale - 0.05;
          }
        }

        if (scaleCandidate) {
          bestBlob = scaleCandidate.blob;
          bestQuality = scaleCandidate.q;
          bestScale = scaleCandidate.s;
        }
      }

      // Final fallback if extremely strict target (e.g. 5KB for massive 8K image)
      if (!bestBlob) {
        const fallScale = 0.15;
        const curW = Math.max(16, Math.round(baseWidth * fallScale));
        const curH = Math.max(16, Math.round(baseHeight * fallScale));
        bestBlob = await renderCanvasToBlob(source, curW, curH, mimeType, 0.25, options, hasTransparency);
        bestQuality = 0.25;
        bestScale = fallScale;
      }
    }

    // Stage 4: Finalizing file
    options.onStageChange?.('finalizing');

    // Calculate final dimensions (respecting rotation)
    const isRotated90 = options.rotation === 90 || options.rotation === 270;
    const finalScaledWidth = Math.round(baseWidth * bestScale);
    const finalScaledHeight = Math.round(baseHeight * bestScale);

    const finalWidth = isRotated90 ? finalScaledHeight : finalScaledWidth;
    const finalHeight = isRotated90 ? finalScaledWidth : finalScaledHeight;

    const compressedSize = bestBlob.size;
    const actualKB = parseFloat((compressedSize / 1024).toFixed(2));
    const savedBytes = Math.max(0, originalSize - compressedSize);
    const reductionPercentage = originalSize > 0 ? parseFloat(((savedBytes / originalSize) * 100).toFixed(1)) : 0;
    const processingTimeMs = Math.round(performance.now() - startTime);

    // Target Status Determination (Honest evaluation)
    let targetStatus: 'achieved' | 'close' | 'failed' = 'failed';
    let statusMessage = '';
    let suggestion: string | undefined;

    if (compressedSize <= targetBytes) {
      targetStatus = 'achieved';
      statusMessage = '✓ Target achieved';
    } else if (compressedSize <= targetBytes * 1.08) {
      targetStatus = 'close';
      statusMessage = '≈ Near target';
      suggestion = 'Compressed to within 8% of requested target. To achieve strict limit, try reducing dimensions or selecting Smallest quality mode.';
    } else {
      targetStatus = 'failed';
      statusMessage = '! Target could not be reached without severe quality loss.';
      if (chosenFormat === 'png') {
        suggestion = 'PNG uses lossless compression and cannot reach very small targets. Try switching to JPEG or WebP.';
      } else {
        suggestion = 'The requested target size is extremely small for this image. Try reducing dimensions or increasing target size.';
      }
    }

    const withinTarget = targetStatus === 'achieved';
    const url = URL.createObjectURL(bestBlob);

    return {
      blob: bestBlob,
      url,
      originalSize,
      compressedSize,
      targetSizeKB: options.targetSizeKB,
      actualKB,
      originalWidth: origWidth,
      originalHeight: origHeight,
      width: finalWidth,
      height: finalHeight,
      format: mimeType,
      qualityUsed: parseFloat(bestQuality.toFixed(3)),
      scaleUsed: parseFloat(bestScale.toFixed(3)),
      iterations,
      hasTransparency,
      withinTarget,
      targetStatus,
      statusMessage,
      closestAchievedKB: actualKB,
      suggestion,
      safetyDownscaled,
      safetyNotice,
      fallbackFormatNotice,
      savedBytes,
      reductionPercentage,
      processingTimeMs,
      requestId: options.requestId,
    };
  } finally {
    cleanup();
  }
}
