/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  WorkerInboundMessage,
  WorkerOutboundMessage,
  WorkerProgressStage,
} from './workerTypes';
import { CompressionOptions, CompressionResult } from '../core/compression/compressionEngine';

interface PendingJob {
  resolve: (result: CompressionResult) => void;
  reject: (error: Error) => void;
  onStageChange?: (stage: 'preparing' | 'testing' | 'optimizing' | 'finalizing') => void;
  targetSizeKB: number;
  originalFileOrBlob: File | Blob;
}

class CompressionWorkerManager {
  private worker: Worker | null = null;
  private pendingJobs = new Map<string, PendingJob>();
  private isSupported: boolean | null = null;
  private workerCreationError = false;

  /**
   * Determine if Web Workers and OffscreenCanvas are supported in this browser
   */
  public checkWorkerSupport(): boolean {
    if (this.isSupported !== null) {
      return this.isSupported;
    }

    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      this.isSupported = false;
      return false;
    }

    // Check OffscreenCanvas support (required for canvas operations inside Worker)
    const hasOffscreenCanvas = typeof OffscreenCanvas !== 'undefined' && 
      typeof OffscreenCanvas.prototype.convertToBlob === 'function';

    this.isSupported = hasOffscreenCanvas && !this.workerCreationError;
    return this.isSupported;
  }

  /**
   * Get or instantiate the reusable Worker
   */
  private getWorker(): Worker | null {
    if (!this.checkWorkerSupport()) {
      return null;
    }

    if (this.worker) {
      return this.worker;
    }

    try {
      // Standard Vite URL constructor for web worker modules
      this.worker = new Worker(
        new URL('./compression.worker.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = (event: MessageEvent<WorkerOutboundMessage>) => {
        const data = event.data;
        if (!data) return;

        const job = this.pendingJobs.get(data.id);
        if (!job) return;

        if (data.type === 'PROGRESS') {
          // Map worker stage to UI stage
          const stageMap: Record<WorkerProgressStage, 'preparing' | 'testing' | 'optimizing' | 'finalizing'> = {
            preparing: 'preparing',
            decoding: 'preparing',
            testing: 'testing',
            optimizing: 'optimizing',
            finalizing: 'finalizing',
          };
          job.onStageChange?.(stageMap[data.stage] || 'testing');
        } else if (data.type === 'SUCCESS') {
          this.pendingJobs.delete(data.id);
          const meta = data.meta;
          const outputBlob = new Blob([data.resultBuffer], { type: meta.format });
          const url = URL.createObjectURL(outputBlob);

          const result: CompressionResult = {
            blob: outputBlob,
            url,
            originalSize: meta.originalSize,
            compressedSize: meta.compressedSize,
            targetSizeKB: meta.targetSizeKB,
            actualKB: meta.actualKB,
            originalWidth: meta.originalWidth,
            originalHeight: meta.originalHeight,
            width: meta.width,
            height: meta.height,
            format: meta.format,
            qualityUsed: meta.qualityUsed,
            scaleUsed: meta.scaleUsed,
            iterations: meta.iterations,
            hasTransparency: meta.hasTransparency,
            withinTarget: meta.withinTarget,
            targetStatus: meta.targetStatus,
            statusMessage: meta.statusMessage,
            closestAchievedKB: meta.closestAchievedKB,
            suggestion: meta.suggestion,
            safetyDownscaled: meta.safetyDownscaled,
            safetyNotice: meta.safetyNotice,
            fallbackFormatNotice: meta.fallbackFormatNotice,
            savedBytes: meta.savedBytes,
            reductionPercentage: meta.reductionPercentage,
            processingTimeMs: meta.processingTimeMs,
            requestId: meta.requestId,
          };

          job.resolve(result);
        } else if (data.type === 'ERROR') {
          this.pendingJobs.delete(data.id);
          job.reject(new Error(data.error));
        }
      };

      this.worker.onerror = (err) => {
        console.warn('Compression worker runtime error, resetting worker:', err);
        this.terminateWorker();
        // Reject all pending jobs so they can fallback
        this.pendingJobs.forEach((job) => {
          job.reject(new Error('Worker encountered unexpected termination'));
        });
        this.pendingJobs.clear();
      };

      return this.worker;
    } catch (err) {
      console.warn('Failed to initialize Web Worker for compression, using main-thread fallback:', err);
      this.workerCreationError = true;
      this.isSupported = false;
      return null;
    }
  }

  /**
   * Execute compression in the worker thread with automatic cancellation and transferable buffer
   */
  public async compress(
    fileOrBlob: File | Blob,
    options: CompressionOptions,
    deviceLimits?: { maxSafeDimension: number; maxSafePixels: number }
  ): Promise<CompressionResult> {
    const worker = this.getWorker();
    if (!worker) {
      throw new Error('Web Worker not available');
    }

    const requestId = options.requestId || `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    if (options.signal?.aborted) {
      throw new DOMException('Compression aborted', 'AbortError');
    }

    // Read ArrayBuffer slice to transfer ownership to worker without blocking UI
    const arrayBuffer = await fileOrBlob.arrayBuffer();

    if (options.signal?.aborted) {
      throw new DOMException('Compression aborted', 'AbortError');
    }

    return new Promise<CompressionResult>((resolve, reject) => {
      const cleanupAbortListener = () => {
        if (options.signal) {
          options.signal.removeEventListener('abort', handleAbort);
        }
      };

      const handleAbort = () => {
        if (this.worker) {
          const cancelMsg: WorkerInboundMessage = {
            type: 'CANCEL',
            id: requestId,
          };
          this.worker.postMessage(cancelMsg);
        }
        this.pendingJobs.delete(requestId);
        cleanupAbortListener();
        reject(new DOMException('Compression aborted', 'AbortError'));
      };

      if (options.signal) {
        options.signal.addEventListener('abort', handleAbort);
      }

      this.pendingJobs.set(requestId, {
        resolve: (res) => {
          cleanupAbortListener();
          resolve(res);
        },
        reject: (err) => {
          cleanupAbortListener();
          reject(err);
        },
        onStageChange: options.onStageChange,
        targetSizeKB: options.targetSizeKB,
        originalFileOrBlob: fileOrBlob,
      });

      const inboundMsg: WorkerInboundMessage = {
        type: 'COMPRESS',
        id: requestId,
        imageBuffer: arrayBuffer,
        mimeType: fileOrBlob.type || 'image/jpeg',
        options: {
          targetSizeKB: options.targetSizeKB,
          format: options.format,
          qualityMode: options.qualityMode,
          maintainAspectRatio: options.maintainAspectRatio,
          customWidth: options.customWidth,
          customHeight: options.customHeight,
          tolerancePercentage: options.tolerancePercentage,
          enhanceQuality: options.enhanceQuality,
          backgroundColor: options.backgroundColor,
          rotation: options.rotation,
          flipH: options.flipH,
          flipV: options.flipV,
          brightness: options.brightness,
          contrast: options.contrast,
          saturation: options.saturation,
          grayscale: options.grayscale,
          maxSafeDimension: deviceLimits?.maxSafeDimension,
          maxSafePixels: deviceLimits?.maxSafePixels,
        },
      };

      // Transfer the ArrayBuffer to worker thread with zero copy
      try {
        worker.postMessage(inboundMsg, [arrayBuffer]);
      } catch (postErr) {
        this.pendingJobs.delete(requestId);
        cleanupAbortListener();
        reject(postErr);
      }
    });
  }

  /**
   * Terminate active worker and clean up memory
   */
  public terminateWorker(): void {
    if (this.worker) {
      try {
        this.worker.terminate();
      } catch {
        // Ignore termination errors
      }
      this.worker = null;
    }
  }
}

export const compressionWorkerClient = new CompressionWorkerManager();
