/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import { ImageSettings } from '../types';
import { compressToExactKB } from '../core/compression/compressionEngine';
import { processImagePipeline } from '../core/image/imagePipeline';

/**
 * Utility to load an image from a URL into an HTMLImageElement
 */
export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Only set crossOrigin if url is an external absolute resource
    if (url.startsWith('http://') || url.startsWith('https://')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error('Failed to load image: ' + err));
    img.src = url;
  });
}

/**
 * Get natural dimensions of an image file
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number; format: string }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
        format: file.type || 'image/png',
      });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0, format: file.type || 'image/png' });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

/**
 * Convert any image format to the desired mime type string
 */
export function formatToMimeType(format: 'png' | 'jpeg' | 'webp' | 'avif' | 'gif' | 'bmp' | 'pdf'): string {
  switch (format) {
    case 'png':
      return 'image/png';
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'avif':
      return 'image/avif';
    case 'gif':
      return 'image/gif';
    case 'bmp':
      return 'image/bmp';
    case 'pdf':
      return 'application/pdf';
    default:
      return 'image/png';
  }
}

/**
 * Sharpen canvas image pixels using a 3x3 convolution matrix
 */
export function sharpenCanvas(ctx: CanvasRenderingContext2D, width: number, height: number, amount: number = 0.2) {
  try {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const buffer = new Uint8ClampedArray(data);
    const a = amount;
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
  } catch (e) {
    console.warn('Canvas pixel sharpening skipped due to cross-origin or sandbox limits', e);
  }
}

/**
 * Low-level canvas rendering to a Blob
 */
export function drawImageToBlob(
  img: HTMLImageElement,
  width: number,
  height: number,
  mimeType: string,
  quality: number,
  settings?: ImageSettings
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    
    // Determine canvas dimensions based on 90/270 rotations
    const isRotated90 = settings && (settings.rotation === 90 || settings.rotation === 270);
    const canvasWidth = isRotated90 ? height : width;
    const canvasHeight = isRotated90 ? width : height;
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Could not create 2D canvas context'));
      return;
    }
    
    // Set supreme linear bicubic interpolation rendering quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Solid background if JPEG
    if (mimeType === 'image/jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }
    
    // Apply visual CSS filters to context if specified in settings
    if (settings) {
      const filterParts: string[] = [];
      if (settings.enhanceQuality) {
        // High quality photo raw graphic enhancement combo
        filterParts.push('contrast(106%) saturate(104%) brightness(101%)');
      }
      if (settings.brightness !== undefined && settings.brightness !== 100) {
        filterParts.push(`brightness(${settings.brightness}%)`);
      }
      if (settings.contrast !== undefined && settings.contrast !== 100) {
        filterParts.push(`contrast(${settings.contrast}%)`);
      }
      if (settings.saturation !== undefined && settings.saturation !== 100) {
        filterParts.push(`saturate(${settings.saturation}%)`);
      }
      if (settings.grayscale) {
        filterParts.push('grayscale(100%)');
      }
      if (filterParts.length > 0) {
        ctx.filter = filterParts.join(' ');
      }
    }

    // Translate to center of canvas for rotation and flipping transforms
    ctx.translate(canvasWidth / 2, canvasHeight / 2);
    
    if (settings?.rotation) {
      ctx.rotate((settings.rotation * Math.PI) / 180);
    }
    
    // Horizontal and vertical scales flipping
    const scaleX = settings?.flipH ? -1 : 1;
    const scaleY = settings?.flipV ? -1 : 1;
    ctx.scale(scaleX, scaleY);
    
    // Draw from center boundary offset
    ctx.drawImage(img, -width / 2, -height / 2, width, height);
    
    // Reset transform to identity matrix to perform pixel sharpening in standard coordinate space
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (settings?.enhanceQuality) {
      sharpenCanvas(ctx, canvasWidth, canvasHeight, 0.25);
    }
    
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas export returned null blob'));
        }
      },
      mimeType,
      quality
    );
  });
}

/**
 * The core image optimization processor engine.
 * Fully local browser rendering.
 */
export async function processImage(
  file: File | Blob,
  settings: ImageSettings,
  originalUrl: string
): Promise<{
  blob: Blob;
  url: string;
  width: number;
  height: number;
  format: string;
  size: number;
}> {
  // Load original image dimensions
  // Cast safety: Blob lacks some File attributes but is compatible here
  const dims = await getImageDimensions(file as File);
  const imgWidth = dims.width || 800;
  const imgHeight = dims.height || 600;
  
  // Load image element
  const imgElement = await loadImage(originalUrl);
  
  // Calculate starting output width and height based on user specifications
  let targetWidth = imgWidth;
  let targetHeight = imgHeight;
  
  if (settings.width || settings.height) {
    if (settings.maintainAspectRatio) {
      const scale = Math.min(
        settings.width ? settings.width / imgWidth : 1,
        settings.height ? settings.height / imgHeight : 1
      );
      if (settings.width && settings.height) {
        targetWidth = Math.round(imgWidth * scale);
        targetHeight = Math.round(imgHeight * scale);
      } else if (settings.width) {
        targetWidth = settings.width;
        targetHeight = Math.round(imgHeight * (settings.width / imgWidth));
      } else if (settings.height) {
        targetHeight = settings.height;
        targetWidth = Math.round(imgWidth * (settings.height / imgHeight));
      }
    } else {
      if (settings.width) targetWidth = settings.width;
      if (settings.height) targetHeight = settings.height;
    }
  }
  
  const mimeType = formatToMimeType(settings.format);

  // Case 0: If Crop or Sharpness is specified, use unified processImagePipeline
  if (settings.crop || settings.sharpness) {
    const pipelineRes = await processImagePipeline(file, {
      rotation: (settings.rotation as any) || 0,
      flipH: settings.flipH || false,
      flipV: settings.flipV || false,
      crop: settings.crop || null,
      aspectRatio: 'free',
      zoom: 1.0,
      panX: 0,
      panY: 0,
      resize: {
        width: targetWidth,
        height: targetHeight,
        maintainAspectRatio: settings.maintainAspectRatio,
        mode: settings.resizeMode || 'fit',
        percentage: 100,
      },
      adjustments: {
        brightness: settings.brightness !== undefined ? settings.brightness - 100 : 0,
        contrast: settings.contrast !== undefined ? settings.contrast - 100 : 0,
        saturation: settings.saturation !== undefined ? settings.saturation - 100 : 0,
        grayscale: settings.grayscale || false,
        sharpness: settings.sharpness || 0,
      },
      format: (settings.format === 'pdf' ? 'jpeg' : settings.format) as any,
      targetSizeKB: settings.mode === 'compress' ? settings.targetSizeKB : undefined,
      quality: settings.quality || 0.85,
    });

    return {
      blob: pipelineRes.blob,
      url: pipelineRes.url,
      width: pipelineRes.width,
      height: pipelineRes.height,
      format: pipelineRes.format,
      size: pipelineRes.size,
    };
  }
  
  // Case A: Strict Target Size Compression via Production-Grade Exact KB Engine
  if (settings.mode === 'compress' && settings.targetSizeKB) {
    const compressionRes = await compressToExactKB(file, {
      targetSizeKB: settings.targetSizeKB,
      format: (settings.format === 'pdf' ? 'jpeg' : settings.format) as any,
      maintainAspectRatio: settings.maintainAspectRatio,
      customWidth: settings.width,
      customHeight: settings.height,
      enhanceQuality: settings.enhanceQuality,
      rotation: settings.rotation,
      flipH: settings.flipH,
      flipV: settings.flipV,
      brightness: settings.brightness,
      contrast: settings.contrast,
      saturation: settings.saturation,
      grayscale: settings.grayscale,
    });

    return {
      blob: compressionRes.blob,
      url: compressionRes.url,
      width: compressionRes.width,
      height: compressionRes.height,
      format: compressionRes.format,
      size: compressionRes.compressedSize,
    };
  }
  
  // Case B: Standard Resizing / Custom quality sliders (Quality Slider: settings.quality from 0.1 to 1.0)
  if (settings.format === 'pdf') {
    const jpegBlob = await drawImageToBlob(imgElement, targetWidth, targetHeight, 'image/jpeg', 0.95, settings);
    
    // Convert to Base64 data URL to bypass iframe sandbox fetch restrictions on blob: URLs
    const jpegDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to convert jpeg blob to base64 data url'));
      reader.readAsDataURL(jpegBlob);
    });
    
    const doc = new jsPDF({
      orientation: targetWidth > targetHeight ? 'landscape' : 'portrait',
      unit: 'px',
      format: [targetWidth, targetHeight]
    });
    doc.addImage(jpegDataUrl, 'JPEG', 0, 0, targetWidth, targetHeight);
    const pdfBlob = doc.output('blob');
    
    return {
      blob: pdfBlob,
      url: URL.createObjectURL(pdfBlob),
      width: targetWidth,
      height: targetHeight,
      format: 'application/pdf',
      size: pdfBlob.size,
    };
  }

  const quality = settings.quality || 0.85;
  const processedBlob = await drawImageToBlob(imgElement, targetWidth, targetHeight, mimeType, quality, settings);
  const blobUrl = URL.createObjectURL(processedBlob);
  
  // Swap final returned dimensions if rotated 90 or 270 degrees
  const isRotated90 = settings.rotation === 90 || settings.rotation === 270;
  const finalWidth = isRotated90 ? targetHeight : targetWidth;
  const finalHeight = isRotated90 ? targetWidth : targetHeight;

  return {
    blob: processedBlob,
    url: blobUrl,
    width: finalWidth,
    height: finalHeight,
    format: mimeType,
    size: processedBlob.size,
  };
}
