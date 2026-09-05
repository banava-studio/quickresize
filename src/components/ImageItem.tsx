/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ProcessedFile, ImageSettings } from '../types';
import { 
  Trash2, 
  Download, 
  RefreshCw, 
  Check, 
  HelpCircle, 
  Image as ImageIcon,
  Edit2,
  TrendingDown,
  Lock,
  ArrowRight,
  Eye,
  Sparkles,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Sliders,
  Crop
} from 'lucide-react';
import CompareModal from './CompareModal';
import RenameModal from './RenameModal';
import StudioEditorModal from './StudioEditorModal';

interface ImageItemProps {
  key?: string;
  item: ProcessedFile;
  onRemove: (id: string) => void;
  onUpdateSettings: (id: string, settings: ImageSettings) => void;
  onProcessIndividual: (id: string) => void | Promise<void>;
  onRenameFile: (id: string, newName: string) => void;
  onDownloadRequest: (item: ProcessedFile) => void;
}

export function formatBytes(bytes: number, decimals = 1) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export default function ImageItem({
  item,
  onRemove,
  onUpdateSettings,
  onProcessIndividual,
  onRenameFile,
  onDownloadRequest,
}: ImageItemProps): React.JSX.Element {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(item.name);
  const [showOverridePanel, setShowOverridePanel] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [showStudioModal, setShowStudioModal] = useState(false);

  const handleDownloadWithRename = () => {
    onDownloadRequest(item);
  };

  const handleRenameConfirm = () => {
    setIsEditingName(false);
    if (tempName.trim()) {
      onRenameFile(item.id, tempName.trim());
    }
  };

  const isDone = item.status === 'done';
  const isProcessing = item.status === 'processing';
  const isError = item.status === 'error';

  // State changes representation as override inputs
  const handleOverrideChange = (key: keyof ImageSettings, value: any) => {
    onUpdateSettings(item.id, {
      ...item.settings,
      [key]: value,
    });
  };

  return (
    <div id={`image-card-${item.id}`} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-md transition-all hover:shadow-lg dark:border-slate-800/80 dark:bg-slate-900/60">
      
      {/* File Header Details */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-50 pb-3.5 dark:border-slate-800">
        <div className="flex items-center gap-3 max-w-[70%]">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50/70 text-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-400">
            <ImageIcon className="h-5.5 w-5.5" />
          </div>
          <div className="truncate">
            <div className="flex items-center gap-1.5">
              {isEditingName ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRenameConfirm()}
                    className="rounded border border-slate-200 bg-white/70 px-2 py-0.5 text-xs font-bold outline-none ring-2 ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <button
                    onClick={handleRenameConfirm}
                    className="p-1 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 rounded"
                  >
                    <Check className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <>
                  <span className="font-sans text-xs font-bold text-slate-850 dark:text-white truncate max-w-[180px] sm:max-w-[240px]">
                    {item.name}
                  </span>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    title="Rename optimized output file"
                  >
                    <Edit2 className="h-3 w-3" />
                  </button>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                {item.originalWidth} &times; {item.originalHeight}px
              </span>
              <span className="text-slate-300 dark:text-slate-800">&bull;</span>
              <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                {formatBytes(item.originalSize)}
              </span>
              <span className="text-slate-300 dark:text-slate-800">&bull;</span>
              <span className="font-sans text-[9px] font-bold tracking-wide text-slate-400 uppercase">
                {item.originalFormat.split('/')[1] || 'IMG'}
              </span>
            </div>
          </div>
        </div>

        {/* Action icons / Status */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowStudioModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950/50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-900/60 transition cursor-pointer"
            title="Open Advanced Cropper & Resizer Studio"
          >
            <Crop className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Crop & Edit</span>
          </button>

          {isDone && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400">
              <Check className="h-3.5 w-3.5 shrink-0" /> Done
            </span>
          )}
          {isProcessing && (
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 animate-pulse">
              <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin" /> Processing
            </span>
          )}
          {isError && (
            <span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-bold text-red-700 dark:bg-red-950/20 dark:text-red-400">
              Error
            </span>
          )}
          
          <button
            onClick={() => onRemove(item.id)}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-red-500 dark:hover:bg-slate-800 dark:hover:text-red-400 transition-all cursor-pointer"
            title="Remove file"
          >
            <Trash2 className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      {/* Main split dashboard block */}
      <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* Left Side: Before-After Previews and Sizing comparison */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1">
              Before / After MATCH
              {isDone && (
                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 font-sans normal-case">
                  (Tap image to inspect quality)
                </span>
              )}
            </span>
            {isDone && item.reductionPercentage && item.reductionPercentage > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 font-mono">
                <TrendingDown className="h-3 w-3" />
                {item.reductionPercentage.toFixed(0)}% smaller
              </span>
            ) : null}
          </div>

          <div id="side-by-side-wrapper" className="grid grid-cols-2 gap-3.5">
            {/* Before Preview */}
            <div 
              onClick={() => isDone && setShowComparison(true)}
              className={`relative aspect-video rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 group ${
                isDone ? 'cursor-zoom-in hover:scale-[1.015] hover:shadow-sm transition-all duration-250' : ''
              }`}
            >
              <img
                src={item.originalUrl}
                alt="Original preview file"
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
              <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase backdrop-blur">
                Before
              </span>
              
              {isDone && (
                <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200">
                  <div className="flex items-center gap-1 rounded-full bg-white/90 text-slate-900 px-3 py-1 text-[11px] font-bold shadow-md">
                    <Eye className="h-3 w-3 text-indigo-500" />
                    Inspect
                  </div>
                </div>
              )}
            </div>

            {/* After Preview / Pending Placeholder */}
            <div 
              onClick={() => isDone && setShowComparison(true)}
              className={`relative aspect-video rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 group flex items-center justify-center ${
                isDone ? 'cursor-zoom-in hover:scale-[1.015] hover:shadow-sm transition-all duration-250' : ''
              }`}
            >
              {isDone && item.outputUrl ? (
                <>
                  <img
                    src={item.outputUrl}
                    alt="Optimized preview file"
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute bottom-1.5 left-1.5 rounded-md bg-indigo-600/80 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase backdrop-blur">
                    After
                  </span>
                  
                  <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200">
                    <div className="flex items-center gap-1 rounded-full bg-white/90 text-slate-900 px-3 py-1 text-[11px] font-bold shadow-md">
                      <Eye className="h-3 w-3 text-indigo-500" />
                      Inspect
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center p-2">
                  <span className="font-mono text-[9px] text-slate-400 dark:text-slate-500 uppercase">
                    {isProcessing ? 'Encoding...' : 'Optimized Fit'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Stats Display Grid */}
          <div className="rounded-xl bg-slate-50/60 p-3.5 dark:bg-slate-800/40 border border-slate-100/50 dark:border-slate-800/20">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="border-r border-slate-200/60 dark:border-slate-800">
                <span className="block font-mono text-[10px] text-slate-400 dark:text-slate-500 uppercase">Original KB</span>
                <span className="block font-sans text-sm font-extrabold text-slate-700 dark:text-slate-350 mt-1">
                  {formatBytes(item.originalSize)}
                </span>
              </div>
              <div>
                <span className="block font-mono text-[10px] text-slate-400 dark:text-slate-500 uppercase">Optimized KB</span>
                <span className="block font-sans text-sm font-extrabold text-indigo-700 dark:text-indigo-400 mt-1">
                  {isDone && item.outputSize ? formatBytes(item.outputSize) : '--'}
                </span>
              </div>
            </div>

            {isDone && item.outputWidth && item.outputHeight && (
              <div className="mt-3 border-t border-slate-200/40 pt-2.5 text-center">
                <p className="flex items-center justify-center gap-1 font-mono text-[10px] text-slate-550 dark:text-slate-400">
                  <span>{item.originalWidth} &times; {item.originalHeight}</span>
                  <ArrowRight className="h-3 w-3" />
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {item.outputWidth} &times; {item.outputHeight}
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Options customization for this individual image (Override settings!) */}
        <div className="flex flex-col justify-between gap-4">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between border-b border-dashed border-slate-100 pb-1.5 dark:border-slate-850">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                Individual Adjust Options
              </span>
              <button
                type="button"
                onClick={() => setShowOverridePanel(!showOverridePanel)}
                className="text-[10px] font-bold tracking-wide uppercase text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 cursor-pointer"
              >
                {showOverridePanel ? 'Hide overrides' : 'Show overrides'}
              </button>
            </div>

            {showOverridePanel ? (
              <div className="space-y-3 rounded-xl border border-dashed border-slate-205 p-3.5 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/40">
                
                {/* 1. Standard mode/size parameters */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-505 dark:text-slate-450 uppercase mb-0.5">
                      Process Mode
                    </label>
                    <select
                      value={item.settings.mode}
                      onChange={(e) => handleOverrideChange('mode', e.target.value)}
                      className="w-full rounded border border-slate-205 bg-white px-1.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="compress">Target file KB</option>
                      <option value="resize">Resize dims</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-505 dark:text-slate-450 uppercase mb-0.5">
                      Format
                    </label>
                    <select
                      value={item.settings.format}
                      onChange={(e) => handleOverrideChange('format', e.target.value)}
                      className="w-full rounded border border-slate-205 bg-white px-1.5 py-1 text-xs dark:border-slate-705 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="jpeg">JPEG</option>
                      <option value="png">PNG</option>
                      <option value="webp">WebP</option>
                    </select>
                  </div>
                </div>

                {item.settings.mode === 'compress' ? (
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-0.5">
                      Target (KB limit)
                    </label>
                    <input
                      type="number"
                      value={item.settings.targetSizeKB || ''}
                      onChange={(e) => handleOverrideChange('targetSizeKB', Number(e.target.value))}
                      className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-505 dark:text-slate-450 uppercase mb-0.5">Width</label>
                      <input
                        type="number"
                        value={item.settings.width || ''}
                        onChange={(e) => handleOverrideChange('width', Number(e.target.value))}
                        className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-505 dark:text-slate-450 uppercase mb-0.5">Height</label>
                      <input
                        type="number"
                        value={item.settings.height || ''}
                        onChange={(e) => handleOverrideChange('height', Number(e.target.value))}
                        className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>
                )}

                {/* 2. Rotations and Flips grid */}
                <div className="border-t border-slate-200/40 dark:border-slate-800/80 pt-2.5">
                  <span className="block text-[9px] font-extrabold tracking-wider text-slate-400 uppercase mb-1.5">
                    Transforms
                  </span>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[8px] font-bold text-slate-450 mb-0.5 uppercase">Rotate</label>
                      <select
                        value={item.settings.rotation || 0}
                        onChange={(e) => handleOverrideChange('rotation', Number(e.target.value))}
                        className="w-full rounded border border-slate-200 bg-white px-1 py-1 text-[11px] font-bold dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      >
                        <option value={0}>0&deg;</option>
                        <option value={90}>90&deg; CW</option>
                        <option value={180}>180&deg;</option>
                        <option value={270}>270&deg; CCW</option>
                      </select>
                    </div>

                    <div className="flex flex-col items-center justify-end">
                      <label className="block text-[8px] font-bold text-slate-455 mb-1 uppercase">Flip H</label>
                      <button
                        onClick={() => handleOverrideChange('flipH', !item.settings.flipH)}
                        className={`flex h-[26px] w-[35px] items-center justify-center rounded border transition ${
                          item.settings.flipH
                            ? 'bg-indigo-50 border-indigo-400 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-850 dark:text-indigo-400'
                            : 'border-slate-200 text-slate-500 bg-white dark:border-slate-700 dark:bg-slate-850'
                        }`}
                      >
                        <FlipHorizontal className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="flex flex-col items-center justify-end">
                      <label className="block text-[8px] font-bold text-slate-455 mb-1 uppercase">Flip V</label>
                      <button
                        onClick={() => handleOverrideChange('flipV', !item.settings.flipV)}
                        className={`flex h-[26px] w-[35px] items-center justify-center rounded border transition ${
                          item.settings.flipV
                            ? 'bg-indigo-50 border-indigo-400 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-850 dark:text-indigo-400'
                            : 'border-slate-200 text-slate-500 bg-white dark:border-slate-700 dark:bg-slate-850'
                        }`}
                      >
                        <FlipVertical className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. Advanced Sliders layout for brightness contrast saturation grayscale */}
                <div className="border-t border-slate-200/40 dark:border-slate-800/80 pt-2.5">
                  <span className="block text-[9px] font-extrabold tracking-wider text-slate-400 uppercase mb-1.5">
                    Color Filters Calibration
                  </span>
                  
                  <div className="space-y-2">
                    {/* Brightness slider */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 w-16">Brightness</span>
                      <input
                        type="range"
                        min="50"
                        max="150"
                        value={item.settings.brightness !== undefined ? item.settings.brightness : 100}
                        onChange={(e) => handleOverrideChange('brightness', Number(e.target.value))}
                        className="flex-1 accent-indigo-500 h-1"
                      />
                      <span className="font-mono text-[10px] text-right w-8 text-slate-450">
                        {item.settings.brightness !== undefined ? item.settings.brightness : 100}%
                      </span>
                    </div>

                    {/* Contrast slider */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 w-16">Contrast</span>
                      <input
                        type="range"
                        min="50"
                        max="150"
                        value={item.settings.contrast !== undefined ? item.settings.contrast : 100}
                        onChange={(e) => handleOverrideChange('contrast', Number(e.target.value))}
                        className="flex-1 accent-indigo-500 h-1"
                      />
                      <span className="font-mono text-[10px] text-right w-8 text-slate-450">
                        {item.settings.contrast !== undefined ? item.settings.contrast : 100}%
                      </span>
                    </div>

                    {/* Saturation slider */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 w-16">Saturation</span>
                      <input
                        type="range"
                        min="0"
                        max="200"
                        value={item.settings.saturation !== undefined ? item.settings.saturation : 100}
                        onChange={(e) => handleOverrideChange('saturation', Number(e.target.value))}
                        className="flex-1 accent-indigo-500 h-1"
                      />
                      <span className="font-mono text-[10px] text-right w-8 text-slate-450">
                        {item.settings.saturation !== undefined ? item.settings.saturation : 100}%
                      </span>
                    </div>

                    {/* Grayscale checkbox */}
                    <label className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 cursor-pointer pt-1 selection:hidden">
                      <input
                        type="checkbox"
                        checked={!!item.settings.grayscale}
                        onChange={(e) => handleOverrideChange('grayscale', e.target.checked)}
                        className="rounded border-slate-205 accent-indigo-500"
                      />
                      <span>Apply Grayscale filter</span>
                    </label>
                  </div>
                </div>

              </div>
            ) : (
              <div className="rounded-xl border border-slate-100 p-3 bg-slate-55/65 dark:border-slate-800/40 dark:bg-slate-900/20 text-xs text-slate-500 dark:text-slate-400">
                {item.settings.mode === 'compress' ? (
                  <p>Configured: <strong className="text-indigo-600 dark:text-indigo-400 font-bold">Target to {item.settings.targetSizeKB} KB</strong>.</p>
                ) : item.settings.mode === 'resize' ? (
                  <p>Configured: <strong className="text-indigo-600 dark:text-indigo-400 font-bold">Resize {item.settings.width}&times;{item.settings.height}px</strong>.</p>
                ) : (
                  <p>Preset: <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{item.settings.width}&times;{item.settings.height}px</strong>.</p>
                )}
                
                {/* Visual transform tags indicators */}
                {(item.settings.rotation || item.settings.flipH || item.settings.flipV || item.settings.grayscale) ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {item.settings.rotation ? <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400">Rotated {item.settings.rotation}&deg;</span> : null}
                    {item.settings.flipH ? <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400">Flipped H</span> : null}
                    {item.settings.flipV ? <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400">Flipped V</span> : null}
                    {item.settings.grayscale ? <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400">Grayscale</span> : null}
                  </div>
                ) : null}

                <p className="mt-1.5 font-mono text-[10px] text-slate-430">Format: <strong>{item.settings.format.toUpperCase()}</strong></p>
              </div>
            )}
          </div>

          {/* Action triggers: Process, Download */}
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                onClick={() => onProcessIndividual(item.id)}
                disabled={isProcessing}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-indigo-200 hover:border-indigo-400 dark:border-slate-800 dark:hover:border-slate-700 bg-white py-2.5 text-xs font-bold text-indigo-700 dark:text-indigo-400 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                Process
              </button>

              {isDone && item.outputUrl && (
                <button
                  onClick={handleDownloadWithRename}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 px-3 py-2.5 text-xs font-bold text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 cursor-pointer animate-fade-in"
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>
              )}
            </div>

            {/* Background remover shortcut option removed */}
          </div>
        </div>
      </div>

      {/* PopUp Lightbox Image CompModal */}
      {showComparison && (
        <CompareModal 
          item={item} 
          onClose={() => setShowComparison(false)} 
        />
      )}

      {/* Advanced Studio Editor & Cropper Modal */}
      {showStudioModal && (
        <StudioEditorModal
          isOpen={showStudioModal}
          file={item.file}
          initialSettings={{
            rotation: (item.settings.rotation as any) || 0,
            flipH: item.settings.flipH || false,
            flipV: item.settings.flipV || false,
            crop: item.settings.crop || null,
            resize: {
              width: item.settings.width || item.originalWidth,
              height: item.settings.height || item.originalHeight,
              maintainAspectRatio: item.settings.maintainAspectRatio,
              mode: item.settings.resizeMode || 'fit',
              percentage: 100,
            },
            adjustments: {
              brightness: item.settings.brightness !== undefined ? item.settings.brightness - 100 : 0,
              contrast: item.settings.contrast !== undefined ? item.settings.contrast - 100 : 0,
              saturation: item.settings.saturation !== undefined ? item.settings.saturation - 100 : 0,
              grayscale: item.settings.grayscale || false,
              sharpness: item.settings.sharpness || 0,
            },
            format: (item.settings.format === 'pdf' ? 'jpeg' : item.settings.format) as any,
            targetSizeKB: item.settings.targetSizeKB,
            quality: item.settings.quality || 0.85,
          }}
          onClose={() => setShowStudioModal(false)}
          onApplyAndSave={(result, updatedState) => {
            onUpdateSettings(item.id, {
              ...item.settings,
              rotation: updatedState.rotation,
              flipH: updatedState.flipH,
              flipV: updatedState.flipV,
              crop: updatedState.crop,
              width: result.width,
              height: result.height,
              maintainAspectRatio: updatedState.resize.maintainAspectRatio,
              resizeMode: updatedState.resize.mode,
              brightness: updatedState.adjustments.brightness + 100,
              contrast: updatedState.adjustments.contrast + 100,
              saturation: updatedState.adjustments.saturation + 100,
              grayscale: updatedState.adjustments.grayscale,
              sharpness: updatedState.adjustments.sharpness,
              targetSizeKB: updatedState.targetSizeKB,
              format: (updatedState.format as any) || item.settings.format,
            });
            setShowStudioModal(false);
            // Trigger process with the new settings
            setTimeout(() => {
              onProcessIndividual(item.id);
            }, 50);
          }}
        />
      )}
    </div>
  );
}
