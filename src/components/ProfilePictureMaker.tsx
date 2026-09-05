/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  UserCircle2, 
  Upload, 
  Download, 
  RotateCw, 
  SlidersHorizontal, 
  Eye, 
  Check, 
  Sparkles,
  Info
} from 'lucide-react';
import RenameModal from './RenameModal';

export interface ProfilePreset {
  id: string;
  name: string;
  size: number;
  label: string;
}

const PROFILE_PRESETS: ProfilePreset[] = [
  { id: 'hd', name: 'High-Res Avatar (1024 x 1024)', size: 1024, label: 'Optimal for Discord, Slack, GitHub & Apple' },
  { id: 'standard', name: 'Standard Profile (600 x 600)', size: 600, label: 'Optimal for Instagram, LinkedIn & WhatsApp' },
  { id: 'compact', name: 'Compact Avatar (300 x 300)', size: 300, label: 'Optimal for forum badges & email signatures' }
];

export default function ProfilePictureMaker() {
  const [file, setFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string>('');
  const [activePreset, setActivePreset] = useState<ProfilePreset>(PROFILE_PRESETS[1]);
  
  // Crop & Transform controls
  const [scale, setScale] = useState<number>(1.0);
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);
  const [rotation, setRotation] = useState<number>(0);
  
  // Mask & Background Styling
  const [maskShape, setMaskShape] = useState<'circle' | 'square' | 'rounded'>('circle');
  const [bgStyle, setBgStyle] = useState<'original' | 'white' | 'color' | 'transparent'>('original');
  const [bgColor, setBgColor] = useState<string>('#4F46E5');
  
  // Border Ring
  const [showBorder, setShowBorder] = useState<boolean>(false);
  const [borderWidth, setBorderWidth] = useState<number>(12);
  const [borderColor, setBorderColor] = useState<string>('#4F46E5');

  // Output
  const [outputFormat, setOutputFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [outputUrl, setOutputUrl] = useState<string>('');
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isRenameOpen, setIsRenameOpen] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setImageSrc(url);
      setScale(1.0);
      setOffsetX(0);
      setOffsetY(0);
      setRotation(0);
      setOutputUrl('');
      setOutputBlob(null);

      const img = new Image();
      img.onload = () => {
        imgRef.current = img;
        renderProfileCanvas();
      };
      img.src = url;

      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  useEffect(() => {
    if (imgRef.current) {
      renderProfileCanvas();
    }
  }, [activePreset, scale, offsetX, offsetY, rotation, maskShape, bgStyle, bgColor, showBorder, borderWidth, borderColor, outputFormat]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const renderProfileCanvas = () => {
    const img = imgRef.current;
    if (!img) return;

    setIsProcessing(true);
    const canvas = canvasRef.current || document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = activePreset.size;
    canvas.width = size;
    canvas.height = size;

    // Fill background
    if (bgStyle === 'white') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, size, size);
    } else if (bgStyle === 'color') {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, size, size);
    } else if (bgStyle === 'transparent') {
      ctx.clearRect(0, 0, size, size);
    }

    ctx.save();

    // Clip to Mask if transparent/PNG output or circular mask
    if (maskShape === 'circle') {
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - (showBorder ? borderWidth : 0), 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
    } else if (maskShape === 'rounded') {
      const radius = size * 0.15;
      ctx.beginPath();
      ctx.roundRect(0, 0, size, size, [radius]);
      ctx.clip();
    }

    // Draw image centered and scaled
    ctx.translate(size / 2 + offsetX, size / 2 + offsetY);
    ctx.rotate((rotation * Math.PI) / 180);

    const imgRatio = img.width / img.height;
    let drawW = size;
    let drawH = size;
    if (imgRatio > 1) {
      drawH = size;
      drawW = size * imgRatio;
    } else {
      drawW = size;
      drawH = size / imgRatio;
    }

    ctx.drawImage(
      img,
      - (drawW * scale) / 2,
      - (drawH * scale) / 2,
      drawW * scale,
      drawH * scale
    );

    ctx.restore();

    // Draw outer border ring if enabled
    if (showBorder) {
      ctx.save();
      ctx.lineWidth = borderWidth;
      ctx.strokeStyle = borderColor;
      if (maskShape === 'circle') {
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2 - borderWidth / 2, 0, Math.PI * 2);
        ctx.stroke();
      } else if (maskShape === 'rounded') {
        const radius = size * 0.15;
        ctx.beginPath();
        ctx.roundRect(borderWidth / 2, borderWidth / 2, size - borderWidth, size - borderWidth, [radius]);
        ctx.stroke();
      } else {
        ctx.strokeRect(borderWidth / 2, borderWidth / 2, size - borderWidth, size - borderWidth);
      }
      ctx.restore();
    }

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
            Profile Picture &amp; Avatar Maker (100% Client-Side)
          </p>
          <p className="text-[11px] leading-relaxed text-blue-700/80 dark:text-blue-300/80">
            Create avatars with circular live preview masks, custom background fills, zoom and pan alignment, and customizable ring borders.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
        {!file ? (
          <div 
            onClick={() => document.getElementById('profile-maker-selector')?.click()}
            className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center hover:bg-slate-50/50 dark:border-slate-800 dark:hover:bg-slate-900/10 cursor-pointer transition-colors"
          >
            <input
              id="profile-maker-selector"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50 text-indigo-500 dark:bg-slate-800">
              <UserCircle2 className="h-5 w-5" />
            </div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-white mt-3">Upload portrait or logo for avatar</h4>
            <p className="text-[11px] text-slate-400 mt-1">Accepts JPG, PNG, and WebP portrait photos</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Controls */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 space-y-4">
                
                {/* Resolution Presets */}
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-2">Resolution</span>
                  <div className="space-y-1">
                    {PROFILE_PRESETS.map((pr) => (
                      <button
                        key={pr.id}
                        type="button"
                        onClick={() => setActivePreset(pr)}
                        className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-center justify-between cursor-pointer ${
                          activePreset.id === pr.id
                            ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/30'
                            : 'border-slate-200/70 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900'
                        }`}
                      >
                        <div>
                          <span className="text-xs font-bold text-slate-800 dark:text-white block">{pr.name}</span>
                          <span className="text-[10px] text-slate-400">{pr.label}</span>
                        </div>
                        {activePreset.id === pr.id && (
                          <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mask Shape */}
                <div className="space-y-1.5 pt-2 border-t border-slate-200/70 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block">Avatar Shape</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'circle', label: 'Circle Mask' },
                      { id: 'rounded', label: 'Squircle' },
                      { id: 'square', label: 'Square' }
                    ].map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setMaskShape(s.id as any)}
                        className={`py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                          maskShape === s.id
                            ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-950'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Zoom & Alignment Sliders */}
                <div className="space-y-3 pt-2 border-t border-slate-200/70 dark:border-slate-800">
                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-1">
                      <span>Zoom Scale</span>
                      <span>{scale.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="3.0"
                      step="0.05"
                      value={scale}
                      onChange={(e) => setScale(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg accent-indigo-600 cursor-pointer"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                        <span>Pan X</span>
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
                    <div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                        <span>Pan Y</span>
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

                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-1">
                      <span>Rotate</span>
                      <span>{rotation}°</span>
                    </div>
                    <input
                      type="range"
                      min="-45"
                      max="45"
                      value={rotation}
                      onChange={(e) => setRotation(parseInt(e.target.value, 10))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg accent-indigo-600 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Border Ring Options */}
                <div className="space-y-2 pt-2 border-t border-slate-200/70 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Accent Ring Border</span>
                    <input
                      type="checkbox"
                      checked={showBorder}
                      onChange={(e) => setShowBorder(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 cursor-pointer"
                    />
                  </div>

                  {showBorder && (
                    <div className="grid grid-cols-2 gap-2 pt-1 animate-fade-in">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 block mb-1">Border Width</span>
                        <input
                          type="range"
                          min="2"
                          max="32"
                          value={borderWidth}
                          onChange={(e) => setBorderWidth(parseInt(e.target.value, 10))}
                          className="w-full h-1.5 bg-slate-200 rounded-lg accent-indigo-600 cursor-pointer"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-500">Color:</span>
                        <input
                          type="color"
                          value={borderColor}
                          onChange={(e) => setBorderColor(e.target.value)}
                          className="h-7 w-10 rounded border border-slate-200 cursor-pointer p-0"
                        />
                      </div>
                    </div>
                  )}
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
                  Download Avatar
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

            {/* Right Preview Sandbox */}
            <div className="lg:col-span-7 space-y-4">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Avatar Live Preview ({activePreset.size} × {activePreset.size} px)
              </span>

              <div className="p-8 rounded-2xl bg-slate-100/80 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center min-h-[360px]">
                <canvas ref={canvasRef} className="hidden" />

                {outputUrl ? (
                  <div className="space-y-4 text-center">
                    <div className="relative inline-block shadow-2xl p-2 bg-white/40 dark:bg-slate-900/40 rounded-full backdrop-blur-xs">
                      <img
                        src={outputUrl}
                        alt="Profile avatar preview"
                        className={`w-64 h-64 object-cover ${
                          maskShape === 'circle' ? 'rounded-full' : maskShape === 'rounded' ? 'rounded-3xl' : 'rounded-lg'
                        }`}
                      />
                    </div>

                    <div className="flex items-center justify-center gap-2 text-[11px] font-mono text-slate-500">
                      <span className="bg-white dark:bg-slate-800 px-2.5 py-1 rounded-md shadow-2xs border border-slate-200 dark:border-slate-700">
                        {activePreset.size} × {activePreset.size} px
                      </span>
                      <span className="bg-white dark:bg-slate-800 px-2.5 py-1 rounded-md shadow-2xs border border-slate-200 dark:border-slate-700">
                        {outputBlob ? (outputBlob.size / 1024).toFixed(1) : 0} KB
                      </span>
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 animate-spin text-indigo-500" />
                    Rendering profile preview...
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
          originalName={`Profile_Avatar_${activePreset.size}x${activePreset.size}.${outputFormat}`}
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
