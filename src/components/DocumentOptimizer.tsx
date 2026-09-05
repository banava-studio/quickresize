/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, 
  Upload, 
  RefreshCw, 
  Download, 
  RotateCw, 
  SlidersHorizontal, 
  AlertTriangle, 
  Check, 
  Maximize2, 
  Eye,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import RenameModal from './RenameModal';
import { compressToExactKB } from '../core/compression/compressionEngine';

export type DocumentProcessingMode = 
  | 'original'
  | 'grayscale'
  | 'high-contrast'
  | 'cleanup'
  | 'black-and-white';

export interface DocumentCropPreset {
  id: string;
  name: string;
  aspect: number | null; // null for free
  label: string;
}

const DOCUMENT_CROP_PRESETS: DocumentCropPreset[] = [
  { id: 'free', name: 'Free Aspect', aspect: null, label: 'Unconstrained document aspect' },
  { id: 'a4', name: 'A4 Page (1:1.414)', aspect: 1 / 1.4142, label: 'Standard ISO 216 A4 paper proportion' },
  { id: 'a5', name: 'A5 Page (1:1.414)', aspect: 1 / 1.4142, label: 'Compact ISO A5 notebook sheet' },
  { id: 'us-letter', name: 'US Letter (8.5:11)', aspect: 8.5 / 11, label: 'North American standard letter' },
  { id: 'receipt', name: 'Receipt (1:2.5)', aspect: 1 / 2.5, label: 'Long vertical thermal receipt strip' }
];

const TARGET_SIZE_PRESETS = [
  { label: '50 KB', value: 50 },
  { label: '100 KB', value: 100 },
  { label: '200 KB', value: 200 },
  { label: '500 KB', value: 500 },
  { label: '1 MB', value: 1024 },
  { label: 'No Limit', value: 0 }
];

export default function DocumentOptimizer() {
  const [file, setFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string>('');
  
  // Document Mode
  const [mode, setMode] = useState<DocumentProcessingMode>('cleanup');
  const [activeCropPreset, setActiveCropPreset] = useState<DocumentCropPreset>(DOCUMENT_CROP_PRESETS[0]);
  
  // Straightening & Adjustments
  const [rotation, setRotation] = useState<number>(0);
  const [fineRotation, setFineRotation] = useState<number>(0); // -45 to +45
  const [brightness, setBrightness] = useState<number>(10); // -50 to +50
  const [contrast, setContrast] = useState<number>(25);   // -50 to +50
  const [bwThreshold, setBwThreshold] = useState<number>(140); // for B&W mode (0-255)
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  
  // Compression & Output Format
  const [targetSizeKB, setTargetSizeKB] = useState<number>(200);
  const [outputFormat, setOutputFormat] = useState<'jpeg' | 'png' | 'webp'>('jpeg');
  
  // Output State
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null);
  const [outputUrl, setOutputUrl] = useState<string>('');
  const [outputDimensions, setOutputDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [isRenameOpen, setIsRenameOpen] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setImageSrc(url);
      setRotation(0);
      setFineRotation(0);
      setOutputUrl('');
      setOutputBlob(null);

      const img = new Image();
      img.onload = () => {
        imgRef.current = img;
        processDocument();
      };
      img.src = url;

      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [file]);

  useEffect(() => {
    if (imgRef.current) {
      processDocument();
    }
  }, [mode, activeCropPreset, rotation, fineRotation, brightness, contrast, bwThreshold, zoomScale, targetSizeKB, outputFormat]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const rotate90 = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const processDocument = async () => {
    const img = imgRef.current;
    if (!img) return;

    setIsProcessing(true);
    const canvas = canvasRef.current || document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setIsProcessing(false);
      return;
    }

    // 1. Calculate Base Rotated Canvas Dimensions
    const totalRotationDeg = rotation + fineRotation;
    const rad = (totalRotationDeg * Math.PI) / 180;
    
    // Bounding box of rotated image
    const sin = Math.abs(Math.sin(rad));
    const cos = Math.abs(Math.cos(rad));
    const rotatedW = Math.round(img.width * cos + img.height * sin);
    const rotatedH = Math.round(img.width * sin + img.height * cos);

    // Apply Crop Aspect Ratio if constrained
    let targetW = rotatedW;
    let targetH = rotatedH;

    if (activeCropPreset.aspect) {
      const currentRatio = rotatedW / rotatedH;
      if (currentRatio > activeCropPreset.aspect) {
        targetW = Math.round(rotatedH * activeCropPreset.aspect);
      } else {
        targetH = Math.round(rotatedW / activeCropPreset.aspect);
      }
    }

    canvas.width = targetW;
    canvas.height = targetH;

    // Solid white backdrop for clean documents
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, targetW, targetH);

    ctx.save();
    ctx.translate(targetW / 2, targetH / 2);
    ctx.rotate(rad);
    ctx.scale(zoomScale, zoomScale);

    ctx.drawImage(
      img,
      -img.width / 2,
      -img.height / 2,
      img.width,
      img.height
    );
    ctx.restore();

    // 2. Pixel Shader Filters for Document Optimization
    try {
      const imgData = ctx.getImageData(0, 0, targetW, targetH);
      const data = imgData.data;

      const bFactor = brightness * 1.5; // brightness shift
      const cFactor = (contrast + 100) / 100; // contrast multiplier

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Standard luminance
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;

        if (mode === 'grayscale') {
          // Clean grayscale with slight contrast
          let adjusted = (gray - 128) * cFactor + 128 + bFactor;
          adjusted = Math.max(0, Math.min(255, adjusted));
          data[i] = adjusted;
          data[i + 1] = adjusted;
          data[i + 2] = adjusted;
        } else if (mode === 'high-contrast') {
          // Boost contrast to make dark ink pop on white
          let highC = cFactor * 1.6;
          r = Math.max(0, Math.min(255, (r - 128) * highC + 128 + bFactor));
          g = Math.max(0, Math.min(255, (g - 128) * highC + 128 + bFactor));
          b = Math.max(0, Math.min(255, (b - 128) * highC + 128 + bFactor));
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
        } else if (mode === 'cleanup') {
          // Document Cleanup: remove paper yellowing/shadows while keeping dark text crisp
          let adjustedGray = gray + bFactor;
          if (adjustedGray > 170) {
            // brighten paper to pure white
            adjustedGray = Math.min(255, adjustedGray + (adjustedGray - 170) * 1.2);
          } else if (adjustedGray < 120) {
            // darken text
            adjustedGray = Math.max(0, adjustedGray * 0.85);
          }
          data[i] = Math.max(0, Math.min(255, adjustedGray));
          data[i + 1] = Math.max(0, Math.min(255, adjustedGray));
          data[i + 2] = Math.max(0, Math.min(255, adjustedGray));
        } else if (mode === 'black-and-white') {
          // Binary threshold
          const val = (gray + bFactor) > bwThreshold ? 255 : 0;
          data[i] = val;
          data[i + 1] = val;
          data[i + 2] = val;
        } else {
          // Original mode with user sliders
          r = Math.max(0, Math.min(255, (r - 128) * cFactor + 128 + bFactor));
          g = Math.max(0, Math.min(255, (g - 128) * cFactor + 128 + bFactor));
          b = Math.max(0, Math.min(255, (b - 128) * cFactor + 128 + bFactor));
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
        }
      }

      ctx.putImageData(imgData, 0, 0);
    } catch (e) {
      console.warn('Canvas pixel adjustment error', e);
    }

    // 3. Compress & Export
    const mime = outputFormat === 'png' ? 'image/png' : outputFormat === 'webp' ? 'image/webp' : 'image/jpeg';

    canvas.toBlob(async (blob) => {
      if (!blob) {
        setIsProcessing(false);
        return;
      }

      let finalBlob = blob;

      // If user selected target KB and format supports quality scaling
      if (targetSizeKB > 0 && outputFormat !== 'png') {
        try {
          const compRes = await compressToExactKB(blob, {
            targetSizeKB,
            format: outputFormat,
            maintainAspectRatio: true,
            tolerancePercentage: 0.05
          });
          finalBlob = compRes.blob;
        } catch (err) {
          console.warn('Target size compression notice:', err);
        }
      }

      setOutputDimensions({ width: targetW, height: targetH });
      setOutputBlob(finalBlob);
      setOutputUrl(URL.createObjectURL(finalBlob));
      setIsProcessing(false);
    }, mime, 0.90);
  };

  const isLowReadabilityRisk = targetSizeKB > 0 && targetSizeKB < 100 && (outputDimensions.width * outputDimensions.height > 2000000);

  return (
    <div className="space-y-6 select-none animate-fade-in">
      {/* Informational Header */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-950 dark:bg-blue-950/20 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2.5">
        <Info className="h-4.5 w-4.5 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
        <div className="space-y-1">
          <p className="font-semibold">
            Document &amp; Form Image Optimizer (100% Client-Side)
          </p>
          <p className="text-[11px] leading-relaxed text-blue-700/80 dark:text-blue-300/80">
            Enhance clarity for photographed forms, ID scans, receipts, invoices, and certificates. Brighten paper backgrounds, boost text contrast, and compress to target file limits.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
        {!file ? (
          <div 
            onClick={() => document.getElementById('doc-optimizer-selector')?.click()}
            className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center hover:bg-slate-50/50 dark:border-slate-800 dark:hover:bg-slate-900/10 cursor-pointer transition-colors"
          >
            <input
              id="doc-optimizer-selector"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50 text-indigo-500 dark:bg-slate-800">
              <FileText className="h-5 w-5" />
            </div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-white mt-3">Upload document or photographed form</h4>
            <p className="text-[11px] text-slate-400 mt-1">Accepts phone photos of forms, receipts, notes, and certificates</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Controls Panel */}
            <div className="lg:col-span-4 space-y-4">
              <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 space-y-4">
                
                {/* Processing Mode */}
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-2">Enhancement Mode</span>
                  <div className="space-y-1.5">
                    {[
                      { id: 'cleanup', name: 'Document Cleanup', desc: 'Whitens paper, eliminates shadows & yellow tint' },
                      { id: 'grayscale', name: 'Clean Grayscale', desc: 'Standard monochrome scanner look' },
                      { id: 'high-contrast', name: 'High Contrast', desc: 'Maximum sharpness for handwritten text' },
                      { id: 'black-and-white', name: 'Binary Black & White', desc: 'Pure 1-bit crisp ink threshold' },
                      { id: 'original', name: 'Natural / Original', desc: 'Original colors with fine tuning' }
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setMode(item.id as DocumentProcessingMode)}
                        className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-center justify-between cursor-pointer ${
                          mode === item.id
                            ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/30'
                            : 'border-slate-200/70 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900'
                        }`}
                      >
                        <div>
                          <span className="text-xs font-bold text-slate-850 dark:text-white block">{item.name}</span>
                          <span className="text-[10px] text-slate-400">{item.desc}</span>
                        </div>
                        {mode === item.id && (
                          <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Straightening & Rotation */}
                <div className="space-y-2.5 pt-2 border-t border-slate-200/70 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Orientation &amp; Straighten</span>
                    <button
                      type="button"
                      onClick={rotate90}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-1 rounded-md hover:bg-indigo-100 cursor-pointer"
                    >
                      <RotateCw className="h-3.5 w-3.5" /> Rotate 90°
                    </button>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-1">
                      <span>Fine Deskew Alignment</span>
                      <span>{fineRotation}°</span>
                    </div>
                    <input
                      type="range"
                      min="-20"
                      max="20"
                      step="0.5"
                      value={fineRotation}
                      onChange={(e) => setFineRotation(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg accent-indigo-600 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Page Crop Preset */}
                <div className="space-y-2 pt-2 border-t border-slate-200/70 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block">Document Aspect Ratio</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {DOCUMENT_CROP_PRESETS.map((cp) => (
                      <button
                        key={cp.id}
                        type="button"
                        onClick={() => setActiveCropPreset(cp)}
                        className={`p-2 text-left rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                          activeCropPreset.id === cp.id
                            ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-950'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                        }`}
                      >
                        {cp.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sliders for Brightness & Contrast */}
                <div className="space-y-3 pt-2 border-t border-slate-200/70 dark:border-slate-800">
                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-1">
                      <span>Paper Brightness</span>
                      <span>{brightness > 0 ? `+${brightness}` : brightness}</span>
                    </div>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      value={brightness}
                      onChange={(e) => setBrightness(parseInt(e.target.value, 10))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg accent-indigo-600 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-1">
                      <span>Ink Contrast</span>
                      <span>{contrast > 0 ? `+${contrast}` : contrast}</span>
                    </div>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      value={contrast}
                      onChange={(e) => setContrast(parseInt(e.target.value, 10))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg accent-indigo-600 cursor-pointer"
                    />
                  </div>

                  {mode === 'black-and-white' && (
                    <div>
                      <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-1">
                        <span>Binary Text Threshold</span>
                        <span>{bwThreshold}</span>
                      </div>
                      <input
                        type="range"
                        min="80"
                        max="220"
                        value={bwThreshold}
                        onChange={(e) => setBwThreshold(parseInt(e.target.value, 10))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg accent-indigo-600 cursor-pointer"
                      />
                    </div>
                  )}
                </div>

                {/* Target File Size */}
                <div className="space-y-2 pt-2 border-t border-slate-200/70 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block">Target Size Compression</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {TARGET_SIZE_PRESETS.map((pr) => (
                      <button
                        key={pr.label}
                        type="button"
                        onClick={() => setTargetSizeKB(pr.value)}
                        className={`py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                          targetSizeKB === pr.value
                            ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-950 font-bold'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {pr.label}
                      </button>
                    ))}
                  </div>

                  {/* Readability warning */}
                  {isLowReadabilityRisk && (
                    <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-[11px] flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                      <span>
                        Aggressive compression selected ({targetSizeKB} KB). Try 200–500 KB to preserve small printed text sharpness.
                      </span>
                    </div>
                  )}
                </div>

                {/* Output Format */}
                <div className="space-y-1.5 pt-2 border-t border-slate-200/70 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block">Output Format</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['jpeg', 'webp', 'png'] as const).map((fmt) => (
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
                  Download Document
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

            {/* Document Preview Stage */}
            <div className="lg:col-span-8 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Enhanced Document Live Preview
                </span>
                {outputBlob && (
                  <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
                    <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-bold">
                      {outputDimensions.width} × {outputDimensions.height} px
                    </span>
                    <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-bold">
                      {(outputBlob.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                )}
              </div>

              <div className="p-6 rounded-2xl bg-slate-100/70 border border-slate-200 dark:bg-slate-950/40 dark:border-slate-800 flex items-center justify-center min-h-[420px] overflow-hidden">
                <canvas ref={canvasRef} className="hidden" />

                {outputUrl ? (
                  <div className="max-h-[500px] max-w-full overflow-auto shadow-2xl rounded-lg border border-slate-300 dark:border-slate-800 bg-white">
                    <img 
                      src={outputUrl} 
                      alt="Optimized document preview" 
                      className="max-h-[480px] w-auto object-contain mx-auto"
                    />
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 animate-spin text-indigo-500" />
                    Processing document enhancements...
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
          originalName={`Optimized_Document_${Date.now()}.${outputFormat}`}
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
