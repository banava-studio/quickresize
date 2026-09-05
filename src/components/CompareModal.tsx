/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  Columns, 
  Split, 
  Move, 
  RefreshCw, 
  Eye, 
  ArrowLeftRight 
} from 'lucide-react';
import { ProcessedFile } from '../types';
import { formatBytes } from './ImageItem';

interface CompareModalProps {
  item: ProcessedFile;
  onClose: () => void;
}

export default function CompareModal({ item, onClose }: CompareModalProps) {
  const [viewMode, setViewMode] = useState<'slider' | 'side-by-side'>('slider');
  const [sliderValue, setSliderValue] = useState<number>(50);
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [panPosition, setPanPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Keyboard shortcut listener to exit modal with 'Escape'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Handle slide overlay dragging on slider track
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSliderValue(Number(e.target.value));
  };

  // Reset zoom settings
  const resetZoom = () => {
    setZoomScale(1);
    setPanPosition({ x: 0, y: 0 });
  };

  // Magnification action sliders
  const handleZoomIn = () => {
    setZoomScale((prev) => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = () => {
    setZoomScale((prev) => {
      const next = Math.max(prev - 0.5, 1);
      if (next === 1) setPanPosition({ x: 0, y: 0 });
      return next;
    });
  };

  // Dragging event handlers to support navigation/panning when zoomed in
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (zoomScale <= 1) return;
    setIsPanning(true);
    dragStart.current = { x: e.clientX - panPosition.x, y: e.clientY - panPosition.y };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning || zoomScale <= 1) return;
    const nextX = e.clientX - dragStart.current.x;
    const nextY = e.clientY - dragStart.current.y;
    
    // Boundary clamp so they don't drag the image fully off-screen
    const maxDrag = 800 * (zoomScale - 1);
    setPanPosition({
      x: Math.min(Math.max(nextX, -maxDrag), maxDrag),
      y: Math.min(Math.max(nextY, -maxDrag), maxDrag)
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950/98 text-white backdrop-blur-md animate-fade-in select-none">
      
      {/* Top Header Controls bar */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-900 px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <Eye className="h-5 w-5 text-indigo-400" />
          <div>
            <span className="font-sans text-sm font-bold block truncate max-w-[200px] sm:max-w-md">
              {item.name}
            </span>
            <span className="font-mono text-[10px] text-slate-450 block">
              Zoom: {zoomScale.toFixed(1)}x &bull; Quality inspector
            </span>
          </div>
        </div>

        {/* Workspace mode selectors */}
        <div className="flex items-center gap-4">
          <div className="flex rounded-lg bg-slate-900 border border-slate-800 p-1">
            <button
              onClick={() => setViewMode('slider')}
              className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                viewMode === 'slider'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Split className="h-3.5 w-3.5" />
              Slider
            </button>
            <button
              onClick={() => setViewMode('side-by-side')}
              className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                viewMode === 'side-by-side'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Columns className="h-3.5 w-3.5" />
              Side-by-Side
            </button>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl bg-slate-900 border border-slate-800 p-2.5 hover:bg-slate-800 transition-colors"
            title="Close inspector"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Main Interactive Inspector Area */}
      <div 
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`flex-1 relative flex items-center justify-center overflow-hidden p-6 select-none ${
          zoomScale > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
        }`}
      >
        {viewMode === 'slider' ? (
          /* Slider overlay mode */
          <div 
            className="relative max-w-full max-h-[72vh] aspect-video border border-slate-900 rounded-xl overflow-hidden shadow-2xl transition-transform duration-75 select-none touch-none"
            style={{
              transform: `scale(${zoomScale}) translate(${panPosition.x / zoomScale}px, ${panPosition.y / zoomScale}px)`,
              width: `${item.originalWidth > 0 ? 'auto' : '100%'}`,
              height: `${item.originalHeight > 0 ? 'auto' : '100%'}`,
            }}
          >
            {/* Base layer: original image (Before) */}
            <img
              src={item.originalUrl}
              alt="Original visual preview"
              className="w-full h-full object-contain block max-h-[72vh]"
              draggable={false}
              referrerPolicy="no-referrer"
            />
            <div className="absolute top-3 left-3 z-10 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase backdrop-blur font-sans">
              Before &bull; {formatBytes(item.originalSize)}
            </div>

            {/* Clipped overlay layer: optimized image (After) */}
            {item.outputUrl && (
              <>
                <div 
                  className="absolute inset-0 z-5 select-none"
                  style={{
                    clipPath: `polygon(${sliderValue}% 0, 100% 0, 100% 100%, ${sliderValue}% 100%)`
                  }}
                >
                  <img
                    src={item.outputUrl}
                    alt="Optimized quality preview"
                    className="w-full h-full object-contain block max-h-[72vh]"
                    draggable={false}
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-3 right-3 z-10 rounded-md bg-indigo-600/80 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase backdrop-blur font-sans">
                    After &bull; {item.outputSize ? formatBytes(item.outputSize) : ''}
                  </div>
                </div>

                {/* Vertical Divider indicator line */}
                <div 
                  className="absolute bottom-0 top-0 z-20 w-0.5 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] cursor-ew-resize pointer-events-none"
                  style={{ left: `${sliderValue}%` }}
                >
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 border border-indigo-400">
                    <ArrowLeftRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          /* Side by side display mode */
          <div 
            className="grid grid-cols-2 gap-6 w-full max-h-[72vh] select-none"
            style={{
              transform: `scale(${zoomScale}) translate(${panPosition.x / zoomScale}px, ${panPosition.y / zoomScale}px)`,
            }}
          >
            <div className="relative rounded-xl border border-slate-900 bg-slate-900/40 overflow-hidden aspect-video flex items-center justify-center shadow-lg">
              <img
                src={item.originalUrl}
                alt="Before side-by-side"
                className="max-h-[62vh] max-w-full object-contain block"
                draggable={false}
                referrerPolicy="no-referrer"
              />
              <span className="absolute top-3 left-3 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase backdrop-blur font-sans">
                Before: {formatBytes(item.originalSize)}
              </span>
            </div>

            <div className="relative rounded-xl border border-slate-900 bg-slate-900/40 overflow-hidden aspect-video flex items-center justify-center shadow-lg">
              {item.outputUrl ? (
                <>
                  <img
                    src={item.outputUrl}
                    alt="After side-by-side"
                    className="max-h-[62vh] max-w-full object-contain block"
                    draggable={false}
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute top-3 left-3 rounded-md bg-indigo-600/80 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase backdrop-blur font-sans">
                    After: {item.outputSize ? formatBytes(item.outputSize) : ''}
                  </span>
                </>
              ) : (
                <div className="animate-pulse text-xs text-slate-500 font-mono">ENCODING IMAGE...</div>
              )}
            </div>
          </div>
        )}

        {/* Drag-to-pan indicator when zoomed */}
        {zoomScale > 1 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 rounded-full bg-black/70 border border-slate-800 px-3.5 py-1.5 text-xs text-slate-200">
            <Move className="h-4 w-4 text-indigo-400 animate-pulse" />
            Drag pointer to pan and explore close-up pixels
          </div>
        )}
      </div>

      {/* Bottom controls & overlay adjustment sliders */}
      <footer className="h-20 shrink-0 bg-slate-950 border-t border-slate-900 px-6 sm:px-8 flex items-center justify-between">
        
        {/* Slider control (hidden in side-by-side mode) */}
        <div className="flex-1 max-w-md">
          {viewMode === 'slider' && (
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold text-slate-400 font-sans uppercase">Compare Slider</span>
              <input
                type="range"
                min="0"
                max="100"
                value={sliderValue}
                onChange={handleSliderChange}
                className="flex-1 accent-indigo-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
              />
              <span className="font-mono text-xs font-bold w-8 text-right text-slate-300">{sliderValue}%</span>
            </div>
          )}
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-3 ml-6">
          <button
            onClick={handleZoomOut}
            disabled={zoomScale <= 1}
            className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-350 hover:bg-slate-800 hover:text-white disabled:opacity-40 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          
          <span className="font-mono text-xs font-bold text-indigo-400 min-w-[50px] text-center">
            {Math.round(zoomScale * 100)}%
          </span>

          <button
            onClick={handleZoomIn}
            disabled={zoomScale >= 4}
            className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-350 hover:bg-slate-800 hover:text-white disabled:opacity-40 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </button>

          {zoomScale > 1 && (
            <button
              onClick={resetZoom}
              className="rounded-xl border border-dashed border-slate-805 bg-slate-900/40 px-3 py-2 text-xs font-bold text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
            >
              Reset Zoom
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
