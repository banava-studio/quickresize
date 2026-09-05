/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface WorkerCompressionOptions {
  targetSizeKB: number;
  format?: 'jpeg' | 'png' | 'webp' | 'avif' | 'auto';
  qualityMode?: 'auto' | 'high' | 'balanced' | 'smallest';
  maintainAspectRatio?: boolean;
  customWidth?: number;
  customHeight?: number;
  tolerancePercentage?: number;
  enhanceQuality?: boolean;
  backgroundColor?: string;
  rotation?: number;
  flipH?: boolean;
  flipV?: boolean;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  grayscale?: boolean;
  maxSafeDimension?: number;
  maxSafePixels?: number;
}

export interface WorkerResultMeta {
  originalSize: number;
  compressedSize: number;
  targetSizeKB: number;
  actualKB: number;
  originalWidth: number;
  originalHeight: number;
  width: number;
  height: number;
  format: string;
  qualityUsed: number;
  scaleUsed: number;
  iterations: number;
  hasTransparency: boolean;
  withinTarget: boolean;
  targetStatus: 'achieved' | 'close' | 'failed';
  statusMessage: string;
  closestAchievedKB: number;
  suggestion?: string;
  safetyDownscaled?: boolean;
  safetyNotice?: string;
  fallbackFormatNotice?: string;
  savedBytes: number;
  reductionPercentage: number;
  processingTimeMs: number;
  requestId?: string;
}

export type WorkerProgressStage = 'preparing' | 'decoding' | 'testing' | 'optimizing' | 'finalizing';

// UI -> Worker messages
export interface WorkerCompressRequest {
  type: 'COMPRESS';
  id: string;
  imageBuffer: ArrayBuffer;
  mimeType: string;
  options: WorkerCompressionOptions;
}

export interface WorkerCancelRequest {
  type: 'CANCEL';
  id: string;
}

export interface WorkerPingRequest {
  type: 'PING';
  id: string;
}

export type WorkerInboundMessage = WorkerCompressRequest | WorkerCancelRequest | WorkerPingRequest;

// Worker -> UI messages
export interface WorkerProgressMessage {
  type: 'PROGRESS';
  id: string;
  stage: WorkerProgressStage;
  detail?: string;
  iteration?: number;
}

export interface WorkerSuccessMessage {
  type: 'SUCCESS';
  id: string;
  resultBuffer: ArrayBuffer;
  meta: WorkerResultMeta;
}

export interface WorkerErrorMessage {
  type: 'ERROR';
  id: string;
  error: string;
  isMemoryError?: boolean;
}

export interface WorkerPongMessage {
  type: 'PONG';
  id: string;
}

export type WorkerOutboundMessage = 
  | WorkerProgressMessage 
  | WorkerSuccessMessage 
  | WorkerErrorMessage 
  | WorkerPongMessage;
