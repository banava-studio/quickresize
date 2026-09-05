/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  Trash2, 
  FileText, 
  Sliders, 
  Settings, 
  Download, 
  Crop, 
  Sparkles, 
  RotateCw,
  Info,
  Check,
  Maximize2
} from 'lucide-react';
import RenameModal from './RenameModal';
import { compressToExactKB } from '../core/compression/compressionEngine';

interface HandledSignatureResult {
  url: string;
  blob: Blob;
  width: number;
  height: number;
  size: number;
}

const SIGNATURE_PRESETS = [
  { id: 'portal-exam', name: 'Exam / Portal (140 x 60 px)', width: 140, height: 60, targetKB: 20, desc: '3.5x1.5 cm ratio, <20 KB target' },
  { id: 'small', name: 'Small Signature (300 x 100 px)', width: 300, height: 100, targetKB: 50, desc: 'Compact web and document insert' },
  { id: 'medium', name: 'Medium Signature (600 x 200 px)', width: 600, height: 200, targetKB: 100, desc: 'Standard high-clarity insert' },
  { id: 'large', name: 'Large Signature (1200 x 400 px)', width: 1200, height: 400, targetKB: 250, desc: 'Ultra-crisp high-resolution format' },
  { id: 'custom', name: 'Custom Dimensions', width: 400, height: 150, targetKB: 0, desc: 'Custom width, height, and target size' }
];

export default function SignatureToolkit() {
  const [file, setFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string>('');
  const [activePresetId, setActivePresetId] = useState<string>('portal-exam');
  
  // Custom sizing & formatting
  const [targetWidth, setTargetWidth] = useState<number>(140);
  const [targetHeight, setTargetHeight] = useState<number>(60);
  const [targetSizeKB, setTargetSizeKB] = useState<number>(20);
  const [customSizeLock, setCustomSizeLock] = useState<boolean>(true);
  
  // Signature Adjustments
  const [inkColor, setInkColor] = useState<'original' | 'black' | 'blue'>('original');
  const [bgMode, setBgMode] = useState<'transparent' | 'white' | 'custom'>('transparent');
  const [customBgColor, setCustomBgColor] = useState<string>('#FFFFFF');
  const [autoCrop, setAutoCrop] = useState<boolean>(true);
  const [cropPadding, setCropPadding] = useState<number>(15);
  const [contrastThreshold, setContrastThreshold] = useState<number>(180); // 0-255
  const [strokeThickening, setStrokeThickening] = useState<number>(0); // 0 to 2
  
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [output, setOutput] = useState<HandledSignatureResult | null>(null);
  const [isRenameOpen, setIsRenameOpen] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setImageSrc(url);
      setOutput(null);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  const handleSelectPreset = (presetId: string) => {
    setActivePresetId(presetId);
    const pr = SIGNATURE_PRESETS.find(p => p.id === presetId);
    if (pr && pr.id !== 'custom') {
      setTargetWidth(pr.width);
      setTargetHeight(pr.height);
      setTargetSizeKB(pr.targetKB);
    }
  };

  // Run the signature processing pipeline on parameter changes
  useEffect(() => {
    if (imageSrc) {
      processSignature();
    }
  }, [imageSrc, inkColor, bgMode, customBgColor, autoCrop, cropPadding, contrastThreshold, targetWidth, targetHeight, targetSizeKB, customSizeLock, strokeThickening]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const processSignature = () => {
    if (!imageSrc) return;
    setIsProcessing(true);

    const img = new Image();
    img.src = imageSrc;
    img.onload = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1. Temporary canvas for full resolution image manipulation
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;

      tempCanvas.width = img.width;
      tempCanvas.height = img.height;
      tempCtx.drawImage(img, 0, 0);

      const imgData = tempCtx.getImageData(0, 0, img.width, img.height);
      const data = imgData.data;

      // 2. Background extraction and ink color mapping
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Luminance calculation
        const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

        if (brightness > contrastThreshold) {
          // Lighter than threshold -> Paper background
          if (bgMode === 'transparent') {
            data[i + 3] = 0; // Alpha transparent
          } else if (bgMode === 'white') {
            data[i] = 255;
            data[i + 1] = 255;
            data[i + 2] = 255;
            data[i + 3] = 255;
          } else {
            // custom hex
            const hex = customBgColor.replace('#', '');
            data[i] = parseInt(hex.substring(0, 2), 16) || 255;
            data[i + 1] = parseInt(hex.substring(2, 4), 16) || 255;
            data[i + 2] = parseInt(hex.substring(4, 6), 16) || 255;
            data[i + 3] = 255;
          }
        } else {
          // Darker -> Ink strokes!
          if (inkColor === 'black') {
            data[i] = 12;
            data[i + 1] = 12;
            data[i + 2] = 14;
            data[i + 3] = 255;
          } else if (inkColor === 'blue') {
            data[i] = 18;
            data[i + 1] = 52;
            data[i + 2] = 186;
            data[i + 3] = 255;
          }
        }
      }
      tempCtx.putImageData(imgData, 0, 0);

      // 3. Automated Crop Scan: detect tight bounding box of ink pixels
      let minX = tempCanvas.width;
      let maxX = 0;
      let minY = tempCanvas.height;
      let maxY = 0;
      let foundInk = false;

      const processedData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height).data;
      for (let y = 0; y < tempCanvas.height; y++) {
        for (let x = 0; x < tempCanvas.width; x++) {
          const idx = (y * tempCanvas.width + x) * 4;
          const isTransparent = processedData[idx + 3] === 0;
          const isWhiteBG = processedData[idx] > 245 && processedData[idx + 1] > 245 && processedData[idx + 2] > 245;
          
          if (!isTransparent && !isWhiteBG) {
            foundInk = true;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      // Add safety padding margin
      if (foundInk && autoCrop) {
        minX = Math.max(0, minX - cropPadding);
        maxX = Math.min(tempCanvas.width, maxX + cropPadding);
        minY = Math.max(0, minY - cropPadding);
        maxY = Math.min(tempCanvas.height, maxY + cropPadding);
      } else {
        minX = 0;
        maxX = tempCanvas.width;
        minY = 0;
        maxY = tempCanvas.height;
      }

      const croppedW = Math.max(1, maxX - minX);
      const croppedH = Math.max(1, maxY - minY);

      // Determine correct output scale bounds
      let finalW = targetWidth;
      let finalH = targetHeight;

      if (customSizeLock) {
        const cropAspect = croppedW / croppedH;
        const targetAspect = targetWidth / targetHeight;
        if (cropAspect > targetAspect) {
          finalW = targetWidth;
          finalH = Math.round(targetWidth / cropAspect);
        } else {
          finalH = targetHeight;
          finalW = Math.round(targetHeight * cropAspect);
        }
      }

      // Render to visible canvas
      canvas.width = finalW;
      canvas.height = finalH;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // If background mode is white or custom, fill canvas first
      if (bgMode === 'white') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, finalW, finalH);
      } else if (bgMode === 'custom') {
        ctx.fillStyle = customBgColor;
        ctx.fillRect(0, 0, finalW, finalH);
      } else {
        ctx.clearRect(0, 0, finalW, finalH);
      }

      // Draw cropped signature centered
      ctx.drawImage(
        tempCanvas,
        minX, minY, croppedW, croppedH,
        0, 0, finalW, finalH
      );

      // 4. Export / Optional Compression
      const format = bgMode === 'transparent' ? 'png' : 'jpeg';
      
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setIsProcessing(false);
          return;
        }

        let finalBlob = blob;

        // If user configured a target KB and format is JPEG, apply target size engine
        if (targetSizeKB > 0 && format === 'jpeg') {
          try {
            const compRes = await compressToExactKB(blob, {
              targetSizeKB,
              format: 'jpeg',
              maintainAspectRatio: true,
              tolerancePercentage: 0.05
            });
            finalBlob = compRes.blob;
          } catch (e) {
            console.warn('Target KB compression fallback:', e);
          }
        }

        setOutput({
          url: URL.createObjectURL(finalBlob),
          blob: finalBlob,
          width: finalW,
          height: finalH,
          size: finalBlob.size
        });
        setIsProcessing(false);
      }, format === 'png' ? 'image/png' : 'image/jpeg', 0.90);
    };
  };

  const downloadSignature = () => {
    if (!output) return;
    setIsRenameOpen(true);
  };

  return (
    <div className="space-y-6 select-none animate-fade-in">
      {/* Informational Banner */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-950 dark:bg-blue-950/20 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2.5">
        <Info className="h-4.5 w-4.5 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
        <div className="space-y-1">
          <p className="font-semibold">
            Signature Image Maker (Clean, Crisp &amp; Transparent)
          </p>
          <p className="text-[11px] leading-relaxed text-blue-700/80 dark:text-blue-300/80">
            Easily remove smartphone paper shadows, convert ink to pure black or blue, crop excess whitespace, and compress to exact KB limits for official forms &amp; applications.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
        {!file ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center hover:bg-slate-50/50 dark:border-slate-800 dark:hover:bg-slate-900/10 cursor-pointer transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50 text-indigo-500 dark:bg-slate-800">
              <Crop className="h-5 w-5" />
            </div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-white mt-3">Upload handwritten signature photo</h4>
            <p className="text-[11px] text-slate-400 mt-1">Accepts phone snapshots on white or lined paper</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Controls Panel */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 space-y-4">
                
                {/* Preset Selector */}
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-2">Preset Dimensions</span>
                  <div className="space-y-1">
                    {SIGNATURE_PRESETS.map((pr) => (
                      <button
                        key={pr.id}
                        type="button"
                        onClick={() => handleSelectPreset(pr.id)}
                        className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-center justify-between cursor-pointer ${
                          activePresetId === pr.id
                            ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/30'
                            : 'border-slate-200/70 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900'
                        }`}
                      >
                        <div>
                          <span className="text-xs font-bold text-slate-800 dark:text-white block">{pr.name}</span>
                          <span className="text-[10px] text-slate-400">{pr.desc}</span>
                        </div>
                        {activePresetId === pr.id && (
                          <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ink Color */}
                <div className="space-y-1.5 pt-2 border-t border-slate-200/70 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block">Ink Color Format</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['original', 'black', 'blue'] as const).map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setInkColor(color)}
                        className={`py-1.5 text-xs font-bold capitalize rounded-lg border transition-all cursor-pointer ${
                          inkColor === color
                            ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:text-slate-950'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                        }`}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Background Option */}
                <div className="space-y-1.5 pt-2 border-t border-slate-200/70 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block">Background Style</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setBgMode('transparent')}
                      className={`py-1.5 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                        bgMode === 'transparent'
                          ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:text-slate-950'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                      }`}
                    >
                      Transparent
                    </button>
                    <button
                      type="button"
                      onClick={() => setBgMode('white')}
                      className={`py-1.5 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                        bgMode === 'white'
                          ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:text-slate-950'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                      }`}
                    >
                      Solid White
                    </button>
                    <button
                      type="button"
                      onClick={() => setBgMode('custom')}
                      className={`py-1.5 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                        bgMode === 'custom'
                          ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:text-slate-950'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                      }`}
                    >
                      Custom
                    </button>
                  </div>
                </div>

                {/* Auto Crop & Sliders */}
                <div className="space-y-3 pt-2 border-t border-slate-200/70 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Auto Crop Whitespace</span>
                    <input
                      type="checkbox"
                      checked={autoCrop}
                      onChange={(e) => setAutoCrop(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-1">
                      <span>Paper Background Removal Threshold</span>
                      <span>{contrastThreshold}</span>
                    </div>
                    <input
                      type="range"
                      min="90"
                      max="240"
                      value={contrastThreshold}
                      onChange={(e) => setContrastThreshold(parseInt(e.target.value, 10))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg accent-indigo-600 cursor-pointer"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">Slide right to eliminate grey paper shadows without fading ink.</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Width (px)</span>
                      <input
                        type="number"
                        value={targetWidth}
                        onChange={(e) => setTargetWidth(parseInt(e.target.value, 10) || 100)}
                        className="w-full text-xs font-bold p-1.5 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Height (px)</span>
                      <input
                        type="number"
                        value={targetHeight}
                        onChange={(e) => setTargetHeight(parseInt(e.target.value, 10) || 50)}
                        className="w-full text-xs font-bold p-1.5 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 outline-none"
                      />
                    </div>
                  </div>

                  {bgMode === 'white' && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Target File Size (KB limit)</span>
                      <input
                        type="number"
                        min="0"
                        max="500"
                        value={targetSizeKB}
                        onChange={(e) => setTargetSizeKB(parseInt(e.target.value, 10) || 0)}
                        className="w-full text-xs font-bold p-1.5 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 outline-none"
                      />
                      <span className="text-[10px] text-slate-400 block mt-0.5">Set to 0 for maximum quality without KB constraint.</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={downloadSignature}
                  disabled={!output}
                  className="flex-1 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-bold text-xs py-3 hover:opacity-90 transition-opacity cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Download className="h-4 w-4" />
                  Download Signature
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setImageSrc('');
                    setOutput(null);
                  }}
                  className="px-3 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-850 cursor-pointer text-xs font-bold"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Live Preview Sandbox */}
            <div className="lg:col-span-7 space-y-4">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block">Live Signature Sandbox &amp; Transparency Check</span>
              
              <div className="p-8 rounded-2xl bg-slate-100/70 border border-dashed border-slate-300 dark:bg-slate-950/40 dark:border-slate-800 flex flex-col items-center justify-center relative overflow-hidden min-h-[220px]">
                {/* Hidden processing canvas */}
                <canvas ref={canvasRef} className="hidden" />

                {output ? (
                  <div className="space-y-4 text-center">
                    {/* Frame with checkerboard background for transparency checking */}
                    <div className="border border-slate-250 rounded-xl shadow-md inline-block relative bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:12px_12px] bg-slate-100 dark:bg-slate-900 p-4">
                      <img 
                        src={output.url} 
                        alt="Processed signature preview" 
                        style={{
                          maxWidth: '340px',
                          maxHeight: '160px',
                          width: `${output.width}px`,
                          height: `${output.height}px`
                        }}
                        className="object-contain"
                      />
                    </div>
                    
                    <div className="flex flex-wrap justify-center gap-2.5 text-[11px] font-mono font-medium text-slate-500">
                      <span className="bg-white dark:bg-slate-800 px-2.5 py-1 rounded-md shadow-2xs border border-slate-200 dark:border-slate-700">
                        {output.width} × {output.height} px
                      </span>
                      <span className="bg-white dark:bg-slate-800 px-2.5 py-1 rounded-md shadow-2xs border border-slate-200 dark:border-slate-700">
                        {(output.size / 1024).toFixed(1)} KB
                      </span>
                      <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 px-2.5 py-1 rounded-md font-bold">
                        {bgMode === 'transparent' ? 'Transparent PNG' : 'Solid JPEG'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 animate-spin text-indigo-500" />
                    Processing signature ink...
                  </span>
                )}
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-4 rounded-xl text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                <p className="font-bold text-slate-700 dark:text-slate-300 mb-1">Tips for crisp digital signatures:</p>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                  <li>Use high threshold values to remove uneven paper shadows caused by smartphone room lighting.</li>
                  <li>Select <strong>Transparent</strong> for digital PDF/Word document pasting, or <strong>Solid White</strong> for upload portals with file size limits.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {isRenameOpen && output && (
        <RenameModal
          isOpen={isRenameOpen}
          originalName={`Signature_${output.width}x${output.height}.${bgMode === 'transparent' ? 'png' : 'jpg'}`}
          onConfirm={(newName) => {
            const link = document.createElement('a');
            link.href = output.url;
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
