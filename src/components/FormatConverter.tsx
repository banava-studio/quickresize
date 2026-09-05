/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Download, 
  Upload, 
  Trash2, 
  RefreshCw, 
  FileCheck, 
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  FileImage,
  Sparkles,
  Layers,
  XCircle,
  RotateCw,
  Archive,
  Info,
  Maximize2
} from 'lucide-react';
import { checkAvifEncodingSupport } from '../utils/avifDetector';
import { detectTransparency } from '../core/compression/compressionEngine';
import { processImagePipeline } from '../core/image/imagePipeline';
import { exportBatchToZip, triggerBlobDownload } from '../utils/zipExport';
import { BatchItem, BatchSummary } from '../core/batch/batchTypes';
import { BatchProcessor } from '../core/batch/batchEngine';
import RenameModal from './RenameModal';

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export interface FormatConverterProps {
  initialTargetFormat?: 'jpeg' | 'png' | 'webp' | 'avif';
  initialBgColor?: string;
}

export default function FormatConverter({
  initialTargetFormat,
  initialBgColor,
}: FormatConverterProps = {}) {
  const [targetFormat, setTargetFormat] = useState<'jpeg' | 'png' | 'webp' | 'avif'>(initialTargetFormat || 'webp');
  const [quality, setQuality] = useState<number>(0.85);
  const [customWidth, setCustomWidth] = useState<string>('');
  const [customHeight, setCustomHeight] = useState<string>('');
  const [lockAspect, setLockAspect] = useState<boolean>(true);
  const [filenameSuffix, setFilenameSuffix] = useState<string>('');
  const [bgColor, setBgColor] = useState<string>(initialBgColor || '#FFFFFF');

  useEffect(() => {
    if (initialTargetFormat) setTargetFormat(initialTargetFormat);
    if (initialBgColor) setBgColor(initialBgColor);
  }, [initialTargetFormat, initialBgColor]);
  
  const [isAvifSupported, setIsAvifSupported] = useState<boolean>(true);
  const [hasTransparentInput, setHasTransparentInput] = useState<boolean>(false);
  
  const [items, setItems] = useState<BatchItem[]>([]);
  const [summary, setSummary] = useState<BatchSummary>({
    total: 0,
    waiting: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
    totalOriginalSize: 0,
    totalOutputSize: 0,
    totalSavedBytes: 0,
    averageReductionPercentage: 0,
    totalProcessingTimeMs: 0,
    isProcessing: false,
  });

  const [renameTarget, setRenameTarget] = useState<BatchItem | null>(null);
  const [zipProgress, setZipProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize BatchProcessor instance
  const processorRef = useRef<BatchProcessor | null>(null);
  if (!processorRef.current) {
    processorRef.current = new BatchProcessor({
      operation: 'convert',
      format: targetFormat,
      quality,
      concurrency: 2,
    });
  }

  // Detect AVIF browser encoding support on mount
  useEffect(() => {
    let isMounted = true;
    checkAvifEncodingSupport().then((supported) => {
      if (isMounted) {
        setIsAvifSupported(supported);
        if (!supported && targetFormat === 'avif') {
          setTargetFormat('webp');
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Subscribe to batch processor state changes
  useEffect(() => {
    const processor = processorRef.current;
    if (!processor) return;

    const unsubscribe = processor.subscribe((updatedItems, updatedSummary) => {
      setItems(updatedItems);
      setSummary(updatedSummary);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Synchronize options to processor
  useEffect(() => {
    const processor = processorRef.current;
    if (!processor) return;

    const w = customWidth ? parseInt(customWidth, 10) : undefined;
    const h = customHeight ? parseInt(customHeight, 10) : undefined;

    processor.setOptions({
      operation: 'convert',
      format: targetFormat,
      quality,
      backgroundColor: bgColor,
      filenameSuffix: filenameSuffix.trim() ? `_${filenameSuffix.trim()}` : undefined,
      resize: (w || h) ? {
        enabled: true,
        width: w,
        height: h,
        maintainAspectRatio: lockAspect,
        mode: 'fit',
      } : undefined,
    });
  }, [targetFormat, quality, customWidth, customHeight, lockAspect, filenameSuffix, bgColor]);

  // Check if any added files have transparency
  const checkTransparencyInQueue = async (newFiles: File[]) => {
    for (const file of newFiles) {
      if (file.type.includes('png') || file.type.includes('webp') || file.type.includes('svg')) {
        try {
          const url = URL.createObjectURL(file);
          const img = new Image();
          await new Promise<void>((res) => {
            img.onload = () => res();
            img.onerror = () => res();
            img.src = url;
          });
          const hasAlpha = await detectTransparency(img);
          URL.revokeObjectURL(url);
          if (hasAlpha) {
            setHasTransparentInput(true);
            return;
          }
        } catch {
          // ignore
        }
      }
    }
  };

  const handleFilesAdded = async (addedFiles: File[]) => {
    if (!addedFiles || addedFiles.length === 0) return;
    const valid = addedFiles.filter((f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|avif|ico|tiff?)$/i.test(f.name));
    if (valid.length === 0) return;

    checkTransparencyInQueue(valid);
    await processorRef.current?.addFiles(valid);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      handleFilesAdded(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFilesAdded(Array.from(e.target.files));
    }
  };

  const handleProcessAll = () => {
    processorRef.current?.start();
  };

  const handleCancelAll = () => {
    processorRef.current?.cancelAll();
  };

  const handleCancelItem = (id: string) => {
    processorRef.current?.cancelItem(id);
  };

  const handleRetryItem = (id: string) => {
    processorRef.current?.retryItem(id);
  };

  const handleClearCompleted = () => {
    processorRef.current?.clearCompleted();
  };

  const handleClearFailed = () => {
    processorRef.current?.clearFailed();
  };

  const handleClearAll = () => {
    processorRef.current?.clearAll();
    setHasTransparentInput(false);
  };

  const handleDownloadSingle = (item: BatchItem) => {
    if (!item.outputBlob) return;
    triggerBlobDownload(item.outputBlob, item.outputFilename || item.filename);
  };

  const handleDownloadZip = async () => {
    const completed = items.filter((i) => i.status === 'COMPLETED' && i.outputBlob);
    if (completed.length === 0) return;

    if (completed.length === 1) {
      handleDownloadSingle(completed[0]);
      return;
    }

    try {
      setZipProgress(10);
      const { zipBlob, downloadFilename } = await exportBatchToZip(items, {
        zipFilename: `QuickResize_Converted_${completed.length}_images.zip`,
        onProgress: (percent) => setZipProgress(percent),
      });
      triggerBlobDownload(zipBlob, downloadFilename);
    } catch (err) {
      console.error('ZIP creation error:', err);
    } finally {
      setZipProgress(null);
    }
  };

  const isSettingsLocked = summary.isProcessing;

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      
      {/* 1. Universal Converter Configuration Header */}
      <div id="universal-converter-panel" className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <h3 className="font-sans text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              Universal Image Converter
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Convert between JPG, PNG, WebP, and AVIF with zero quality degradation and complete client-side privacy.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300">
            <span>Engine:</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">100% In-Browser Canvas</span>
          </div>
        </div>

        {/* Format Selection Grid */}
        <div className="mt-5 space-y-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Target Output Format
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { id: 'webp', label: 'WEBP', badge: 'Recommended', desc: 'Modern & Compact' },
              { id: 'jpeg', label: 'JPG / JPEG', badge: 'Universal', desc: 'Photos & Web' },
              { id: 'png', label: 'PNG', badge: 'Lossless', desc: 'Transparent & Crisp' },
              { 
                id: 'avif', 
                label: 'AVIF', 
                badge: isAvifSupported ? 'Next-Gen' : 'Unsupported', 
                desc: isAvifSupported ? 'Ultra Compression' : 'Browser lacks encoder',
                disabled: !isAvifSupported
              },
            ].map((fmt) => (
              <button
                key={fmt.id}
                type="button"
                disabled={fmt.disabled || isSettingsLocked}
                onClick={() => setTargetFormat(fmt.id as any)}
                className={`relative flex flex-col p-3.5 rounded-xl border text-left transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  targetFormat === fmt.id
                    ? 'border-indigo-600 bg-indigo-50/50 shadow-sm dark:border-indigo-500 dark:bg-indigo-950/30'
                    : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {fmt.label}
                  </span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                    targetFormat === fmt.id
                      ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                      : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                  }`}>
                    {fmt.badge}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {fmt.desc}
                </span>
              </button>
            ))}
          </div>

          {!isAvifSupported && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-[11px] text-amber-800 dark:text-amber-300">
              <Info className="h-4 w-4 shrink-0" />
              <span>AVIF export is not supported by your current browser. WebP and JPG are fully available for modern high-efficiency compression.</span>
            </div>
          )}
        </div>

        {/* Transparency Safety Warning */}
        {hasTransparentInput && targetFormat === 'jpeg' && (
          <div className="mt-4 flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 animate-fade-in">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">JPEG does not support transparency.</p>
              <p className="text-[11px] leading-relaxed opacity-90">
                Transparent areas will be flattened with a clean matte color. If you need transparency preserved, choose <strong>PNG</strong> or <strong>WebP</strong>.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] font-semibold">Matte Fill:</span>
                {['#FFFFFF', '#000000', '#F8FAFC'].map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setBgColor(col)}
                    className={`h-5 w-5 rounded border shadow-xs cursor-pointer ${
                      bgColor === col ? 'ring-2 ring-indigo-500 scale-110' : 'border-slate-300'
                    }`}
                    style={{ backgroundColor: col }}
                    title={`Fill with ${col}`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Detailed Options: Quality, Resize, Naming */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* 1. Quality Control (Only for lossy formats) */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Compression Quality
              </label>
              {targetFormat !== 'png' ? (
                <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {Math.round(quality * 100)}%
                </span>
              ) : (
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  Lossless (100%)
                </span>
              )}
            </div>

            {targetFormat !== 'png' ? (
              <>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  disabled={isSettingsLocked}
                  value={quality}
                  onChange={(e) => setQuality(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 dark:bg-slate-700 disabled:opacity-50"
                />
                <p className="text-[10px] text-slate-400 leading-tight">
                  Higher quality keeps sharp fine details; 80–85% provides optimal size savings.
                </p>
              </>
            ) : (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                PNG format uses lossless deflate compression. All pixels are preserved exactly without lossy artifacts.
              </p>
            )}
          </div>

          {/* 2. Optional Resize Dimensions */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Optional Resize (pixels)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Width (e.g. 1920)"
                disabled={isSettingsLocked}
                value={customWidth}
                onChange={(e) => setCustomWidth(e.target.value.replace(/\D/g, ''))}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2.5 py-1.5 text-xs font-bold outline-none focus:border-indigo-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <input
                type="text"
                placeholder={lockAspect ? 'Auto' : 'Height'}
                disabled={isSettingsLocked || lockAspect}
                value={customHeight}
                onChange={(e) => setCustomHeight(e.target.value.replace(/\D/g, ''))}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2.5 py-1.5 text-xs font-bold outline-none focus:border-indigo-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white disabled:opacity-50"
              />
            </div>
            <label className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer pt-0.5">
              <input
                type="checkbox"
                checked={lockAspect}
                disabled={isSettingsLocked}
                onChange={(e) => setLockAspect(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:bg-slate-800"
              />
              <span>Lock Aspect Ratio</span>
            </label>
          </div>

          {/* 3. Output Filename Customization */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Filename Suffix
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder={`converted`}
                disabled={isSettingsLocked}
                value={filenameSuffix}
                onChange={(e) => setFilenameSuffix(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs font-bold outline-none focus:border-indigo-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Preview: <span className="font-mono text-slate-600 dark:text-slate-300">photo_{filenameSuffix || targetFormat}.{targetFormat === 'jpeg' ? 'jpg' : targetFormat}</span>
            </p>
          </div>

        </div>
      </div>

      {/* 2. Drag & Drop Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !isSettingsLocked && fileInputRef.current?.click()}
        className={`rounded-2xl border-2 border-dashed p-8 text-center transition-all cursor-pointer ${
          isSettingsLocked
            ? 'border-slate-200 bg-slate-50/50 opacity-60 cursor-not-allowed dark:border-slate-800'
            : 'border-indigo-200/80 bg-indigo-50/20 hover:bg-indigo-50/40 hover:border-indigo-400 dark:border-slate-800 dark:bg-slate-900/20 dark:hover:bg-slate-900/40'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          disabled={isSettingsLocked}
          onChange={handleFileInputChange}
          className="hidden"
        />
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/10 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
          <Upload className="h-6 w-6" />
        </div>
        <h4 className="mt-4 text-sm font-bold text-slate-900 dark:text-white">
          Drop bulk images to convert (JPG, PNG, WebP, AVIF, BMP, GIF)
        </h4>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          or click to browse from device &bull; Process 1 or 100+ photos locally
        </p>
      </div>

      {/* 3. Batch Queue & Operations Dashboard */}
      {items.length > 0 && (
        <div className="space-y-4">
          
          {/* Summary Banner & Action Controls */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-3">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-indigo-500" />
                    Conversion Queue ({items.length})
                  </h4>
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    {summary.completed > 0 && (
                      <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 rounded-md">
                        {summary.completed} Done
                      </span>
                    )}
                    {summary.failed > 0 && (
                      <span className="bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 px-2 py-0.5 rounded-md">
                        {summary.failed} Failed
                      </span>
                    )}
                    {summary.cancelled > 0 && (
                      <span className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 px-2 py-0.5 rounded-md">
                        {summary.cancelled} Cancelled
                      </span>
                    )}
                  </div>
                </div>

                {/* Aggregate statistics */}
                {summary.completed > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 font-mono">
                    <span>Original: <strong>{formatBytes(summary.totalOriginalSize)}</strong></span>
                    <span>&rarr;</span>
                    <span>Output: <strong>{formatBytes(summary.totalOutputSize)}</strong></span>
                    {summary.totalSavedBytes > 0 && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        (Saved {formatBytes(summary.totalSavedBytes)} &bull; {summary.averageReductionPercentage}%)
                      </span>
                    )}
                    {summary.totalProcessingTimeMs > 0 && (
                      <span>Time: {(summary.totalProcessingTimeMs / 1000).toFixed(1)}s</span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {!summary.isProcessing ? (
                  <button
                    type="button"
                    onClick={handleProcessAll}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 text-xs font-bold shadow-sm transition-all cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Convert All ({items.length})
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCancelAll}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 text-xs font-bold shadow-sm transition-all cursor-pointer"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Cancel All
                  </button>
                )}

                {summary.completed > 0 && (
                  <button
                    type="button"
                    onClick={handleDownloadZip}
                    disabled={zipProgress !== null}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 text-xs font-bold shadow-sm transition-all cursor-pointer"
                  >
                    <Archive className="h-3.5 w-3.5" />
                    {zipProgress !== null ? `Archiving ${zipProgress}%...` : `Download All (${summary.completed})`}
                  </button>
                )}

                <div className="flex items-center gap-1">
                  {summary.failed > 0 && (
                    <button
                      type="button"
                      onClick={() => processorRef.current?.retryAllFailed()}
                      className="p-2 text-xs font-bold text-amber-600 hover:bg-amber-50 rounded-lg dark:hover:bg-amber-950/40 cursor-pointer"
                      title="Retry Failed"
                    >
                      Retry Failed
                    </button>
                  )}
                  {summary.completed > 0 && (
                    <button
                      type="button"
                      onClick={handleClearCompleted}
                      className="p-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                      title="Clear Completed"
                    >
                      Clear Done
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="p-2 text-xs font-bold text-rose-500 hover:bg-rose-50 rounded-lg dark:hover:bg-rose-950/40 cursor-pointer"
                    title="Remove All"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </div>

            {/* Real Progress Bar */}
            {summary.isProcessing && (
              <div className="mt-4 space-y-1.5">
                <div className="flex justify-between text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-3 w-3 animate-spin text-indigo-500" />
                    Converting images locally in memory...
                  </span>
                  <span>
                    {summary.completed + summary.failed} / {summary.total} (
                    {Math.round(((summary.completed + summary.failed) / summary.total) * 100)}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-indigo-600 transition-all duration-300 dark:bg-indigo-500"
                    style={{ width: `${((summary.completed + summary.failed) / summary.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Cards List for Each Image */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((item) => {
              const isCompleted = item.status === 'COMPLETED';
              const isProcessing = item.status === 'PROCESSING';
              const isFailed = item.status === 'FAILED';
              const isCancelled = item.status === 'CANCELLED';

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border p-4 transition-all shadow-xs flex flex-col justify-between ${
                    isCompleted
                      ? 'border-emerald-100 bg-white dark:border-emerald-950/50 dark:bg-slate-900/80'
                      : isFailed
                      ? 'border-rose-200 bg-rose-50/30 dark:border-rose-900/40 dark:bg-slate-900/80'
                      : isProcessing
                      ? 'border-indigo-300 bg-indigo-50/20 ring-1 ring-indigo-400 dark:border-indigo-800 dark:bg-slate-900/80'
                      : 'border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900/50'
                  }`}
                >
                  <div className="flex gap-3.5 items-start">
                    {/* Thumbnail */}
                    <div className="h-16 w-16 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 flex items-center justify-center relative">
                      {item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl}
                          alt={item.filename}
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <FileImage className="h-6 w-6 text-slate-400" />
                      )}
                      <span className="absolute bottom-0 right-0 bg-slate-900/80 text-[8px] font-mono font-bold text-white px-1 rounded-tl">
                        {item.inputFormat}
                      </span>
                    </div>

                    {/* Meta and Status */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate" title={item.filename}>
                          {item.filename}
                        </h5>
                        <div className="shrink-0">
                          {isCompleted && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded">
                              <CheckCircle className="h-3 w-3" /> Done
                            </span>
                          )}
                          {isProcessing && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-1.5 py-0.5 rounded">
                              <RefreshCw className="h-3 w-3 animate-spin" /> Converting
                            </span>
                          )}
                          {isFailed && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-1.5 py-0.5 rounded">
                              <AlertTriangle className="h-3 w-3" /> Error
                            </span>
                          )}
                          {isCancelled && (
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                              Cancelled
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Before / After Specs */}
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono flex flex-wrap items-center gap-1.5">
                        <span>{item.originalWidth}&times;{item.originalHeight}</span>
                        <span>&bull;</span>
                        <span>{formatBytes(item.originalSize)}</span>
                        
                        {isCompleted && item.outputSize && (
                          <>
                            <ArrowRight className="h-3 w-3 text-indigo-500" />
                            <span className="font-bold text-slate-900 dark:text-white">
                              {formatBytes(item.outputSize)}
                            </span>
                            <span className={`font-bold ${
                              item.isLarger ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                            }`}>
                              ({item.isLarger ? `+${item.reductionPercentage}%` : `-${item.reductionPercentage}%`})
                            </span>
                          </>
                        )}
                      </div>

                      {/* Error message display if failed */}
                      {isFailed && item.errorMessage && (
                        <p className="text-[10px] text-rose-600 dark:text-rose-400 leading-tight">
                          {item.errorMessage}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions per item */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <div className="text-[10px] font-mono text-slate-400">
                      {isCompleted && item.processingTimeMs && (
                        <span>Processed in {item.processingTimeMs}ms</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isCompleted && (
                        <button
                          type="button"
                          onClick={() => handleDownloadSingle(item)}
                          className="inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-2.5 py-1 text-[11px] font-bold cursor-pointer transition-colors shadow-2xs"
                        >
                          <Download className="h-3 w-3" />
                          Download
                        </button>
                      )}

                      {(isFailed || isCancelled) && (
                        <button
                          type="button"
                          onClick={() => handleRetryItem(item.id)}
                          className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-lg px-2 py-1 text-[11px] font-bold cursor-pointer"
                        >
                          <RotateCw className="h-3 w-3" />
                          Retry
                        </button>
                      )}

                      {isProcessing && (
                        <button
                          type="button"
                          onClick={() => handleCancelItem(item.id)}
                          className="inline-flex items-center gap-1 text-rose-500 hover:bg-rose-50 rounded-lg px-2 py-1 text-[11px] font-bold cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => processorRef.current?.removeItem(item.id)}
                        className="p-1 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* Single Rename Modal */}
      {renameTarget && (
        <RenameModal
          isOpen={!!renameTarget}
          originalName={renameTarget.outputFilename || renameTarget.filename}
          onConfirm={(newName) => {
            if (renameTarget.outputBlob) {
              triggerBlobDownload(renameTarget.outputBlob, newName);
            }
            setRenameTarget(null);
          }}
          onClose={() => setRenameTarget(null)}
        />
      )}

    </div>
  );
}
