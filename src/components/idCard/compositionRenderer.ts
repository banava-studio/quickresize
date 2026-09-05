/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ImageSlotState,
  CompositionSettings,
  FitMode,
} from './idCardTypes';

export interface CompositionBounds {
  canvasW: number;
  canvasH: number;
  frontRect: { x: number; y: number; w: number; h: number } | null;
  backRect: { x: number; y: number; w: number; h: number } | null;
}

/**
 * Loads an image from a File object, validates decoding, and extracts natural dimensions.
 */
export async function loadAndDecodeImage(file: File): Promise<{
  img: HTMLImageElement;
  width: number;
  height: number;
  format: string;
  size: number;
  url: string;
}> {
  const url = URL.createObjectURL(file);
  const img = new Image();

  const format =
    file.name.split('.').pop()?.toUpperCase() ||
    (file.type.includes('png') ? 'PNG' : file.type.includes('webp') ? 'WEBP' : 'JPG');

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Image decoding failed'));
    img.src = url;
  });

  if ('decode' in img) {
    try {
      await img.decode();
    } catch {
      // Fallback: onload already verified the image source
    }
  }

  const naturalWidth = img.naturalWidth || img.width;
  const naturalHeight = img.naturalHeight || img.height;

  if (naturalWidth <= 0 || naturalHeight <= 0) {
    URL.revokeObjectURL(url);
    throw new Error('Invalid image dimensions');
  }

  return {
    img,
    width: naturalWidth,
    height: naturalHeight,
    format,
    size: file.size,
    url,
  };
}

/**
 * Calculates effective aspect ratio and dimensions for an image taking rotation into account.
 */
export function getEffectiveImageAspect(slot: ImageSlotState): { aspect: number; isRotatedQuarter: boolean } {
  const isRotatedQuarter = slot.rotation === 90 || slot.rotation === 270;
  const w = isRotatedQuarter ? slot.height : slot.width;
  const h = isRotatedQuarter ? slot.width : slot.height;
  const aspect = (w || 1) / (h || 1);
  return { aspect, isRotatedQuarter };
}

/**
 * Computes exact positions and overall canvas dimensions for the composition.
 */
export function calculateCompositionBounds(
  front: ImageSlotState | null,
  back: ImageSlotState | null,
  settings: CompositionSettings
): CompositionBounds {
  const { layout, gap, padding, manualPos, hAlign, vAlign } = settings;

  const hasFront = front && front.imgElement && front.width > 0;
  const hasBack = back && back.imgElement && back.width > 0;

  if (!hasFront && !hasBack) {
    return {
      canvasW: 800,
      canvasH: 500,
      frontRect: null,
      backRect: null,
    };
  }

  // SCENARIO 1: Only one image uploaded
  if ((hasFront && !hasBack) || (!hasFront && hasBack)) {
    const activeSlot = (hasFront ? front : back)!;
    const { aspect } = getEffectiveImageAspect(activeSlot);

    let baseDim = 800;
    let targetW = Math.round(baseDim * (aspect >= 1 ? 1 : aspect));
    let targetH = Math.round(targetW / aspect);

    const canvasW = targetW + padding * 2;
    const canvasH = targetH + padding * 2;

    const rect = {
      x: padding,
      y: padding,
      w: targetW,
      h: targetH,
    };

    return {
      canvasW,
      canvasH,
      frontRect: hasFront ? rect : null,
      backRect: hasBack ? rect : null,
    };
  }

  // SCENARIO 2: Both images uploaded
  const frontAspectInfo = getEffectiveImageAspect(front!);
  const backAspectInfo = getEffectiveImageAspect(back!);

  let canvasW = 1200;
  let canvasH = 800;
  let frontRect = { x: 0, y: 0, w: 0, h: 0 };
  let backRect = { x: 0, y: 0, w: 0, h: 0 };

  if (layout === 'side-by-side') {
    // Normalise height for both cards (standard ID card look)
    const targetH = 640;
    const frontW = Math.round(targetH * frontAspectInfo.aspect);
    const backW = Math.round(targetH * backAspectInfo.aspect);

    canvasW = padding * 2 + frontW + gap + backW;
    canvasH = padding * 2 + targetH;

    let vOffset = 0;
    if (vAlign === 'center') vOffset = 0;
    else if (vAlign === 'top') vOffset = 0;
    else if (vAlign === 'bottom') vOffset = 0;

    frontRect = {
      x: padding,
      y: padding + vOffset,
      w: frontW,
      h: targetH,
    };

    backRect = {
      x: padding + frontW + gap,
      y: padding + vOffset,
      w: backW,
      h: targetH,
    };
  } else if (layout === 'top-bottom') {
    // Normalise width for both cards (standard Aadhaar / document look)
    const targetW = 760;
    const frontH = Math.round(targetW / frontAspectInfo.aspect);
    const backH = Math.round(targetW / backAspectInfo.aspect);

    canvasW = padding * 2 + targetW;
    canvasH = padding * 2 + frontH + gap + backH;

    let hOffset = 0;
    if (hAlign === 'center') hOffset = 0;
    else if (hAlign === 'left') hOffset = 0;
    else if (hAlign === 'right') hOffset = 0;

    frontRect = {
      x: padding + hOffset,
      y: padding,
      w: targetW,
      h: frontH,
    };

    backRect = {
      x: padding + hOffset,
      y: padding + frontH + gap,
      w: targetW,
      h: backH,
    };
  } else {
    // MANUAL MODE
    const baseH = 600;
    const frontW = Math.round(baseH * frontAspectInfo.aspect * manualPos.frontScale);
    const frontH = Math.round(baseH * manualPos.frontScale);

    const backW = Math.round(baseH * backAspectInfo.aspect * manualPos.backScale);
    const backH = Math.round(baseH * manualPos.backScale);

    let fX = padding + manualPos.frontX;
    let fY = padding + manualPos.frontY;

    let bX = padding + frontW + gap + manualPos.backX;
    let bY = padding + manualPos.backY;

    const minX = Math.min(fX, bX, 0);
    const minY = Math.min(fY, bY, 0);
    const maxX = Math.max(fX + frontW, bX + backW);
    const maxY = Math.max(fY + frontH, bY + backH);

    canvasW = Math.max(800, maxX + padding - minX);
    canvasH = Math.max(600, maxY + padding - minY);

    if (minX < 0) {
      const shiftX = Math.abs(minX) + padding;
      fX += shiftX;
      bX += shiftX;
      canvasW += shiftX;
    }
    if (minY < 0) {
      const shiftY = Math.abs(minY) + padding;
      fY += shiftY;
      bY += shiftY;
      canvasH += shiftY;
    }

    frontRect = { x: fX, y: fY, w: frontW, h: frontH };
    backRect = { x: bX, y: bY, w: backW, h: backH };
  }

  // Safe maximum dimension limit to prevent browser mobile canvas crashes
  const maxDim = 3200;
  if (canvasW > maxDim || canvasH > maxDim) {
    const scale = Math.min(maxDim / canvasW, maxDim / canvasH);
    canvasW = Math.round(canvasW * scale);
    canvasH = Math.round(canvasH * scale);

    frontRect = {
      x: Math.round(frontRect.x * scale),
      y: Math.round(frontRect.y * scale),
      w: Math.round(frontRect.w * scale),
      h: Math.round(frontRect.h * scale),
    };

    backRect = {
      x: Math.round(backRect.x * scale),
      y: Math.round(backRect.y * scale),
      w: Math.round(backRect.w * scale),
      h: Math.round(backRect.h * scale),
    };
  }

  return {
    canvasW,
    canvasH,
    frontRect,
    backRect,
  };
}

/**
 * Helper to draw a rounded rectangle path.
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
) {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  if (r === 0) {
    ctx.rect(x, y, w, h);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Draws a single document slot onto the target canvas context with full transformation.
 */
export function drawImageSlot(
  ctx: CanvasRenderingContext2D,
  slot: ImageSlotState,
  rect: { x: number; y: number; w: number; h: number },
  settings: CompositionSettings
) {
  if (!slot.imgElement) return;

  const { x, y, w, h } = rect;
  const { rotation, flipH, flipV, fitMode } = slot;
  const { cornerRadius, borderEnabled, borderWidth, borderColor, cardShadow, bgType } = settings;

  // 1. Draw realistic shadow if enabled and not transparent
  if (cardShadow && bgType !== 'transparent') {
    ctx.save();
    ctx.shadowColor = 'rgba(15, 23, 42, 0.12)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 5;
    ctx.fillStyle = '#ffffff';
    drawRoundedRect(ctx, x, y, w, h, cornerRadius);
    ctx.fill();
    ctx.restore();
  }

  // 2. Draw card container and actual image pixels
  ctx.save();

  // Clip to rounded corner if radius > 0
  if (cornerRadius > 0) {
    drawRoundedRect(ctx, x, y, w, h, cornerRadius);
    ctx.clip();
  }

  // Base background behind the image slot
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, w, h);

  // Compute image scaling based on fitMode
  const isRotatedQuarter = rotation === 90 || rotation === 270;
  const effImgW = isRotatedQuarter ? slot.height : slot.width;
  const effImgH = isRotatedQuarter ? slot.width : slot.height;

  let drawEffW = w;
  let drawEffH = h;

  if (fitMode === 'contain') {
    const scale = Math.min(w / (effImgW || 1), h / (effImgH || 1));
    drawEffW = effImgW * scale;
    drawEffH = effImgH * scale;
  } else if (fitMode === 'cover') {
    const scale = Math.max(w / (effImgW || 1), h / (effImgH || 1));
    drawEffW = effImgW * scale;
    drawEffH = effImgH * scale;
  } else {
    // Original size capped at slot size
    drawEffW = Math.min(w, effImgW);
    drawEffH = Math.min(h, effImgH);
  }

  // Center the image inside the slot
  const cx = x + w / 2;
  const cy = y + h / 2;

  ctx.translate(cx, cy);

  if (rotation !== 0) {
    ctx.rotate((rotation * Math.PI) / 180);
  }

  if (flipH || flipV) {
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  }

  // When rotated 90 or 270, natural dimensions are swapped relative to rotated axes
  const srcW = isRotatedQuarter ? drawEffH : drawEffW;
  const srcH = isRotatedQuarter ? drawEffW : drawEffH;

  ctx.drawImage(slot.imgElement, -srcW / 2, -srcH / 2, srcW, srcH);
  ctx.restore();

  // 3. Draw border on top if enabled
  if (borderEnabled && borderWidth > 0) {
    ctx.save();
    ctx.lineWidth = borderWidth;
    ctx.strokeStyle = borderColor;
    const halfB = borderWidth / 2;
    drawRoundedRect(
      ctx,
      x + halfB,
      y + halfB,
      w - borderWidth,
      h - borderWidth,
      Math.max(0, cornerRadius - halfB)
    );
    ctx.stroke();
    ctx.restore();
  }
}

/**
 * Master Composition Renderer: The Single Source of Truth for Preview, Image Export, and PDF.
 */
export function renderCompositionToCanvas(
  front: ImageSlotState | null,
  back: ImageSlotState | null,
  settings: CompositionSettings,
  targetCanvas?: HTMLCanvasElement,
  selectedSlot?: 'front' | 'back' | null
): HTMLCanvasElement {
  const canvas = targetCanvas || document.createElement('canvas');
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return canvas;

  const bounds = calculateCompositionBounds(front, back, settings);
  const { canvasW, canvasH, frontRect, backRect } = bounds;

  canvas.width = canvasW;
  canvas.height = canvasH;

  // Clear previous canvas
  ctx.clearRect(0, 0, canvasW, canvasH);

  // Background Fill
  if (settings.bgType === 'white') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasW, canvasH);
  } else if (settings.bgType === 'black') {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvasW, canvasH);
  } else if (settings.bgType === 'custom') {
    ctx.fillStyle = settings.customBgColor || '#ffffff';
    ctx.fillRect(0, 0, canvasW, canvasH);
  } else {
    // 'transparent' -> remains transparent clear
  }

  // Draw Front Document
  if (front && front.imgElement && frontRect) {
    drawImageSlot(ctx, front, frontRect, settings);
  }

  // Draw Back Document
  if (back && back.imgElement && backRect) {
    drawImageSlot(ctx, back, backRect, settings);
  }

  // In Manual Mode, draw active selection highlight dashed border for precision nudging
  if (settings.layout === 'manual' && selectedSlot) {
    const activeRect = selectedSlot === 'front' ? frontRect : backRect;
    if (activeRect) {
      ctx.save();
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(
        activeRect.x - 5,
        activeRect.y - 5,
        activeRect.w + 10,
        activeRect.h + 10
      );
      ctx.restore();
    }
  }

  return canvas;
}
