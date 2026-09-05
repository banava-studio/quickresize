/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Columns, Rows, Move } from 'lucide-react';

export type CombinerLayout = 'side-by-side' | 'top-bottom' | 'manual';
export type ExportFormat = 'png' | 'jpeg' | 'pdf';
export type PdfPaperSize = 'a4' | 'a5' | 'letter' | 'auto';
export type PdfOrientation = 'portrait' | 'landscape';
export type PdfHorizontalPos = 'left' | 'center' | 'right';
export type PdfVerticalPos = 'top' | 'center' | 'bottom';
export type PdfMarginOption = 'none' | 'small' | 'medium' | 'large';
export type PdfDocSizeOption = 'fit' | 'original' | 'custom';
export type FitMode = 'contain' | 'cover' | 'original';
export type BgType = 'white' | 'black' | 'transparent' | 'custom';

export interface ImageSlotState {
  file: File | null;
  url: string;
  imgElement: HTMLImageElement | null;
  width: number;
  height: number;
  size: number;
  name: string;
  format: string; // 'JPG' | 'PNG' | 'WEBP'
  rotation: number; // 0, 90, 180, 270
  flipH: boolean;
  flipV: boolean;
  fitMode: FitMode;
  isLoading: boolean;
  error: string | null;
}

export interface ManualPositionState {
  frontScale: number;
  frontX: number;
  frontY: number;
  backScale: number;
  backX: number;
  backY: number;
}

export interface CompositionSettings {
  layout: CombinerLayout;
  gap: number;
  padding: number;
  bgType: BgType;
  customBgColor: string;
  borderEnabled: boolean;
  borderWidth: number;
  borderColor: string;
  cornerRadius: number;
  cardShadow: boolean;
  hAlign: 'left' | 'center' | 'right';
  vAlign: 'top' | 'center' | 'bottom';
  manualPos: ManualPositionState;
}

export interface PdfSettingsState {
  paperSize: PdfPaperSize;
  orientation: PdfOrientation;
  horizontalPos: PdfHorizontalPos;
  verticalPos: PdfVerticalPos;
  margin: PdfMarginOption;
  docSize: PdfDocSizeOption;
  customScale: number; // 40 to 100 (%)
}

export const COLOR_SWATCHES = [
  { label: 'White', value: '#ffffff' },
  { label: 'Ivory / Doc', value: '#fafaf9' },
  { label: 'Soft Slate', value: '#f1f5f9' },
  { label: 'Cool Gray', value: '#e2e8f0' },
  { label: 'Dark Navy', value: '#1e293b' },
  { label: 'Pure Black', value: '#000000' },
  { label: 'Light Blue', value: '#e0f2fe' },
];

export const PAPER_DIMENSIONS_MM: Record<Exclude<PdfPaperSize, 'auto'>, { portrait: [number, number]; landscape: [number, number] }> = {
  a4: {
    portrait: [210, 297],
    landscape: [297, 210],
  },
  a5: {
    portrait: [148, 210],
    landscape: [210, 148],
  },
  letter: {
    portrait: [215.9, 279.4],
    landscape: [279.4, 215.9],
  },
};

export const MARGIN_VALUES_MM: Record<PdfMarginOption, number> = {
  none: 0,
  small: 10,
  medium: 20,
  large: 30,
};
