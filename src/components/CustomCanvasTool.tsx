/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Square, 
  Upload, 
  Download, 
  SlidersHorizontal, 
  Move, 
  Sparkles, 
  RefreshCw, 
  Info,
  Check
} from 'lucide-react';
import RenameModal from './RenameModal';
import { physicalToPixels, DimensionUnit } from '../core/presets/smartPresets';

export type CanvasPosition = 
  | 'center' 
  | 'top-left' 
  | 'top' 
  | 'top-right' 
  | 'center-left' 
  | 'center-right' 
  | 'bottom-left' 
  | 'bottom' 
  | 'bottom-right';

export default function CustomCanvasTool() {
  const [file, setFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string>('');
  
  // Canvas Dimensions
  const [unit, setUnit] = useState<DimensionUnit>('px');
  const [inputWidth, setInputWidth] = useState<number>(1200);
  const [inputHeight, setInputHeight] = useState<number>(1200);
  const [dpi, setDpi] = useState<number>(300);
  
  // Background
  const [bgStyle, setBgStyle] = useState<'white' | 'black' | 'transparent' | 'custom'>('white');
  const [customBgColor, setCustomBgColor] = useState<string>('#F1F5F9');
  
  // Image Fit & Position
  const [fitMode, setFitMode] = useState<'contain' | 'cover' | 'fill' | 'original'>('contain');
  const [position, setPosition] = useState<CanvasPosition>('center');
  const [padding, setPadding] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.0);
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);

  // Output
  const [outputFormat, setOutputFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [outputUrl, setOutputUrl] = useState<string>('');
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isRenameOpen, setIsRenameOpen] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const canvasWidthPx = physicalToPixels(inputWidth, unit, dpi);
  const canvasHeightPx = physicalToPixels(inputHeight, unit, dpi);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setImageSrc(url);
      setScale(1.0);
      setOffsetX(0);
      setOffsetY(0);
      setPadding(0);
      setOutputUrl('');
      setOutputBlob(null);

      const img = new Image();
      img.onload = () => {
        imgRef.current = img;
        renderCustomCanvas();
      };
      img.src = url;

      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  useEffect(() => {
    if (imgRef.current) {
      renderCustomCanvas();
    }
  }, [canvasWidthPx, canvasHeightPx, bgStyle, customBgColor, fitMode, position, padding, scale, offsetX, offsetY, outputFormat]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const renderCustomCanvas = () => {
    const img = imgRef.current;
    if (!img) return;

    setIsProcessing(true);
    const canvas = canvasRef.current || document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = Math.max(10, Math.min(8000, canvasWidthPx));
    canvas.height = Math.max(10, Math.min(8000, canvasHeightPx));

    // Fill background
    if (bgStyle === 'white') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (bgStyle === 'black') {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (bgStyle === 'custom') {
      ctx.fillStyle = customBgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // Usable area after padding
    const usableW = Math.max(1, canvas.width - padding * 2);
    const usableH = Math.max(1, canvas.height - padding * 2);

    let drawW = img.width;
    let drawH = img.height;

    const imgAspect = img.width / img.height;
    const canvasAspect = usableW / usableH;

    if (fitMode === 'contain') {
      if (imgAspect > canvasAspect) {
        drawW = usableW;
        drawH = usableW / imgAspect;
      } else {
        drawH = usableH;
        drawW = usableH * imgAspect;
      }
    } else if (fitMode === 'cover') {
      if (imgAspect > canvasAspect) {
        drawH = usableH;
        drawW = usableH * imgAspect;
      } else {
        drawW = usableW;
        drawH = usableW / imgAspect;
      }
    } else if (fitMode === 'fill') {
      drawW = usableW;
      drawH = usableH;
    } else {
      // original
      drawW = img.width;
      drawH = img.height;
    }

    // Apply scale multiplier
    drawW *= scale;
    drawH *= scale;

    // Determine Anchor coordinates
    let startX = (canvas.width - drawW) / 2;
    let startY = (canvas.height - drawH) / 2;

    switch (position) {
      case 'top-left':
        startX = padding;
        startY = padding;
        break;
      case 'top':
        startX = (canvas.width - drawW) / 2;
        startY = padding;
        break;
      case 'top-right':
        startX = canvas.width - drawW - padding;
        startY = padding;
        break;
      case 'center-left':
        startX = padding;
        startY = (canvas.height - drawH) / 2;
        break;
      case 'center-right':
        startX = canvas.width - drawW - padding;
        startY = (canvas.height - drawH) / 2;
        break;
      case 'bottom-left':
        startX = padding;
        startY = canvas.height - drawH - padding;
        break;
      case 'bottom':
        startX = (canvas.width - drawW) / 2;
        startY = canvas.height - drawH - padding;
        break;
      case 'bottom-right':
        startX = canvas.width - drawW - padding;
        startY = canvas.height - drawH - padding;
        break;
      case 'center':
      default:
        startX = (canvas.width - drawW) / 2;
        startY = (canvas.height - drawH) / 2;
        break;
    }

    // Apply manual offset
    startX += offsetX;
    startY += offsetY;

    ctx.drawImage(img, startX, startY, drawW, drawH);

    const mime = outputFormat === 'png' ? 'image/png' : outputFormat === 'webp' ? 'image/webp' : 'image/jpeg';
    canvas.toBlob((blob) => {
      if (blob) {
        setOutputBlob(blob);
        setOutputUrl(URL.createObjectURL(blob));
      }
      setIsProcessing(false);
    }, mime, 0.95);
  };

  return (
    <div className="space-y-6 select-none animate-fade-in">
      {/* Informational Header */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-950 dark:bg-blue-950/20 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2.5">
        <Info className="h-4.5 w-4.5 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
        <div className="space-y-1">
          <p className="font-semibold">
            Custom Canvas &amp; Background Placement (100% Client-Side)
          </p>
          <p className="text-[11px] leading-relaxed text-blue-700/80 dark:text-blue-300/80">
            Expand or frame any image onto custom width &amp; height dimensions with solid white, black, custom hex, or transparent backgrounds. Supports mm, cm, in, and px units at adjustable DPI.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
        {!file ? (
          <div 
            onClick={() => document.getElementById('custom-canvas-selector')?.click()}
            className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center hover:bg-slate-50/50 dark:border-slate-800 dark:hover:bg-slate-900/10 cursor-pointer transition-colors"
          >
            <input
              id="custom-canvas-selector"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50 text-indigo-500 dark:bg-slate-800">
              <Square className="h-5 w-5" />
            </div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-white mt-3">Upload image to place on custom canvas</h4>
            <p className="text-[11px] text-slate-400 mt-1">Accepts any photo, illustration, or graphic</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Controls */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 space-y-4">
                
                {/* Unit & Dimensions */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Canvas Dimensions</span>
                    <div className="flex gap-1">
                      {(['px', 'mm', 'cm', 'in'] as DimensionUnit[]).map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => {
                            setUnit(u);
                            if (u === 'mm') {
                              setInputWidth(100);
                              setInputHeight(100);
                            } else if (u === 'in') {
                              setInputWidth(4);
                              setInputHeight(4);
                            } else if (u === 'cm') {
                              setInputWidth(10);
                              setInputHeight(10);
                            } else {
                              setInputWidth(1200);
                              setInputHeight(1200);
                            }
                          }}
                          className={`px-2 py-0.5 text-xs font-bold uppercase rounded border transition-all cursor-pointer ${
                            unit === u
                              ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-950'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block mb-1">Width ({unit})</span>
                      <input
                        type="number"
                        value={inputWidth}
                        onChange={(e) => setInputWidth(Math.max(1, parseFloat(e.target.value) || 100))}
                        className="w-full text-xs font-bold p-1.5 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block mb-1">Height ({unit})</span>
                      <input
                        type="number"
                        value={inputHeight}
                        onChange={(e) => setInputHeight(Math.max(1, parseFloat(e.target.value) || 100))}
                        className="w-full text-xs font-bold p-1.5 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 outline-none"
                      />
                    </div>
                  </div>

                  {unit !== 'px' && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">DPI</span>
                      <select
                        value={dpi}
                        onChange={(e) => setDpi(parseInt(e.target.value, 10))}
                        className="text-xs font-bold p-1 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                      >
                        <option value={300}>300 DPI</option>
                        <option value={150}>150 DPI</option>
                        <option value={72}>72 DPI</option>
                      </select>
                    </div>
                  )}

                  <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 block">
                    Calculated: {canvasWidthPx} × {canvasHeightPx} px
                  </span>
                </div>

                {/* Background Fill */}
                <div className="space-y-1.5 pt-2 border-t border-slate-200/70 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block">Canvas Background</span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: 'white', label: 'White' },
                      { id: 'black', label: 'Black' },
                      { id: 'custom', label: 'Color' },
                      { id: 'transparent', label: 'Alpha' }
                    ].map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setBgStyle(b.id as any)}
                        className={`py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                          bgStyle === b.id
                            ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-950'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                        }`}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>

                  {bgStyle === 'custom' && (
                    <div className="flex items-center gap-2 pt-1 animate-fade-in">
                      <input
                        type="color"
                        value={customBgColor}
                        onChange={(e) => setCustomBgColor(e.target.value)}
                        className="h-6 w-10 rounded border border-slate-200 cursor-pointer p-0"
                      />
                      <span className="text-xs font-mono">{customBgColor}</span>
                    </div>
                  )}
                </div>

                {/* Fit Mode */}
                <div className="space-y-1.5 pt-2 border-t border-slate-200/70 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block">Image Fitting Mode</span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: 'contain', label: 'Fit' },
                      { id: 'cover', label: 'Cover' },
                      { id: 'fill', label: 'Fill' },
                      { id: 'original', label: '1:1' }
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setFitMode(m.id as any)}
                        className={`py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
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

                {/* Alignment Grid Anchor */}
                <div className="space-y-2 pt-2 border-t border-slate-200/70 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block">Anchor Alignment</span>
                  <div className="grid grid-cols-3 gap-1 w-36 mx-auto">
                    {[
                      'top-left', 'top', 'top-right',
                      'center-left', 'center', 'center-right',
                      'bottom-left', 'bottom', 'bottom-right'
                    ].map((pos) => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => setPosition(pos as CanvasPosition)}
                        className={`h-7 rounded border transition-all flex items-center justify-center cursor-pointer ${
                          position === pos
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className={`h-2 w-2 rounded-full ${position === pos ? 'bg-white' : 'bg-slate-400'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sliders for Padding & Scale */}
                <div className="space-y-3 pt-2 border-t border-slate-200/70 dark:border-slate-800">
                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-1">
                      <span>Inner Padding</span>
                      <span>{padding}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="150"
                      value={padding}
                      onChange={(e) => setPadding(parseInt(e.target.value, 10))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg accent-indigo-600 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-1">
                      <span>Scale Multiplier</span>
                      <span>{scale.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="2.5"
                      step="0.05"
                      value={scale}
                      onChange={(e) => setScale(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg accent-indigo-600 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Output Format */}
                <div className="space-y-1.5 pt-2 border-t border-slate-200/70 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block">Export Format</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['png', 'jpeg', 'webp'] as const).map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => setOutputFormat(fmt)}
                        className={`py-1.5 text-xs font-bold uppercase rounded-lg border transition-all cursor-pointer ${
                          outputFormat === fmt
                            ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-950'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsRenameOpen(true)}
                  disabled={!outputUrl}
                  className="flex-1 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-bold text-xs py-3 hover:opacity-90 transition-opacity cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Download className="h-4 w-4" />
                  Download Canvas
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setImageSrc('');
                    setOutputUrl('');
                  }}
                  className="px-3 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-850 cursor-pointer text-xs font-bold"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Right Canvas Preview */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Custom Canvas Live Preview ({canvasWidthPx} × {canvasHeightPx} px)
                </span>
                {outputBlob && (
                  <span className="text-[11px] font-mono text-slate-500 font-bold">
                    {(outputBlob.size / 1024).toFixed(1)} KB
                  </span>
                )}
              </div>

              <div className="p-6 rounded-2xl bg-slate-100/80 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 flex items-center justify-center min-h-[420px] overflow-hidden">
                <canvas ref={canvasRef} className="hidden" />

                {outputUrl ? (
                  <div className="max-h-[460px] max-w-full overflow-auto shadow-2xl rounded-lg border border-slate-300 dark:border-slate-800 bg-white">
                    <img 
                      src={outputUrl} 
                      alt="Custom Canvas Output" 
                      className="max-h-[440px] w-auto object-contain mx-auto"
                    />
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 animate-spin text-indigo-500" />
                    Rendering canvas...
                  </span>
                )}
              </div>
            </div>

          </div>
        )}
      </div>

      {isRenameOpen && outputUrl && (
        <RenameModal
          isOpen={isRenameOpen}
          originalName={`Custom_Canvas_${canvasWidthPx}x${canvasHeightPx}.${outputFormat}`}
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
