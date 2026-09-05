/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Download, 
  Upload, 
  RefreshCw, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  HelpCircle,
  Lock,
  ArrowRight,
  SlidersHorizontal,
  Move,
  RotateCw,
  Eye
} from 'lucide-react';
import { loadImage } from '../utils/imageProcessor';
import RenameModal from './RenameModal';

interface GovPreset {
  id: string;
  name: string;
  dims: string;
  resolution: string;
  width: number;
  height: number;
  minKB: number;
  maxKB: number;
  targetKB: number;
  format: 'jpeg' | 'png';
  desc: string;
}

const GOV_PRESETS: GovPreset[] = [
  { id: 'ssc-photo', name: 'SSC Photo Upload', dims: '3.5 x 4.5 cm', resolution: '350 x 450 px', width: 350, height: 450, minKB: 20, maxKB: 50, targetKB: 35, format: 'jpeg', desc: 'Staff Selection Commission portal registration portrait' },
  { id: 'ssc-sig', name: 'SSC Signature Upload', dims: '4.0 x 2.0 cm', resolution: '400 x 200 px', width: 400, height: 200, minKB: 10, maxKB: 20, targetKB: 15, format: 'jpeg', desc: 'Mandatory black/blue ink signature line upload file' },
  { id: 'railway-photo', name: 'Railway Exams (RRB) Photo', dims: '3.5 x 4.5 cm', resolution: '350 x 450 px', width: 350, height: 450, minKB: 20, maxKB: 50, targetKB: 35, format: 'jpeg', desc: 'Official RRB recruitment photograph standard' },
  { id: 'upsc-photo', name: 'UPSC Exam Photo', dims: '3.5 x 3.5 cm', resolution: '350 x 350 px', width: 350, height: 350, minKB: 20, maxKB: 300, targetKB: 75, format: 'jpeg', desc: 'Union Public Service Commission applicant standard fit' },
  { id: 'ibps-photo', name: 'Banking Exams (IBPS/SBI) Photo', dims: '4.5 x 3.5 cm', resolution: '200 x 230 px', width: 200, height: 230, minKB: 20, maxKB: 50, targetKB: 35, format: 'jpeg', desc: 'Standard Bank PO and clerk portal photograph requirement' },
  { id: 'ibps-sig', name: 'Banking Exams (IBPS/SBI) Signature', dims: '140 x 60 px', resolution: '140 x 60 px', width: 140, height: 60, minKB: 10, maxKB: 20, targetKB: 15, format: 'jpeg', desc: 'Bank recruitment signature crop standard' },
  { id: 'state-photo', name: 'State Exams PSC Photo', dims: '3.5 x 4.5 cm', resolution: '350 x 450 px', width: 350, height: 450, minKB: 20, maxKB: 100, targetKB: 45, format: 'jpeg', desc: 'State Civil services online registration portrait' },
  { id: 'pan-photo', name: 'PAN Card Portal Photo', dims: '2.5 x 3.5 cm', resolution: '295 x 413 px', width: 295, height: 413, minKB: 5, maxKB: 50, targetKB: 25, format: 'jpeg', desc: 'Protean / NSDL PAN database online photo standard' },
  { id: 'aadhaar-photo', name: 'Aadhaar Portal Update Photo', dims: '3.5 x 4.5 cm', resolution: '413 x 531 px', width: 413, height: 531, minKB: 10, maxKB: 100, targetKB: 55, format: 'jpeg', desc: 'UIDAI official portals online document updater update standard' }
];

export default function GovFormTool() {
  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string>('');
  const [activePreset, setActivePreset] = useState<GovPreset>(GOV_PRESETS[0]);
  
  // Realtime micro alignment sliders state
  const [scale, setScale] = useState<number>(1);
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);
  const [rotation, setRotation] = useState<number>(0);
  const [isImgLoaded, setIsImgLoaded] = useState<boolean>(false);
  
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [outputUrl, setOutputUrl] = useState<string>('');
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null);
  const [generatedSizeKB, setGeneratedSizeKB] = useState<number>(0);
  
  // Rename Download Modal state
  const [isRenameOpen, setIsRenameOpen] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load selected source file
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setSourceUrl(url);
      setIsImgLoaded(false);
      setScale(1.0);
      setOffsetX(0);
      setOffsetY(0);
      setRotation(0);
      setOutputUrl('');
      setGeneratedSizeKB(0);

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

    // Auto-generate compressed output to display realtime file capacities (KB) and output state
    const timer = setTimeout(() => {
      autoGenerateOutput();
    }, 180);

    return () => clearTimeout(timer);
  }, [isImgLoaded, activePreset, scale, offsetX, offsetY, rotation]);

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

    canvas.width = activePreset.width;
    canvas.height = activePreset.height;

    // Solid white backing
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    
    // Translate and pivot rotation
    ctx.translate(canvas.width / 2 + offsetX, canvas.height / 2 + offsetY);
    ctx.rotate((rotation * Math.PI) / 180);

    // Initial cover proportional math
    const imgRatio = img.width / img.height;
    const presetRatio = canvas.width / canvas.height;
    
    let drawW, drawH;
    if (imgRatio > presetRatio) {
      drawH = canvas.height;
      drawW = canvas.height * imgRatio;
    } else {
      drawW = canvas.width;
      drawH = canvas.width / imgRatio;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      img,
      - (drawW * scale) / 2,
      - (drawH * scale) / 2,
      drawW * scale,
      drawH * scale
    );

    ctx.restore();
  };

  const autoGenerateOutput = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsProcessing(true);
    try {
      let bestBlob: Blob | null = null;
      let bestSizeKB = 0;
      const mime = activePreset.format === 'jpeg' ? 'image/jpeg' : 'image/png';

      if (mime === 'image/png') {
        const blob: Blob = await new Promise((resolve) => {
          canvas.toBlob((b) => resolve(b!), 'image/png');
        });
        bestBlob = blob;
        bestSizeKB = blob.size / 1024;
      } else {
        // High-precision JPEG binary search
        let lowQ = 0.1;
        let highQ = 1.0;
        for (let step = 0; step < 8; step++) {
          const midQ = (lowQ + highQ) / 2;
          const blob: Blob = await new Promise((resolve) => {
            canvas.toBlob((b) => resolve(b!), 'image/jpeg', midQ);
          });
          const sizeKB = blob.size / 1024;

          if (sizeKB <= activePreset.maxKB) {
            bestBlob = blob;
            bestSizeKB = sizeKB;
            lowQ = midQ;
            if (sizeKB >= activePreset.minKB && Math.abs(sizeKB - activePreset.targetKB) < 2) {
              break;
            }
          } else {
            highQ = midQ;
          }
        }

        if (!bestBlob) {
          const blob: Blob = await new Promise((resolve) => {
            canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.1);
          });
          bestBlob = blob;
          bestSizeKB = blob.size / 1024;
        }
      }

      if (bestBlob) {
        if (outputUrl) URL.revokeObjectURL(outputUrl);
        setOutputUrl(URL.createObjectURL(bestBlob));
        setOutputBlob(bestBlob);
        setGeneratedSizeKB(bestSizeKB);
      }
    } catch (err) {
      console.error('Realtime Gov Generator error', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadClick = () => {
    if (!outputUrl) return;
    setIsRenameOpen(true);
  };

  const isCompliant = generatedSizeKB >= activePreset.minKB && generatedSizeKB <= activePreset.maxKB;
  const isSignature = activePreset.id.endsWith('sig');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 select-none">
      {/* Left Menu Column: Presets list */}
      <div className="lg:col-span-4 space-y-6">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/45 space-y-5">
          <h3 className="font-sans text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-500" />
            Official Portal Presets
          </h3>
          
          <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1 select-scrollbar">
            {GOV_PRESETS.map((pr) => (
              <button
                key={pr.id}
                onClick={() => {
                  setActivePreset(pr);
                  setOutputUrl('');
                  setGeneratedSizeKB(0);
                  setScale(1.0);
                  setOffsetX(0);
                  setOffsetY(0);
                  setRotation(0);
                }}
                className={`w-full text-left p-3 rounded-xl border flex flex-col items-start transition-all cursor-pointer ${
                  activePreset.id === pr.id
                    ? 'border-indigo-505 bg-indigo-50/20 dark:border-indigo-500 dark:bg-indigo-950/20'
                    : 'border-slate-150 bg-slate-50/50 hover:bg-slate-100/50 dark:border-slate-800 dark:bg-slate-900'
                }`}
              >
                <div className="flex justify-between items-center w-full">
                  <span className="text-xs font-bold text-slate-800 dark:text-white truncate max-w-[70%]">{pr.name}</span>
                  <span className="text-[10px] uppercase font-mono font-bold text-indigo-600 dark:text-indigo-455">
                    {pr.minKB}-{pr.maxKB} KB
                  </span>
                </div>
                <div className="flex gap-2 text-[10px] text-slate-450 mt-1.5 font-mono">
                  <span>Dims: {pr.dims}</span>
                  <span>&bull;</span>
                  <span>Res: {pr.resolution}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Center & Right Column: Stage and Fine Adjustment Sliders */}
      <div className="lg:col-span-8 flex flex-col md:flex-row gap-6 items-start">
        <div className="flex-1 w-full space-y-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/40 select-none relative">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-3">Pristine Alignment stage</span>

            {!file ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl border-2 border-dashed border-slate-205 py-16 text-center hover:bg-slate-50/50 dark:border-slate-850 dark:hover:bg-slate-900/10 cursor-pointer transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-400 dark:bg-slate-800">
                  <Upload className="h-5 w-5" />
                </div>
                <h4 className="text-xs font-bold text-slate-700 dark:text-white mt-3">Upload document photo / scan</h4>
                <p className="text-[10px] text-slate-400 mt-1">Accepts PNG, JPG or WEBP. Compiles perfectly to JPEG.</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex justify-center bg-slate-955 p-6 rounded-xl relative overflow-hidden">
                  {/* Aspect-locked rendering frame */}
                  <div 
                    className="relative border border-dashed border-indigo-400 shadow-2xl overflow-hidden bg-slate-900 flex items-center justify-center"
                    style={{
                      width: '240px',
                      height: `${240 / (activePreset.width / activePreset.height)}px`
                    }}
                  >
                    <canvas
                      ref={canvasRef}
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                    />

                    {/* Dotted overlay grids depending on preset category */}
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                      {isSignature ? (
                        <div className="w-[90%] h-[50%] border-2 border-dashed border-yellow-405/45 flex items-center justify-center">
                          <span className="text-[8px] font-mono font-bold tracking-wider text-yellow-450 bg-black/80 px-1.5 py-0.5 rounded">
                            ALIGN SIGNATURE HERE
                          </span>
                        </div>
                      ) : (
                        <div className="w-[60%] h-[55%] border border-dashed border-indigo-400/50 rounded-full flex items-center justify-center relative">
                          <div className="absolute w-[120%] h-[0.5px] bg-red-400/40 top-[45%]" />
                          <div className="absolute w-[0.5px] h-[120%] bg-indigo-400/40 left-[50%]" />
                          <span className="absolute bottom-1 text-[8px] font-mono font-bold tracking-wider text-indigo-400 bg-black/85 px-1.5 py-0.5 rounded uppercase">
                            FACE GUIDE
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Adjustments Panel (Sliders) */}
                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 dark:bg-slate-950/20 dark:border-slate-850 space-y-4 animate-fade-in">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    <SlidersHorizontal className="h-4 w-4" />
                    <span>Fine Tuning Alignment Controls</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Scale slider */}
                    <div>
                      <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-1">
                        <span>Zoom Scale</span>
                        <span>{scale.toFixed(2)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.2"
                        max="3"
                        step="0.05"
                        value={scale}
                        onChange={(e) => setScale(parseFloat(e.target.value))}
                        className="w-full h-1 bg-slate-205 rounded-lg accent-indigo-500 cursor-pointer"
                      />
                    </div>

                    {/* Rotation slider */}
                    <div>
                      <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-1">
                        <span>Rotation</span>
                        <span>{rotation}°</span>
                      </div>
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        step="1"
                        value={rotation}
                        onChange={(e) => setRotation(parseInt(e.target.value, 10))}
                        className="w-full h-1 bg-slate-205 rounded-lg accent-indigo-500 cursor-pointer"
                      />
                    </div>

                    {/* Offset X slider */}
                    <div>
                      <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-1">
                        <span>Horizontal Offset (X)</span>
                        <span>{offsetX}px</span>
                      </div>
                      <input
                        type="range"
                        min="-300"
                        max="300"
                        value={offsetX}
                        onChange={(e) => setOffsetX(parseInt(e.target.value, 10))}
                        className="w-full h-1 bg-slate-205 rounded-lg accent-indigo-500 cursor-pointer"
                      />
                    </div>

                    {/* Offset Y slider */}
                    <div>
                      <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-1">
                        <span>Vertical Offset (Y)</span>
                        <span>{offsetY}px</span>
                      </div>
                      <input
                        type="range"
                        min="-300"
                        max="300"
                        value={offsetY}
                        onChange={(e) => setOffsetY(parseInt(e.target.value, 10))}
                        className="w-full h-1 bg-slate-205 rounded-lg accent-indigo-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => {
                        setFile(null);
                        setSourceUrl('');
                        setOutputUrl('');
                      }}
                      className="w-full rounded-xl border border-slate-200 text-xs py-3 font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-350 dark:hover:bg-slate-800 transition-colors cursor-pointer text-center"
                    >
                      Reset File
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Real-time optimized output compliance display */}
        {outputUrl && (
          <div className="w-full md:w-56 space-y-4 shrink-0 animate-fade-in select-none">
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/40 flex flex-col items-center">
              <span className="text-[10px] font-bold tracking-wider uppercase text-indigo-650 dark:text-indigo-400 mb-3 flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" /> Live Portal Preview
              </span>
              
              <div 
                className="border border-slate-100 dark:border-slate-900 bg-slate-50 overflow-hidden shadow-md flex items-center justify-center"
                style={{
                  width: '140px',
                  height: `${140 / (activePreset.width / activePreset.height)}px`
                }}
              >
                <img
                  src={outputUrl}
                  alt="Ready Document Output"
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Compliance / KB constraints validation */}
              <div className="w-full mt-4 space-y-2 text-center">
                {isCompliant ? (
                  <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-extrabold text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400">
                    <CheckCircle className="h-3 w-3 text-emerald-500" /> Compliant Size ({generatedSizeKB.toFixed(1)} KB)
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[9px] font-extrabold text-amber-800 dark:bg-amber-950/20 dark:text-amber-400 animate-pulse">
                    <AlertCircle className="h-3 w-3 text-amber-500" /> Adapting: {generatedSizeKB.toFixed(1)} KB
                  </div>
                )}

                <div className="space-y-1 text-left font-mono text-[9px] text-slate-450 pt-2 border-t border-slate-50 dark:border-slate-805">
                  <div>Dimensions: {activePreset.width}x{activePreset.height} px</div>
                  <div>Allowed: {activePreset.minKB}-{activePreset.maxKB} KB</div>
                  <div>Format: {activePreset.format.toUpperCase()}</div>
                </div>

                <button
                  onClick={handleDownloadClick}
                  disabled={isProcessing}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 text-xs shadow-soft transition-all cursor-pointer mt-2 disabled:opacity-50"
                >
                  <Download className="h-4 w-4" /> Download Photo
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Rename popup before saving */}
      {isRenameOpen && (
        <RenameModal
          isOpen={isRenameOpen}
          originalName={`QuickResize_Gov_${activePreset.id}.${activePreset.format === 'jpeg' ? 'jpg' : 'png'}`}
          onConfirm={(newName) => {
            if (!outputUrl) return;
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
