/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ImageSettings, Preset } from '../types';
import PresetSelector from './PresetSelector';
import { 
  Minimize2, 
  Maximize2, 
  Compass, 
  Sparkles,
  Download,
  CheckCircle,
  HelpCircle,
  Info
} from 'lucide-react';

interface BatchControlsProps {
  settings: ImageSettings;
  onChangeSettings: (newSettings: ImageSettings) => void;
  onApplyToAll: () => void;
  onDownloadZip: () => void;
  totalFiles: number;
  completedFiles: number;
  isProcessing: boolean;
}

export default function BatchControls({
  settings,
  onChangeSettings,
  onApplyToAll,
  onDownloadZip,
  totalFiles,
  completedFiles,
  isProcessing,
}: BatchControlsProps) {
  const [customKB, setCustomKB] = useState<string>(
    settings.targetSizeKB ? String(settings.targetSizeKB) : '100'
  );

  const handleModeChange = (mode: 'compress' | 'resize' | 'preset') => {
    const updated: ImageSettings = {
      ...settings,
      mode,
    };
    if (mode === 'compress') {
      updated.targetSizeKB = Number(customKB) || 100;
      updated.format = 'jpeg'; // Default optimal format for KB targets
    } else if (mode === 'resize') {
      updated.width = settings.width || 800;
      updated.height = settings.height || 600;
    }
    onChangeSettings(updated);
  };

  const handleKBSelection = (kbValue: number) => {
    setCustomKB(String(kbValue));
    onChangeSettings({
      ...settings,
      targetSizeKB: kbValue,
    });
  };

  const handleCustomKBChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    setCustomKB(val);
    if (val) {
      onChangeSettings({
        ...settings,
        targetSizeKB: Number(val),
      });
    }
  };

  const updateDimension = (key: 'width' | 'height', valStr: string) => {
    const num = Number(valStr.replace(/\D/g, '')) || 0;
    onChangeSettings({
      ...settings,
      [key]: num || undefined,
    });
  };

  const selectPreset = (preset: Preset) => {
    onChangeSettings({
      ...settings,
      mode: 'preset',
      presetId: preset.id,
      width: preset.width,
      height: preset.height,
      format: preset.format || settings.format || 'png',
    });
  };

  return (
    <div id="batch-control-dashboard" className="rounded-2xl border border-slate-100 bg-white/80 p-6 shadow-xl backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/80">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
        <div>
          <h3 className="font-sans text-base font-extrabold text-slate-900 dark:text-white">
            Global Optimization Panel
          </h3>
          <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
            Configure settings for batch or individual files.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-300">
          Selected: {totalFiles} file{totalFiles !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Main Tab Controls */}
      <div id="mode-tabs" className="mt-5 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        <button
          type="button"
          onClick={() => handleModeChange('compress')}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold transition-all ${
            settings.mode === 'compress'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Minimize2 className="h-4 w-4" />
          Compress Size
        </button>

        <button
          type="button"
          onClick={() => handleModeChange('resize')}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold transition-all ${
            settings.mode === 'resize'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Maximize2 className="h-4 w-4" />
          Resize Dims
        </button>

        <button
          type="button"
          onClick={() => handleModeChange('preset')}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold transition-all ${
            settings.mode === 'preset'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Compass className="h-4 w-4" />
          Templates
        </button>
      </div>

      {/* Mode Renderings */}
      <div className="mt-6">
        {settings.mode === 'compress' && (
          <div id="compress-controls" className="space-y-4">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Desirable target file size limit:
            </label>
            <div className="flex flex-wrap gap-2">
              {[50, 100, 200, 500, 1024].map((kbVal) => {
                const label = kbVal >= 1024 ? '1 MB' : `${kbVal} KB`;
                const isSelected = settings.targetSizeKB === kbVal;
                return (
                  <button
                    key={kbVal}
                    type="button"
                    onClick={() => handleKBSelection(kbVal)}
                    className={`rounded-lg px-3.5 py-2 text-xs font-bold border transition-colors ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 dark:bg-indigo-500 dark:border-indigo-500'
                        : 'bg-slate-50 text-slate-700 border-slate-100 hover:border-slate-350 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Custom Input */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 dark:text-slate-400">Custom target KB:</span>
              <div className="relative rounded-lg shadow-sm w-36">
                <input
                  type="text"
                  value={customKB}
                  onChange={handleCustomKBChange}
                  className="w-full rounded-lg border border-slate-200 bg-white/50 px-3 py-1.5 text-xs font-bold outline-none ring-offset-2 transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  placeholder="Target size"
                />
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[10px] font-bold text-slate-400">
                  KB
                </span>
              </div>
            </div>
            <div className="flex items-start gap-1.5 rounded-lg bg-indigo-50/50 p-2.5 text-[11px] text-indigo-805 dark:bg-indigo-950/20 dark:text-indigo-400">
              <Info className="h-4 w-4 shrink-0 text-indigo-500 mt-0.5" />
              <span>Auto balance keeps resolution while scaling quality index. If target is extremely small, physical dims will be intelligently auto-scaled for optimal encoding layout.</span>
            </div>
          </div>
        )}

        {settings.mode === 'resize' && (
          <div id="resize-controls" className="space-y-4">
            <div id="dim-inputs" className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Width (pixels)
                </label>
                <input
                  type="text"
                  value={settings.width || ''}
                  onChange={(e) => updateDimension('width', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white/50 px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  placeholder="e.g. 1920"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Height (pixels)
                </label>
                <input
                  type="text"
                  value={settings.height || ''}
                  disabled={settings.maintainAspectRatio}
                  onChange={(e) => updateDimension('height', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white/50 px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  placeholder={settings.maintainAspectRatio ? 'Auto' : 'e.g. 1080'}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="maintain-aspect-ratio"
                checked={settings.maintainAspectRatio}
                onChange={(e) =>
                  onChangeSettings({
                    ...settings,
                    maintainAspectRatio: e.target.checked,
                  })
                }
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700"
              />
              <label
                style={{ cursor: 'pointer' }}
                htmlFor="maintain-aspect-ratio"
                className="text-xs font-semibold text-slate-750 dark:text-slate-300 selection-none"
              >
                Maintain Aspect Ratio (Locks proportions)
              </label>
            </div>
          </div>
        )}

        {settings.mode === 'preset' && (
          <div>
            <PresetSelector
              selectedPresetId={settings.presetId}
              onSelectPreset={selectPreset}
            />
          </div>
        )}
      </div>

      {/* Universal Format & Quality controls */}
      {settings.mode !== 'preset' && (
        <div id="universal-quality-format" className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            {/* Format Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Output Format
              </label>
              <select
                value={settings.format}
                onChange={(e) =>
                  onChangeSettings({
                    ...settings,
                    format: e.target.value as 'png' | 'jpeg' | 'webp',
                  })
                }
                className="w-full rounded-lg border border-slate-200 bg-white/50 px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="jpeg">JPG / JPEG (Best compression)</option>
                <option value="png">PNG (Lossless transparency)</option>
                <option value="webp">WEBP (Modern optimized)</option>
              </select>
            </div>

            {/* Quality Slider - Hidden when PNG selected as PNG is lossless */}
            {settings.format !== 'png' && (
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Quality Level
                  </label>
                  <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
                    {Math.round(settings.quality * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={settings.quality}
                  onChange={(e) =>
                    onChangeSettings({
                      ...settings,
                      quality: Number(e.target.value),
                    })
                  }
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 dark:bg-slate-700"
                />
              </div>
            )}
          </div>
          
          {/* Smart Quality Selector Toggle */}
          <div className="mt-4 flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 to-indigo-500/10 border border-indigo-100/40 dark:border-indigo-950/20">
            <div className="flex items-start gap-2.5">
              <input
                type="checkbox"
                id="enhance-quality"
                aria-label="Smart Quality Enhancer"
                checked={!!settings.enhanceQuality}
                onChange={(e) =>
                  onChangeSettings({
                    ...settings,
                    enhanceQuality: e.target.checked,
                  })
                }
                className="h-4 w-4 mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700 cursor-pointer"
              />
              <div className="flex flex-col">
                <label
                  style={{ cursor: 'pointer' }}
                  htmlFor="enhance-quality"
                  className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 selection-none"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0 fill-amber-500 animate-pulse animate-spin-slow" />
                  Smart Quality Enhancer
                </label>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
                  Contrast auto-correction, sharpening and dynamic saturation.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch Processing Progress Bar */}
      {totalFiles > 0 && (isProcessing || completedFiles > 0) && (
        <div className="mt-6 space-y-2 border-t border-slate-100 pt-5 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-705 dark:text-slate-300 flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                {isProcessing && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isProcessing ? 'bg-indigo-605' : 'bg-emerald-500'}`}></span>
              </span>
              {isProcessing ? 'Processing Batch Images...' : 'Optimize Completed!'}
            </span>
            <span className="font-mono text-indigo-600 dark:text-indigo-400">
              {completedFiles} / {totalFiles} processed ({Math.round((completedFiles / totalFiles) * 100)}%)
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-105 dark:bg-slate-800">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(completedFiles / totalFiles) * 100}%` }}
              transition={{ type: 'spring', stiffness: 80, damping: 15 }}
              className={`h-full rounded-full bg-gradient-to-r ${isProcessing ? 'from-indigo-500 to-indigo-650' : 'from-emerald-500 to-teal-600'}`}
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div id="batch-actions" className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-slate-100 pt-5 dark:border-slate-800">
        <div>
          <button
            type="button"
            onClick={onApplyToAll}
            disabled={isProcessing || totalFiles === 0}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-3.5 px-4.5 shadow-md shadow-indigo-100 transition-all disabled:opacity-50 disabled:pointer-events-none dark:bg-indigo-500 dark:shadow-none dark:hover:bg-indigo-600 cursor-pointer"
          >
            <Sparkles className="h-4 w-4 animate-spin-slow" />
            Process All
          </button>
        </div>

        {completedFiles > 0 && (
          <button
            type="button"
            onClick={onDownloadZip}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-3.5 px-5.5 shadow-md shadow-emerald-100 transition-all dark:bg-emerald-500 dark:shadow-none dark:hover:bg-emerald-600 cursor-pointer"
          >
            <Download className="h-4.5 w-4.5 animate-bounce-slow" />
            Download ZIP ({completedFiles} Optimized)
          </button>
        )}
      </div>
    </div>
  );
}
