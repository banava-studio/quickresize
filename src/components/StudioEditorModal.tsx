/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, 
  Crop, 
  Maximize2, 
  RotateCw, 
  RotateCcw, 
  FlipHorizontal, 
  FlipVertical, 
  Sliders, 
  Sparkles, 
  Lock, 
  Unlock, 
  Download, 
  Check, 
  Undo2, 
  Redo2, 
  RotateCcw as ResetIcon, 
  Layers, 
  Zap, 
  RefreshCw, 
  FileText, 
  Info,
  Archive,
  ArrowRight
} from 'lucide-react';
import { 
  TransformState, 
  CropRect, 
  ResizeConfig, 
  ImageAdjustments, 
  AspectRatioType, 
  ResizeFitMode,
  Preset
} from '../types';
import { PRESETS } from '../presets';
import { 
  processImagePipeline, 
  RenderPipelineResult, 
  getRotatedDimensions, 
  getAbsoluteCropCoordinates, 
  calculateResizeOutputDimensions 
} from '../core/image/imagePipeline';
import { generateCompressedFileName } from '../core/compression/compressionEngine';
import ImageCropper from './ImageCropper';
import RenameModal from './RenameModal';

interface StudioEditorModalProps {
  isOpen: boolean;
  file: File;
  initialSettings?: Partial<TransformState>;
  onClose: () => void;
  onApplyAndSave?: (result: RenderPipelineResult, updatedState: TransformState) => void;
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export default function StudioEditorModal({
  isOpen,
  file,
  initialSettings,
  onClose,
  onApplyAndSave,
}: StudioEditorModalProps) {
  const [activeTab, setActiveTab] = useState<'crop' | 'resize' | 'presets' | 'enhance' | 'compress'>('resize');
  const [sourceImgUrl, setSourceImgUrl] = useState<string>('');
  const [origDims, setOrigDims] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Initial State Factory
  const createDefaultState = useCallback((w: number, h: number): TransformState => ({
    rotation: 0,
    flipH: false,
    flipV: false,
    crop: null,
    aspectRatio: 'free',
    zoom: 1.0,
    panX: 0,
    panY: 0,
    resize: {
      width: w,
      height: h,
      maintainAspectRatio: true,
      mode: 'fit',
      percentage: 100,
      maxDimensionType: 'none',
    },
    adjustments: {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      grayscale: false,
      sharpness: 0,
    },
    format: 'jpeg',
    targetSizeKB: undefined,
    quality: 0.85,
  }), []);

  const [state, setState] = useState<TransformState>(() => createDefaultState(800, 600));

  // History stack for Undo / Redo
  const [history, setHistory] = useState<TransformState[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Live preview result
  const [previewResult, setPreviewResult] = useState<RenderPipelineResult | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [renameTarget, setRenameTarget] = useState<{ url: string; suggestedName: string } | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize source image
  useEffect(() => {
    if (!isOpen || !file) return;

    const url = URL.createObjectURL(file);
    setSourceImgUrl(url);

    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      setOrigDims({ width: w, height: h });

      const initial = createDefaultState(w, h);
      if (initialSettings) {
        Object.assign(initial, initialSettings);
      }
      setState(initial);
      setHistory([initial]);
      setHistoryIndex(0);
    };
    img.src = url;

    return () => {
      URL.revokeObjectURL(url);
      if (previewResult?.url) URL.revokeObjectURL(previewResult.url);
    };
  }, [isOpen, file]);

  // Push new state snapshot to history
  const updateStateWithHistory = (updater: (prev: TransformState) => TransformState) => {
    setState((prev) => {
      const next = updater(prev);
      setHistory((hPrev) => {
        const trimmed = hPrev.slice(0, historyIndex + 1);
        return [...trimmed, next].slice(-25); // Max 25 history records
      });
      setHistoryIndex((iPrev) => Math.min(24, iPrev + 1));
      return next;
    });
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setState(history[newIndex]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setState(history[newIndex]);
    }
  };

  const handleResetAll = () => {
    const fresh = createDefaultState(origDims.width, origDims.height);
    updateStateWithHistory(() => fresh);
  };

  // Run live fast preview generation (Debounced & cancellable)
  const generatePreview = useCallback(async (currentState: TransformState) => {
    if (!file || origDims.width === 0) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsPreviewLoading(true);

    try {
      const res = await processImagePipeline(file, currentState, {
        isPreview: true,
        maxPreviewDimension: 900,
        signal: controller.signal,
      });

      if (!controller.signal.aborted) {
        setPreviewResult((prev) => {
          if (prev?.url) URL.revokeObjectURL(prev.url);
          return res;
        });
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Preview render error:', err);
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsPreviewLoading(false);
      }
    }
  }, [file, origDims]);

  // Trigger preview on state change
  useEffect(() => {
    if (!isOpen || origDims.width === 0) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      generatePreview(state);
    }, 60);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [state, isOpen, origDims, generatePreview]);

  // Handlers for Rotation & Flip
  const handleRotateCW = () => {
    updateStateWithHistory((s) => ({
      ...s,
      rotation: (((s.rotation + 90) % 360) as 0 | 90 | 180 | 270),
    }));
  };

  const handleRotateCCW = () => {
    updateStateWithHistory((s) => ({
      ...s,
      rotation: (((s.rotation + 270) % 360) as 0 | 90 | 180 | 270),
    }));
  };

  const handleFlipH = () => {
    updateStateWithHistory((s) => ({ ...s, flipH: !s.flipH }));
  };

  const handleFlipV = () => {
    updateStateWithHistory((s) => ({ ...s, flipV: !s.flipV }));
  };

  // Handlers for Resize
  const handleWidthChange = (val: number) => {
    updateStateWithHistory((s) => {
      const currentRotDims = getRotatedDimensions(origDims.width, origDims.height, s.rotation);
      const cropAbs = getAbsoluteCropCoordinates(s.crop, currentRotDims.width, currentRotDims.height);
      const ratio = cropAbs.width / cropAbs.height;

      let newH = s.resize.height;
      if (s.resize.maintainAspectRatio && ratio > 0) {
        newH = Math.max(1, Math.round(val / ratio));
      }

      return {
        ...s,
        resize: {
          ...s.resize,
          width: val,
          height: newH,
          percentage: 100,
          maxDimensionType: 'none',
        },
      };
    });
  };

  const handleHeightChange = (val: number) => {
    updateStateWithHistory((s) => {
      const currentRotDims = getRotatedDimensions(origDims.width, origDims.height, s.rotation);
      const cropAbs = getAbsoluteCropCoordinates(s.crop, currentRotDims.width, currentRotDims.height);
      const ratio = cropAbs.width / cropAbs.height;

      let newW = s.resize.width;
      if (s.resize.maintainAspectRatio && ratio > 0) {
        newW = Math.max(1, Math.round(val * ratio));
      }

      return {
        ...s,
        resize: {
          ...s.resize,
          width: newW,
          height: val,
          percentage: 100,
          maxDimensionType: 'none',
        },
      };
    });
  };

  const handlePercentageChange = (pct: number) => {
    updateStateWithHistory((s) => {
      const currentRotDims = getRotatedDimensions(origDims.width, origDims.height, s.rotation);
      const cropAbs = getAbsoluteCropCoordinates(s.crop, currentRotDims.width, currentRotDims.height);
      const scale = pct / 100;
      const targetW = Math.max(1, Math.round(cropAbs.width * scale));
      const targetH = Math.max(1, Math.round(cropAbs.height * scale));

      return {
        ...s,
        resize: {
          ...s.resize,
          percentage: pct,
          width: targetW,
          height: targetH,
          maxDimensionType: 'none',
        },
      };
    });
  };

  const handleApplyPreset = (preset: Preset) => {
    updateStateWithHistory((s) => {
      let format = s.format;
      if (preset.format) {
        format = preset.format;
      }
      return {
        ...s,
        format,
        resize: {
          ...s.resize,
          width: preset.width,
          height: preset.height,
          mode: 'fit',
          percentage: 100,
          maxDimensionType: 'none',
        },
      };
    });
  };

  // Full-Resolution Export Action
  const handleFullResolutionExport = async (saveToQueue = false) => {
    if (!file) return;
    setIsExporting(true);

    try {
      const fullRes = await processImagePipeline(file, state, {
        isPreview: false,
      });

      if (saveToQueue && onApplyAndSave) {
        onApplyAndSave(fullRes, state);
        onClose();
      } else {
        // Open download modal with clean generated filename
        const suggestedName = state.targetSizeKB
          ? generateCompressedFileName(file.name, state.targetSizeKB, state.format)
          : `${file.name.replace(/\.[^/.]+$/, '')}_${fullRes.width}x${fullRes.height}.${state.format === 'jpeg' ? 'jpg' : state.format}`;

        setRenameTarget({
          url: fullRes.url,
          suggestedName,
        });
      }
    } catch (err: any) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  // Calculated current transformed dimensions for status display
  const currentRotDims = getRotatedDimensions(origDims.width, origDims.height, state.rotation);
  const cropAbs = getAbsoluteCropCoordinates(state.crop, currentRotDims.width, currentRotDims.height);
  const calculatedOutputDims = calculateResizeOutputDimensions(cropAbs.width, cropAbs.height, state.resize);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-2 sm:p-4 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-6xl rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 flex flex-col max-h-[96vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-sans text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Image Studio & Optimizer
                <span className="text-[11px] font-normal text-slate-400 font-mono">
                  ({file.name})
                </span>
              </h3>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                <span>Original: {origDims.width}&times;{origDims.height} ({formatBytes(file.size)})</span>
                <span>&rarr;</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                  Output: {calculatedOutputDims.targetWidth}&times;{calculatedOutputDims.targetHeight}
                  {state.targetSizeKB ? ` (~${state.targetSizeKB} KB)` : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Undo / Redo & Close Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800 cursor-pointer"
              title="Undo (Ctrl+Z)"
              aria-label="Undo"
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800 cursor-pointer"
              title="Redo (Ctrl+Y)"
              aria-label="Redo"
            >
              <Redo2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleResetAll}
              className="rounded-lg p-2 text-slate-500 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              title="Reset All to Original"
              aria-label="Reset all"
            >
              <ResetIcon className="h-4 w-4" />
            </button>
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1" />
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white cursor-pointer"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Left Canvas Preview, Right Studio Controls */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
          
          {/* Main Stage / Image Viewer */}
          <div className="flex-1 bg-slate-950 p-4 flex flex-col items-center justify-center relative overflow-hidden min-h-[300px]">
            {activeTab === 'crop' ? (
              <ImageCropper
                imageSrc={sourceImgUrl}
                sourceWidth={origDims.width}
                sourceHeight={origDims.height}
                initialCrop={state.crop}
                initialAspectRatio={state.aspectRatio}
                initialRotation={state.rotation}
                initialFlipH={state.flipH}
                initialFlipV={state.flipV}
                onApplyCrop={(cropRect, rotUpdates) => {
                  updateStateWithHistory((s) => ({
                    ...s,
                    crop: cropRect,
                    rotation: rotUpdates.rotation,
                    flipH: rotUpdates.flipH,
                    flipV: rotUpdates.flipV,
                  }));
                  setActiveTab('resize');
                }}
                onCancel={() => setActiveTab('resize')}
              />
            ) : (
              <div className="relative max-w-full max-h-full flex items-center justify-center">
                {previewResult?.url ? (
                  <img
                    src={previewResult.url}
                    alt="Transformed preview"
                    className="max-w-full max-h-[500px] object-contain rounded-lg shadow-2xl transition-all"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 p-8">
                    <RefreshCw className="h-8 w-8 animate-spin text-indigo-500 mb-2" />
                    <span className="text-xs">Rendering preview...</span>
                  </div>
                )}

                {isPreviewLoading && (
                  <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] text-white flex items-center gap-1.5 shadow">
                    <RefreshCw className="h-3 w-3 animate-spin text-indigo-400" /> Updating
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Editing Control Sidebar */}
          <div className="w-full lg:w-96 bg-white dark:bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden shrink-0">
            
            {/* Tool Category Navigation Tabs */}
            <div className="grid grid-cols-5 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-slate-50 dark:bg-slate-950/40 text-[11px] font-bold">
              {[
                { id: 'resize', label: 'Resize', icon: Maximize2 },
                { id: 'crop', label: 'Crop', icon: Crop },
                { id: 'presets', label: 'Presets', icon: Sparkles },
                { id: 'enhance', label: 'Adjust', icon: Sliders },
                { id: 'compress', label: 'KB Limit', icon: Layers },
              ].map((t) => {
                const Icon = t.icon;
                const isActive = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id as any)}
                    className={`flex flex-col items-center justify-center py-2.5 transition cursor-pointer border-b-2 ${
                      isActive
                        ? 'border-indigo-600 text-indigo-600 bg-white dark:bg-slate-900 dark:text-indigo-400 dark:border-indigo-500'
                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="h-4 w-4 mb-1" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Controls Content Scrollable Container */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 select-scrollbar">
              
              {/* TAB 1: RESIZE & TRANSFORM */}
              {activeTab === 'resize' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2">
                      Dimensions & Aspect Ratio
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Width (px)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="20000"
                          value={state.resize.width}
                          onChange={(e) => handleWidthChange(parseInt(e.target.value) || 1)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Height (px)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="20000"
                          value={state.resize.height}
                          onChange={(e) => handleHeightChange(parseInt(e.target.value) || 1)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() =>
                          updateStateWithHistory((s) => ({
                            ...s,
                            resize: { ...s.resize, maintainAspectRatio: !s.resize.maintainAspectRatio },
                          }))
                        }
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold cursor-pointer transition ${
                          state.resize.maintainAspectRatio
                            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {state.resize.maintainAspectRatio ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                        Lock Ratio ({cropAbs.width}:{cropAbs.height})
                      </button>

                      <select
                        value={state.resize.mode}
                        onChange={(e) =>
                          updateStateWithHistory((s) => ({
                            ...s,
                            resize: { ...s.resize, mode: e.target.value as ResizeFitMode },
                          }))
                        }
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        title="Fit mode"
                      >
                        <option value="fit">Mode: Fit</option>
                        <option value="contain">Mode: Contain</option>
                        <option value="cover">Mode: Cover</option>
                        <option value="fill">Mode: Fill (Distort)</option>
                      </select>
                    </div>
                  </div>

                  {/* Percentage Quick Resize Buttons */}
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">
                      Percentage Scale
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[25, 50, 75, 100, 125, 150, 200].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => handlePercentageChange(pct)}
                          className={`rounded-lg py-1.5 text-xs font-bold transition cursor-pointer ${
                            state.resize.percentage === pct
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quick Rotate & Flip Controls */}
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">
                      Orientation & Transforms
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={handleRotateCCW}
                        className="rounded-xl border border-slate-200 p-2.5 flex flex-col items-center justify-center text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <RotateCcw className="h-4 w-4 mb-1" />
                        <span className="text-[10px] font-bold">90&deg; CCW</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleRotateCW}
                        className="rounded-xl border border-slate-200 p-2.5 flex flex-col items-center justify-center text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <RotateCw className="h-4 w-4 mb-1" />
                        <span className="text-[10px] font-bold">90&deg; CW</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleFlipH}
                        className={`rounded-xl border p-2.5 flex flex-col items-center justify-center cursor-pointer transition ${
                          state.flipH
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                        }`}
                      >
                        <FlipHorizontal className="h-4 w-4 mb-1" />
                        <span className="text-[10px] font-bold">Flip H</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleFlipV}
                        className={`rounded-xl border p-2.5 flex flex-col items-center justify-center cursor-pointer transition ${
                          state.flipV
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                        }`}
                      >
                        <FlipVertical className="h-4 w-4 mb-1" />
                        <span className="text-[10px] font-bold">Flip V</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CROP HELPER */}
              {activeTab === 'crop' && (
                <div className="space-y-4">
                  <div className="rounded-xl bg-indigo-50/50 p-4 border border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/30">
                    <p className="text-xs text-indigo-900 dark:text-indigo-200 font-medium">
                      Drag the bounding box handles directly on the canvas to crop your image with pixel precision.
                    </p>
                  </div>
                  {state.crop && (
                    <button
                      type="button"
                      onClick={() => updateStateWithHistory((s) => ({ ...s, crop: null }))}
                      className="w-full rounded-xl border border-red-200 bg-red-50 py-2.5 text-xs font-bold text-red-600 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400 cursor-pointer"
                    >
                      Clear Existing Crop
                    </button>
                  )}
                </div>
              )}

              {/* TAB 3: CENTRALIZED PRESETS */}
              {activeTab === 'presets' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Apply Standard Size Preset
                  </h4>
                  <div className="space-y-2 max-h-[360px] overflow-y-auto select-scrollbar pr-1">
                    {PRESETS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleApplyPreset(p)}
                        className="w-full text-left rounded-xl border border-slate-100 p-3 hover:border-indigo-400 hover:bg-indigo-50/20 dark:border-slate-800 dark:hover:border-indigo-500 dark:hover:bg-indigo-950/20 transition cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {p.name}
                          </span>
                          <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400">
                            {p.width}&times;{p.height}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                          {p.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: ENHANCEMENTS & ADJUSTMENTS */}
              {activeTab === 'enhance' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Color & Crispness Calibration
                  </h4>

                  {/* Brightness */}
                  <div>
                    <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      <span>Brightness</span>
                      <span className="font-mono">{state.adjustments.brightness > 0 ? `+${state.adjustments.brightness}` : state.adjustments.brightness}</span>
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={state.adjustments.brightness}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setState((s) => ({
                          ...s,
                          adjustments: { ...s.adjustments, brightness: val },
                        }));
                      }}
                      onPointerUp={() => updateStateWithHistory((s) => s)}
                      className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer dark:bg-slate-700"
                    />
                  </div>

                  {/* Contrast */}
                  <div>
                    <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      <span>Contrast</span>
                      <span className="font-mono">{state.adjustments.contrast > 0 ? `+${state.adjustments.contrast}` : state.adjustments.contrast}</span>
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={state.adjustments.contrast}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setState((s) => ({
                          ...s,
                          adjustments: { ...s.adjustments, contrast: val },
                        }));
                      }}
                      onPointerUp={() => updateStateWithHistory((s) => s)}
                      className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer dark:bg-slate-700"
                    />
                  </div>

                  {/* Saturation */}
                  <div>
                    <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      <span>Saturation</span>
                      <span className="font-mono">{state.adjustments.saturation > 0 ? `+${state.adjustments.saturation}` : state.adjustments.saturation}</span>
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={state.adjustments.saturation}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setState((s) => ({
                          ...s,
                          adjustments: { ...s.adjustments, saturation: val },
                        }));
                      }}
                      onPointerUp={() => updateStateWithHistory((s) => s)}
                      className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer dark:bg-slate-700"
                    />
                  </div>

                  {/* Sharpness */}
                  <div>
                    <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      <span>Sharpness</span>
                      <span className="font-mono">{state.adjustments.sharpness}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={state.adjustments.sharpness}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setState((s) => ({
                          ...s,
                          adjustments: { ...s.adjustments, sharpness: val },
                        }));
                      }}
                      onPointerUp={() => updateStateWithHistory((s) => s)}
                      className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer dark:bg-slate-700"
                    />
                  </div>

                  {/* Grayscale toggle */}
                  <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Grayscale (B&W)
                    </span>
                    <input
                      type="checkbox"
                      checked={state.adjustments.grayscale}
                      onChange={(e) =>
                        updateStateWithHistory((s) => ({
                          ...s,
                          adjustments: { ...s.adjustments, grayscale: e.target.checked },
                        }))
                      }
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* TAB 5: EXACT KB COMPRESSION TARGET (ROUND 1 ENGINE) */}
              {activeTab === 'compress' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      Target File Size (KB limit)
                    </h4>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                      Round 1 Engine
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[20, 50, 100, 200, 500].map((kb) => (
                      <button
                        key={kb}
                        type="button"
                        onClick={() =>
                          updateStateWithHistory((s) => ({
                            ...s,
                            targetSizeKB: s.targetSizeKB === kb ? undefined : kb,
                          }))
                        }
                        className={`rounded-xl py-2 text-xs font-bold transition cursor-pointer ${
                          state.targetSizeKB === kb
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {kb} KB
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        updateStateWithHistory((s) => ({
                          ...s,
                          targetSizeKB: undefined,
                        }))
                      }
                      className={`rounded-xl py-2 text-xs font-bold transition cursor-pointer ${
                        state.targetSizeKB === undefined
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      Original / Off
                    </button>
                  </div>

                  {/* Custom Target KB Input */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Or Custom Target (KB)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="50000"
                      placeholder="e.g. 75"
                      value={state.targetSizeKB || ''}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        updateStateWithHistory((s) => ({
                          ...s,
                          targetSizeKB: isNaN(val) ? undefined : val,
                        }));
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none"
                    />
                  </div>

                  {/* Output Format Picker */}
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">
                      Export Format
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['jpeg', 'webp', 'png'] as const).map((fmt) => (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => updateStateWithHistory((s) => ({ ...s, format: fmt }))}
                          className={`rounded-xl py-1.5 text-xs font-bold uppercase transition cursor-pointer ${
                            state.format === fmt
                              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {fmt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions Toolbar */}
            <div className="border-t border-slate-200 p-4 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                {onApplyAndSave && (
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={() => handleFullResolutionExport(true)}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-950 text-white py-2.5 text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {isExporting ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Apply to Queue
                  </button>
                )}
                
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => handleFullResolutionExport(false)}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 text-xs font-bold transition shadow-md shadow-indigo-100 dark:shadow-none cursor-pointer disabled:opacity-50"
                >
                  {isExporting ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Export & Download
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rename Modal before download */}
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
    </div>
  );
}
