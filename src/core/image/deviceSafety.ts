/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Device-aware memory and safety heuristics for large image processing
 */

export interface DeviceSafetyLimits {
  isMobileOrConstrained: boolean;
  maxSafeDimension: number;
  maxSafePixels: number;
  recommendedBatchConcurrency: number;
}

/**
 * Detect if current device is a mobile browser or memory-constrained environment
 */
export function getDeviceSafetyLimits(): DeviceSafetyLimits {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      isMobileOrConstrained: false,
      maxSafeDimension: 4096,
      maxSafePixels: 16777216, // 16 MP
      recommendedBatchConcurrency: 2,
    };
  }

  const userAgent = navigator.userAgent || '';
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  
  // Hardware concurrency (CPU logical cores)
  const cores = typeof navigator.hardwareConcurrency === 'number' ? navigator.hardwareConcurrency : 4;
  const isLowCore = cores <= 4;

  // Experimental deviceMemory API (in GB, e.g. 2, 4, 8)
  const memoryGB = typeof (navigator as any).deviceMemory === 'number' ? (navigator as any).deviceMemory : 8;
  const isLowMemory = memoryGB <= 4;

  const isConstrained = isMobile || (isLowCore && isLowMemory);

  if (isConstrained) {
    return {
      isMobileOrConstrained: true,
      maxSafeDimension: 3200,
      maxSafePixels: 10240000, // 10 MP
      recommendedBatchConcurrency: 1, // Single-thread sequential on mobile prevents OOM crashes
    };
  }

  return {
    isMobileOrConstrained: false,
    maxSafeDimension: 4096,
    maxSafePixels: 16777216, // 16 MP
    recommendedBatchConcurrency: 2,
  };
}

/**
 * Calculate safe working dimensions preserving exact aspect ratio
 */
export function calculateSafeDimensions(
  width: number,
  height: number,
  limits?: DeviceSafetyLimits
): {
  safeWidth: number;
  safeHeight: number;
  wasDownscaled: boolean;
  notice?: string;
} {
  const currentLimits = limits || getDeviceSafetyLimits();
  const { maxSafeDimension, maxSafePixels } = currentLimits;

  const totalPixels = width * height;
  if (width <= maxSafeDimension && height <= maxSafeDimension && totalPixels <= maxSafePixels) {
    return {
      safeWidth: width,
      safeHeight: height,
      wasDownscaled: false,
    };
  }

  const scale = Math.min(
    maxSafeDimension / width,
    maxSafeDimension / height,
    Math.sqrt(maxSafePixels / totalPixels)
  );

  const safeWidth = Math.max(64, Math.round(width * scale));
  const safeHeight = Math.max(64, Math.round(height * scale));

  const notice = `This image is very large (${width}×${height}), so QuickResize reduced the working dimensions to ${safeWidth}×${safeHeight} to keep processing stable on your device.`;

  return {
    safeWidth,
    safeHeight,
    wasDownscaled: true,
    notice,
  };
}

/**
 * Estimate uncompressed 32-bit RGBA pixel memory consumption in Megabytes
 */
export function estimateBitmapMemoryMB(width: number, height: number): number {
  const bytes = width * height * 4;
  return parseFloat((bytes / (1024 * 1024)).toFixed(1));
}
