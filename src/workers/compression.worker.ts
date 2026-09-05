/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  WorkerInboundMessage,
  WorkerOutboundMessage,
  WorkerCompressionOptions,
  WorkerResultMeta,
  WorkerProgressStage,
} from './workerTypes';

// Helper to post messages from worker context cleanly
function postWorkerMessage(message: WorkerOutboundMessage, transfer?: Transferable[]): void {
  if (transfer && transfer.length > 0) {
    (self as any).postMessage(message, transfer);
  } else {
    (self as any).postMessage(message);
  }
}

// Track cancelled request IDs to stop long-running loops immediately
const cancelledRequestIds = new Set<string>();

/**
 * Apply 3x3 unsharp convolution mask for clean edge crispness inside worker
 */
function applySharpenFilter(
  ctx: OffscreenCanvasRenderingContext2D,
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
    // Canvas security or memory limitation - safely ignore
  }
}

/**
 * Detect alpha transparency on an ImageBitmap
 */
function detectTransparency(
  bitmap: ImageBitmap,
  sampleWidth = 128,
  sampleHeight = 128
): boolean {
  try {
    const canvas = new OffscreenCanvas(sampleWidth, sampleHeight);
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    ctx.drawImage(bitmap, 0, 0, sampleWidth, sampleHeight);
    const imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
    const data = imageData.data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 250) {
        canvas.width = 0;
        canvas.height = 0;
        return true;
      }
    }
    canvas.width = 0;
    canvas.height = 0;
  } catch (err) {
    // Fallback if context creation fails
  }
  return false;
}

/**
 * Render ImageBitmap to Blob using OffscreenCanvas
 */
async function renderCanvasToBlob(
  source: ImageBitmap,
  targetWidth: number,
  targetHeight: number,
  mimeType: string,
  quality: number,
  options: WorkerCompressionOptions,
  hasAlpha: boolean,
  requestId: string
): Promise<Blob> {
  if (cancelledRequestIds.has(requestId)) {
    throw new Error('Worker compression cancelled');
  }

  const isRotated90 = options.rotation === 90 || options.rotation === 270;
  const canvasWidth = isRotated90 ? targetHeight : targetWidth;
  const canvasHeight = isRotated90 ? targetWidth : targetHeight;

  const width = Math.max(1, Math.round(canvasWidth));
  const height = Math.max(1, Math.round(canvasHeight));

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('OffscreenCanvas 2D context unavailable in worker');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Handle background fill
  if (mimeType === 'image/jpeg' || (!hasAlpha && options.backgroundColor)) {
    ctx.fillStyle = options.backgroundColor || '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
  }

  // Filter adjustments
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
  if (filterParts.length > 0 && 'filter' in ctx) {
    try {
      (ctx as any).filter = filterParts.join(' ');
    } catch {
      // Ignore filter if unsupported in this worker context
    }
  }

  // Transforms
  ctx.translate(width / 2, height / 2);
  if (options.rotation) {
    ctx.rotate((options.rotation * Math.PI) / 180);
  }
  const scaleX = options.flipH ? -1 : 1;
  const scaleY = options.flipV ? -1 : 1;
  ctx.scale(scaleX, scaleY);

  ctx.drawImage(source, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (options.enhanceQuality) {
    applySharpenFilter(ctx, width, height, 0.2);
  }

  const blob = await canvas.convertToBlob({
    type: mimeType,
    quality: Math.min(1.0, Math.max(0.01, quality)),
  });

  // Free memory
  canvas.width = 0;
  canvas.height = 0;

  if (cancelledRequestIds.has(requestId)) {
    throw new Error('Worker compression cancelled');
  }

  return blob;
}

/**
 * Execute target size compression inside the worker
 */
async function processCompressionInWorker(
  requestId: string,
  imageBuffer: ArrayBuffer,
  mimeTypeInput: string,
  options: WorkerCompressionOptions
): Promise<{ resultBuffer: ArrayBuffer; meta: WorkerResultMeta }> {
  const startTime = performance.now();
  const targetBytes = Math.max(1024, Math.round(options.targetSizeKB * 1024));
  const originalSize = imageBuffer.byteLength;

  const notifyProgress = (stage: WorkerProgressStage, detail?: string, iteration?: number) => {
    const msg: WorkerOutboundMessage = {
      type: 'PROGRESS',
      id: requestId,
      stage,
      detail,
      iteration,
    };
    postWorkerMessage(msg);
  };

  notifyProgress('preparing', 'Decoding image in worker thread');

  // Decode ImageBitmap from ArrayBuffer
  const inputBlob = new Blob([imageBuffer], { type: mimeTypeInput || 'image/jpeg' });
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(inputBlob);
  } catch (err: any) {
    throw new Error(`Failed to decode image data in worker: ${err?.message || 'Unsupported image'}`);
  }

  try {
    if (cancelledRequestIds.has(requestId)) {
      throw new Error('Worker compression cancelled');
    }

    const origWidth = bitmap.width;
    const origHeight = bitmap.height;

    // Safety checks
    let safetyDownscaled = false;
    let safetyNotice: string | undefined;
    let baseWidth = origWidth;
    let baseHeight = origHeight;

    const maxSafeDimension = options.maxSafeDimension || 4096;
    const maxSafePixels = options.maxSafePixels || 16777216; // 16 MP

    if (origWidth > maxSafeDimension || origHeight > maxSafeDimension || (origWidth * origHeight > maxSafePixels)) {
      const safeScale = Math.min(
        maxSafeDimension / origWidth,
        maxSafeDimension / origHeight,
        Math.sqrt(maxSafePixels / (origWidth * origHeight))
      );
      baseWidth = Math.max(64, Math.round(origWidth * safeScale));
      baseHeight = Math.max(64, Math.round(origHeight * safeScale));
      safetyDownscaled = true;
      safetyNotice = `Large image (${origWidth}×${origHeight}) was safely pre-scaled to ${baseWidth}×${baseHeight} to maintain device memory stability.`;
    }

    // Alpha channel detection
    const hasTransparency = detectTransparency(bitmap);

    // Output format determination
    let chosenFormat = options.format || 'jpeg';
    if (chosenFormat === 'auto') {
      chosenFormat = hasTransparency ? 'webp' : 'jpeg';
    }

    let mimeType = 'image/jpeg';
    if (chosenFormat === 'png') mimeType = 'image/png';
    else if (chosenFormat === 'webp') mimeType = 'image/webp';
    else if (chosenFormat === 'avif') mimeType = 'image/avif';
    else mimeType = 'image/jpeg';

    // User custom dimensions
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
    baseWidth = Math.max(16, baseWidth);
    baseHeight = Math.max(16, baseHeight);

    let bestBlob: Blob | null = null;
    let bestQuality = 0.85;
    let bestScale = 1.0;
    let iterations = 0;

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
      const bpp = targetBytes / (baseWidth * baseHeight);
      minQualityFloor = bpp < 0.04 ? 0.50 : 0.35;
    }

    // Lossless PNG path
    if (mimeType === 'image/png') {
      notifyProgress('testing', 'Testing full resolution PNG');
      const fullBlob = await renderCanvasToBlob(bitmap, baseWidth, baseHeight, mimeType, 1.0, options, hasTransparency, requestId);
      iterations++;

      if (fullBlob.size <= targetBytes) {
        bestBlob = fullBlob;
        bestScale = 1.0;
      } else {
        notifyProgress('optimizing', 'Optimizing dimensions for target size');
        let minScale = 0.05;
        let maxScale = 1.0;
        let scaleSteps = 0;

        while (scaleSteps < 9 && minScale <= maxScale) {
          if (cancelledRequestIds.has(requestId)) throw new Error('Worker compression cancelled');
          scaleSteps++;
          iterations++;

          const midScale = (minScale + maxScale) / 2;
          const curW = Math.max(16, Math.round(baseWidth * midScale));
          const curH = Math.max(16, Math.round(baseHeight * midScale));

          const testBlob = await renderCanvasToBlob(bitmap, curW, curH, mimeType, 1.0, options, hasTransparency, requestId);
          if (testBlob.size <= targetBytes) {
            bestBlob = testBlob;
            bestScale = midScale;
            minScale = midScale + 0.02;
          } else {
            maxScale = midScale - 0.02;
          }
        }

        if (!bestBlob) {
          const tinyW = Math.max(16, Math.round(baseWidth * 0.1));
          const tinyH = Math.max(16, Math.round(baseHeight * 0.1));
          bestBlob = await renderCanvasToBlob(bitmap, tinyW, tinyH, mimeType, 1.0, options, hasTransparency, requestId);
          bestScale = 0.1;
        }
      }
    } else {
      // Lossy JPEG / WebP / AVIF path
      notifyProgress('testing', 'Testing quality iterations');
      let currentScale = 1.0;
      let foundAcceptable = false;

      let lowQ = minQualityFloor;
      let highQ = maxQualityCeil;
      let qCandidate: { blob: Blob; q: number; s: number } | null = null;

      for (let step = 0; step < 7; step++) {
        if (cancelledRequestIds.has(requestId)) throw new Error('Worker compression cancelled');

        iterations++;
        const midQ = (lowQ + highQ) / 2;
        const curW = Math.max(16, Math.round(baseWidth * currentScale));
        const curH = Math.max(16, Math.round(baseHeight * currentScale));

        const testBlob = await renderCanvasToBlob(bitmap, curW, curH, mimeType, midQ, options, hasTransparency, requestId);

        if (testBlob.size <= targetBytes) {
          if (!qCandidate || testBlob.size > qCandidate.blob.size) {
            qCandidate = { blob: testBlob, q: midQ, s: currentScale };
          }
          if (testBlob.size >= targetBytes * 0.97) {
            foundAcceptable = true;
            break;
          }
          lowQ = midQ;
        } else {
          highQ = midQ;
        }
      }

      if (qCandidate && qCandidate.blob.size <= targetBytes && qCandidate.q >= minQualityFloor) {
        bestBlob = qCandidate.blob;
        bestQuality = qCandidate.q;
        bestScale = qCandidate.s;
        foundAcceptable = true;
      }

      // Phase 2: Adaptive dimension scaling if quality drop alone cannot meet target
      if (!foundAcceptable) {
        notifyProgress('optimizing', 'Adjusting dimensions to reach target size');
        let minScale = 0.08;
        let maxScale = 0.95;
        let scaleCandidate: { blob: Blob; q: number; s: number } | null = qCandidate;

        for (let scaleStep = 0; scaleStep < 6; scaleStep++) {
          if (cancelledRequestIds.has(requestId)) throw new Error('Worker compression cancelled');

          const midScale = (minScale + maxScale) / 2;
          const curW = Math.max(16, Math.round(baseWidth * midScale));
          const curH = Math.max(16, Math.round(baseHeight * midScale));

          let subLowQ = Math.max(0.40, minQualityFloor);
          let subHighQ = maxQualityCeil;
          let subBestBlob: Blob | null = null;
          let subBestQ = 0.75;

          for (let subStep = 0; subStep < 4; subStep++) {
            iterations++;
            const testQ = (subLowQ + subHighQ) / 2;
            const testBlob = await renderCanvasToBlob(bitmap, curW, curH, mimeType, testQ, options, hasTransparency, requestId);

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
            minScale = midScale + 0.05;
          } else {
            maxScale = midScale - 0.05;
          }
        }

        if (scaleCandidate) {
          bestBlob = scaleCandidate.blob;
          bestQuality = scaleCandidate.q;
          bestScale = scaleCandidate.s;
        }
      }

      if (!bestBlob) {
        const fallScale = 0.15;
        const curW = Math.max(16, Math.round(baseWidth * fallScale));
        const curH = Math.max(16, Math.round(baseHeight * fallScale));
        bestBlob = await renderCanvasToBlob(bitmap, curW, curH, mimeType, 0.25, options, hasTransparency, requestId);
        bestQuality = 0.25;
        bestScale = fallScale;
      }
    }

    notifyProgress('finalizing', 'Finalizing output buffer');

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

    let targetStatus: 'achieved' | 'close' | 'failed' = 'failed';
    let statusMessage = '';
    let suggestion: string | undefined;

    if (compressedSize <= targetBytes) {
      targetStatus = 'achieved';
      statusMessage = '✓ Target achieved';
    } else if (compressedSize <= targetBytes * 1.08) {
      targetStatus = 'close';
      statusMessage = '≈ Near target';
      suggestion = 'Compressed to within 8% of target. To reach strict limit, try reducing dimensions or selecting Smallest mode.';
    } else {
      targetStatus = 'failed';
      statusMessage = '! Target could not be reached without severe quality loss.';
      if (chosenFormat === 'png') {
        suggestion = 'PNG uses lossless compression and cannot reach small targets. Try switching to JPEG or WebP.';
      } else {
        suggestion = 'The requested target size is very small for this image. Try reducing dimensions or increasing target.';
      }
    }

    const withinTarget = targetStatus === 'achieved';
    const resultBuffer = await bestBlob.arrayBuffer();

    const meta: WorkerResultMeta = {
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
      savedBytes,
      reductionPercentage,
      processingTimeMs,
      requestId,
    };

    return { resultBuffer, meta };
  } finally {
    bitmap.close();
  }
}

// Inbound message listener
self.addEventListener('message', async (event: MessageEvent<WorkerInboundMessage>) => {
  const data = event.data;
  if (!data) return;

  if (data.type === 'PING') {
    const pong: WorkerOutboundMessage = { type: 'PONG', id: data.id };
    postWorkerMessage(pong);
    return;
  }

  if (data.type === 'CANCEL') {
    cancelledRequestIds.add(data.id);
    return;
  }

  if (data.type === 'COMPRESS') {
    const { id, imageBuffer, mimeType, options } = data;
    cancelledRequestIds.delete(id);

    try {
      if (typeof OffscreenCanvas === 'undefined') {
        throw new Error('OffscreenCanvas is not supported in this worker environment');
      }

      const { resultBuffer, meta } = await processCompressionInWorker(id, imageBuffer, mimeType, options);

      if (cancelledRequestIds.has(id)) {
        cancelledRequestIds.delete(id);
        return;
      }

      const successMsg: WorkerOutboundMessage = {
        type: 'SUCCESS',
        id,
        resultBuffer,
        meta,
      };

      // Transfer ArrayBuffer back to main thread with zero copy
      postWorkerMessage(successMsg, [resultBuffer]);
    } catch (err: any) {
      if (cancelledRequestIds.has(id)) {
        cancelledRequestIds.delete(id);
        return;
      }

      const errMsg: WorkerOutboundMessage = {
        type: 'ERROR',
        id,
        error: err?.message || 'Worker processing failed',
        isMemoryError: err?.name === 'QuotaExceededError' || err?.message?.toLowerCase().includes('memory'),
      };
      postWorkerMessage(errMsg);
    } finally {
      cancelledRequestIds.delete(id);
    }
  }
});
