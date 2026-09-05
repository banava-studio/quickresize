/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  BatchItem, 
  BatchItemStatus, 
  BatchProcessingOptions, 
  BatchSummary, 
  OutputFormat 
} from './batchTypes';
import { processImagePipeline } from '../image/imagePipeline';
import { compressToExactKB, detectTransparency } from '../compression/compressionEngine';
import { createThumbnailDataUrl } from './thumbnailGenerator';
import { getUniqueFilename } from '../../utils/zipExport';
import { TransformState } from '../../types';
import { checkAvifEncodingSupport } from '../../utils/avifDetector';
import { getDeviceSafetyLimits } from '../image/deviceSafety';

export type BatchChangeListener = (items: BatchItem[], summary: BatchSummary) => void;

/**
 * PRODUCTION-GRADE REUSABLE BATCH PROCESSING ENGINE
 * 
 * Manages queue lifecycle, controlled concurrency (2-3 parallel jobs),
 * per-item cancellation tokens, memory safety, and comprehensive metrics.
 */
export class BatchProcessor {
  private items: BatchItem[] = [];
  private options: BatchProcessingOptions;
  private listeners: Set<BatchChangeListener> = new Set();
  private isRunning = false;
  private currentSessionId = 0;
  private activeWorkers = 0;
  private globalAbortController: AbortController | null = null;
  private existingExportFilenames = new Set<string>();

  constructor(initialOptions?: Partial<BatchProcessingOptions>) {
    this.options = {
      operation: 'convert',
      format: 'webp',
      quality: 0.85,
      concurrency: 2,
      ...initialOptions,
    };
  }

  public subscribe(listener: BatchChangeListener): () => void {
    this.listeners.add(listener);
    // Trigger initial notification
    listener(this.getItems(), this.getSummary());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const currentItems = this.getItems();
    const currentSummary = this.getSummary();
    this.listeners.forEach((listener) => listener(currentItems, currentSummary));
  }

  public getItems(): BatchItem[] {
    return [...this.items];
  }

  public getOptions(): BatchProcessingOptions {
    return { ...this.options };
  }

  public setOptions(newOptions: Partial<BatchProcessingOptions>): void {
    this.options = {
      ...this.options,
      ...newOptions,
    };
  }

  /**
   * Add raw files to the processing queue
   */
  public async addFiles(newFiles: File[]): Promise<void> {
    const newItems: BatchItem[] = [];

    for (const file of newFiles) {
      const id = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const inputFormat = (file.type.split('/')[1] || 'img').toUpperCase();

      // Read dimensions quickly
      let width = 0;
      let height = 0;
      let thumbnailUrl = '';

      try {
        thumbnailUrl = await createThumbnailDataUrl(file, 140);
        
        // Fast probe dimensions using createImageBitmap if available
        if (typeof createImageBitmap === 'function') {
          const bmp = await createImageBitmap(file);
          width = bmp.width;
          height = bmp.height;
          bmp.close();
        } else {
          const url = URL.createObjectURL(file);
          const probeImg = new Image();
          await new Promise<void>((res) => {
            probeImg.onload = () => {
              width = probeImg.naturalWidth || probeImg.width;
              height = probeImg.naturalHeight || probeImg.height;
              res();
            };
            probeImg.onerror = () => res();
            probeImg.src = url;
          });
          URL.revokeObjectURL(url);
        }
      } catch (err) {
        console.warn('Metadata probe warning for', file.name, err);
      }

      newItems.push({
        id,
        file,
        filename: file.name,
        originalSize: file.size,
        originalWidth: width || 800,
        originalHeight: height || 600,
        inputFormat,
        thumbnailUrl,
        status: 'WAITING',
      });
    }

    this.items = [...this.items, ...newItems];
    this.notify();
  }

  /**
   * Remove an item from the queue and free its URLs
   */
  public removeItem(id: string): void {
    const item = this.items.find((i) => i.id === id);
    if (item) {
      if (item.abortController) {
        item.abortController.abort();
      }
      if (item.outputUrl) {
        URL.revokeObjectURL(item.outputUrl);
      }
    }
    this.items = this.items.filter((i) => i.id !== id);
    this.notify();
  }

  /**
   * Clear all completed items
   */
  public clearCompleted(): void {
    this.items.forEach((item) => {
      if (item.status === 'COMPLETED' && item.outputUrl) {
        URL.revokeObjectURL(item.outputUrl);
      }
    });
    this.items = this.items.filter((i) => i.status !== 'COMPLETED');
    this.existingExportFilenames.clear();
    this.notify();
  }

  /**
   * Clear all failed items
   */
  public clearFailed(): void {
    this.items = this.items.filter((i) => i.status !== 'FAILED');
    this.notify();
  }

  /**
   * Clear entire queue
   */
  public clearAll(): void {
    this.cancelAll();
    this.items.forEach((item) => {
      if (item.outputUrl) {
        URL.revokeObjectURL(item.outputUrl);
      }
    });
    this.items = [];
    this.existingExportFilenames.clear();
    this.notify();
  }

  /**
   * Cancel all currently waiting and processing items
   */
  public cancelAll(): void {
    if (this.globalAbortController) {
      this.globalAbortController.abort();
    }
    this.items.forEach((item) => {
      if (item.status === 'PROCESSING' || item.status === 'WAITING') {
        if (item.abortController) {
          item.abortController.abort();
        }
        item.status = 'CANCELLED';
      }
    });
    this.isRunning = false;
    this.activeWorkers = 0;
    this.notify();
  }

  /**
   * Cancel a specific item
   */
  public cancelItem(id: string): void {
    const item = this.items.find((i) => i.id === id);
    if (!item) return;

    if (item.status === 'PROCESSING' || item.status === 'WAITING') {
      if (item.abortController) {
        item.abortController.abort();
      }
      item.status = 'CANCELLED';
      this.notify();
    }
  }

  /**
   * Retry a single failed or cancelled item
   */
  public async retryItem(id: string): Promise<void> {
    const item = this.items.find((i) => i.id === id);
    if (!item) return;

    item.status = 'WAITING';
    item.errorMessage = undefined;
    if (item.outputUrl) {
      URL.revokeObjectURL(item.outputUrl);
      item.outputUrl = undefined;
      item.outputBlob = undefined;
    }
    this.notify();

    if (!this.isRunning) {
      this.start();
    }
  }

  /**
   * Retry all failed items
   */
  public retryAllFailed(): void {
    let hasFailed = false;
    this.items.forEach((item) => {
      if (item.status === 'FAILED' || item.status === 'CANCELLED') {
        item.status = 'WAITING';
        item.errorMessage = undefined;
        hasFailed = true;
      }
    });

    if (hasFailed) {
      this.notify();
      if (!this.isRunning) {
        this.start();
      }
    }
  }

  /**
   * Start or resume batch processing
   */
  public async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    this.currentSessionId++;
    const sessionId = this.currentSessionId;
    this.globalAbortController = new AbortController();

    const limits = getDeviceSafetyLimits();
    const maxConcurrency = Math.max(1, Math.min(limits.recommendedBatchConcurrency, this.options.concurrency || 2));
    this.notify();

    const processNext = async () => {
      if (!this.isRunning || sessionId !== this.currentSessionId) return;

      const nextItem = this.items.find((i) => i.status === 'WAITING');
      if (!nextItem) {
        if (this.activeWorkers === 0) {
          this.isRunning = false;
          this.notify();
        }
        return;
      }

      this.activeWorkers++;
      await this.processSingleItem(nextItem, sessionId);
      this.activeWorkers--;

      // Recurse for remaining queue
      if (this.isRunning && sessionId === this.currentSessionId) {
        processNext();
      }
    };

    // Spin up concurrent worker loops
    const workers = [];
    for (let i = 0; i < maxConcurrency; i++) {
      workers.push(processNext());
    }

    await Promise.all(workers);
  }

  /**
   * Execute single item transformation and encoding
   */
  private async processSingleItem(item: BatchItem, sessionId: number): Promise<void> {
    if (sessionId !== this.currentSessionId) return;

    const startTime = performance.now();
    const abortController = new AbortController();
    item.abortController = abortController;
    item.status = 'PROCESSING';
    this.notify();

    try {
      // 1. Resolve output format
      let format = this.options.format;
      if (format === 'original' || format === 'auto') {
        const ext = item.file.type.split('/')[1]?.toLowerCase() || 'jpeg';
        format = ext === 'png' ? 'png' : ext === 'webp' ? 'webp' : 'jpeg';
      }

      if (format === 'avif') {
        const isAvifSupported = await checkAvifEncodingSupport();
        if (!isAvifSupported) {
          throw new Error('AVIF export is not supported by this browser. Please select WebP or JPG.');
        }
      }

      // 2. Prepare pipeline transform state
      const transformState: TransformState = {
        rotation: this.options.rotation || 0,
        flipH: !!this.options.flipH,
        flipV: !!this.options.flipV,
        crop: this.options.crop || null,
        aspectRatio: 'free',
        zoom: 1.0,
        panX: 0,
        panY: 0,
        resize: {
          width: this.options.resize?.width || 0,
          height: this.options.resize?.height || 0,
          maintainAspectRatio: this.options.resize?.maintainAspectRatio ?? true,
          mode: this.options.resize?.mode || 'fit',
          percentage: this.options.resize?.percentage,
          maxDimension: this.options.resize?.maxDimension,
          maxDimensionType: this.options.resize?.maxDimensionType || 'none',
        },
        adjustments: this.options.adjustments || {
          brightness: 0,
          contrast: 0,
          saturation: 0,
          grayscale: false,
          sharpness: 0,
        },
        format: format as 'jpeg' | 'png' | 'webp' | 'avif',
        targetSizeKB: this.options.targetSizeKB,
        quality: this.options.quality || 0.85,
      };

      // 3. Execute Image Pipeline (single-pass in memory)
      const pipelineResult = await processImagePipeline(item.file, transformState, {
        signal: abortController.signal,
        backgroundColor: this.options.backgroundColor || '#FFFFFF',
      });

      if (sessionId !== this.currentSessionId || abortController.signal.aborted) {
        URL.revokeObjectURL(pipelineResult.url);
        item.status = 'CANCELLED';
        this.notify();
        return;
      }

      // 4. Calculate metrics
      const originalSize = item.originalSize;
      const outputSize = pipelineResult.size;
      const reduction = originalSize > 0 
        ? ((originalSize - outputSize) / originalSize) * 100 
        : 0;

      const isLarger = outputSize > originalSize;
      const totalTimeMs = Math.round(performance.now() - startTime);

      // 5. Generate clean, collision-free filename
      const targetExt = format === 'jpeg' ? 'jpg' : format;
      const suffix = this.options.filenameSuffix || (
        this.options.operation === 'compress' ? `_${Math.round(this.options.targetSizeKB || 100)}kb` :
        this.options.operation === 'resize' ? '_resized' :
        `_${targetExt}`
      );

      const uniqueOutputName = getUniqueFilename(
        item.filename,
        targetExt,
        suffix,
        this.existingExportFilenames
      );

      // 6. Update item state
      item.outputBlob = pipelineResult.blob;
      item.outputUrl = pipelineResult.url;
      item.outputSize = outputSize;
      item.outputWidth = pipelineResult.width;
      item.outputHeight = pipelineResult.height;
      item.outputFormat = pipelineResult.format;
      item.outputFilename = uniqueOutputName;
      item.reductionPercentage = Math.abs(parseFloat(reduction.toFixed(1)));
      item.isLarger = isLarger;
      item.processingTimeMs = totalTimeMs;
      item.status = 'COMPLETED';
    } catch (err: any) {
      if (err?.name === 'AbortError' || abortController.signal.aborted) {
        item.status = 'CANCELLED';
      } else {
        console.error(`Batch processing failed for file: ${item.filename}`, err);
        item.status = 'FAILED';
        item.errorMessage = err?.message || 'Processing failed';
      }
    } finally {
      item.abortController = undefined;
      this.notify();
    }
  }

  /**
   * Get calculated real-time summary statistics
   */
  public getSummary(): BatchSummary {
    let waiting = 0;
    let processing = 0;
    let completed = 0;
    let failed = 0;
    let cancelled = 0;

    let totalOriginalSize = 0;
    let totalOutputSize = 0;
    let totalProcessingTimeMs = 0;
    let totalReductions = 0;

    for (const item of this.items) {
      totalOriginalSize += item.originalSize;

      if (item.status === 'WAITING') waiting++;
      else if (item.status === 'PROCESSING') processing++;
      else if (item.status === 'COMPLETED') {
        completed++;
        if (item.outputSize) totalOutputSize += item.outputSize;
        if (item.processingTimeMs) totalProcessingTimeMs += item.processingTimeMs;
        if (item.reductionPercentage !== undefined) {
          totalReductions += item.isLarger ? -item.reductionPercentage : item.reductionPercentage;
        }
      } else if (item.status === 'FAILED') failed++;
      else if (item.status === 'CANCELLED') cancelled++;
    }

    const totalSavedBytes = Math.max(0, totalOriginalSize - totalOutputSize);
    const averageReductionPercentage = completed > 0
      ? parseFloat((totalReductions / completed).toFixed(1))
      : 0;

    return {
      total: this.items.length,
      waiting,
      processing,
      completed,
      failed,
      cancelled,
      totalOriginalSize,
      totalOutputSize,
      totalSavedBytes,
      averageReductionPercentage,
      totalProcessingTimeMs,
      isProcessing: this.isRunning || processing > 0,
    };
  }
}
