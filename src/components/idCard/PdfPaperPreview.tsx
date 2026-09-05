/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { FileText, CheckCircle2 } from 'lucide-react';
import { PdfSettingsState } from './idCardTypes';
import { calculatePdfPlacement } from './pdfRenderer';

interface PdfPaperPreviewProps {
  compositionDataUrl: string | null;
  canvasDimensions: { width: number; height: number };
  settings: PdfSettingsState;
  hasImages: boolean;
  onPositionChange?: (h: PdfSettingsState['horizontalPos'], v: PdfSettingsState['verticalPos']) => void;
}

export default function PdfPaperPreview({
  compositionDataUrl,
  canvasDimensions,
  settings,
  hasImages,
  onPositionChange,
}: PdfPaperPreviewProps): React.JSX.Element {
  const canvasW = canvasDimensions.width || 800;
  const canvasH = canvasDimensions.height || 500;

  const placement = useMemo(() => {
    return calculatePdfPlacement(canvasW, canvasH, settings);
  }, [canvasW, canvasH, settings]);

  const { pageW, pageH, marginMm, posX, posY, docW, docH, scalePercentage, isScaledDown } = placement;

  const paperLabel = useMemo(() => {
    if (settings.paperSize === 'auto') return 'Auto Fit Page';
    const nameMap = { a4: 'A4', a5: 'A5', letter: 'Letter' };
    const name = nameMap[settings.paperSize] || 'A4';
    const orient = settings.orientation === 'portrait' ? 'Portrait' : 'Landscape';
    return `${name} ${orient} (${Math.round(pageW)} × ${Math.round(pageH)} mm)`;
  }, [settings.paperSize, settings.orientation, pageW, pageH]);

  // 3x3 Grid Items
  const gridPositions: {
    h: PdfSettingsState['horizontalPos'];
    v: PdfSettingsState['verticalPos'];
    label: string;
    symbol: string;
  }[] = [
    { h: 'left', v: 'top', label: 'Top Left', symbol: '↖' },
    { h: 'center', v: 'top', label: 'Top Center', symbol: '↑' },
    { h: 'right', v: 'top', label: 'Top Right', symbol: '↗' },
    { h: 'left', v: 'center', label: 'Middle Left', symbol: '←' },
    { h: 'center', v: 'center', label: 'Center', symbol: '●' },
    { h: 'right', v: 'center', label: 'Middle Right', symbol: '→' },
    { h: 'left', v: 'bottom', label: 'Bottom Left', symbol: '↙' },
    { h: 'center', v: 'bottom', label: 'Bottom Center', symbol: '↓' },
    { h: 'right', v: 'bottom', label: 'Bottom Right', symbol: '↘' },
  ];

  return (
    <div className="w-full flex flex-col items-center space-y-3">
      {/* Paper Sheet Representation Container */}
      <div className="w-full flex items-center justify-center p-3 bg-slate-100/90 dark:bg-slate-950 rounded-2xl min-h-[300px] max-h-[420px] overflow-hidden border border-slate-200/80 dark:border-slate-800">
        <div
          className="relative bg-white shadow-xl rounded-sm border border-slate-200 dark:border-slate-700 transition-all duration-200 overflow-hidden"
          style={{
            aspectRatio: `${pageW} / ${pageH}`,
            maxHeight: '360px',
            maxWidth: '100%',
            height: '360px',
            width: 'auto',
          }}
        >
          {/* Printable Safe Area Margin Guide (Dashed line) */}
          {marginMm > 0 && settings.paperSize !== 'auto' && (
            <div
              className="absolute border border-dashed border-indigo-300/80 dark:border-indigo-500/50 pointer-events-none rounded-xs z-10"
              style={{
                left: `${(marginMm / pageW) * 100}%`,
                top: `${(marginMm / pageH) * 100}%`,
                right: `${(marginMm / pageW) * 100}%`,
                bottom: `${(marginMm / pageH) * 100}%`,
              }}
              title={`Page Safe Margin: ${marginMm}mm`}
            />
          )}

          {/* Actual Document Content on Paper */}
          {hasImages && compositionDataUrl ? (
            <div
              className="absolute transition-all duration-200 z-0 shadow-2xs"
              style={{
                left: `${(posX / pageW) * 100}%`,
                top: `${(posY / pageH) * 100}%`,
                width: `${(docW / pageW) * 100}%`,
                height: `${(docH / pageH) * 100}%`,
              }}
            >
              <img
                src={compositionDataUrl}
                alt="Combined Document Preview on Paper"
                className="w-full h-full object-contain pointer-events-none block"
              />
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-slate-400 space-y-1.5 pointer-events-none">
              <FileText className="h-6 w-6 text-slate-300 dark:text-slate-600" />
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                PDF Paper Preview
              </span>
              <span className="text-[10px] text-slate-400 max-w-[160px]">
                Upload Front and Back images to preview layout on A4 paper
              </span>
            </div>
          )}
        </div>
      </div>

      {/* PDF Status / Placement Badge */}
      <div className="w-full flex items-center justify-between text-[11px] bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3.5 py-2.5 border border-slate-200/60 dark:border-slate-700/60">
        <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300 truncate">
          <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="truncate">{paperLabel}</span>
        </div>
        <div className="text-right font-mono text-slate-500 dark:text-slate-400 text-[10.5px] shrink-0">
          {isScaledDown ? (
            <span className="text-amber-600 dark:text-amber-400 font-bold">
              Scaled ({scalePercentage}%)
            </span>
          ) : (
            <span>Fit ({scalePercentage}%)</span>
          )}
        </div>
      </div>

      {/* 3x3 Positioning Grid */}
      {onPositionChange && settings.paperSize !== 'auto' && (
        <div className="w-full p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Document Position on Page:
            </span>
            <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 capitalize">
              {settings.horizontalPos} &bull; {settings.verticalPos}
            </span>
          </div>

          <div className="flex items-center justify-center pt-1">
            <div className="grid grid-cols-3 gap-1.5 w-40">
              {gridPositions.map((pos) => {
                const isActive =
                  settings.horizontalPos === pos.h && settings.verticalPos === pos.v;
                return (
                  <button
                    key={`${pos.h}-${pos.v}`}
                    type="button"
                    onClick={() => onPositionChange(pos.h, pos.v)}
                    title={pos.label}
                    className={`h-9 flex items-center justify-center rounded-lg text-sm font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-xs scale-105'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                    }`}
                  >
                    {pos.symbol}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
