/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CropRect {
  x: number; // in pixels relative to rotated source or normalized percentage
  y: number;
  width: number;
  height: number;
  isNormalized?: boolean; // if true, values are 0..1
}

export type AspectRatioType = 
  | 'free' 
  | '1:1' 
  | '4:5' 
  | '3:4' 
  | '16:9' 
  | '9:16' 
  | 'a4' 
  | 'passport' 
  | 'custom';

export type ResizeFitMode = 'fit' | 'contain' | 'cover' | 'fill';

export interface ImageAdjustments {
  brightness: number; // -100 to +100, default 0
  contrast: number;   // -100 to +100, default 0
  saturation: number; // -100 to +100, default 0
  grayscale: boolean; // default false
  sharpness: number;  // 0 to 100, default 0
}

export interface ResizeConfig {
  width: number;
  height: number;
  maintainAspectRatio: boolean;
  mode: ResizeFitMode;
  percentage?: number; // 25, 50, 75, 100, 125, 150, 200
  maxDimension?: number;
  maxDimensionType?: 'width' | 'height' | 'none';
}

export interface TransformState {
  rotation: 0 | 90 | 180 | 270;
  flipH: boolean;
  flipV: boolean;
  crop: CropRect | null;
  aspectRatio: AspectRatioType;
  customAspectRatio?: { width: number; height: number };
  zoom: number; // 1.0 to 3.0
  panX: number;
  panY: number;
  resize: ResizeConfig;
  adjustments: ImageAdjustments;
  format: 'jpeg' | 'png' | 'webp' | 'avif';
  targetSizeKB?: number;
  quality: number; // 0.1 to 1.0
}

export interface ImageSettings {
  mode: 'compress' | 'resize' | 'preset';
  targetSizeKB?: number; // e.g. 100 for 100KB
  width?: number;
  height?: number;
  maintainAspectRatio: boolean;
  quality: number; // 0.1 to 1.0 (represented as 0-100 in slider)
  format: 'png' | 'jpeg' | 'webp' | 'avif' | 'gif' | 'bmp' | 'pdf';
  presetId?: string;
  
  // Extra advanced editor options
  rotation?: number; // 0, 90, 180, 270
  flipH?: boolean;
  flipV?: boolean;
  brightness?: number; // -100 to 100 or 50 to 150
  contrast?: number;   // -100 to 100 or 50 to 150
  saturation?: number; // -100 to 100 or 0 to 200
  grayscale?: boolean;
  sharpness?: number;  // 0 to 100
  enhanceQuality?: boolean;
  crop?: CropRect | null;
  resizeMode?: ResizeFitMode;
}

export interface ProcessedFile {
  id: string;
  file: File;
  name: string;
  originalSize: number; // in bytes
  originalWidth: number;
  originalHeight: number;
  originalFormat: string;
  originalUrl: string;
  
  status: 'idle' | 'processing' | 'done' | 'error';
  errorMessage?: string;
  
  outputSize?: number; // in bytes
  outputWidth?: number;
  outputHeight?: number;
  outputFormat?: string;
  outputUrl?: string;
  outputBlob?: Blob;
  reductionPercentage?: number;
  
  settings: ImageSettings;
}

export interface Preset {
  id: string;
  name: string;
  category: 'Social Media' | 'Documents' | 'Web & Banner' | 'App Icons' | 'Logo / Website';
  width: number;
  height: number;
  format?: 'png' | 'jpeg' | 'webp';
  description: string;
  aspectRatioLabel?: string;
}

