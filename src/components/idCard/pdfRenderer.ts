/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import {
  PdfSettingsState,
  PAPER_DIMENSIONS_MM,
  MARGIN_VALUES_MM,
} from './idCardTypes';

export interface PdfPlacementResult {
  pageW: number; // mm
  pageH: number; // mm
  marginMm: number;
  availW: number;
  availH: number;
  docW: number;
  docH: number;
  posX: number;
  posY: number;
  isScaledDown: boolean;
  scalePercentage: number;
}

/**
 * Computes exact dimensions, margins, scale, and (x,y) positioning for placing
 * a composition canvas onto a PDF page.
 */
export function calculatePdfPlacement(
  canvasW: number,
  canvasH: number,
  settings: PdfSettingsState
): PdfPlacementResult {
  const {
    paperSize,
    orientation,
    horizontalPos,
    verticalPos,
    margin,
    docSize,
    customScale,
  } = settings;

  if (paperSize === 'auto') {
    const isLandscape = canvasW >= canvasH;
    // For Auto Fit, page dimension matches canvas aspect ratio
    return {
      pageW: canvasW,
      pageH: canvasH,
      marginMm: 0,
      availW: canvasW,
      availH: canvasH,
      docW: canvasW,
      docH: canvasH,
      posX: 0,
      posY: 0,
      isScaledDown: false,
      scalePercentage: 100,
    };
  }

  const dims = PAPER_DIMENSIONS_MM[paperSize][orientation];
  const pageW = dims[0];
  const pageH = dims[1];

  const marginMm = MARGIN_VALUES_MM[margin];
  const availW = Math.max(10, pageW - marginMm * 2);
  const availH = Math.max(10, pageH - marginMm * 2);

  const aspect = canvasW / (canvasH || 1);

  // Maximum dimensions that fit within the usable area
  let maxFitW: number;
  let maxFitH: number;

  if (availW / availH > aspect) {
    // Usable area is wider than document aspect ratio
    maxFitH = availH;
    maxFitW = availH * aspect;
  } else {
    // Usable area is taller than document aspect ratio
    maxFitW = availW;
    maxFitH = availW / aspect;
  }

  let docW = maxFitW;
  let docH = maxFitH;
  let isScaledDown = false;
  let scalePercentage = 100;

  if (docSize === 'fit') {
    docW = maxFitW;
    docH = maxFitH;
    scalePercentage = 100;
  } else if (docSize === 'original') {
    // Standard print DPI assumption: 150 DPI (1px ≈ 0.1693 mm)
    const mmPerPx = 25.4 / 150;
    const origW = canvasW * mmPerPx;
    const origH = canvasH * mmPerPx;

    if (origW > availW || origH > availH) {
      // Must scale down to prevent cropping
      docW = maxFitW;
      docH = maxFitH;
      isScaledDown = true;
      scalePercentage = Math.round((maxFitW / origW) * 100);
    } else {
      docW = origW;
      docH = origH;
      scalePercentage = 100;
    }
  } else if (docSize === 'custom') {
    const scaleFactor = Math.min(1.0, Math.max(0.4, (customScale || 80) / 100));
    docW = maxFitW * scaleFactor;
    docH = maxFitH * scaleFactor;
    scalePercentage = Math.round(scaleFactor * 100);
  }

  // Calculate Horizontal Position within usable area
  let posX = marginMm;
  if (horizontalPos === 'center') {
    posX = marginMm + (availW - docW) / 2;
  } else if (horizontalPos === 'right') {
    posX = marginMm + (availW - docW);
  }

  // Calculate Vertical Position within usable area
  let posY = marginMm;
  if (verticalPos === 'center') {
    posY = marginMm + (availH - docH) / 2;
  } else if (verticalPos === 'bottom') {
    posY = marginMm + (availH - docH);
  }

  // Anti-clipping safety check: ensure bounds stay strictly inside page
  posX = Math.max(0, Math.min(posX, pageW - docW));
  posY = Math.max(0, Math.min(posY, pageH - docH));

  return {
    pageW,
    pageH,
    marginMm,
    availW,
    availH,
    docW,
    docH,
    posX,
    posY,
    isScaledDown,
    scalePercentage,
  };
}

/**
 * Exports the combined canvas as a high-fidelity PDF placed on the configured paper size.
 */
export async function exportCombinedPdf(
  canvas: HTMLCanvasElement,
  fileName: string,
  settings: PdfSettingsState
): Promise<void> {
  const { paperSize, orientation } = settings;

  // Prepare a canvas with a clean white background for PDF rendering
  const pdfCanvas = document.createElement('canvas');
  pdfCanvas.width = canvas.width;
  pdfCanvas.height = canvas.height;
  const pctx = pdfCanvas.getContext('2d');
  if (pctx) {
    pctx.fillStyle = '#ffffff';
    pctx.fillRect(0, 0, canvas.width, canvas.height);
    pctx.drawImage(canvas, 0, 0);
  }

  const imgDataUrl = pdfCanvas.toDataURL('image/jpeg', 0.95);

  let doc: jsPDF;

  if (paperSize === 'auto') {
    const isLandscape = canvas.width >= canvas.height;
    doc = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'px',
      format: [canvas.width, canvas.height],
    });
    doc.addImage(imgDataUrl, 'JPEG', 0, 0, canvas.width, canvas.height, undefined, 'FAST');
  } else {
    doc = new jsPDF({
      orientation,
      unit: 'mm',
      format: paperSize, // 'a4', 'a5', 'letter'
    });

    const placement = calculatePdfPlacement(canvas.width, canvas.height, settings);
    doc.addImage(
      imgDataUrl,
      'JPEG',
      placement.posX,
      placement.posY,
      placement.docW,
      placement.docH,
      undefined,
      'FAST'
    );
  }

  doc.save(fileName);
}
