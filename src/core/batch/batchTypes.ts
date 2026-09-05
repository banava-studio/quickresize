/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TransformState, CropRect, ResizeFitMode, ImageAdjustments } from '../../types';

export type BatchItemStatus = 
  | 'WAITING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type OutputFormat = 'jpeg' | 'png' | 'webp' | 'avif' | 'original' | 'auto';

export interface BatchProcessingOptions {
  /** Mode of batch operation */
  operation: 'convert' | 'compress' | 'resize' | 'pipeline';
  
  /** Target output format */
  format: OutputFormat;
  
  /** Quality 0.1 to 1.0 (applicable for JPEG, WebP, AVIF) */
  quality: number;
  
  /** Target file size in KB if compression is active */
  targetSizeKB?: number;
  
  /** Optional Resize specifications */
  resize?: {
    enabled: boolean;
    width?: number;
    height?: number;
    maintainAspectRatio: boolean;
    mode: ResizeFitMode;
    percentage?: number;
    maxDimension?: number;
    maxDimensionType?: 'width' | 'height' | 'none';
  };
  
  /** Adjustments and filters */
  adjustments?: ImageAdjustments;
  
  /** Transforms (rotation, flip, crop) */
  rotation?: 0 | 90 | 180 | 270;
  flipH?: boolean;
  flipV?: boolean;
  crop?: CropRect | null;
  
  /** Metadata handling */
  stripMetadata?: boolean;
  
  /** Background color for flattening transparency in JPEG (default '#FFFFFF') */
  backgroundColor?: string;
  
  /** Output filename suffix or pattern */
  filenameSuffix?: string;
  
  /** Concurrency level (default: 2 or 3) */
  concurrency?: number;
}

export interface BatchItem {
  id: string;
  file: File;
  filename: string;
  originalSize: number; // in bytes
  originalWidth: number;
  originalHeight: number;
  inputFormat: string; // e.g. 'JPEG', 'PNG', 'WEBP'
  thumbnailUrl?: string; // Small lightweight memory-safe data URL
  
  // Processing Result
  outputBlob?: Blob;
  outputFilename?: string;
  outputSize?: number; // in bytes
  outputWidth?: number;
  outputHeight?: number;
  outputFormat?: string; // e.g. 'image/webp'
  outputUrl?: string;
  
  // State Machine
  status: BatchItemStatus;
  errorMessage?: string;
  processingTimeMs?: number;
  reductionPercentage?: number;
  isLarger?: boolean;
  hasTransparency?: boolean;
  
  // Internal tracking
  abortController?: AbortController;
}

export interface BatchSummary {
  total: number;
  waiting: number;
  processing: number;
  completed: number;
  failed: number;
  cancelled: number;
  
  totalOriginalSize: number; // bytes
  totalOutputSize: number; // bytes
  totalSavedBytes: number; // bytes
  averageReductionPercentage: number;
  totalProcessingTimeMs: number;
  isProcessing: boolean;
}
