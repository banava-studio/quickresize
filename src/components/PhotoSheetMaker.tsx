/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Printer, 
  Upload, 
  Download, 
  Grid, 
  Scissors, 
  Sparkles, 
  RefreshCw, 
  Info,
  Check,
  Layers
} from 'lucide-react';
import RenameModal from './RenameModal';
import { physicalToPixels } from '../core/presets/smartPresets';
import { PassportPresetOption } from './PassportMaker';

export interface PaperSizeOption {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  desc: string;
}

const PAPER_SIZES: PaperSizeOption[] = [
  { id: 'a4', name: 'A4 Sheet (210 x 297 mm)', widthMm: 210, heightMm: 297, desc: 'Standard international printer paper' },
  { id: '4x6', name: '4" x 6" Photo Paper (102 x 152 mm)', widthMm: 101.6, heightMm: 152.4, desc: 'Standard photo studio postcard paper' },
  { id: 'a5', name: 'A5 Sheet (148 x 210 mm)', widthMm: 148, heightMm: 210, desc: 'Half A4 compact print sheet' },
  { id: 'letter', name: 'US Letter (8.5" x 11")', widthMm: 215.9, heightMm: 279.4, desc: 'Standard North American paper' }
];

export interface PhotoSheetMakerProps {
  initialPhotoUrl?: string;
  initialPreset?: PassportPresetOption;
}

export default function PhotoSheetMaker({ initialPhotoUrl, initialPreset }: PhotoSheetMakerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string>(initialPhotoUrl || '');
  
  // Paper Settings
  const [paper, setPaper] = useState<PaperSizeOption>(PAPER_SIZES[0]);
  const [dpi, setDpi] = useState<number>(300);
  
  // Single Photo Dimension (in mm)
  const [photoWidthMm, setPhotoWidthMm] = useState<number>(initialPreset ? initialPreset.widthMm : 35);
  const [photoHeightMm, setPhotoHeightMm] = useState<number>(initialPreset ? initialPreset.heightMm : 45);
  
  // Grid layout controls
  const [marginMm, setMarginMm] = useState<number>(10);
  const [spacingMm, setSpacingMm] = useState<number>(5);
  const [showCutLines, setShowCutLines] = useState<boolean>(true);
  const [copiesLimit, setCopiesLimit] = useState<number>(0); // 0 = fill all available slots
  
  // Output
  const [outputFormat, setOutputFormat] = useState<'jpeg' | 'png'>('jpeg');
  const [outputUrl, setOutputUrl] = useState<string>('');
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isRenameOpen, setIsRenameOpen] = useState<boolean>(false);
  const [renderedCount, setRenderedCount] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (initialPhotoUrl) {
      setImageSrc(initialPhotoUrl);
      if (initialPreset) {
        setPhotoWidthMm(initialPreset.widthMm);
        setPhotoHeightMm(initialPreset.heightMm);
      }
    }
  }, [initialPhotoUrl, initialPreset]);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setImageSrc(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  useEffect(() => {
    if (imageSrc) {
      const img = new Image();
      img.onload = () => {
        imgRef.current = img;
        renderSheet();
      };
      img.src = imageSrc;
    }
  }, [imageSrc, paper, dpi, photoWidthMm, photoHeightMm, marginMm, spacingMm, showCutLines, copiesLimit, outputFormat]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const renderSheet = () => {
    const img = imgRef.current;
    if (!img) return;

    setIsProcessing(true);
    const canvas = canvasRef.current || document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Calculate physical pixel dimensions
    const sheetWidthPx = physicalToPixels(paper.widthMm, 'mm', dpi);
    const sheetHeightPx = physicalToPixels(paper.heightMm, 'mm', dpi);
    const singlePhotoWidthPx = physicalToPixels(photoWidthMm, 'mm', dpi);
    const singlePhotoHeightPx = physicalToPixels(photoHeightMm, 'mm', dpi);
    const marginPx = physicalToPixels(marginMm, 'mm', dpi);
    const spacingPx = physicalToPixels(spacingMm, 'mm', dpi);

    canvas.width = sheetWidthPx;
    canvas.height = sheetHeightPx;

    // Solid white sheet background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, sheetWidthPx, sheetHeightPx);

    // 2. Compute Maximum Grid Capacity
    const usableW = sheetWidthPx - marginPx * 2;
    const usableH = sheetHeightPx - marginPx * 2;

    const cols = Math.floor((usableW + spacingPx) / (singlePhotoWidthPx + spacingPx));
    const rows = Math.floor((usableH + spacingPx) / (singlePhotoHeightPx + spacingPx));

    if (cols <= 0 || rows <= 0) {
      setIsProcessing(false);
      return;
    }

    const totalGridCapacity = cols * rows;
    const countToDraw = copiesLimit > 0 ? Math.min(copiesLimit, totalGridCapacity) : totalGridCapacity;
    setRenderedCount(countToDraw);

    // Center the entire grid block on the sheet
    const totalBlockW = cols * singlePhotoWidthPx + (cols - 1) * spacingPx;
    const totalBlockH = rows * singlePhotoHeightPx + (rows - 1) * spacingPx;
    const startX = Math.round((sheetWidthPx - totalBlockW) / 2);
    const startY = Math.round((sheetHeightPx - totalBlockH) / 2);

    let drawn = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (drawn >= countToDraw) break;

        const x = startX + c * (singlePhotoWidthPx + spacingPx);
        const y = startY + r * (singlePhotoHeightPx + spacingPx);

        // Draw individual photo
        ctx.drawImage(img, x, y, singlePhotoWidthPx, singlePhotoHeightPx);

        // Draw dotted/light cut line guides if enabled
        if (showCutLines) {
          ctx.save();
          ctx.strokeStyle = '#CBD5E1';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(x - 0.5, y - 0.5, singlePhotoWidthPx + 1, singlePhotoHeightPx + 1);
          ctx.restore();
        }

        drawn++;
      }
    }

    const mime = outputFormat === 'png' ? 'image/png' : 'image/jpeg';
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
            Multi-Copy Photo Sheet Maker (100% Client-Side)
          </p>
          <p className="text-[11px] leading-relaxed text-blue-700/80 dark:text-blue-300/80">
            Generate print-ready A4 or 4x6" photo sheets repeating passport, ID, or wallet photos with adjustable margins, spacing, and dashed cut guides.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
        {!imageSrc ? (
          <div 
            onClick={() => document.getElementById('photo-sheet-selector')?.click()}
            className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center hover:bg-slate-50/50 dark:border-slate-800 dark:hover:bg-slate-900/10 cursor-pointer transition-colors"
          >
            <input
              id="photo-sheet-selector"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50 text-indigo-500 dark:bg-slate-800">
              <Printer className="h-5 w-5" />
            </div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-white mt-3">Upload cropped passport/portrait photo</h4>
            <p className="text-[11px] text-slate-400 mt-1">Accepts JPG, PNG, and WebP portrait photos</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Controls */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 space-y-4">
                
                {/* Paper Size */}
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-2">Paper Sheet Size</span>
                  <div className="space-y-1">
                    {PAPER_SIZES.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPaper(p)}
                        className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-center justify-between cursor-pointer ${
                          paper.id === p.id
                            ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/30'
                            : 'border-slate-200/70 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900'
                        }`}
                      >
                        <div>
                          <span className="text-xs font-bold text-slate-800 dark:text-white block">{p.name}</span>
                          <span className="text-[10px] text-slate-400">{p.desc}</span>
                        </div>
                        {paper.id === p.id && (
                          <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Single Photo Dimensions */}
                <div className="space-y-2 pt-2 border-t border-slate-200/70 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block">Single Photo Dimensions</span>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block mb-1">Width (mm)</span>
                      <input
                        type="number"
                        value={photoWidthMm}
                        onChange={(e) => setPhotoWidthMm(Math.max(10, parseFloat(e.target.value) || 35))}
                        className="w-full text-xs font-bold p-1.5 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block mb-1">Height (mm)</span>
                      <input
                        type="number"
                        value={photoHeightMm}
                        onChange={(e) => setPhotoHeightMm(Math.max(10, parseFloat(e.target.value) || 45))}
                        className="w-full text-xs font-bold p-1.5 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-1 pt-1">
                    {[
                      { label: '35x45 mm', w: 35, h: 45 },
                      { label: '2x2 in (51 mm)', w: 50.8, h: 50.8 },
                      { label: '30x40 mm', w: 30, h: 40 }
                    ].map((pre) => (
                      <button
                        key={pre.label}
                        type="button"
                        onClick={() => {
                          setPhotoWidthMm(pre.w);
                          setPhotoHeightMm(pre.h);
                        }}
                        className="px-2 py-1 text-[10px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 text-slate-700 dark:text-slate-300 cursor-pointer"
                      >
                        {pre.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Spacing & Margins */}
                <div className="space-y-3 pt-2 border-t border-slate-200/70 dark:border-slate-800">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                        <span>Margin (mm)</span>
                        <span>{marginMm} mm</span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="30"
                        value={marginMm}
                        onChange={(e) => setMarginMm(parseInt(e.target.value, 10))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg accent-indigo-600 cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                        <span>Gap Spacing (mm)</span>
                        <span>{spacingMm} mm</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="20"
                        value={spacingMm}
                        onChange={(e) => setSpacingMm(parseInt(e.target.value, 10))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg accent-indigo-600 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Cut Lines Toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Printable Cut Line Guides</span>
                    <input
                      type="checkbox"
                      checked={showCutLines}
                      onChange={(e) => setShowCutLines(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Output Format */}
                <div className="space-y-1.5 pt-2 border-t border-slate-200/70 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block">Print Export Format</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['jpeg', 'png'] as const).map((fmt) => (
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
                  Download Print Sheet
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

            {/* Right Sheet Preview */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Print Sheet Preview ({renderedCount} photos on {paper.name})
                </span>
                {outputBlob && (
                  <span className="text-[11px] font-mono text-slate-500 font-bold">
                    {(outputBlob.size / 1024 / 1024).toFixed(2)} MB @ 300 DPI
                  </span>
                )}
              </div>

              <div className="p-6 rounded-2xl bg-slate-100/80 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 flex items-center justify-center min-h-[460px] overflow-hidden">
                <canvas ref={canvasRef} className="hidden" />

                {outputUrl ? (
                  <div className="max-h-[500px] max-w-full overflow-auto shadow-2xl rounded-lg border border-slate-300 dark:border-slate-800 bg-white p-2">
                    <img 
                      src={outputUrl} 
                      alt="Photo Sheet Output" 
                      className="max-h-[460px] w-auto object-contain mx-auto"
                    />
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 animate-spin text-indigo-500" />
                    Generating high-resolution 300 DPI photo sheet...
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
          originalName={`Photo_Sheet_${paper.id}_${renderedCount}copies.${outputFormat}`}
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
