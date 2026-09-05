/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Share2, 
  Upload, 
  Download, 
  Check, 
  Layers, 
  Archive, 
  Sparkles, 
  SlidersHorizontal,
  RefreshCw,
  Info
} from 'lucide-react';
import { SMART_PRESETS, SmartPreset } from '../core/presets/smartPresets';
import { exportMultipleBlobsToZip } from '../utils/zipExport';

export interface SocialResizeResult {
  preset: SmartPreset;
  blob: Blob;
  url: string;
  width: number;
  height: number;
  size: number;
}

export type FitMode = 'contain-blur' | 'contain-solid' | 'cover' | 'fill';

export default function SocialResizer() {
  const [file, setFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string>('');
  
  // Platform filtering
  const [selectedPlatform, setSelectedPlatform] = useState<string>('All');
  const [fitMode, setFitMode] = useState<FitMode>('contain-solid');
  const [solidBgColor, setSolidBgColor] = useState<string>('#FFFFFF');
  const [outputFormat, setOutputFormat] = useState<'jpeg' | 'png' | 'webp'>('jpeg');
  
  // Processing & Results
  const [results, setResults] = useState<SocialResizeResult[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isZipping, setIsZipping] = useState<boolean>(false);
  const [selectedPresetIds, setSelectedPresetIds] = useState<string[]>([]);

  const socialPresets = SMART_PRESETS.filter((p) => p.category === 'Social Media');
  const platforms = ['All', ...Array.from(new Set(socialPresets.map((p) => p.platform || 'Other')))];

  const filteredPresets = selectedPlatform === 'All' 
    ? socialPresets 
    : socialPresets.filter((p) => (p.platform || 'Other') === selectedPlatform);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setImageSrc(url);
      setSelectedPresetIds(socialPresets.map(p => p.id));
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  useEffect(() => {
    if (imageSrc && selectedPresetIds.length > 0) {
      generateAllSelected();
    }
  }, [imageSrc, fitMode, solidBgColor, outputFormat, selectedPresetIds]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const togglePresetSelection = (id: string) => {
    setSelectedPresetIds((prev) => 
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const generateAllSelected = async () => {
    if (!imageSrc) return;
    setIsProcessing(true);

    const img = new Image();
    img.src = imageSrc;
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
    });

    const activePresetsToRender = socialPresets.filter(p => selectedPresetIds.includes(p.id));
    const newResults: SocialResizeResult[] = [];

    for (const preset of activePresetsToRender) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      canvas.width = preset.width;
      canvas.height = preset.height;

      // 1. Draw Background
      if (fitMode === 'contain-blur') {
        // Draw blurred stretched copy
        ctx.save();
        ctx.filter = 'blur(20px) brightness(0.7)';
        ctx.drawImage(img, -20, -20, canvas.width + 40, canvas.height + 40);
        ctx.restore();
      } else if (fitMode === 'contain-solid') {
        ctx.fillStyle = solidBgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // 2. Draw Foreground Image
      const imgRatio = img.width / img.height;
      const targetRatio = canvas.width / canvas.height;

      if (fitMode === 'cover') {
        let drawW, drawH, offsetX = 0, offsetY = 0;
        if (imgRatio > targetRatio) {
          drawH = canvas.height;
          drawW = canvas.height * imgRatio;
          offsetX = - (drawW - canvas.width) / 2;
        } else {
          drawW = canvas.width;
          drawH = canvas.width / imgRatio;
          offsetY = - (drawH - canvas.height) / 2;
        }
        ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
      } else if (fitMode === 'fill') {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      } else {
        // contain-solid or contain-blur
        let drawW, drawH, offsetX = 0, offsetY = 0;
        if (imgRatio > targetRatio) {
          drawW = canvas.width;
          drawH = canvas.width / imgRatio;
          offsetY = (canvas.height - drawH) / 2;
        } else {
          drawH = canvas.height;
          drawW = canvas.height * imgRatio;
          offsetX = (canvas.width - drawW) / 2;
        }
        ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
      }

      // 3. Render Blob
      const mime = outputFormat === 'png' ? 'image/png' : outputFormat === 'webp' ? 'image/webp' : 'image/jpeg';
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, mime, 0.92));
      
      if (blob) {
        newResults.push({
          preset,
          blob,
          url: URL.createObjectURL(blob),
          width: canvas.width,
          height: canvas.height,
          size: blob.size
        });
      }
    }

    setResults(newResults);
    setIsProcessing(false);
  };

  const handleDownloadAllZip = async () => {
    if (results.length === 0) return;
    setIsZipping(true);

    try {
      const itemsToZip = results.map((r) => ({
        name: `${r.preset.platform || 'Social'}_${r.preset.name.replace(/\s+/g, '_')}_${r.width}x${r.height}.${outputFormat}`,
        blob: r.blob
      }));

      await exportMultipleBlobsToZip(itemsToZip, `Social_Media_Assets_${Date.now()}.zip`);
    } catch (err) {
      console.error('ZIP error:', err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="space-y-6 select-none animate-fade-in">
      {/* Informational Banner */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-950 dark:bg-blue-950/20 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2.5">
        <Info className="h-4.5 w-4.5 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
        <div className="space-y-1">
          <p className="font-semibold">
            Social Media Multi-Format Resizer (100% Client-Side)
          </p>
          <p className="text-[11px] leading-relaxed text-blue-700/80 dark:text-blue-300/80">
            Automatically adapts one master image across Instagram, YouTube, LinkedIn, Facebook, Pinterest, WhatsApp, and X. Export all formats at once in a single ZIP or download individually.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
        {!file ? (
          <div 
            onClick={() => document.getElementById('social-resizer-selector')?.click()}
            className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center hover:bg-slate-50/50 dark:border-slate-800 dark:hover:bg-slate-900/10 cursor-pointer transition-colors"
          >
            <input
              id="social-resizer-selector"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50 text-indigo-500 dark:bg-slate-800">
              <Share2 className="h-5 w-5" />
            </div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-white mt-3">Upload source image to resize for all social channels</h4>
            <p className="text-[11px] text-slate-400 mt-1">Accepts high-resolution JPG, PNG, and WebP graphics</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Global Settings Toolbar */}
            <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex flex-wrap items-center justify-between gap-4">
              
              {/* Fit Mode */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Fitting Style:</span>
                <div className="flex gap-1">
                  {[
                    { id: 'contain-solid', label: 'Solid Fit' },
                    { id: 'contain-blur', label: 'Blur Backdrop' },
                    { id: 'cover', label: 'Crop to Cover' },
                    { id: 'fill', label: 'Stretch' }
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setFitMode(m.id as FitMode)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        fitMode === m.id
                          ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-950'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Solid Color Picker if solid fit */}
              {fitMode === 'contain-solid' && (
                <div className="flex items-center gap-1.5 animate-fade-in">
                  <span className="text-xs font-bold text-slate-500">Backdrop:</span>
                  <input
                    type="color"
                    value={solidBgColor}
                    onChange={(e) => setSolidBgColor(e.target.value)}
                    className="h-6 w-8 rounded border border-slate-200 cursor-pointer p-0"
                  />
                </div>
              )}

              {/* Output Format */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Format:</span>
                <div className="flex gap-1">
                  {(['jpeg', 'png', 'webp'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setOutputFormat(fmt)}
                      className={`px-2 py-1 text-xs font-bold uppercase rounded-lg border transition-all cursor-pointer ${
                        outputFormat === fmt
                          ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-950'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadAllZip}
                  disabled={results.length === 0 || isZipping}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-3.5 shadow-soft transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Archive className={`h-4 w-4 ${isZipping ? 'animate-spin' : ''}`} />
                  {isZipping ? 'Creating ZIP...' : `Download All (${results.length}) as ZIP`}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setImageSrc('');
                    setResults([]);
                  }}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-850 cursor-pointer"
                >
                  Reset
                </button>
              </div>

            </div>

            {/* Platform Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {platforms.map((plat) => (
                <button
                  key={plat}
                  type="button"
                  onClick={() => setSelectedPlatform(plat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    selectedPlatform === plat
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {plat}
                </button>
              ))}
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPresets.map((preset) => {
                const res = results.find((r) => r.preset.id === preset.id);
                const isSelected = selectedPresetIds.includes(preset.id);

                return (
                  <div
                    key={preset.id}
                    className={`rounded-2xl border transition-all p-4 flex flex-col justify-between space-y-3 ${
                      isSelected 
                        ? 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 shadow-sm'
                        : 'border-slate-100 bg-slate-50/50 opacity-60 dark:border-slate-850 dark:bg-slate-950/20'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                            {preset.platform}
                          </span>
                          <h4 className="text-xs font-bold text-slate-850 dark:text-white">
                            {preset.name}
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => togglePresetSelection(preset.id)}
                          className={`h-6 w-6 rounded-md flex items-center justify-center border transition-all cursor-pointer ${
                            isSelected 
                              ? 'bg-indigo-600 border-indigo-600 text-white' 
                              : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800'
                          }`}
                        >
                          {isSelected && <Check className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block mt-1">
                        {preset.width} × {preset.height} px ({preset.aspectRatioLabel})
                      </span>
                    </div>

                    {/* Thumbnail Preview Stage */}
                    <div className="h-32 rounded-xl bg-slate-950/90 border border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden p-2">
                      {res ? (
                        <img
                          src={res.url}
                          alt={preset.name}
                          className="max-h-full max-w-full object-contain rounded"
                        />
                      ) : (
                        <span className="text-[11px] text-slate-500">
                          {isProcessing ? 'Rendering...' : 'Click checkbox to enable'}
                        </span>
                      )}
                    </div>

                    {/* Download button */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] font-mono text-slate-400">
                        {res ? `${(res.size / 1024).toFixed(1)} KB` : '--'}
                      </span>
                      {res && (
                        <a
                          href={res.url}
                          download={`${preset.platform}_${preset.name.replace(/\s+/g, '_')}_${preset.width}x${preset.height}.${outputFormat}`}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          <Download className="h-3 w-3" /> Download
                        </a>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
