/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Crop, 
  RotateCw, 
  RotateCcw, 
  FlipHorizontal, 
  FlipVertical, 
  Maximize2, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw as ResetIcon, 
  Check, 
  X,
  Lock,
  Unlock,
  Sliders,
  Sparkles
} from 'lucide-react';
import { 
  CropRect, 
  AspectRatioType, 
  TransformState 
} from '../types';
import { getAspectRatioMultiplier } from '../core/image/imagePipeline';

interface ImageCropperProps {
  imageSrc: string;
  sourceWidth: number;
  sourceHeight: number;
  initialCrop?: CropRect | null;
  initialAspectRatio?: AspectRatioType;
  initialRotation?: 0 | 90 | 180 | 270;
  initialFlipH?: boolean;
  initialFlipV?: boolean;
  onApplyCrop: (crop: CropRect, transformUpdates: { rotation: 0 | 90 | 180 | 270; flipH: boolean; flipV: boolean }) => void;
  onCancel: () => void;
}

type DragMode = 'none' | 'move' | 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w';

export default function ImageCropper({
  imageSrc,
  sourceWidth,
  sourceHeight,
  initialCrop,
  initialAspectRatio = 'free',
  initialRotation = 0,
  initialFlipH = false,
  initialFlipV = false,
  onApplyCrop,
  onCancel,
}: ImageCropperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>(initialAspectRatio);
  const [customRatio, setCustomRatio] = useState<{ width: number; height: number }>({ width: 16, height: 9 });
  const [showCustomRatioInput, setShowCustomRatioInput] = useState<boolean>(false);

  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(initialRotation);
  const [flipH, setFlipH] = useState<boolean>(initialFlipH);
  const [flipV, setFlipV] = useState<boolean>(initialFlipV);
  const [zoom, setZoom] = useState<number>(1.0);

  // Normalized crop rectangle: 0..1 relative to the rotated source bounds
  const [crop, setCrop] = useState<{ x: number; y: number; w: number; h: number }>(() => {
    if (initialCrop) {
      return {
        x: initialCrop.isNormalized ? initialCrop.x : initialCrop.x / (sourceWidth || 1),
        y: initialCrop.isNormalized ? initialCrop.y : initialCrop.y / (sourceHeight || 1),
        w: initialCrop.isNormalized ? initialCrop.width : initialCrop.width / (sourceWidth || 1),
        h: initialCrop.isNormalized ? initialCrop.height : initialCrop.height / (sourceHeight || 1),
      };
    }
    return { x: 0.05, y: 0.05, w: 0.9, h: 0.9 };
  });

  const [dragMode, setDragMode] = useState<DragMode>('none');
  const [dragStart, setDragStart] = useState<{ clientX: number; clientY: number; startCrop: typeof crop }>({
    clientX: 0,
    clientY: 0,
    startCrop: { x: 0, y: 0, w: 1, h: 1 },
  });

  // Calculate rotated bounds
  const isRotated90 = rotation === 90 || rotation === 270;
  const currentBoundW = isRotated90 ? sourceHeight : sourceWidth;
  const currentBoundH = isRotated90 ? sourceWidth : sourceHeight;

  // Set initial crop according to aspect ratio
  const applyAspectRatioToCrop = useCallback((
    ratioType: AspectRatioType,
    custom?: { width: number; height: number }
  ) => {
    const targetRatio = getAspectRatioMultiplier(ratioType, custom);
    if (!targetRatio) return; // Free crop, keep current

    const containerRatio = currentBoundW / currentBoundH;
    let newW = 0.8;
    let newH = 0.8;

    if (targetRatio > containerRatio) {
      // Wider than image
      newW = 0.9;
      newH = (newW * containerRatio) / targetRatio;
    } else {
      // Taller than image
      newH = 0.9;
      newW = (newH * targetRatio) / containerRatio;
    }

    newW = Math.min(1.0, Math.max(0.1, newW));
    newH = Math.min(1.0, Math.max(0.1, newH));

    const newX = (1.0 - newW) / 2;
    const newY = (1.0 - newH) / 2;

    setCrop({ x: newX, y: newY, w: newW, h: newH });
  }, [currentBoundW, currentBoundH]);

  useEffect(() => {
    if (aspectRatio !== 'free') {
      applyAspectRatioToCrop(aspectRatio, customRatio);
    }
  }, [aspectRatio, rotation, applyAspectRatioToCrop]);

  // Pointer down interaction handler
  const handlePointerDown = (mode: DragMode, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragMode(mode);
    setDragStart({
      clientX: e.clientX,
      clientY: e.clientY,
      startCrop: { ...crop },
    });
  };

  // Pointer move interaction handler
  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragMode === 'none' || !containerRef.current) return;
    e.preventDefault();

    const rect = containerRef.current.getBoundingClientRect();
    const dx = (e.clientX - dragStart.clientX) / (rect.width * zoom);
    const dy = (e.clientY - dragStart.clientY) / (rect.height * zoom);

    const { startCrop } = dragStart;
    let nextCrop = { ...crop };
    const ratioMult = getAspectRatioMultiplier(aspectRatio, customRatio);

    if (dragMode === 'move') {
      let nx = startCrop.x + dx;
      let ny = startCrop.y + dy;
      nx = Math.max(0, Math.min(1 - startCrop.w, nx));
      ny = Math.max(0, Math.min(1 - startCrop.h, ny));
      nextCrop.x = nx;
      nextCrop.y = ny;
    } else {
      let nx = startCrop.x;
      let ny = startCrop.y;
      let nw = startCrop.w;
      let nh = startCrop.h;

      // Handle corner and edge drags
      if (dragMode.includes('e')) {
        nw = Math.max(0.05, Math.min(1 - startCrop.x, startCrop.w + dx));
      }
      if (dragMode.includes('s')) {
        nh = Math.max(0.05, Math.min(1 - startCrop.y, startCrop.h + dy));
      }
      if (dragMode.includes('w')) {
        const potentialW = Math.max(0.05, startCrop.w - dx);
        if (startCrop.x + startCrop.w - potentialW >= 0) {
          nw = potentialW;
          nx = startCrop.x + (startCrop.w - potentialW);
        }
      }
      if (dragMode.includes('n')) {
        const potentialH = Math.max(0.05, startCrop.h - dy);
        if (startCrop.y + startCrop.h - potentialH >= 0) {
          nh = potentialH;
          ny = startCrop.y + (startCrop.h - potentialH);
        }
      }

      // Enforce aspect ratio lock during resize if selected
      if (ratioMult) {
        const imageRatio = currentBoundW / currentBoundH;
        // target (w_px / h_px) = ratioMult
        // (nw * currentBoundW) / (nh * currentBoundH) = ratioMult
        // nh = (nw * imageRatio) / ratioMult
        nh = (nw * imageRatio) / ratioMult;
        if (ny + nh > 1) {
          nh = 1 - ny;
          nw = (nh * ratioMult) / imageRatio;
        }
      }

      nextCrop = {
        x: Math.max(0, Math.min(1, nx)),
        y: Math.max(0, Math.min(1, ny)),
        w: Math.max(0.05, Math.min(1 - nx, nw)),
        h: Math.max(0.05, Math.min(1 - ny, nh)),
      };
    }

    setCrop(nextCrop);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragMode !== 'none') {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Safe release
      }
      setDragMode('none');
    }
  };

  const handleRotateCW = () => {
    const nextRot = ((rotation + 90) % 360) as 0 | 90 | 180 | 270;
    setRotation(nextRot);
  };

  const handleRotateCCW = () => {
    const nextRot = ((rotation + 270) % 360) as 0 | 90 | 180 | 270;
    setRotation(nextRot);
  };

  const handleReset = () => {
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setZoom(1.0);
    setAspectRatio('free');
    setCrop({ x: 0.05, y: 0.05, w: 0.9, h: 0.9 });
  };

  const handleConfirm = () => {
    // Generate accurate absolute pixel coordinates based on rotated bounds
    const cropPixelW = Math.round(crop.w * currentBoundW);
    const cropPixelH = Math.round(crop.h * currentBoundH);
    const cropPixelX = Math.round(crop.x * currentBoundW);
    const cropPixelY = Math.round(crop.y * currentBoundH);

    const appliedCrop: CropRect = {
      x: cropPixelX,
      y: cropPixelY,
      width: cropPixelW,
      height: cropPixelH,
      isNormalized: false,
    };

    onApplyCrop(appliedCrop, {
      rotation,
      flipH,
      flipV,
    });
  };

  // True pixel resolution of selected crop
  const croppedPixelW = Math.round(crop.w * currentBoundW);
  const croppedPixelH = Math.round(crop.h * currentBoundH);

  return (
    <div className="flex flex-col h-full select-none max-w-5xl mx-auto">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
            <Crop className="h-4.5 w-4.5" />
          </div>
          <div>
            <h4 className="font-sans text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              Advanced Crop & Orientation
            </h4>
            <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
              Selection: {croppedPixelW} &times; {croppedPixelH} px
            </span>
          </div>
        </div>

        {/* Quick Orientation & Zoom Controls */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={handleRotateCCW}
            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
            title="Rotate 90° CCW"
            aria-label="Rotate 90 degrees counter-clockwise"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleRotateCW}
            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
            title="Rotate 90° CW"
            aria-label="Rotate 90 degrees clockwise"
          >
            <RotateCw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setFlipH(!flipH)}
            className={`rounded-lg border p-2 cursor-pointer transition ${
              flipH
                ? 'border-indigo-500 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400'
                : 'border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
            title="Flip Horizontal"
            aria-label="Flip horizontally"
          >
            <FlipHorizontal className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setFlipV(!flipV)}
            className={`rounded-lg border p-2 cursor-pointer transition ${
              flipV
                ? 'border-indigo-500 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400'
                : 'border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
            title="Flip Vertical"
            aria-label="Flip vertically"
          >
            <FlipVertical className="h-4 w-4" />
          </button>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1" />
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.6, parseFloat((z - 0.2).toFixed(1))))}
            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
            title="Zoom Out"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="font-mono text-[10px] text-slate-500 w-8 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(2.5, parseFloat((z + 0.2).toFixed(1))))}
            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
            title="Zoom In"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:text-red-500 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800 cursor-pointer ml-1"
            title="Reset All"
            aria-label="Reset crop and orientation"
          >
            <ResetIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Aspect Ratio Pills Toolbar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 select-scrollbar text-xs font-semibold">
        {(
          [
            { id: 'free', label: 'Free' },
            { id: '1:1', label: '1:1 Square' },
            { id: '4:5', label: '4:5 Portrait' },
            { id: '3:4', label: '3:4' },
            { id: '16:9', label: '16:9 Wide' },
            { id: '9:16', label: '9:16 Story' },
            { id: 'a4', label: 'A4 Doc' },
            { id: 'passport', label: 'Passport (35:45)' },
            { id: 'custom', label: 'Custom' },
          ] as const
        ).map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => {
              setAspectRatio(r.id);
              if (r.id === 'custom') setShowCustomRatioInput(true);
              else setShowCustomRatioInput(false);
            }}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs transition cursor-pointer shrink-0 ${
              aspectRatio === r.id
                ? 'bg-indigo-600 text-white shadow-sm font-bold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Custom Aspect Ratio Inputs */}
      {showCustomRatioInput && aspectRatio === 'custom' && (
        <div className="flex items-center gap-2 mb-3 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 max-w-sm">
          <span className="text-xs text-slate-500 font-medium">Ratio:</span>
          <input
            type="number"
            min="1"
            max="100"
            value={customRatio.width}
            onChange={(e) => setCustomRatio({ ...customRatio, width: Math.max(1, parseInt(e.target.value) || 1) })}
            className="w-14 rounded border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-center dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <span className="text-slate-400 font-bold">:</span>
          <input
            type="number"
            min="1"
            max="100"
            value={customRatio.height}
            onChange={(e) => setCustomRatio({ ...customRatio, height: Math.max(1, parseInt(e.target.value) || 1) })}
            className="w-14 rounded border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-center dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <button
            type="button"
            onClick={() => applyAspectRatioToCrop('custom', customRatio)}
            className="rounded bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-indigo-700 ml-auto"
          >
            Set
          </button>
        </div>
      )}

      {/* Main Interactive Stage Container */}
      <div className="relative flex-1 min-h-[340px] max-h-[500px] w-full bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center p-4">
        <div
          ref={containerRef}
          className="relative max-w-full max-h-full transition-transform duration-75"
          style={{
            transform: `scale(${zoom})`,
            aspectRatio: `${currentBoundW} / ${currentBoundH}`,
            width: currentBoundW >= currentBoundH ? '100%' : 'auto',
            height: currentBoundH > currentBoundW ? '100%' : 'auto',
            maxHeight: '440px',
            maxWidth: '100%',
          }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {/* Base Rotated & Flipped Image Element */}
          <img
            src={imageSrc}
            alt="Crop target"
            className="w-full h-full object-contain pointer-events-none transition-transform"
            style={{
              transform: `rotate(${rotation}deg) scale(${flipH ? -1 : 1}, ${flipV ? -1 : 1})`,
            }}
            referrerPolicy="no-referrer"
          />

          {/* Darkened Overlay Scrim Outside Selection */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Top scrim */}
            <div
              className="absolute left-0 right-0 top-0 bg-black/60"
              style={{ height: `${crop.y * 100}%` }}
            />
            {/* Bottom scrim */}
            <div
              className="absolute left-0 right-0 bottom-0 bg-black/60"
              style={{ height: `${(1 - (crop.y + crop.h)) * 100}%` }}
            />
            {/* Left scrim */}
            <div
              className="absolute left-0 bg-black/60"
              style={{
                top: `${crop.y * 100}%`,
                height: `${crop.h * 100}%`,
                width: `${crop.x * 100}%`,
              }}
            />
            {/* Right scrim */}
            <div
              className="absolute right-0 bg-black/60"
              style={{
                top: `${crop.y * 100}%`,
                height: `${crop.h * 100}%`,
                width: `${(1 - (crop.x + crop.w)) * 100}%`,
              }}
            />
          </div>

          {/* Active Interactive Crop Box */}
          <div
            className="absolute border-2 border-white shadow-2xl cursor-move touch-none"
            style={{
              left: `${crop.x * 100}%`,
              top: `${crop.y * 100}%`,
              width: `${crop.w * 100}%`,
              height: `${crop.h * 100}%`,
            }}
            onPointerDown={(e) => handlePointerDown('move', e)}
          >
            {/* Rule of Thirds Grid Lines */}
            <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-40">
              <div className="border-r border-b border-white/60" />
              <div className="border-r border-b border-white/60" />
              <div className="border-b border-white/60" />
              <div className="border-r border-b border-white/60" />
              <div className="border-r border-b border-white/60" />
              <div className="border-b border-white/60" />
              <div className="border-r border-white/60" />
              <div className="border-r border-white/60" />
              <div />
            </div>

            {/* Corner Resize Handles (Touch-friendly 44px active hit areas) */}
            {/* NW */}
            <div
              className="absolute -top-3 -left-3 w-7 h-7 flex items-center justify-center cursor-nwse-resize touch-none"
              onPointerDown={(e) => handlePointerDown('nw', e)}
            >
              <div className="w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-sm shadow-md" />
            </div>
            {/* NE */}
            <div
              className="absolute -top-3 -right-3 w-7 h-7 flex items-center justify-center cursor-nesw-resize touch-none"
              onPointerDown={(e) => handlePointerDown('ne', e)}
            >
              <div className="w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-sm shadow-md" />
            </div>
            {/* SW */}
            <div
              className="absolute -bottom-3 -left-3 w-7 h-7 flex items-center justify-center cursor-nesw-resize touch-none"
              onPointerDown={(e) => handlePointerDown('sw', e)}
            >
              <div className="w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-sm shadow-md" />
            </div>
            {/* SE */}
            <div
              className="absolute -bottom-3 -right-3 w-7 h-7 flex items-center justify-center cursor-nwse-resize touch-none"
              onPointerDown={(e) => handlePointerDown('se', e)}
            >
              <div className="w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-sm shadow-md" />
            </div>

            {/* Edge Midpoint Handles */}
            {/* N */}
            <div
              className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-8 h-5 flex items-center justify-center cursor-ns-resize touch-none"
              onPointerDown={(e) => handlePointerDown('n', e)}
            >
              <div className="w-5 h-1.5 bg-white border border-indigo-600 rounded-full shadow" />
            </div>
            {/* S */}
            <div
              className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-8 h-5 flex items-center justify-center cursor-ns-resize touch-none"
              onPointerDown={(e) => handlePointerDown('s', e)}
            >
              <div className="w-5 h-1.5 bg-white border border-indigo-600 rounded-full shadow" />
            </div>
            {/* W */}
            <div
              className="absolute top-1/2 -left-2.5 -translate-y-1/2 w-5 h-8 flex items-center justify-center cursor-ew-resize touch-none"
              onPointerDown={(e) => handlePointerDown('w', e)}
            >
              <div className="w-1.5 h-5 bg-white border border-indigo-600 rounded-full shadow" />
            </div>
            {/* E */}
            <div
              className="absolute top-1/2 -right-2.5 -translate-y-1/2 w-5 h-8 flex items-center justify-center cursor-ew-resize touch-none"
              onPointerDown={(e) => handlePointerDown('e', e)}
            >
              <div className="w-1.5 h-5 bg-white border border-indigo-600 rounded-full shadow" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="flex items-center justify-between gap-3 pt-4 mt-3 border-t border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
        >
          Cancel
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleConfirm}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-100 dark:shadow-none transition-all cursor-pointer"
          >
            <Check className="h-4 w-4" />
            Apply Crop ({croppedPixelW} &times; {croppedPixelH})
          </button>
        </div>
      </div>
    </div>
  );
}
