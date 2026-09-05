/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  X,
  Download,
  RefreshCw,
  FileText,
  Image as ImageIcon,
  Sliders,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ShieldCheck,
} from 'lucide-react';
import {
  ExportFormat,
  PdfSettingsState,
  PdfPaperSize,
  PdfOrientation,
  PdfHorizontalPos,
  PdfVerticalPos,
  PdfMarginOption,
  PdfDocSizeOption,
} from './idCardTypes';

interface IdCardExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  onFileNameChange: (name: string) => void;
  exportFormat: ExportFormat;
  onExportFormatChange: (fmt: ExportFormat) => void;
  jpegQuality: number;
  onJpegQualityChange: (q: number) => void;
  pdfSettings: PdfSettingsState;
  onPdfSettingsChange: (settings: PdfSettingsState) => void;
  canvasDimensions: { width: number; height: number };
  isDownloading: boolean;
  onExecuteDownload: () => void;
  sanitizeFilename: (input: string) => string;
}

export default function IdCardExportModal({
  isOpen,
  onClose,
  fileName,
  onFileNameChange,
  exportFormat,
  onExportFormatChange,
  jpegQuality,
  onJpegQualityChange,
  pdfSettings,
  onPdfSettingsChange,
  canvasDimensions,
  isDownloading,
  onExecuteDownload,
  sanitizeFilename,
}: IdCardExportModalProps): React.JSX.Element | null {
  if (!isOpen) return null;

  const safeBaseName = sanitizeFilename(fileName);
  const finalExt = exportFormat === 'jpeg' ? 'jpg' : exportFormat;

  const updatePdfSetting = <K extends keyof PdfSettingsState>(
    key: K,
    val: PdfSettingsState[K]
  ) => {
    onPdfSettingsChange({
      ...pdfSettings,
      [key]: val,
    });
  };

  const gridPositions: {
    h: PdfHorizontalPos;
    v: PdfVerticalPos;
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 my-8 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="font-sans text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Save Your File</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Choose output format, customize page placement, and download your document.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 1. File Name Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
            File Name:
          </label>
          <input
            type="text"
            value={fileName}
            onChange={(e) => onFileNameChange(e.target.value)}
            placeholder="My_ID_Card"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-indigo-500 focus:outline-none"
          />
          <p className="text-[10.5px] text-slate-400">
            Special characters are automatically sanitized for your operating system.
          </p>
        </div>

        {/* 2. Format Selection Cards: [ PNG ] [ JPG ] [ PDF ] */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
            Format:
          </label>
          <div className="grid grid-cols-3 gap-3">
            {/* PNG Card */}
            <button
              type="button"
              onClick={() => onExportFormatChange('png')}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                exportFormat === 'png'
                  ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              <span className="font-sans font-black text-sm">PNG</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Exact Image Size</span>
            </button>

            {/* JPG Card */}
            <button
              type="button"
              onClick={() => onExportFormatChange('jpeg')}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                exportFormat === 'jpeg'
                  ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              <span className="font-sans font-black text-sm">JPG</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Compact Image</span>
            </button>

            {/* PDF Card (Default) */}
            <button
              type="button"
              onClick={() => onExportFormatChange('pdf')}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                exportFormat === 'pdf'
                  ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              <span className="font-sans font-black text-sm">PDF</span>
              <span className="text-[10px] text-slate-400 mt-0.5">A4 Document Page</span>
            </button>
          </div>
        </div>

        {/* 3. CONDITIONAL SETTINGS ACCORDING TO FORMAT */}

        {/* A. PNG SETTINGS SUMMARY */}
        {exportFormat === 'png' && (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 space-y-2 animate-fade-in">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">Composition Dimensions:</span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {canvasDimensions.width} × {canvasDimensions.height} px
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Exporting as pure PNG uses the actual calculated composition bounds with full alpha transparency support. No paper margins or A4 canvas are added.
            </p>
          </div>
        )}

        {/* B. JPG QUALITY SETTINGS */}
        {exportFormat === 'jpeg' && (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">Composition Dimensions:</span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {canvasDimensions.width} × {canvasDimensions.height} px
              </span>
            </div>
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                <span>JPEG Compression Quality:</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400">{jpegQuality}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="100"
                value={jpegQuality}
                onChange={(e) => onJpegQualityChange(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg accent-indigo-600 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* C. PDF COMPLETE PAPER SETTINGS */}
        {exportFormat === 'pdf' && (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                PDF Page Settings
              </span>
              <span className="text-[10.5px] font-bold text-indigo-600 dark:text-indigo-400">
                Standard Printable Document
              </span>
            </div>

            {/* Paper Size & Orientation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Paper Size:
                </label>
                <div className="grid grid-cols-4 gap-1">
                  {(['a4', 'a5', 'letter', 'auto'] as PdfPaperSize[]).map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => updatePdfSetting('paperSize', size)}
                      className={`py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer uppercase ${
                        pdfSettings.paperSize === size
                          ? 'border-indigo-600 bg-white text-indigo-700 shadow-2xs dark:bg-slate-900 dark:text-indigo-300 dark:border-indigo-500'
                          : 'border-transparent text-slate-600 hover:bg-slate-200/50 dark:text-slate-400'
                      }`}
                    >
                      {size === 'auto' ? 'Auto' : size}
                    </button>
                  ))}
                </div>
              </div>

              {pdfSettings.paperSize !== 'auto' && (
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Orientation:
                  </label>
                  <div className="grid grid-cols-2 gap-1">
                    {(['portrait', 'landscape'] as PdfOrientation[]).map((orient) => (
                      <button
                        key={orient}
                        type="button"
                        onClick={() => updatePdfSetting('orientation', orient)}
                        className={`py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer capitalize ${
                          pdfSettings.orientation === orient
                            ? 'border-indigo-600 bg-white text-indigo-700 shadow-2xs dark:bg-slate-900 dark:text-indigo-300 dark:border-indigo-500'
                            : 'border-transparent text-slate-600 hover:bg-slate-200/50 dark:text-slate-400'
                      }`}
                      >
                        {orient}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Document Position: 3x3 Position Grid + Horizontal & Vertical Controls */}
            {pdfSettings.paperSize !== 'auto' && (
              <div className="space-y-3 pt-2 border-t border-slate-200/60 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Position on Page:
                  </span>
                  <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 capitalize">
                    {pdfSettings.horizontalPos} &bull; {pdfSettings.verticalPos}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  {/* 3x3 Grid */}
                  <div className="flex items-center justify-center p-2 bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="grid grid-cols-3 gap-1 w-32">
                      {gridPositions.map((pos) => {
                        const isActive =
                          pdfSettings.horizontalPos === pos.h && pdfSettings.verticalPos === pos.v;
                        return (
                          <button
                            key={`${pos.h}-${pos.v}`}
                            type="button"
                            onClick={() => {
                              onPdfSettingsChange({
                                ...pdfSettings,
                                horizontalPos: pos.h,
                                verticalPos: pos.v,
                              });
                            }}
                            title={pos.label}
                            className={`h-8 flex items-center justify-center rounded-md text-xs font-bold transition-all cursor-pointer ${
                              isActive
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {pos.symbol}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Horizontal & Vertical Tabs */}
                  <div className="space-y-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">Horizontal:</span>
                      <div className="grid grid-cols-3 gap-1">
                        {(['left', 'center', 'right'] as PdfHorizontalPos[]).map((pos) => (
                          <button
                            key={pos}
                            type="button"
                            onClick={() => updatePdfSetting('horizontalPos', pos)}
                            className={`py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer capitalize ${
                              pdfSettings.horizontalPos === pos
                                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {pos}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">Vertical:</span>
                      <div className="grid grid-cols-3 gap-1">
                        {(['top', 'center', 'bottom'] as PdfVerticalPos[]).map((pos) => (
                          <button
                            key={pos}
                            type="button"
                            onClick={() => updatePdfSetting('verticalPos', pos)}
                            className={`py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer capitalize ${
                              pdfSettings.verticalPos === pos
                                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {pos}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Page Margin & Document Scale */}
            {pdfSettings.paperSize !== 'auto' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 dark:border-slate-700">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Page Margin:
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {(
                      [
                        { id: 'none', label: 'None' },
                        { id: 'small', label: 'Small' },
                        { id: 'medium', label: 'Med' },
                        { id: 'large', label: 'Large' },
                      ] as { id: PdfMarginOption; label: string }[]
                    ).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => updatePdfSetting('margin', m.id)}
                        className={`py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                          pdfSettings.margin === m.id
                            ? 'border-indigo-600 bg-white text-indigo-700 shadow-2xs dark:bg-slate-900 dark:text-indigo-300 dark:border-indigo-500'
                            : 'border-transparent text-slate-600 hover:bg-slate-200/50 dark:text-slate-400'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Document Size:
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {(
                      [
                        { id: 'fit', label: 'Fit Page' },
                        { id: 'original', label: 'Original' },
                        { id: 'custom', label: 'Custom' },
                      ] as { id: PdfDocSizeOption; label: string }[]
                    ).map((ds) => (
                      <button
                        key={ds.id}
                        type="button"
                        onClick={() => updatePdfSetting('docSize', ds.id)}
                        className={`py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                          pdfSettings.docSize === ds.id
                            ? 'border-indigo-600 bg-white text-indigo-700 shadow-2xs dark:bg-slate-900 dark:text-indigo-300 dark:border-indigo-500'
                            : 'border-transparent text-slate-600 hover:bg-slate-200/50 dark:text-slate-400'
                        }`}
                      >
                        {ds.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Custom Scale Slider if Custom Size selected */}
            {pdfSettings.docSize === 'custom' && pdfSettings.paperSize !== 'auto' && (
              <div className="pt-2 animate-fade-in">
                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  <span>Custom Scale Percentage:</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400">
                    {pdfSettings.customScale}%
                  </span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="100"
                  value={pdfSettings.customScale}
                  onChange={(e) => updatePdfSetting('customScale', parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg accent-indigo-600 cursor-pointer"
                />
              </div>
            )}

            <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40">
              ✓ Document is placed onto real paper and automatically scaled proportionally to prevent clipping.
            </div>
          </div>
        )}

        {/* 4. Live Preview of Final Filename */}
        <div className="rounded-xl bg-slate-100 dark:bg-slate-950 p-3 text-xs flex items-center justify-between border border-slate-200/60 dark:border-slate-800">
          <span className="text-slate-400 text-[11px]">Preview Filename:</span>
          <span className="font-mono font-bold text-slate-900 dark:text-white truncate max-w-[260px]">
            {safeBaseName}.{finalExt}
          </span>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onExecuteDownload}
            disabled={isDownloading}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-xs font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            {isDownloading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span>Download</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
