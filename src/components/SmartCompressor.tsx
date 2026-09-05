/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Download, 
  Upload, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Layers, 
  Sparkles,
  ArrowRight,
  RefreshCw,
  Sliders,
  Zap,
  Archive,
  Eye,
  ShieldCheck,
  HelpCircle,
  X,
  Scale,
  FileText,
  Camera,
  Share2,
  Globe,
  Mail,
  Youtube,
  Check,
  Maximize2
} from 'lucide-react';
import JSZip from 'jszip';
import { 
  compressToExactKB, 
  CompressionResult, 
  generateCompressedFileName 
} from '../core/compression/compressionEngine';
import { 
  COMPRESSION_SMART_PRESETS, 
  TARGET_SIZE_PRESETS,
  CompressionSmartPreset 
} from '../core/presets/compressionPresets';
import RenameModal from './RenameModal';
import CompareModal from './CompareModal';
import { ProcessedFile } from '../types';

export interface SmartCompressorItem {
  id: string;
  file: File;
  name: string;
  originalSize: number;
  originalWidth: number;
  originalHeight: number;
  originalUrl: string;
  result?: CompressionResult;
  status: 'idle' | 'processing' | 'done' | 'error';
  currentStage?: 'preparing' | 'testing' | 'optimizing' | 'finalizing';
  errorMessage?: string;
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

const PRESET_ICONS: Record<string, React.ReactNode> = {
  government: <FileText className="h-4 w-4" />,
  passport: <Camera className="h-4 w-4" />,
  signature: <FileText className="h-4 w-4" />,
  whatsapp: <Share2 className="h-4 w-4" />,
  instagram: <Share2 className="h-4 w-4" />,
  website: <Globe className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  youtube: <Youtube className="h-4 w-4" />,
};

export interface SmartCompressorProps {
  initialTargetKB?: number;
  initialFormat?: 'jpeg' | 'webp' | 'png' | 'avif';
  initialPresetId?: string | null;
  initialQualityMode?: 'auto' | 'high' | 'balanced' | 'smallest';
}

export default function SmartCompressor({
  initialTargetKB,
  initialFormat,
  initialPresetId,
  initialQualityMode,
}: SmartCompressorProps = {}) {
  // Target Size state
  const isCustomInit = initialTargetKB !== undefined && ![20, 50, 100, 200, 500, 1024].includes(initialTargetKB);
  const [targetSizeKB, setTargetSizeKB] = useState<number>(initialTargetKB || 100);
  const [isCustomMode, setIsCustomMode] = useState<boolean>(isCustomInit);
  const [customValue, setCustomValue] = useState<string>(
    initialTargetKB ? (initialTargetKB >= 1024 ? (initialTargetKB / 1024).toString() : initialTargetKB.toString()) : '100'
  );
  const [customUnit, setCustomUnit] = useState<'KB' | 'MB'>(
    initialTargetKB && initialTargetKB >= 1024 ? 'MB' : 'KB'
  );

  // Smart Presets state
  const [activePresetId, setActivePresetId] = useState<string | null>(initialPresetId ?? null);

  // Compression options
  const [format, setFormat] = useState<'jpeg' | 'webp' | 'png' | 'avif'>(initialFormat || 'jpeg');
  const [qualityMode, setQualityMode] = useState<'auto' | 'high' | 'balanced' | 'smallest'>(initialQualityMode || 'auto');
  const [enhanceQuality, setEnhanceQuality] = useState<boolean>(true);
  const [customWidth, setCustomWidth] = useState<string>('');
  const [customHeight, setCustomHeight] = useState<string>('');
  const [maintainAspect, setMaintainAspect] = useState<boolean>(true);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Sync state when props change
  useEffect(() => {
    if (initialTargetKB !== undefined) {
      setTargetSizeKB(initialTargetKB);
      if (![20, 50, 100, 200, 500, 1024].includes(initialTargetKB)) {
        setIsCustomMode(true);
        if (initialTargetKB >= 1024) {
          setCustomUnit('MB');
          setCustomValue((initialTargetKB / 1024).toString());
        } else {
          setCustomUnit('KB');
          setCustomValue(initialTargetKB.toString());
        }
      } else {
        setIsCustomMode(false);
      }
    }
    if (initialFormat) setFormat(initialFormat);
    if (initialPresetId !== undefined) setActivePresetId(initialPresetId);
    if (initialQualityMode) setQualityMode(initialQualityMode);
  }, [initialTargetKB, initialFormat, initialPresetId, initialQualityMode]);

  // Files and processing state
  const [items, setItems] = useState<SmartCompressorItem[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Modals state
  const [renameTarget, setRenameTarget] = useState<{ url: string; suggestedName: string; blob?: Blob } | null>(null);
  const [compareTarget, setCompareTarget] = useState<ProcessedFile | null>(null);

  // References
  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compute effective target KB
  const effectiveTargetKB = isCustomMode 
    ? (customUnit === 'MB' 
        ? Math.max(1, (parseFloat(customValue) || 1) * 1024) 
        : Math.max(1, parseInt(customValue, 10) || 100))
    : targetSizeKB;

  // Cleanup Object URLs on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      items.forEach((item) => {
        if (item.originalUrl) URL.revokeObjectURL(item.originalUrl);
        if (item.result?.url) URL.revokeObjectURL(item.result.url);
      });
    };
  }, []);

  // Handle Preset selection
  const handleSelectPreset = (preset: CompressionSmartPreset) => {
    setActivePresetId(preset.id);
    setIsCustomMode(false);
    setTargetSizeKB(preset.targetSizeKB);
    if (preset.preferredFormat !== 'auto') {
      setFormat(preset.preferredFormat as any);
    }
    setQualityMode(preset.qualityMode);
    if (preset.fixedWidth && preset.fixedHeight) {
      setCustomWidth(String(preset.fixedWidth));
      setCustomHeight(String(preset.fixedHeight));
    } else {
      setCustomWidth('');
      setCustomHeight('');
    }
    setStatusNotice(`Preset applied: ${preset.name}. Click "Compress to ${preset.targetSizeKB} KB" to process.`);
  };

  // Run compression process with AbortSignal cancellation support
  const runCompression = useCallback(async (
    targetItems?: SmartCompressorItem[]
  ) => {
    if (isProcessing) return; // Prevent double-triggering

    const listToProcess = targetItems || items;
    if (listToProcess.length === 0) return;

    // Abort previous run if in-flight
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const currentAbort = new AbortController();
    abortControllerRef.current = currentAbort;

    setIsProcessing(true);
    setStatusNotice(null);

    // Mark items as processing
    setItems((prev) =>
      prev.map((it) => {
        const isInList = listToProcess.some((target) => target.id === it.id);
        return isInList ? { ...it, status: 'processing', currentStage: 'preparing', errorMessage: undefined } : it;
      })
    );

    const targetKB = effectiveTargetKB;
    const cWidth = customWidth ? parseInt(customWidth, 10) : undefined;
    const cHeight = customHeight ? parseInt(customHeight, 10) : undefined;

    for (const item of listToProcess) {
      if (currentAbort.signal.aborted) break;

      try {
        const result = await compressToExactKB(item.file, {
          targetSizeKB: targetKB,
          format,
          qualityMode,
          customWidth: cWidth,
          customHeight: cHeight,
          maintainAspectRatio: maintainAspect,
          enhanceQuality,
          signal: currentAbort.signal,
          requestId: item.id,
          onStageChange: (stage) => {
            setItems((prev) =>
              prev.map((it) => (it.id === item.id ? { ...it, currentStage: stage } : it))
            );
          },
        });

        if (currentAbort.signal.aborted) {
          URL.revokeObjectURL(result.url);
          break;
        }

        setItems((prev) =>
          prev.map((it) => {
            if (it.id === item.id) {
              if (it.result?.url) URL.revokeObjectURL(it.result.url);
              return {
                ...it,
                status: 'done',
                result,
                currentStage: undefined,
                errorMessage: undefined,
              };
            }
            return it;
          })
        );
      } catch (err: any) {
        if (err.name === 'AbortError' || currentAbort.signal.aborted) {
          break;
        }
        console.error('Compression failed for item:', item.name, err);
        setItems((prev) =>
          prev.map((it) =>
            it.id === item.id
              ? {
                  ...it,
                  status: 'error',
                  currentStage: undefined,
                  errorMessage: err.message || 'Compression failed. Please try a different format or size.',
                }
              : it
          )
        );
      }
    }

    if (currentAbort.signal.aborted) {
      setStatusNotice('Compression cancelled.');
      setItems((prev) =>
        prev.map((it) => (it.status === 'processing' ? { ...it, status: 'idle', currentStage: undefined } : it))
      );
    }

    setIsProcessing(false);
  }, [items, effectiveTargetKB, format, qualityMode, customWidth, customHeight, maintainAspect, enhanceQuality]);

  // Cancel in-flight compression
  const handleCancelCompression = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsProcessing(false);
    setStatusNotice('Compression cancelled.');
  };

  // Add files to queue and pre-load natural dimensions
  const addFiles = async (newFiles: File[]) => {
    if (newFiles.length === 0) return;

    const newItems: SmartCompressorItem[] = [];

    for (const file of newFiles) {
      const origUrl = URL.createObjectURL(file);
      // Read dimensions quickly
      let dims = { w: 0, h: 0 };
      if (typeof createImageBitmap === 'function') {
        try {
          const bmp = await createImageBitmap(file);
          dims = { w: bmp.width, h: bmp.height };
          bmp.close();
        } catch {
          // Fallback to Image element
        }
      }
      if (dims.w === 0) {
        const img = new Image();
        dims = await new Promise<{ w: number; h: number }>((resolve) => {
          img.onload = () => resolve({ w: img.naturalWidth || img.width, h: img.naturalHeight || img.height });
          img.onerror = () => resolve({ w: 0, h: 0 });
          img.src = origUrl;
        });
      }

      newItems.push({
        id: Math.random().toString(36).substring(2, 11),
        file,
        name: file.name,
        originalSize: file.size,
        originalWidth: dims.w,
        originalHeight: dims.h,
        originalUrl: origUrl,
        status: 'idle',
      });
    }

    setItems((prev) => [...prev, ...newItems]);
    setStatusNotice(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const rawList = (Array.from(e.dataTransfer.files) as File[]).filter((f) =>
        f.type.startsWith('image/')
      );
      addFiles(rawList);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const rawList = (Array.from(e.target.files) as File[]).filter((f) => f.type.startsWith('image/'));
      addFiles(rawList);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      const match = prev.find((it) => it.id === id);
      if (match?.originalUrl) URL.revokeObjectURL(match.originalUrl);
      if (match?.result?.url) URL.revokeObjectURL(match.result.url);
      return prev.filter((it) => it.id !== id);
    });
  };

  const clearAll = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    items.forEach((it) => {
      if (it.originalUrl) URL.revokeObjectURL(it.originalUrl);
      if (it.result?.url) URL.revokeObjectURL(it.result.url);
    });
    setItems([]);
    setIsProcessing(false);
    setStatusNotice(null);
  };

  // Trigger download with rename modal or direct save
  const handleDownloadSingle = (item: SmartCompressorItem) => {
    if (!item.result?.url) return;
    const suggested = generateCompressedFileName(item.name, effectiveTargetKB, item.result.format);
    setRenameTarget({
      url: item.result.url,
      suggestedName: suggested,
      blob: item.result.blob,
    });
  };

  // Download all completed items as a flat ZIP file
  const handleDownloadAllZip = async () => {
    const doneItems = items.filter((it) => it.status === 'done' && it.result?.blob);
    if (doneItems.length === 0) return;

    const zip = new JSZip();

    doneItems.forEach((it) => {
      if (it.result?.blob) {
        const fileName = generateCompressedFileName(it.name, effectiveTargetKB, it.result.format);
        zip.file(fileName, it.result.blob);
      }
    });

    try {
      const content = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `QuickResize_${effectiveTargetKB}KB_Batch.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Failed to generate ZIP:', err);
    }
  };

  // Launch CompareModal
  const handleOpenCompare = (item: SmartCompressorItem) => {
    if (!item.result?.url) return;

    const processedFile: ProcessedFile = {
      id: item.id,
      file: item.file,
      name: item.name,
      originalSize: item.originalSize,
      originalWidth: item.originalWidth || item.result.originalWidth,
      originalHeight: item.originalHeight || item.result.originalHeight,
      originalFormat: item.file.type || 'image/jpeg',
      originalUrl: item.originalUrl,
      status: item.status,
      outputSize: item.result.compressedSize,
      outputWidth: item.result.width,
      outputHeight: item.result.height,
      outputFormat: item.result.format,
      outputUrl: item.result.url,
      outputBlob: item.result.blob,
      reductionPercentage: item.result.reductionPercentage,
      settings: {
        mode: 'compress',
        targetSizeKB: effectiveTargetKB,
        maintainAspectRatio: true,
        quality: item.result.qualityUsed,
        format: item.result.format.replace('image/', '') as any,
      },
    };

    setCompareTarget(processedFile);
  };

  const completedCount = items.filter((it) => it.status === 'done').length;
  const activePreset = COMPRESSION_SMART_PRESETS.find((p) => p.id === activePresetId);

  return (
    <div id="smart-compressor-container" className="space-y-6 select-none max-w-6xl mx-auto">
      
      {/* 1. Header & Trust Banner */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 mb-2">
              <Scale className="h-3.5 w-3.5 text-indigo-600" />
              <span>Target File Size Engine</span>
            </div>
            <h2 className="font-sans text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Target File Size Compression
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Specify your exact KB/MB target limit. The engine uses binary quality search and adaptive dimension scaling to produce files near or under your target without severe quality loss.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>100% Local In-Browser</span>
            </span>
          </div>
        </div>

        {/* 2. Target File Size Selection Controls */}
        <div className="mt-6 border-t border-slate-100 pt-6 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              1. Choose Target File Size:
            </label>
            <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
              Active: {effectiveTargetKB >= 1024 ? `${(effectiveTargetKB / 1024).toFixed(1)} MB` : `${effectiveTargetKB} KB`}
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {TARGET_SIZE_PRESETS.map((preset) => {
              const isActive = !isCustomMode && targetSizeKB === preset.valueKB;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setTargetSizeKB(preset.valueKB);
                    setIsCustomMode(false);
                    setStatusNotice(null);
                  }}
                  className={`rounded-xl py-2.5 px-3 text-xs font-bold transition-all text-center cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => {
                setIsCustomMode(true);
                setStatusNotice(null);
              }}
              className={`rounded-xl py-2.5 px-3 text-xs font-bold transition-all text-center cursor-pointer col-span-3 sm:col-span-1 ${
                isCustomMode
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750'
              }`}
            >
              Custom
            </button>
          </div>

          {/* Custom Size Input Field */}
          {isCustomMode && (
            <div className="mt-4 flex flex-wrap items-center gap-3 p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/70 dark:border-indigo-900/40 animate-fade-in max-w-md">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Custom Target:
              </span>
              <div className="flex items-center gap-1.5 flex-1">
                <input
                  type="number"
                  min="5"
                  max={customUnit === 'MB' ? 50 : 50000}
                  step={customUnit === 'MB' ? 0.1 : 1}
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:border-indigo-500"
                  placeholder="e.g. 75"
                />
                <select
                  value={customUnit}
                  onChange={(e) => setCustomUnit(e.target.value as 'KB' | 'MB')}
                  aria-label="Custom target size unit"
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none cursor-pointer"
                >
                  <option value="KB">KB</option>
                  <option value="MB">MB</option>
                </select>
                <span className="text-[11px] text-slate-500 font-mono ml-2">
                  (= {effectiveTargetKB} KB)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 3. Smart Presets Section */}
        <div className="mt-6 border-t border-slate-100 pt-6 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>Smart Compression Presets</span>
            </label>
            <span className="text-[11px] text-slate-450 dark:text-slate-400">
              Quick presets for common uses
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mt-3">
            {COMPRESSION_SMART_PRESETS.map((preset) => {
              const isSelected = activePresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`rounded-xl p-2.5 text-left transition-all flex flex-col justify-between cursor-pointer border ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 dark:bg-indigo-950/40 dark:border-indigo-500 dark:text-white ring-1 ring-indigo-500'
                      : 'border-slate-100 bg-slate-50 hover:bg-slate-100 text-slate-800 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-indigo-600 dark:text-indigo-400">
                      {PRESET_ICONS[preset.id] || <Sparkles className="h-4 w-4" />}
                    </span>
                    <span className="rounded bg-slate-200/80 px-1 py-0.5 font-mono text-[9px] font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                      {preset.targetSizeKB} KB
                    </span>
                  </div>
                  <div>
                    <div className="text-xs font-bold truncate">{preset.shortName}</div>
                    <div className="text-[10px] text-slate-450 dark:text-slate-400 truncate mt-0.5">
                      {preset.badge}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Preset Recommendation Note */}
          {activePreset && (
            <div className="mt-3.5 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800/40 dark:text-slate-300 flex items-start gap-2 border border-slate-100 dark:border-slate-800 animate-fade-in">
              <HelpCircle className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold text-slate-900 dark:text-white mr-1.5">{activePreset.name}:</span>
                <span>{activePreset.recommendationNote}</span>
              </div>
            </div>
          )}
        </div>

        {/* 4. Format & Quality Strategy Options */}
        <div className="mt-6 border-t border-slate-100 pt-6 dark:border-slate-800 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Preferred Format */}
            <div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                Output Format:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(['jpeg', 'webp', 'png', 'avif'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => {
                      setFormat(fmt);
                      setStatusNotice(null);
                    }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold tracking-wider uppercase transition-all cursor-pointer ${
                      format === fmt
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            {/* Quality Mode Strategy */}
            <div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                Quality Control:
              </span>
              <div className="flex flex-wrap gap-1 bg-slate-100 dark:bg-slate-800/70 p-1 rounded-xl">
                {(['auto', 'high', 'balanced', 'smallest'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setQualityMode(mode)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold capitalize transition-all cursor-pointer ${
                      qualityMode === mode
                        ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    {mode === 'auto' ? 'Auto (Smart)' : mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Advanced Toggle */}
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 cursor-pointer"
              >
                <Sliders className="h-3.5 w-3.5" />
                <span>{showAdvanced ? 'Hide Advanced Controls' : 'More Options'}</span>
              </button>
            </div>
          </div>

          {/* Collapsible Advanced Settings (Dimensions & Enhancement) */}
          {showAdvanced && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 space-y-3 animate-fade-in">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Max Dimensions:
                  </span>
                  <input
                    type="number"
                    value={customWidth}
                    onChange={(e) => setCustomWidth(e.target.value)}
                    placeholder="Width px"
                    className="w-24 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none"
                  />
                  <span className="text-slate-400 text-xs">&times;</span>
                  <input
                    type="number"
                    value={customHeight}
                    onChange={(e) => setCustomHeight(e.target.value)}
                    placeholder="Height px"
                    className="w-24 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none"
                  />
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer ml-2">
                    <input
                      type="checkbox"
                      checked={maintainAspect}
                      onChange={(e) => setMaintainAspect(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span>Lock aspect ratio</span>
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="compress-enhance-quality"
                    checked={enhanceQuality}
                    onChange={(e) => setEnhanceQuality(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <label
                    htmlFor="compress-enhance-quality"
                    className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                    <span>Edge Sharpening & Color Boost</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. Drag & Drop Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="rounded-2xl border-2 border-dashed border-slate-200 bg-white/60 p-8 text-center hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/20 dark:hover:bg-slate-900/40 cursor-pointer transition-all"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 mb-3">
          <Upload className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          Drop your image(s) here or click to browse
        </h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Supports JPEG, PNG, WebP, AVIF, HEIC, BMP &bull; Files processed locally on your device
        </p>
      </div>

      {/* Status Notice if any */}
      {statusNotice && (
        <div className="rounded-xl bg-indigo-50/70 p-3 text-xs font-semibold text-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between">
          <span>{statusNotice}</span>
          <button onClick={() => setStatusNotice(null)} className="text-indigo-500 hover:text-indigo-700 cursor-pointer p-0.5">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 6. Queue Toolbar & Action Controls */}
      {items.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              Queue: {items.length} {items.length === 1 ? 'image' : 'images'}
            </span>
            <span className="text-slate-300 dark:text-slate-700">&bull;</span>
            <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
              Target: {effectiveTargetKB} KB
            </span>

            {isProcessing && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 animate-pulse ml-2">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>
                  {items.find((it) => it.status === 'processing')?.currentStage 
                    ? `${items.find((it) => it.status === 'processing')?.currentStage}...`
                    : 'Compressing...'}
                </span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isProcessing ? (
              <button
                type="button"
                onClick={handleCancelCompression}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 px-4 py-2 text-xs font-bold transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
                <span>Cancel</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => runCompression()}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 text-xs font-bold transition-all shadow-md shadow-indigo-100 dark:shadow-none cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>{completedCount > 0 ? 'Compress Again' : `Compress to ${effectiveTargetKB} KB`}</span>
              </button>
            )}

            {completedCount > 1 && (
              <button
                type="button"
                onClick={handleDownloadAllZip}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-bold transition-all cursor-pointer shadow-sm"
              >
                <Archive className="h-3.5 w-3.5" />
                <span>Download ZIP ({completedCount})</span>
              </button>
            )}

            <button
              type="button"
              onClick={clearAll}
              className="text-xs font-semibold text-slate-400 hover:text-red-500 cursor-pointer px-2 py-1.5 transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>
      )}

      {/* 7. Results List Panel with Professional Comparison */}
      {items.length > 0 && (
        <div className="grid grid-cols-1 gap-5">
          {items.map((it) => {
            const res = it.result;
            return (
              <div
                key={it.id}
                className="rounded-2xl border border-slate-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60 shadow-sm flex flex-col md:flex-row gap-5 items-start transition-all"
              >
                {/* Left: Thumbnail & Quick Compare Button */}
                <div className="w-full md:w-48 shrink-0 flex flex-col gap-2">
                  <div className="w-full h-36 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 overflow-hidden relative flex items-center justify-center group">
                    {res?.url ? (
                      <>
                        <img
                          src={res.url}
                          alt={it.name}
                          className="max-w-full max-h-full object-contain cursor-pointer"
                          onClick={() => handleOpenCompare(it)}
                          referrerPolicy="no-referrer"
                        />
                        {res.reductionPercentage > 0 && (
                          <span className="absolute top-2 left-2 rounded-md bg-indigo-600 px-1.5 py-0.5 font-mono text-[9px] font-extrabold text-white shadow-sm">
                            -{res.reductionPercentage}%
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenCompare(it)}
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1 cursor-pointer backdrop-blur-[1px]"
                        >
                          <Eye className="h-4 w-4" /> Compare
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                        {it.status === 'processing' ? (
                          <>
                            <RefreshCw className="h-5 w-5 animate-spin text-indigo-500 mb-1" />
                            <span className="font-mono text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400">
                              {it.currentStage ? `${it.currentStage}...` : 'Processing...'}
                            </span>
                          </>
                        ) : (
                          <>
                            <Layers className="h-5 w-5 text-slate-300 mb-1" />
                            <span className="font-mono text-[10px] uppercase">Pending</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Compare button under thumbnail */}
                  {res && it.status === 'done' && (
                    <button
                      type="button"
                      onClick={() => handleOpenCompare(it)}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5 text-indigo-500" />
                      <span>Compare Before & After</span>
                    </button>
                  )}
                </div>

                {/* Right: Comprehensive Comparison Card */}
                <div className="flex-1 min-w-0 flex flex-col justify-between h-full space-y-3.5 w-full">
                  <div>
                    {/* Header: File Name, Target Status Badge & Remove */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-sans text-sm font-bold text-slate-900 dark:text-white truncate" title={it.name}>
                          {it.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          {/* Target Status Badge */}
                          {res && (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                                res.targetStatus === 'achieved'
                                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                  : res.targetStatus === 'close'
                                  ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                                  : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                              }`}
                            >
                              {res.targetStatus === 'achieved' && <CheckCircle2 className="h-3 w-3" />}
                              {res.targetStatus === 'close' && <AlertTriangle className="h-3 w-3" />}
                              {res.targetStatus === 'failed' && <AlertCircle className="h-3 w-3" />}
                              <span>{res.statusMessage}</span>
                            </span>
                          )}

                          {it.status === 'processing' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                              <RefreshCw className="h-3 w-3 animate-spin" />
                              <span>{it.currentStage ? `${it.currentStage}...` : 'Optimizing...'}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(it.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors p-1 cursor-pointer shrink-0"
                        title="Remove from queue"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Result Comparison Grid */}
                    {res ? (
                      <div className="mt-3.5 space-y-3">
                        {/* 4-Column Metric Summary */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-850">
                          <div>
                            <span className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider block">
                              Original
                            </span>
                            <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                              {formatBytes(res.originalSize)}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider block">
                              Compressed
                            </span>
                            <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                              {res.actualKB} KB
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider block">
                              Target
                            </span>
                            <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                              {res.targetSizeKB} KB
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider block">
                              Saved
                            </span>
                            <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              {res.reductionPercentage}% ({formatBytes(res.savedBytes)})
                            </span>
                          </div>
                        </div>

                        {/* Dimensions & Quality Details */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          <div>
                            <span>Dimensions: </span>
                            <span className="text-slate-450">{res.originalWidth}&times;{res.originalHeight}</span>
                            <span className="mx-1">&rarr;</span>
                            <span className="font-bold text-slate-900 dark:text-white">{res.width}&times;{res.height} px</span>
                          </div>
                          <span className="text-slate-300 dark:text-slate-700">&bull;</span>
                          <div>
                            <span>Format: </span>
                            <span className="font-bold text-slate-900 dark:text-white">{res.format.replace('image/', '').toUpperCase()}</span>
                          </div>
                          <span className="text-slate-300 dark:text-slate-700">&bull;</span>
                          <div>
                            <span>Quality: </span>
                            <span className="font-bold text-slate-900 dark:text-white">{Math.round(res.qualityUsed * 100)}%</span>
                          </div>
                          <span className="text-slate-300 dark:text-slate-700">&bull;</span>
                          <div>
                            <span>Time: </span>
                            <span className="font-bold text-slate-900 dark:text-white">{res.processingTimeMs} ms</span>
                          </div>
                        </div>

                        {/* Safety downscale message if triggered */}
                        {res.safetyDownscaled && res.safetyNotice && (
                          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-2 text-xs text-amber-800 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/40">
                            🛡️ {res.safetyNotice}
                          </div>
                        )}

                        {/* Format fallback notice if triggered */}
                        {res.fallbackFormatNotice && (
                          <div className="rounded-lg bg-sky-50 dark:bg-sky-950/30 p-2 text-xs text-sky-800 dark:text-sky-400 border border-sky-200/60 dark:border-sky-900/40">
                            ℹ️ {res.fallbackFormatNotice}
                          </div>
                        )}

                        {/* Suggestion / Advice if target failed or close */}
                        {res.targetStatus !== 'achieved' && res.suggestion && (
                          <div className="rounded-lg bg-slate-50 dark:bg-slate-950/50 p-2.5 text-xs text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800">
                            <span className="font-bold text-slate-900 dark:text-white">Recommendation: </span>
                            <span>{res.suggestion}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Idle item details */
                      <div className="mt-2 text-xs text-slate-500 font-mono">
                        Original: {formatBytes(it.originalSize)} &bull; {it.originalWidth || '--'}&times;{it.originalHeight || '--'} px
                      </div>
                    )}

                    {it.status === 'error' && (
                      <div className="mt-2 text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5 font-semibold">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{it.errorMessage}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-2.5">
                    {res && it.status === 'done' && (
                      <button
                        type="button"
                        onClick={() => handleDownloadSingle(it)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-bold text-white transition-all cursor-pointer shadow-sm shadow-indigo-100 dark:shadow-none"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download ({res.actualKB} KB)</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => runCompression([it])}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="h-3.5 w-3.5 text-indigo-500" />
                      <span>{it.status === 'done' ? 'Compress Again' : 'Compress This Image'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rename & Download Modal */}
      {renameTarget && (
        <RenameModal
          isOpen={!!renameTarget}
          originalName={renameTarget.suggestedName}
          onConfirm={(newName) => {
            if (!renameTarget) return;
            const link = document.createElement('a');
            link.href = renameTarget.url;
            link.download = newName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setRenameTarget(null);
          }}
          onClose={() => setRenameTarget(null)}
        />
      )}

      {/* Compare Modal (Before / After with Slider & Side-by-side) */}
      {compareTarget && (
        <CompareModal
          item={compareTarget}
          onClose={() => setCompareTarget(null)}
        />
      )}
    </div>
  );
}
