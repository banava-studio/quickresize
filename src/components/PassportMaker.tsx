/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Download, 
  Upload, 
  RefreshCw, 
  User, 
  RotateCw, 
  Eye, 
  SlidersHorizontal,
  Info,
  Layers,
  Check,
  Grid,
  ShieldAlert,
  Printer
} from 'lucide-react';
import RenameModal from './RenameModal';
import { physicalToPixels, DimensionUnit } from '../core/presets/smartPresets';

export interface PassportPresetOption {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  widthPx: number;
  heightPx: number;
  aspect: number;
  label: string;
  unit: DimensionUnit;
}

const COMMON_PASSPORT_PRESETS: PassportPresetOption[] = [
  { 
    id: 'us-passport', 
    name: 'Passport Photo (2" x 2" / 51x51 mm)', 
    widthMm: 50.8, 
    heightMm: 50.8, 
    widthPx: 600, 
    heightPx: 600, 
    aspect: 1, 
    label: 'Common 2x2 inch standard (600x600 px @ 300 DPI)',
    unit: 'in'
  },
  { 
    id: 'intl-passport', 
    name: 'Passport Photo (35 x 45 mm)', 
    widthMm: 35, 
    heightMm: 45, 
    widthPx: 413, 
    heightPx: 531, 
    aspect: 35 / 45, 
    label: 'Common 35x45 mm international passport standard',
    unit: 'mm'
  },
  { 
    id: 'id-photo-3040', 
    name: 'ID Card Photo (30 x 40 mm)', 
    widthMm: 30, 
    heightMm: 40, 
    widthPx: 354, 
    heightPx: 472, 
    aspect: 30 / 40, 
    label: 'Common 3x4 cm identity badge format',
    unit: 'mm'
  },
  { 
    id: 'id-photo-2535', 
    name: 'Small ID Photo (25 x 35 mm)', 
    widthMm: 25, 
    heightMm: 35, 
    widthPx: 295, 
    heightPx: 413, 
    aspect: 25 / 35, 
    label: 'Common 2.5x3.5 cm badge / PAN card format',
    unit: 'mm'
  },
  { 
    id: 'visa-photo', 
    name: 'Visa Photo (35 x 45 mm)', 
    widthMm: 35, 
    heightMm: 45, 
    widthPx: 413, 
    heightPx: 531, 
    aspect: 35 / 45, 
    label: 'Common Schengen / international visa specification',
    unit: 'mm'
  }
];

interface PassportMakerProps {
  onOpenPhotoSheet?: (photoBlob: Blob, photoUrl: string, preset: PassportPresetOption) => void;
}

export default function PassportMaker({ onOpenPhotoSheet }: PassportMakerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string>('');
  const [activePreset, setActivePreset] = useState<PassportPresetOption>(COMMON_PASSPORT_PRESETS[0]);
  const [isCustomPreset, setIsCustomPreset] = useState<boolean>(false);
  const [customWidthMm, setCustomWidthMm] = useState<number>(35);
  const [customHeightMm, setCustomHeightMm] = useState<number>(45);
  const [dpi, setDpi] = useState<number>(300);
  
  // Alignment & Adjustment States
  const [scale, setScale] = useState<number>(1);
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);
  const [rotation, setRotation] = useState<number>(0);
  const [isImgLoaded, setIsImgLoaded] = useState<boolean>(false);
  
  // Visual Guide Overlay & Background
  const [showGuide, setShowGuide] = useState<boolean>(true);
  const [bgColorMode, setBgColorMode] = useState<'white' | 'custom' | 'transparent'>('white');
  const [customBgColor, setCustomBgColor] = useState<string>('#E0F2FE');
  
  // Output & Processing
  const [outputFormat, setOutputFormat] = useState<'jpeg' | 'png' | 'webp'>('jpeg');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [outputUrl, setOutputUrl] = useState<string>('');
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null);
  const [isRenameOpen, setIsRenameOpen] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Compute active target dimensions in pixels based on DPI
  const targetWidthPx = isCustomPreset 
    ? physicalToPixels(customWidthMm, 'mm', dpi)
    : physicalToPixels(activePreset.widthMm, 'mm', dpi);
  
  const targetHeightPx = isCustomPreset 
    ? physicalToPixels(customHeightMm, 'mm', dpi)
    : physicalToPixels(activePreset.heightMm, 'mm', dpi);

  const currentAspect = targetWidthPx / targetHeightPx;

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setImageSrc(url);
      setIsImgLoaded(false);
      setScale(1.0);
      setOffsetX(0);
      setOffsetY(0);
      setRotation(0);
      setOutputUrl('');
      setOutputBlob(null);

      const img = new Image();
      img.onload = () => {
        imgRef.current = img;
        setIsImgLoaded(true);
      };
      img.src = url;

      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [file]);

  // Redraw preview inside offscreen canvas live while parameters slide
  useEffect(() => {
    if (!isImgLoaded || !imgRef.current) return;
    drawCanvasPreview();
  }, [isImgLoaded, activePreset, isCustomPreset, customWidthMm, customHeightMm, dpi, scale, offsetX, offsetY, rotation, bgColorMode, customBgColor]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const drawCanvasPreview = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = imgRef.current;
    if (!img) return;

    canvas.width = targetWidthPx;
    canvas.height = targetHeightPx;

    // Fill background
    if (bgColorMode === 'white') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (bgColorMode === 'custom') {
      ctx.fillStyle = customBgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    ctx.save();
    
    // Move pen to center
    ctx.translate(canvas.width / 2 + offsetX, canvas.height / 2 + offsetY);
    ctx.rotate((rotation * Math.PI) / 180);

    // Draw proportional fit
    const imgRatio = img.width / img.height;
    const presetRatio = canvas.width / canvas.height;
    
    let drawW, drawH;
    if (imgRatio > presetRatio) {
      // image is wider
      drawH = canvas.height;
      drawW = canvas.height * imgRatio;
    } else {
      // image is taller
      drawW = canvas.width;
      drawH = canvas.width / imgRatio;
    }

    // Draw scaled relative to target dimension
    ctx.drawImage(
      img,
      - (drawW * scale) / 2,
      - (drawH * scale) / 2,
      drawW * scale,
      drawH * scale
    );

    ctx.restore();
  };

  const generatePhoto = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsProcessing(true);

    const mime = outputFormat === 'png' ? 'image/png' : outputFormat === 'webp' ? 'image/webp' : 'image/jpeg';

    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        setOutputUrl(url);
        setOutputBlob(blob);
      }
      setIsProcessing(false);
    }, mime, 0.95);
  };

  const downloadPhoto = () => {
    if (!outputUrl) return;
    setIsRenameOpen(true);
  };

  const handleOpenSheet = () => {
    if (!outputBlob || !outputUrl) {
      // generate first
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          if (onOpenPhotoSheet) {
            onOpenPhotoSheet(blob, url, activePreset);
          }
        }
      }, 'image/jpeg', 0.95);
    } else {
      if (onOpenPhotoSheet) {
        onOpenPhotoSheet(outputBlob, outputUrl, activePreset);
      }
    }
  };

  return (
    <div className="space-y-6 select-none animate-fade-in">
      {/* Informational Banner */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-950 dark:bg-blue-950/20 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2.5">
        <Info className="h-4.5 w-4.5 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
        <div className="space-y-1">
          <p className="font-semibold">
            Passport &amp; ID Photo Maker (100% Local &amp; Private in Browser)
          </p>
          <p className="text-[11px] leading-relaxed text-blue-700/80 dark:text-blue-300/80">
            Presets represent common dimensions (e.g. 2x2", 35x45mm). Requirements vary across issuing authorities and embassies; please confirm official requirements for your specific application.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Settings Grid Panel */}
        <div className="lg:col-span-4 space-y-5">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/40 space-y-4">
            <h3 className="font-sans text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <User className="h-4.5 w-4.5 text-indigo-500" />
              Photo Presets
            </h3>
            
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {COMMON_PASSPORT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => {
                    setIsCustomPreset(false);
                    setActivePreset(preset);
                    setOutputUrl('');
                    setOffsetX(0);
                    setOffsetY(0);
                    setScale(1.0);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all flex flex-col justify-between cursor-pointer ${
                    !isCustomPreset && activePreset.id === preset.id
                      ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/30'
                      : 'border-slate-100 bg-slate-50/60 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:bg-slate-850'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-850 dark:text-white">{preset.name}</span>
                    {!isCustomPreset && activePreset.id === preset.id && (
                      <Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5">{preset.label}</span>
                </button>
              ))}

              <button
                onClick={() => {
                  setIsCustomPreset(true);
                  setOutputUrl('');
                }}
                className={`w-full text-left p-2.5 rounded-xl border transition-all flex flex-col justify-between cursor-pointer ${
                  isCustomPreset
                    ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/30'
                    : 'border-slate-100 bg-slate-50/60 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:bg-slate-850'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-850 dark:text-white">Custom Dimensions</span>
                  {isCustomPreset && (
                    <Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  )}
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5">Specify custom width, height (mm) and print DPI</span>
              </button>
            </div>

            {/* Custom Dimension Inputs if selected */}
            {isCustomPreset && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 space-y-3 animate-fade-in">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Width (mm)</label>
                    <input
                      type="number"
                      min="10"
                      max="200"
                      value={customWidthMm}
                      onChange={(e) => setCustomWidthMm(Math.max(10, parseFloat(e.target.value) || 35))}
                      className="w-full text-xs font-bold p-1.5 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Height (mm)</label>
                    <input
                      type="number"
                      min="10"
                      max="200"
                      value={customHeightMm}
                      onChange={(e) => setCustomHeightMm(Math.max(10, parseFloat(e.target.value) || 45))}
                      className="w-full text-xs font-bold p-1.5 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* DPI Configuration */}
            <div className="border-t border-slate-100 pt-3 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Print DPI (Dots Per Inch)</span>
                <select
                  value={dpi}
                  onChange={(e) => setDpi(parseInt(e.target.value, 10))}
                  className="text-xs font-bold p-1.5 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 outline-none text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <option value={300}>300 DPI (High Quality Print)</option>
                  <option value={200}>200 DPI (Standard Print)</option>
                  <option value={150}>150 DPI (Web &amp; Forms)</option>
                  <option value={600}>600 DPI (Ultra Fine)</option>
                </select>
              </div>

              {/* Background Setting */}
              <div className="space-y-2 pt-1">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block">Solid Canvas Background</span>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setBgColorMode('white')}
                    className={`py-1.5 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                      bgColorMode === 'white'
                        ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-950'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                    }`}
                  >
                    White
                  </button>
                  <button
                    type="button"
                    onClick={() => setBgColorMode('custom')}
                    className={`py-1.5 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                      bgColorMode === 'custom'
                        ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-950'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                    }`}
                  >
                    Custom
                  </button>
                  <button
                    type="button"
                    onClick={() => setBgColorMode('transparent')}
                    className={`py-1.5 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                      bgColorMode === 'transparent'
                        ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-950'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                    }`}
                  >
                    Alpha (PNG)
                  </button>
                </div>

                {bgColorMode === 'custom' && (
                  <div className="flex items-center gap-2 pt-1 animate-fade-in">
                    <input
                      type="color"
                      value={customBgColor}
                      onChange={(e) => setCustomBgColor(e.target.value)}
                      className="h-7 w-12 rounded border border-slate-200 dark:border-slate-700 cursor-pointer p-0"
                    />
                    <input
                      type="text"
                      value={customBgColor}
                      onChange={(e) => setCustomBgColor(e.target.value)}
                      className="text-xs font-mono p-1 rounded border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 w-24"
                    />
                  </div>
                )}
              </div>

              {/* Guide Overlay Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Visual Alignment Guide</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showGuide}
                    onChange={(e) => setShowGuide(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600" />
                </label>
              </div>

              {/* Output Format */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1.5">Output Format</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['jpeg', 'png', 'webp'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setOutputFormat(fmt)}
                      className={`py-1 text-xs font-bold uppercase rounded-lg border transition-all cursor-pointer ${
                        outputFormat === fmt
                          ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-950 font-bold'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Editor / Alignment Stage */}
        <div className="lg:col-span-8 space-y-5">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/40 select-none">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Position &amp; Alignment Canvas ({targetWidthPx} × {targetHeightPx} px @ {dpi} DPI)
              </span>
              <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded font-bold">
                Aspect {currentAspect >= 1 ? `${currentAspect.toFixed(2)}:1` : `1:${(1/currentAspect).toFixed(2)}`}
              </span>
            </div>

            {!imageSrc ? (
              <div 
                onClick={() => document.getElementById('passport-raw-selector')?.click()}
                className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center hover:bg-slate-50/50 dark:border-slate-800 dark:hover:bg-slate-900/10 cursor-pointer transition-colors"
              >
                <input
                  id="passport-raw-selector"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50 text-indigo-500 dark:bg-slate-800">
                  <Upload className="h-5 w-5" />
                </div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-white mt-3">Upload portrait photo</h4>
                <p className="text-[11px] text-slate-400 mt-1">Accepts JPG, PNG, WebP photos taken with smartphones or cameras</p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Visual Canvas Stage */}
                <div className="flex justify-center bg-slate-950 p-6 rounded-2xl relative overflow-hidden">
                  <div 
                    className="relative border-2 border-dashed border-indigo-400/80 shadow-2xl overflow-hidden bg-slate-900 flex items-center justify-center"
                    style={{
                      width: '260px',
                      height: `${260 / currentAspect}px`,
                      maxHeight: '380px'
                    }}
                  >
                    <canvas
                      ref={canvasRef}
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                    />

                    {/* Face Positioning Guide Overlay */}
                    {showGuide && (
                      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                        {/* Oval Head Area */}
                        <div className="w-[58%] h-[64%] border border-dashed border-indigo-400 rounded-full flex items-center justify-center relative">
                          {/* Eye Line Guide */}
                          <div className="absolute w-[125%] h-[1px] bg-red-400/70 top-[45%]" />
                          {/* Chin Marker Line */}
                          <div className="absolute w-[80%] h-[1px] bg-amber-400/70 bottom-[5%]" />
                          {/* Center Vertical Axis */}
                          <div className="absolute w-[1px] h-[125%] bg-indigo-400/70 left-[50%]" />
                        </div>
                        <span className="absolute bottom-1.5 text-[8.5px] font-mono font-bold tracking-wider text-indigo-300 bg-black/80 px-2 py-0.5 rounded">
                          ALIGN EYES WITH RED LINE
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Fine Tuning Controls */}
                <div className="bg-slate-50/70 p-4.5 rounded-xl border border-slate-100 dark:bg-slate-950/20 dark:border-slate-850 space-y-4">
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-650 dark:text-indigo-400">
                    <div className="flex items-center gap-1.5">
                      <SlidersHorizontal className="h-4 w-4" />
                      <span>Zoom, Pan &amp; Rotate Adjustments</span>
                    </div>
                    <button
                      onClick={() => {
                        setScale(1);
                        setOffsetX(0);
                        setOffsetY(0);
                        setRotation(0);
                      }}
                      className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      Reset alignment
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Scale */}
                    <div>
                      <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-1">
                        <span>Zoom / Scale</span>
                        <span>{scale.toFixed(2)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.3"
                        max="3.0"
                        step="0.02"
                        value={scale}
                        onChange={(e) => setScale(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg accent-indigo-600 cursor-pointer"
                      />
                    </div>

                    {/* Rotation */}
                    <div>
                      <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-1">
                        <span>Rotate portrait</span>
                        <span>{rotation}°</span>
                      </div>
                      <input
                        type="range"
                        min="-45"
                        max="45"
                        step="1"
                        value={rotation}
                        onChange={(e) => setRotation(parseInt(e.target.value, 10))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg accent-indigo-600 cursor-pointer"
                      />
                    </div>

                    {/* Offset X */}
                    <div>
                      <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-1">
                        <span>Horizontal Pan (X)</span>
                        <span>{offsetX}px</span>
                      </div>
                      <input
                        type="range"
                        min="-200"
                        max="200"
                        value={offsetX}
                        onChange={(e) => setOffsetX(parseInt(e.target.value, 10))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg accent-indigo-600 cursor-pointer"
                      />
                    </div>

                    {/* Offset Y */}
                    <div>
                      <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-1">
                        <span>Vertical Pan (Y)</span>
                        <span>{offsetY}px</span>
                      </div>
                      <input
                        type="range"
                        min="-200"
                        max="200"
                        value={offsetY}
                        onChange={(e) => setOffsetY(parseInt(e.target.value, 10))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg accent-indigo-600 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2.5 pt-3 border-t border-slate-200/70 dark:border-slate-800">
                    <button
                      onClick={generatePhoto}
                      className="flex-1 rounded-xl bg-slate-950 px-4 py-3 text-xs font-bold text-white hover:bg-slate-900 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 shadow-md transition-all cursor-pointer text-center flex items-center justify-center gap-2"
                    >
                      <RefreshCw className={`h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} />
                      {isProcessing ? 'Rendering high-res photo...' : 'Generate Photo Crop'}
                    </button>
                    {onOpenPhotoSheet && (
                      <button
                        onClick={handleOpenSheet}
                        className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 text-xs font-bold shadow-soft transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Printer className="h-4 w-4" />
                        Create Photo Sheet
                      </button>
                    )}
                    <button
                      onClick={() => setFile(null)}
                      className="rounded-xl border border-slate-200 px-3 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-850 cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Final Output Result Card */}
          {outputUrl && (
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/40 animate-fade-in flex flex-col sm:flex-row items-center gap-6">
              <div 
                className="border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 rounded-xl overflow-hidden shadow-md shrink-0 flex items-center justify-center"
                style={{
                  width: '120px',
                  height: `${120 / currentAspect}px`,
                  maxHeight: '160px'
                }}
              >
                <img
                  src={outputUrl}
                  alt="Ready Passport Output"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 min-w-0 space-y-2 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-450">
                  <Eye className="h-4 w-4" />
                  <span>Photo Ready for Download</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Formatted to <span className="font-bold text-slate-800 dark:text-white">{targetWidthPx} × {targetHeightPx} px</span> ({outputBlob ? (outputBlob.size / 1024).toFixed(1) : 0} KB) at {dpi} DPI.
                </p>
                <div className="flex flex-wrap gap-2 pt-2 justify-center sm:justify-start">
                  <button
                    onClick={downloadPhoto}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 text-xs shadow-soft transition-all cursor-pointer"
                  >
                    <Download className="h-4 w-4" /> Download Photo
                  </button>
                  {onOpenPhotoSheet && (
                    <button
                      onClick={handleOpenSheet}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white font-bold py-2.5 px-4 text-xs transition-all cursor-pointer"
                    >
                      <Printer className="h-4 w-4" /> Print on Multi-Photo Sheet
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {isRenameOpen && (
        <RenameModal
          isOpen={isRenameOpen}
          originalName={`Passport_Photo_${targetWidthPx}x${targetHeightPx}.${outputFormat}`}
          onConfirm={(newName) => {
            const link = document.createElement('a');
            link.href = outputUrl;
            link.download = newName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setIsRenameOpen(false);
          }}
          onClose={() => setIsRenameOpen(false)}
        />
      )}
    </div>
  );
}
