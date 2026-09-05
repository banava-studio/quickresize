/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Download, 
  Upload, 
  Trash2, 
  Lock, 
  Unlock, 
  CheckCircle,
  RefreshCw, 
  Minimize2, 
  ArrowRight,
  Maximize2,
  FileImage,
  Sparkles,
  Crop,
  Sliders,
  Layers,
  RotateCw,
  Archive
} from 'lucide-react';
import JSZip from 'jszip';
import { processImage, getImageDimensions } from '../utils/imageProcessor';
import { ImageSettings, ResizeFitMode, Preset } from '../types';
import { PRESETS } from '../presets';
import RenameModal from './RenameModal';
import StudioEditorModal from './StudioEditorModal';

interface ResizerItem {
  id: string;
  file: File;
  name: string;
  origWidth: number;
  origHeight: number;
  size: number;
  newWidth?: number;
  newHeight?: number;
  url?: string;
  blob?: Blob;
  status: 'idle' | 'processing' | 'done' | 'error';
  customSettings?: ImageSettings;
}

export default function EnhancedResizer() {
  const [items, setItems] = useState<ResizerItem[]>([]);
  const [targetWidth, setTargetWidth] = useState<number>(1080);
  const [targetHeight, setTargetHeight] = useState<number>(1080);
  const [maintainAspect, setMaintainAspect] = useState<boolean>(true);
  const [resizeMode, setResizeMode] = useState<ResizeFitMode>('fit');
  const [resizePercent, setResizePercent] = useState<number>(100);
  const [maxDimension, setMaxDimension] = useState<number | undefined>(undefined);
  const [format, setFormat] = useState<'png' | 'jpeg' | 'webp'>('jpeg');
  const [quality, setQuality] = useState<number>(0.85);
  const [targetSizeKB, setTargetSizeKB] = useState<number | undefined>(undefined);
  const [enhanceQuality, setEnhanceQuality] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  
  const [renameTarget, setRenameTarget] = useState<{ url: string; suggestedName: string } | null>(null);
  const [studioTargetItem, setStudioTargetItem] = useState<ResizerItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleFilesAdded = async (newFiles: File[]) => {
    const newItems: ResizerItem[] = [];

    for (const f of newFiles) {
      const id = Math.random().toString(36).substring(2, 9);
      const dims = await getImageDimensions(f);
      newItems.push({
        id,
        file: f,
        name: f.name,
        origWidth: dims.width || 800,
        origHeight: dims.height || 600,
        size: f.size,
        status: 'idle',
      });
    }

    if (items.length === 0 && newItems.length > 0) {
      // Initialize target dimensions from first file
      setTargetWidth(newItems[0].origWidth);
      setTargetHeight(newItems[0].origHeight);
    }

    setItems((prev) => [...prev, ...newItems]);
  };

  const handleWidthChange = (val: number) => {
    setTargetWidth(val);
    if (maintainAspect && items.length > 0 && items[0].origWidth > 0) {
      const ratio = items[0].origWidth / items[0].origHeight;
      setTargetHeight(Math.max(1, Math.round(val / ratio)));
    }
  };

  const handleHeightChange = (val: number) => {
    setTargetHeight(val);
    if (maintainAspect && items.length > 0 && items[0].origHeight > 0) {
      const ratio = items[0].origWidth / items[0].origHeight;
      setTargetHeight(Math.max(1, Math.round(val * ratio)));
    }
  };

  const handlePercentChange = (pct: number) => {
    setResizePercent(pct);
    if (items.length > 0 && items[0].origWidth > 0) {
      const scale = pct / 100;
      setTargetWidth(Math.max(1, Math.round(items[0].origWidth * scale)));
      setTargetHeight(Math.max(1, Math.round(items[0].origHeight * scale)));
    }
  };

  const applyPreset = (preset: Preset) => {
    setTargetWidth(preset.width);
    setTargetHeight(preset.height);
    if (preset.format) {
      setFormat(preset.format);
    }
  };

  const clearAll = () => {
    items.forEach((item) => {
      if (item.url) URL.revokeObjectURL(item.url);
    });
    setItems([]);
  };

  const processAllItems = async () => {
    if (items.length === 0) return;
    setIsProcessing(true);

    const updatedItems = [...items];

    for (let i = 0; i < updatedItems.length; i++) {
      const item = updatedItems[i];
      item.status = 'processing';
      setItems([...updatedItems]);

      try {
        let calcW = targetWidth;
        let calcH = targetHeight;

        // Adapt percentage scaling per individual item
        if (resizePercent !== 100) {
          calcW = Math.max(1, Math.round((item.origWidth * resizePercent) / 100));
          calcH = Math.max(1, Math.round((item.origHeight * resizePercent) / 100));
        }

        // Max Dimension restriction
        if (maxDimension && maxDimension > 0) {
          const maxSide = Math.max(item.origWidth, item.origHeight);
          if (maxSide > maxDimension) {
            const scale = maxDimension / maxSide;
            calcW = Math.max(1, Math.round(item.origWidth * scale));
            calcH = Math.max(1, Math.round(item.origHeight * scale));
          }
        }

        const settings: ImageSettings = {
          mode: targetSizeKB ? 'compress' : 'resize',
          width: calcW,
          height: calcH,
          maintainAspectRatio: maintainAspect,
          resizeMode,
          quality,
          format,
          targetSizeKB,
          enhanceQuality,
          ...(item.customSettings || {}),
        };

        const origUrl = URL.createObjectURL(item.file);
        const res = await processImage(item.file, settings, origUrl);
        URL.revokeObjectURL(origUrl);

        if (item.url) URL.revokeObjectURL(item.url);
        item.url = res.url;
        item.blob = res.blob;
        item.newWidth = res.width;
        item.newHeight = res.height;
        item.status = 'done';
      } catch (err) {
        console.error('Failed to resize item', err);
        item.status = 'error';
      }

      setItems([...updatedItems]);
    }

    setIsProcessing(false);
  };

  const downloadItem = (item: ResizerItem) => {
    if (!item.url) return;
    const baseName = item.name.replace(/\.[^/.]+$/, '');
    const ext = format === 'jpeg' ? 'jpg' : format;
    const suggestedName = targetSizeKB
      ? `${baseName}_${targetSizeKB}KB.${ext}`
      : `${baseName}_${item.newWidth}x${item.newHeight}.${ext}`;

    setRenameTarget({
      url: item.url,
      suggestedName,
    });
  };

  const downloadAllAsZip = async () => {
    const doneItems = items.filter((it) => it.status === 'done' && it.blob);
    if (doneItems.length === 0) return;

    const zip = new JSZip();
    const ext = format === 'jpeg' ? 'jpg' : format;

    doneItems.forEach((it) => {
      const baseName = it.name.replace(/\.[^/.]+$/, '');
      const filename = `${baseName}_${it.newWidth}x${it.newHeight}.${ext}`;
      zip.file(filename, it.blob!);
    });

    const content = await zip.generateAsync({ type: 'blob' });
    const zipUrl = URL.createObjectURL(content);

    const link = document.createElement('a');
    link.href = zipUrl;
    link.download = `QuickResize_Batch_${Date.now()}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(zipUrl);
  };

  const filteredPresets = PRESETS.filter((p) => {
    if (activeCategory === 'All') return true;
    if (activeCategory === 'Social') return p.category === 'Social Media';
    if (activeCategory === 'Documents') return p.category === 'Documents';
    if (activeCategory === 'Web') return p.category === 'Web & Banner' || p.category === 'Logo / Website';
    if (activeCategory === 'App') return p.category === 'App Icons';
    return true;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* Left Column: Resize Settings & Presets */}
      <div className="lg:col-span-1 space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-sans text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Minimize2 className="h-5 w-5 text-indigo-500" />
              Smart Resizer Parameters
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 rounded-full">
              Round 2 Engine
            </span>
          </div>

          {/* Width & Height Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                Width (px)
              </label>
              <input
                type="number"
                min="1"
                max="20000"
                value={targetWidth}
                onChange={(e) => handleWidthChange(parseInt(e.target.value, 10) || 1)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-bold text-slate-800 focus:bg-white focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                Height (px)
              </label>
              <input
                type="number"
                min="1"
                max="20000"
                value={targetHeight}
                onChange={(e) => handleHeightChange(parseInt(e.target.value, 10) || 1)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-bold text-slate-800 focus:bg-white focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white outline-none"
              />
            </div>
          </div>

          {/* Aspect Ratio Lock & Fit Mode */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setMaintainAspect(!maintainAspect)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                maintainAspect
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {maintainAspect ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
              <span>Lock Ratio</span>
            </button>

            <select
              value={resizeMode}
              onChange={(e) => setResizeMode(e.target.value as ResizeFitMode)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none"
            >
              <option value="fit">Mode: Fit</option>
              <option value="contain">Mode: Contain</option>
              <option value="cover">Mode: Cover</option>
              <option value="fill">Mode: Fill</option>
            </select>
          </div>

          {/* Percentage Scale Buttons */}
          <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Scale by Percentage</span>
              <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{resizePercent}%</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[25, 50, 75, 100, 125, 150, 200].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handlePercentChange(pct)}
                  className={`rounded-lg py-1 text-xs font-bold transition cursor-pointer ${
                    resizePercent === pct
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Standard Presets Selector */}
          <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Standard Presets</span>
              <div className="flex gap-1 text-[10px] font-bold">
                {['All', 'Social', 'Documents', 'Web', 'App'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={`px-1.5 py-0.5 rounded cursor-pointer ${
                      activeCategory === cat
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 max-h-40 overflow-y-auto select-scrollbar pr-1">
              {filteredPresets.slice(0, 8).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="w-full text-left p-2 rounded-xl bg-slate-50 hover:bg-indigo-50/40 hover:border-indigo-300 dark:bg-slate-900/60 dark:hover:bg-indigo-950/30 border border-slate-100 dark:border-slate-800/80 transition-all flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">{p.name}</span>
                    <span className="text-[10px] text-slate-400">{p.description}</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-500 bg-slate-200/60 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                    {p.width}&times;{p.height}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Export Format & Exact KB Limit */}
          <div className="border-t border-slate-100 pt-4 dark:border-slate-800 space-y-3">
            <div>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1.5">
                Export Format:
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {(['jpeg', 'png', 'webp'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setFormat(fmt)}
                    className={`py-2 text-xs font-bold uppercase rounded-xl transition cursor-pointer ${
                      format === fmt
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Round 1 Exact KB Target Limit */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  Target File Size (Optional)
                </span>
                {targetSizeKB && (
                  <button
                    type="button"
                    onClick={() => setTargetSizeKB(undefined)}
                    className="text-[10px] font-bold text-red-500 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="grid grid-cols-4 gap-1">
                {[20, 50, 100, 200].map((kb) => (
                  <button
                    key={kb}
                    type="button"
                    onClick={() => setTargetSizeKB(targetSizeKB === kb ? undefined : kb)}
                    className={`rounded-lg py-1 text-xs font-bold cursor-pointer transition ${
                      targetSizeKB === kb
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {kb} KB
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right 2 Columns: Workspace, Uploads, List & Results */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Upload Zone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files) {
              const list = (Array.from(e.dataTransfer.files) as File[]).filter((f) => f.type.startsWith('image/'));
              handleFilesAdded(list);
            }
          }}
          onClick={() => fileInputRef.current?.click()}
          className="rounded-3xl border-2 border-dashed border-slate-200 bg-white/50 p-8 text-center hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/10 cursor-pointer transition-all shadow-sm"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => {
              if (e.target.files) {
                handleFilesAdded(Array.from(e.target.files));
              }
            }}
            className="hidden"
          />
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
            <Upload className="h-6 w-6" />
          </div>
          <h4 className="mt-3.5 text-sm font-bold text-slate-900 dark:text-white">
            Drag photo files here, or click to browse
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Supports JPEG, PNG, WebP, GIF, BMP &bull; 100% Client-Side
          </p>
        </div>

        {/* Queued Items List */}
        {items.length > 0 && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/40 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Queue ({items.length} file{items.length > 1 ? 's' : ''})
              </span>
              <button
                type="button"
                onClick={clearAll}
                className="text-xs font-bold text-red-500 hover:text-red-600 cursor-pointer"
              >
                Clear All
              </button>
            </div>

            <div className="space-y-3 max-h-[380px] overflow-y-auto select-scrollbar pr-1">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-12 w-12 rounded-xl bg-slate-200 dark:bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                      <FileImage className="h-6 w-6 text-slate-400" />
                    </div>
                    <div className="truncate">
                      <h5 className="text-xs font-bold text-slate-800 dark:text-white truncate max-w-xs">
                        {item.name}
                      </h5>
                      <span className="font-mono text-[10px] text-slate-400">
                        {item.origWidth}&times;{item.origHeight} &bull; {formatSize(item.size)}
                      </span>
                    </div>
                  </div>

                  {/* Actions per item: Crop / Studio + Remove */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setStudioTargetItem(item)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 border border-indigo-200 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300 hover:bg-indigo-100 transition cursor-pointer"
                      title="Open Interactive Cropper & Studio for this item"
                    >
                      <Crop className="h-3.5 w-3.5" />
                      Studio
                    </button>

                    {item.status === 'done' && (
                      <button
                        type="button"
                        onClick={() => downloadItem(item)}
                        className="inline-flex items-center gap-1 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-3 py-1.5 text-xs font-bold cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Batch Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={processAllItems}
                disabled={isProcessing}
                className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 px-6 py-3.5 text-xs font-bold text-white shadow-md shadow-indigo-100 dark:shadow-none cursor-pointer transition disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} />
                {isProcessing ? 'Interpolating & Processing...' : `Resize ${items.length} Photo(s)`}
              </button>

              {items.some((i) => i.status === 'done') && (
                <button
                  type="button"
                  onClick={downloadAllAsZip}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950 px-5 py-3.5 text-xs font-bold transition cursor-pointer"
                >
                  <Archive className="h-4 w-4" />
                  Download ZIP
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Studio Modal for individual item cropping and custom fine-tuning */}
      {studioTargetItem && (
        <StudioEditorModal
          isOpen={!!studioTargetItem}
          file={studioTargetItem.file}
          initialSettings={{
            resize: {
              width: targetWidth,
              height: targetHeight,
              maintainAspectRatio: maintainAspect,
              mode: resizeMode,
              percentage: resizePercent,
            },
            format,
            targetSizeKB,
          }}
          onClose={() => setStudioTargetItem(null)}
          onApplyAndSave={(result, updatedState) => {
            setItems((prev) =>
              prev.map((it) => {
                if (it.id === studioTargetItem.id) {
                  return {
                    ...it,
                    url: result.url,
                    blob: result.blob,
                    newWidth: result.width,
                    newHeight: result.height,
                    status: 'done',
                    customSettings: {
                      mode: 'resize',
                      width: result.width,
                      height: result.height,
                      maintainAspectRatio: updatedState.resize.maintainAspectRatio,
                      rotation: updatedState.rotation,
                      flipH: updatedState.flipH,
                      flipV: updatedState.flipV,
                      crop: updatedState.crop,
                      format: (updatedState.format as any) || format,
                      quality: updatedState.quality,
                      targetSizeKB: updatedState.targetSizeKB,
                    },
                  };
                }
                return it;
              })
            );
            setStudioTargetItem(null);
          }}
        />
      )}

      {/* Single File Rename Modal */}
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
