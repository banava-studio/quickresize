/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useRef, useEffect } from 'react';
import { Youtube, Monitor, Smartphone, Search, AlertTriangle, Eye, Upload, RefreshCw, Layers } from 'lucide-react';

export default function ThumbnailPreview() {
  const [file, setFile] = useState<File | null>(null);
  const [thumbSrc, setThumbSrc] = useState<string>('');
  const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop' | 'search'>('mobile');
  const [showSafeArea, setShowSafeArea] = useState<boolean>(true);
  const [title, setTitle] = useState<string>('My AWESOME Video Title! (Don\'t Let Your Text Get Blocked by the Timestamp!)');
  const [channelName, setChannelName] = useState<string>('Creative Studio Master');
  const [views, setViews] = useState<string>('124K views');
  const [timeAgo, setTimeAgo] = useState<string>('2 days ago');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setThumbSrc(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/40 space-y-6">
      <div className="flex items-center gap-2.5">
        <div className="h-9 w-9 bg-rose-500/10 text-rose-500 rounded-xl flex items-center justify-center">
          <Youtube className="h-5 w-5 text-rose-550" />
        </div>
        <div>
          <h3 className="font-sans text-base font-bold text-slate-900 dark:text-white">
            Creator Video Cover & YouTube Previewer
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Test how video thumbnails look in smartphone feeds, home pages, or search lists. Detect covered text through safe-area overlays.
          </p>
        </div>
      </div>

      {!file ? (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="rounded-xl border-2 border-dashed border-slate-205/80 p-10 text-center hover:bg-slate-50/50 dark:border-slate-800 dark:hover:bg-slate-900/10 cursor-pointer transition-colors"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <Youtube className="h-8 w-8 text-rose-500 mx-auto stroke-1 animate-pulse" />
          <h4 className="text-xs font-bold text-slate-700 dark:text-white mt-3">Upload your custom 16:9 thumbnail</h4>
          <p className="text-[10px] text-slate-400 mt-1">Recommended: 1280x720 pixels JPEG/PNG covers, up to 2MB.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Mock settings sidebar */}
          <div className="lg:col-span-4 space-y-4">
            <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/20 space-y-3.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Cover Mock Attributes</span>
              
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 block">Video Title:</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs font-bold p-1.5 rounded border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 block">Channel Brand Name:</label>
                <input
                  type="text"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  className="w-full text-xs font-bold p-1.5 rounded border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 block">Mock Views:</label>
                  <input
                    type="text"
                    value={views}
                    onChange={(e) => setViews(e.target.value)}
                    className="w-full text-xs font-bold p-1.5 rounded border bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 block">Mock Upload Date:</label>
                  <input
                    type="text"
                    value={timeAgo}
                    onChange={(e) => setTimeAgo(e.target.value)}
                    className="w-full text-xs font-bold p-1.5 rounded border bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-650 dark:text-slate-350">Toggle Safe Area Overlay</span>
                <input
                  type="checkbox"
                  checked={showSafeArea}
                  onChange={(e) => setShowSafeArea(e.target.checked)}
                  className="h-4 w-4 text-indigo-650 cursor-pointer rounded"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 rounded-xl bg-slate-905 border border-slate-300 dark:border-slate-800 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 transition-all cursor-pointer text-center"
              >
                Change Image
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setThumbSrc('');
                }}
                className="rounded-xl border border-rose-200 hover:bg-rose-50 dark:border-rose-950/20 px-3 text-rose-600 cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Core Simulator screen visualization area */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* Tab navigation */}
            <div className="flex gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <button
                onClick={() => setPreviewMode('mobile')}
                type="button"
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                  previewMode === 'mobile'
                    ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <Smartphone className="h-4 w-4" />
                Mobile Feed Feed
              </button>
              <button
                onClick={() => setPreviewMode('desktop')}
                type="button"
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                  previewMode === 'desktop'
                    ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <Monitor className="h-4 w-4" />
                Desktop Grid Panel
              </button>
              <button
                onClick={() => setPreviewMode('search')}
                type="button"
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                  previewMode === 'search'
                    ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <Search className="h-4 w-4" />
                Search Result Row
              </button>
            </div>

            {/* YouTube Sandbox Rendering */}
            <div className="p-6 rounded-2xl bg-[#0f0f0f] text-white flex justify-center items-center overflow-hidden min-h-[320px]">
              
              {/* MOBILE FEED SIMULATION */}
              {previewMode === 'mobile' && (
                <div className="w-[340px] bg-black border border-slate-750/50 rounded-3xl overflow-hidden shadow-2xl relative">
                  
                  {/* Smartphone Top Notch bar */}
                  <div className="bg-slate-900 text-slate-400 text-[9px] px-4.5 py-1 flex justify-between select-none">
                    <span>9:41 AM</span>
                    <span className="flex items-center gap-1">5G &bull; 94%</span>
                  </div>

                  {/* Thumbnail Cover container */}
                  <div className="relative aspect-video w-full bg-slate-950 overflow-hidden">
                    <img src={thumbSrc} alt="Previewer cover" className="w-full h-full object-cover" />
                    
                    {/* Timestamp Box */}
                    <div className="absolute bottom-2 right-2 bg-black/85 text-white text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wider">
                      12:14
                    </div>

                    {/* RED SAFE AREA INDICATORS */}
                    {showSafeArea && (
                      <div className="absolute inset-0 border border-rose-500/30 overflow-hidden pointer-events-none">
                        <div className="absolute bottom-2 right-2 w-[130px] h-[55px] bg-rose-500/25 border-2 border-dashed border-rose-500 rounded flex flex-col justify-center items-center p-1 text-[8px] font-bold text-white text-center">
                          <AlertTriangle className="h-3 w-3 mb-0.5 text-white" />
                          TIMESTAMP COVERS
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Creator Info feed layout */}
                  <div className="p-3 bg-[#0f0f0f] flex gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-rose-500 to-indigo-500 shrink-0 text-[10px] font-bold flex items-center justify-center uppercase select-none">
                      CS
                    </div>
                    <div>
                      <h4 className="text-[12px] font-bold text-white leading-normal truncate max-w-[240px]">
                        {title}
                      </h4>
                      <div className="flex flex-wrap gap-1 text-[10px] text-slate-400 mt-0.5 truncate max-w-[240px]">
                        <span>{channelName}</span>
                        <span>&bull;</span>
                        <span>{views}</span>
                        <span>&bull;</span>
                        <span>{timeAgo}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* DESKTOP GRID PREVIEW */}
              {previewMode === 'desktop' && (
                <div className="w-[300px] bg-[#0f0f0f] font-sans text-left">
                  <div className="relative aspect-video w-full bg-slate-950 rounded-xl overflow-hidden shadow-md">
                    <img src={thumbSrc} alt="Previewer cover" className="w-full h-full object-cover" />
                    
                    {/* Time */}
                    <div className="absolute bottom-2.5 right-2.5 bg-black/85 text-white text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wider">
                      12:14
                    </div>

                    {/* Safe Area indicators */}
                    {showSafeArea && (
                      <div className="absolute bottom-2.5 right-2.5 w-[110px] h-[45px] bg-rose-500/30 border border-dashed border-rose-455 rounded flex justify-center items-center text-[7px] font-bold text-white tracking-wide">
                        BLOCK ZONE
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-3 mt-3">
                    <div className="h-9 w-9 rounded-full bg-slate-805 shrink-0 flex items-center justify-center font-bold text-xs select-none">
                      YT
                    </div>
                    <div>
                      <h4 className="text-[13px] font-bold text-white leading-snug line-clamp-2">
                        {title}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1">{channelName}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{views} &bull; {timeAgo}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* HORIZONTAL SEARCH FEED */}
              {previewMode === 'search' && (
                <div className="w-full max-w-lg bg-[#0f0f0f] text-left flex gap-4 items-start py-2">
                  <div className="relative w-48 aspect-video shrink-0 scroll-py-1.5 bg-slate-950 rounded-lg overflow-hidden border border-slate-850">
                    <img src={thumbSrc} alt="Previewer cover" className="w-full h-full object-cover" />
                    
                    {/* Timestamp */}
                    <div className="absolute bottom-1.5 right-1.5 bg-black/85 text-white text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wider">
                      12:14
                    </div>

                    {/* Overlay */}
                    {showSafeArea && (
                      <div className="absolute bottom-1.5 right-1.5 w-[70px] h-[35px] bg-rose-500/20 border border-dashed border-rose-500 rounded flex justify-center items-center text-[6px] text-white font-bold uppercase">
                        Covers
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="text-[13px] font-bold text-white leading-snug truncate">
                      {title}
                    </h4>
                    <span className="text-[10px] text-slate-450 block mt-0.5">{views} &bull; {timeAgo}</span>
                    
                    <div className="flex items-center gap-1.5 mt-2.5">
                      <div className="h-5 w-5 bg-gradient-to-r from-teal-400 to-indigo-500 rounded-full shrink-0 flex items-center justify-center text-[7px] font-bold">
                        US
                      </div>
                      <span className="text-[10px] text-slate-400 truncate font-semibold">{channelName}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick alert context */}
            <div className="bg-amber-50/15 border border-amber-300/20 p-4 rounded-xl flex items-start gap-2">
              <AlertTriangle className="h-4.5 w-4.5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-[10px] text-slate-450 dark:text-slate-350 leading-relaxed">
                <span className="font-bold text-slate-700 dark:text-slate-200 block mb-0.5">Safe-Area Compliance Recommendation:</span>
                Never locate text captions, face focus locks, or brand watermarks inside the bottom-right coordinate zone (approx. the bottom-right 25% Width x 35% Height boundary). Standard YouTube apps globally overlay video durations permanently on grids, completely rendering covered information illegible.
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
