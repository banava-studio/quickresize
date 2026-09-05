/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Layers,
  Minimize2,
  Maximize2,
  RefreshCw,
  Sliders,
  Upload,
  Download,
  Trash2,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RotateCw,
  Archive,
  ArrowRight,
  Info,
  FileImage,
  Zap,
  Sparkles,
  ShieldCheck,
  Plus
} from 'lucide-react';
import { BatchProcessor } from '../core/batch/batchEngine';
import { BatchItem, BatchSummary, BatchProcessingOptions } from '../core/batch/batchTypes';
import { checkAvifEncodingSupport } from '../utils/avifDetector';
import { exportBatchToZip, triggerBlobDownload } from '../utils/zipExport';
import { formatBytes } from './FormatConverter';
import RenameModal from './RenameModal';

export default function BatchStudio() {
  const [activeMode, setActiveMode] = useState<'compress' | 'resize' | 'convert' | 'pipeline'>('compress');
  
  // Compression options
  const [targetKB, setTargetKB] = useState<number>(100);
  const [customKB, setCustomKB] = useState<string>('100');
  
  // Resize options
  const [resizeMode, setResizeMode] = useState<'dimensions' | 'percentage' | 'max_dimension'>('dimensions');
  const [resizeWidth, setResizeWidth] = useState<string>('1920');
  const [resizeHeight, setResizeHeight] = useState<string>('1080');
  const [lockAspect, setLockAspect] = useState<boolean>(true);
  const [resizePercentage, setResizePercentage] = useState<number>(50);
  const [maxDimension, setMaxDimension] = useState<number>(1920);
  
  // Format options
  const [targetFormat, setTargetFormat] = useState<'auto' | 'jpeg' | 'png' | 'webp' | 'avif'>('auto');
  const [quality, setQuality] = useState<number>(0.85);
  const [isAvifSupported, setIsAvifSupported] = useState<boolean>(true);
  
  // Pipeline extra options
  const [enhanceQuality, setEnhanceQuality] = useState<boolean>(false);
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const [concurrency, setConcurrency] = useState<number>(2);

  // Queue state from BatchProcessor
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

  const [zipProgress, setZipProgress] = useState<number | null>(null);
  const [isZipRenameModalOpen, setIsZipRenameModalOpen] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Instance of BatchProcessor
  const processorRef = useRef<BatchProcessor | null>(null);
  if (!processorRef.current) {
    processorRef.current = new BatchProcessor({
      operation: 'compress',
      format: 'auto',
      quality: 0.85,
      targetSizeKB: 100,
      concurrency: 2,
    });
  }

  // Detect AVIF support
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

  // Subscribe to processor
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

  // Update processor options whenever user changes any control
  useEffect(() => {
    const processor = processorRef.current;
    if (!processor) return;

    const parsedW = resizeWidth ? parseInt(resizeWidth, 10) : undefined;
    const parsedH = resizeHeight ? parseInt(resizeHeight, 10) : undefined;

    let resizeConfig: BatchProcessingOptions['resize'] | undefined = undefined;

    if (activeMode === 'resize' || activeMode === 'pipeline') {
      if (resizeMode === 'dimensions') {
        resizeConfig = {
          enabled: true,
          width: parsedW,
          height: parsedH,
          maintainAspectRatio: lockAspect,
          mode: 'fit',
        };
      } else if (resizeMode === 'percentage') {
        resizeConfig = {
          enabled: true,
          percentage: resizePercentage,
          maintainAspectRatio: true,
          mode: 'fit',
        };
      } else if (resizeMode === 'max_dimension') {
        resizeConfig = {
          enabled: true,
          maxDimension,
          maxDimensionType: 'width',
          maintainAspectRatio: true,
          mode: 'fit',
        };
      }
    }

    processor.setOptions({
      operation: activeMode,
      format: targetFormat === 'auto' ? 'auto' : targetFormat,
      quality,
      targetSizeKB: activeMode === 'compress' || (activeMode === 'pipeline' && targetKB > 0) ? targetKB : undefined,
      resize: resizeConfig,
      rotation,
      adjustments: enhanceQuality ? {
        brightness: 2,
        contrast: 5,
        saturation: 4,
        grayscale: false,
        sharpness: 20,
      } : undefined,
      concurrency,
    });
  }, [
    activeMode, 
    targetKB, 
    resizeMode, 
    resizeWidth, 
    resizeHeight, 
    lockAspect, 
    resizePercentage, 
    maxDimension, 
    targetFormat, 
    quality, 
    enhanceQuality, 
    rotation, 
    concurrency
  ]);

  const handleFilesAdded = async (addedFiles: File[]) => {
    if (!addedFiles || addedFiles.length === 0) return;
    const valid = addedFiles.filter((f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|avif|ico|tiff?)$/i.test(f.name));
    if (valid.length === 0) return;

    await processorRef.current?.addFiles(valid);
  };

  const handleCustomKBChange = (val: string) => {
    const num = val.replace(/\D/g, '');
    setCustomKB(num);
    if (num) {
      setTargetKB(parseInt(num, 10));
    }
  };

  const handleDownloadSingle = (item: BatchItem) => {
    if (!item.outputBlob) return;
    triggerBlobDownload(item.outputBlob, item.outputFilename || item.filename);
  };

  const handleDownloadZip = async (customName?: string) => {
    const completed = items.filter((i) => i.status === 'COMPLETED' && i.outputBlob);
    if (completed.length === 0) return;

    if (completed.length === 1 && !customName) {
      handleDownloadSingle(completed[0]);
      return;
    }

    try {
      setZipProgress(10);
      const defaultName = customName || `QuickResize_Batch_${completed.length}_images.zip`;
      const { zipBlob, downloadFilename } = await exportBatchToZip(items, {
        zipFilename: defaultName,
        onProgress: (percent) => setZipProgress(percent),
      });
      triggerBlobDownload(zipBlob, downloadFilename);
    } catch (err) {
      console.error('ZIP export error:', err);
    } finally {
      setZipProgress(null);
      setIsZipRenameModalOpen(false);
    }
  };

  const isSettingsLocked = summary.isProcessing;

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      
      {/* 1. Header & Mode Switcher */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              Batch Processing Studio
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Process hundreds of images simultaneously with controlled concurrency, high speed, and zero remote uploads.
            </p>
          </div>

          {/* Concurrency Selector */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 pl-2">
              Concurrency:
            </span>
            {[1, 2, 3].map((workers) => (
              <button
                key={workers}
                type="button"
                disabled={isSettingsLocked}
                onClick={() => setConcurrency(workers)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  concurrency === workers
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
                title={`${workers} concurrent images processed simultaneously`}
              >
                {workers}x
              </button>
            ))}
          </div>
        </div>

        {/* Operation Modes Navigation */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { id: 'compress', label: 'Batch Compress', icon: Minimize2, desc: 'Exact Target KB Engine' },
            { id: 'resize', label: 'Batch Resize', icon: Maximize2, desc: 'Dimensions & Scale' },
            { id: 'convert', label: 'Batch Convert', icon: RefreshCw, desc: 'JPG, PNG, WebP, AVIF' },
            { id: 'pipeline', label: 'Combined Pipeline', icon: Sliders, desc: 'All tools in 1-pass' },
          ].map((mode) => {
            const Icon = mode.icon;
            const isSelected = activeMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                disabled={isSettingsLocked}
                onClick={() => setActiveMode(mode.id as any)}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer disabled:opacity-60 ${
                  isSelected
                    ? 'border-teal-600 bg-teal-50/50 shadow-xs dark:border-teal-500 dark:bg-teal-950/30'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-850/50 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${isSelected ? 'text-teal-600 dark:text-teal-400' : 'text-slate-500'}`} />
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                    {mode.label}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  {mode.desc}
                </p>
              </button>
            );
          })}
        </div>

        {/* Active Mode Specific Configuration Controls */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
          
          {/* 1. BATCH COMPRESS */}
          {activeMode === 'compress' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Target Size Limit for all images
                </label>
                <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                  Powered by Round 1 Exact KB Engine
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {[20, 50, 100, 200, 500, 1024].map((kbVal) => {
                  const isSelected = targetKB === kbVal;
                  const label = kbVal >= 1024 ? '1 MB' : `${kbVal} KB`;
                  return (
                    <button
                      key={kbVal}
                      type="button"
                      disabled={isSettingsLocked}
                      onClick={() => {
                        setTargetKB(kbVal);
                        setCustomKB(String(kbVal));
                      }}
                      className={`px-4 py-2 text-xs font-extrabold rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-teal-600 text-white border-teal-600 shadow-xs dark:bg-teal-500'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}

                {/* Custom target input */}
                <div className="relative flex items-center w-36">
                  <input
                    type="text"
                    disabled={isSettingsLocked}
                    value={customKB}
                    onChange={(e) => handleCustomKBChange(e.target.value)}
                    placeholder="Custom"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs font-bold outline-none focus:border-teal-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <span className="absolute right-3 text-[10px] font-bold text-slate-400 pointer-events-none">
                    KB
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 2. BATCH RESIZE */}
          {activeMode === 'resize' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex gap-2">
                {[
                  { id: 'dimensions', label: 'Exact Width & Height' },
                  { id: 'percentage', label: 'Scale by Percentage' },
                  { id: 'max_dimension', label: 'Max Edge Limit' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    disabled={isSettingsLocked}
                    onClick={() => setResizeMode(m.id as any)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      resizeMode === m.id
                        ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {resizeMode === 'dimensions' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Width (px)</label>
                    <input
                      type="text"
                      disabled={isSettingsLocked}
                      value={resizeWidth}
                      onChange={(e) => setResizeWidth(e.target.value.replace(/\D/g, ''))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold outline-none focus:border-teal-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      placeholder="1920"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Height (px)</label>
                    <input
                      type="text"
                      disabled={isSettingsLocked || lockAspect}
                      value={resizeHeight}
                      onChange={(e) => setResizeHeight(e.target.value.replace(/\D/g, ''))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold outline-none focus:border-teal-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white disabled:opacity-50"
                      placeholder={lockAspect ? 'Auto aspect' : '1080'}
                    />
                  </div>
                  <div className="pt-5">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={lockAspect}
                        disabled={isSettingsLocked}
                        onChange={(e) => setLockAspect(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 dark:bg-slate-800"
                      />
                      <span>Lock Proportions</span>
                    </label>
                  </div>
                </div>
              )}

              {resizeMode === 'percentage' && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-700 dark:text-slate-300">Scale factor:</span>
                    <span className="font-mono text-teal-600 dark:text-teal-400 font-extrabold">{resizePercentage}%</span>
                  </div>
                  <div className="flex gap-2">
                    {[25, 50, 75, 80].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setResizePercentage(p)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border cursor-pointer ${
                          resizePercentage === p
                            ? 'bg-teal-600 text-white border-teal-600'
                            : 'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {p}%
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {resizeMode === 'max_dimension' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Max bounding box edge:</label>
                  <div className="flex gap-2">
                    {[1080, 1920, 2560, 3840].map((dim) => (
                      <button
                        key={dim}
                        type="button"
                        onClick={() => setMaxDimension(dim)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border cursor-pointer ${
                          maxDimension === dim
                            ? 'bg-teal-600 text-white border-teal-600'
                            : 'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {dim}px
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. BATCH CONVERT / PIPELINE FORMAT CONTROLS */}
          <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            
            {/* Target Format */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Target Output Format
              </label>
              <select
                value={targetFormat}
                disabled={isSettingsLocked}
                onChange={(e) => setTargetFormat(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold outline-none focus:border-teal-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="auto">Auto (Preserve source format)</option>
                <option value="webp">WEBP (Recommended modern standard)</option>
                <option value="jpeg">JPG / JPEG (Universal compatibility)</option>
                <option value="png">PNG (Lossless transparency)</option>
                {isAvifSupported && <option value="avif">AVIF (Next-Gen High Efficiency)</option>}
              </select>
            </div>

            {/* Quality Slider (Lossy only) */}
            {targetFormat !== 'png' && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-700 dark:text-slate-300">Base Encoding Quality</span>
                  <span className="font-mono text-teal-600 dark:text-teal-400 font-extrabold">{Math.round(quality * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  disabled={isSettingsLocked}
                  value={quality}
                  onChange={(e) => setQuality(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600 dark:bg-slate-700"
                />
              </div>
            )}
          </div>

          {/* 4. Extra pipeline enhancers */}
          {activeMode === 'pipeline' && (
            <div className="mt-4 flex flex-wrap items-center gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enhanceQuality}
                  disabled={isSettingsLocked}
                  onChange={(e) => setEnhanceQuality(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 dark:bg-slate-800"
                />
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>Auto-Enhance Contrast & Edge Sharpen</span>
              </label>

              <div className="flex items-center gap-1.5 text-xs font-bold">
                <span className="text-slate-500">Rotate all:</span>
                {[0, 90, 180, 270].map((deg) => (
                  <button
                    key={deg}
                    type="button"
                    onClick={() => setRotation(deg as any)}
                    className={`px-2 py-1 rounded text-[11px] font-mono cursor-pointer ${
                      rotation === deg ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800'
                    }`}
                  >
                    {deg}&deg;
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* 2. Drag & Drop Files Zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files) handleFilesAdded(Array.from(e.dataTransfer.files));
        }}
        onClick={() => !isSettingsLocked && fileInputRef.current?.click()}
        className={`rounded-2xl border-2 border-dashed p-7 text-center transition-all cursor-pointer ${
          isSettingsLocked
            ? 'border-slate-200 bg-slate-50/50 opacity-60 cursor-not-allowed dark:border-slate-800'
            : 'border-teal-200/80 bg-teal-50/20 hover:bg-teal-50/40 hover:border-teal-400 dark:border-slate-800 dark:bg-slate-900/20 dark:hover:bg-slate-900/40'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          disabled={isSettingsLocked}
          onChange={(e) => e.target.files && handleFilesAdded(Array.from(e.target.files))}
          className="hidden"
        />
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-600/10 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400">
          <Upload className="h-6 w-6" />
        </div>
        <h4 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
          Add images to Batch Queue
        </h4>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Drop bulk folders or select multiple photos &bull; 100% private in-browser memory
        </p>
      </div>

      {/* 3. Batch Queue Table & Action Bar */}
      {items.length > 0 && (
        <div className="space-y-4">
          
          {/* Queue Actions & Real Statistics Bar */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-3">
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-teal-500" />
                    Queue Status ({items.length} files)
                  </h4>
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    {summary.completed > 0 && (
                      <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 rounded-md">
                        {summary.completed} Completed
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

                {/* Real-time stats */}
                {summary.completed > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-slate-500 dark:text-slate-400">
                    <span>Input: <strong>{formatBytes(summary.totalOriginalSize)}</strong></span>
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

              {/* Master Actions */}
              <div className="flex flex-wrap items-center gap-2">
                {!summary.isProcessing ? (
                  <button
                    type="button"
                    onClick={() => processorRef.current?.start()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 text-xs font-bold shadow-sm transition-all cursor-pointer"
                  >
                    <Zap className="h-3.5 w-3.5" />
                    Process Batch ({items.length})
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => processorRef.current?.cancelAll()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 text-xs font-bold shadow-sm transition-all cursor-pointer"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Cancel All
                  </button>
                )}

                {summary.completed > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsZipRenameModalOpen(true)}
                    disabled={zipProgress !== null}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 text-xs font-bold shadow-sm transition-all cursor-pointer"
                  >
                    <Archive className="h-3.5 w-3.5" />
                    {zipProgress !== null ? `Archiving ${zipProgress}%...` : `Export ZIP (${summary.completed})`}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => processorRef.current?.clearAll()}
                  className="p-2 text-xs font-bold text-rose-500 hover:bg-rose-50 rounded-lg dark:hover:bg-rose-950/40 cursor-pointer"
                  title="Clear All Files"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            {summary.isProcessing && (
              <div className="mt-4 space-y-1.5">
                <div className="flex justify-between text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-3 w-3 animate-spin text-teal-500" />
                    Executing transformations with {concurrency} workers...
                  </span>
                  <span>
                    {summary.completed + summary.failed} / {summary.total} (
                    {Math.round(((summary.completed + summary.failed) / summary.total) * 100)}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-teal-600 transition-all duration-300 dark:bg-teal-500"
                    style={{ width: `${((summary.completed + summary.failed) / summary.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Queue Item Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((item) => {
              const isCompleted = item.status === 'COMPLETED';
              const isProcessing = item.status === 'PROCESSING';
              const isFailed = item.status === 'FAILED';
              const isCancelled = item.status === 'CANCELLED';

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border p-3.5 flex flex-col justify-between transition-all ${
                    isCompleted
                      ? 'border-emerald-100 bg-white dark:border-emerald-950/40 dark:bg-slate-900/80'
                      : isFailed
                      ? 'border-rose-200 bg-rose-50/20 dark:border-rose-900/40 dark:bg-slate-900/80'
                      : isProcessing
                      ? 'border-teal-300 bg-teal-50/20 ring-1 ring-teal-400 dark:border-teal-800 dark:bg-slate-900/80'
                      : 'border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900/50'
                  }`}
                >
                  <div className="flex gap-3 items-start">
                    {/* Thumbnail */}
                    <div className="h-14 w-14 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 flex items-center justify-center relative">
                      {item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl}
                          alt={item.filename}
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <FileImage className="h-5 w-5 text-slate-400" />
                      )}
                      <span className="absolute bottom-0 right-0 bg-slate-900/80 text-[7px] font-mono font-bold text-white px-1 rounded-tl">
                        {item.inputFormat}
                      </span>
                    </div>

                    {/* Metadata & Status */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate" title={item.filename}>
                          {item.filename}
                        </h5>
                        <div className="shrink-0">
                          {isCompleted && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded">
                              <CheckCircle className="h-2.5 w-2.5" /> Done
                            </span>
                          )}
                          {isProcessing && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/50 px-1.5 py-0.5 rounded">
                              <RefreshCw className="h-2.5 w-2.5 animate-spin" /> Running
                            </span>
                          )}
                          {isFailed && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-1.5 py-0.5 rounded">
                              <AlertTriangle className="h-2.5 w-2.5" /> Failed
                            </span>
                          )}
                          {isCancelled && (
                            <span className="text-[9px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                              Cancelled
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Specs */}
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono flex flex-wrap items-center gap-1">
                        <span>{formatBytes(item.originalSize)}</span>
                        {isCompleted && item.outputSize && (
                          <>
                            <ArrowRight className="h-2.5 w-2.5 text-teal-500" />
                            <span className="font-bold text-slate-900 dark:text-white">
                              {formatBytes(item.outputSize)}
                            </span>
                            <span className={`font-bold ${
                              item.isLarger ? 'text-amber-600' : 'text-emerald-600 dark:text-emerald-400'
                            }`}>
                              ({item.isLarger ? `+${item.reductionPercentage}%` : `-${item.reductionPercentage}%`})
                            </span>
                          </>
                        )}
                      </div>

                      {isFailed && item.errorMessage && (
                        <p className="text-[9px] text-rose-600 dark:text-rose-400 truncate" title={item.errorMessage}>
                          {item.errorMessage}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <div className="text-[9px] font-mono text-slate-400">
                      {isCompleted && item.processingTimeMs && (
                        <span>{item.processingTimeMs}ms</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {isCompleted && (
                        <button
                          type="button"
                          onClick={() => handleDownloadSingle(item)}
                          className="inline-flex items-center gap-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg px-2 py-0.5 text-[10px] font-bold cursor-pointer transition-colors shadow-2xs"
                        >
                          <Download className="h-2.5 w-2.5" />
                          Save
                        </button>
                      )}

                      {(isFailed || isCancelled) && (
                        <button
                          type="button"
                          onClick={() => processorRef.current?.retryItem(item.id)}
                          className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-lg px-1.5 py-0.5 text-[10px] font-bold cursor-pointer"
                        >
                          <RotateCw className="h-2.5 w-2.5" />
                          Retry
                        </button>
                      )}

                      {isProcessing && (
                        <button
                          type="button"
                          onClick={() => processorRef.current?.cancelItem(item.id)}
                          className="inline-flex items-center gap-1 text-rose-500 hover:bg-rose-50 rounded-lg px-1.5 py-0.5 text-[10px] font-bold cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => processorRef.current?.removeItem(item.id)}
                        className="p-1 text-slate-400 hover:text-rose-500 rounded-lg cursor-pointer"
                        title="Remove"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* ZIP Rename Dialog */}
      <RenameModal
        isOpen={isZipRenameModalOpen}
        originalName={`QuickResize_Batch_${items.filter((i) => i.status === 'COMPLETED').length}_images.zip`}
        onClose={() => setIsZipRenameModalOpen(false)}
        onConfirm={(confirmedName) => handleDownloadZip(confirmedName)}
      />

    </div>
  );
}
