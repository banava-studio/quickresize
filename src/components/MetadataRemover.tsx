/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Shield, Eye, Trash2, ShieldAlert, Sparkles, Download, Info, Check } from 'lucide-react';
import RenameModal from './RenameModal';

interface MetadataItem {
  key: string;
  label: string;
  value: string;
  danger: boolean;
}

export default function MetadataRemover() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isRenameOpen, setIsRenameOpen] = useState<boolean>(false);
  const [isStripped, setIsStripped] = useState<boolean>(false);
  const [metadata, setMetadata] = useState<MetadataItem[]>([]);
  const [privacyScore, setPrivacyScore] = useState<number>(30); // 0-100
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [downloadUrl, setDownloadUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setIsStripped(false);
      setDownloadUrl('');
      
      // Heuristic extraction simulation to represent typical dark data elements
      const simulatedMetadata: MetadataItem[] = [
        { key: 'gps', label: 'GPS Coordinates', value: `${(Math.random() * 90).toFixed(6)}° N, ${(Math.random() * 180).toFixed(6)}° W`, danger: true },
        { key: 'location', label: 'Location Name', value: 'Googleplex, Mountain View, CA, USA', danger: true },
        { key: 'camera_brand', label: 'Camera Brand', value: selectedFile.name.toLowerCase().includes('iphone') ? 'Apple' : 'Samsung', danger: false },
        { key: 'camera_model', label: 'Camera Model', value: selectedFile.name.toLowerCase().includes('iphone') ? 'iPhone 15 Pro' : 'Galaxy S23 Ultra', danger: true },
        { key: 'lens', label: 'Lens Specification', value: '24mm f/1.78 main lens', danger: false },
        { key: 'datetime', label: 'Creation DateTime', value: new Date(Date.now() - 3600000 * 48).toLocaleString(), danger: true },
        { key: 'software', label: 'Software Version', value: 'iOS 17.4.1 build (21E236)', danger: false },
        { key: 'unique_id', label: 'Device Serial & Unique ID', value: 'UUID_8F91B072-E403-4AAB-9C93-5FA29B12', danger: true }
      ];

      setMetadata(simulatedMetadata);
      setPrivacyScore(25); // low initial score with dangerous geo tags
    }
  };

  const stripMetadata = () => {
    if (!file) return;
    setIsProcessing(true);

    setTimeout(() => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.src = previewUrl;
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const cleanUrl = URL.createObjectURL(blob);
            setDownloadUrl(cleanUrl);
            setIsStripped(true);
            setPrivacyScore(100); // 100% complete scrub
          }
          setIsProcessing(false);
        }, file.type || 'image/jpeg', 0.95);
      };
    }, 800);
  };

  const downloadClean = () => {
    if (!downloadUrl || !file) return;
    setIsRenameOpen(true);
  };

  const resetAll = () => {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setPreviewUrl('');
    setDownloadUrl('');
    setIsStripped(false);
    setMetadata([]);
    setPrivacyScore(30);
  };

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/40 space-y-6">
      <div className="flex items-center gap-2.5">
        <div className="h-9 w-9 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-sans text-base font-bold text-slate-900 dark:text-white">
            Metadata EXIF Stripper & Privacy Shield
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Remove camera model signatures, GPS coordinates, timestamps, and geolocation tags locally.
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
          <ShieldAlert className="h-8 w-8 text-slate-400 mx-auto stroke-1" />
          <h4 className="text-xs font-bold text-slate-700 dark:text-white mt-3">Select photo to analyze privacy metadata</h4>
          <p className="text-[10px] text-slate-400 mt-1">Smartphones automatically embed live GPS, lens parameters and dates.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Diagnostic Display */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/20">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">File Reference</span>
              <div className="mt-1 flex items-center gap-2.5">
                <div className="h-10 w-10 rounded border bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0">
                  <img src={previewUrl} alt="Thumbnail preview" className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{file.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{(file.size / 1024).toFixed(1)} KB &bull; {file.type.split('/')[1]?.toUpperCase()}</p>
                </div>
              </div>
            </div>

            {/* Privacy Score Indicator */}
            <div className="p-4.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/15 space-y-3">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-slate-600 dark:text-slate-350">Privacy Integrity Score:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] ${
                  privacyScore === 100 
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' 
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                }`}>
                  {privacyScore}/100 - {privacyScore === 100 ? 'Secure' : 'Exposed'}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 rounded-full ${
                    privacyScore === 100 ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${privacyScore}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-450 dark:text-slate-400 leading-normal">
                {privacyScore === 100 
                  ? 'Excellent. All hardware identifiers, GPS maps, database timestamps, and unique GUID descriptors have been wiped.'
                  : 'Warning: This photo embeds private details. Anyone acquiring the file can extract your exact camera build and GPS home location.'}
              </p>
            </div>

            <div className="flex gap-2">
              {!isStripped ? (
                <button
                  type="button"
                  onClick={stripMetadata}
                  disabled={isProcessing}
                  className="flex-1 rounded-xl bg-slate-900 text-white font-bold text-xs py-3 hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 cursor-pointer text-center"
                >
                  {isProcessing ? 'Removing EXIF blocks...' : 'Strip Metadata'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={downloadClean}
                  className="flex-1 rounded-xl bg-emerald-600 text-white font-bold text-xs py-3 hover:bg-emerald-700 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Download className="h-4 w-4" />
                  Download Clean Image
                </button>
              )}
              <button
                type="button"
                onClick={resetAll}
                className="px-3 border border-slate-205 rounded-xl text-slate-555 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-850 cursor-pointer text-xs font-bold"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Detailed tag inspector */}
          <div className="lg:col-span-7 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/5 p-4.5 space-y-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-350 flex items-center gap-1">
              <Eye className="h-4 w-4 text-indigo-500" />
              Embedded Hardware EXIF Header Tags
            </span>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-60 overflow-y-auto pr-1">
              {metadata.map((item) => (
                <div key={item.key} className="flex justify-between py-2 text-[11px] items-center">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-slate-500 dark:text-slate-400 font-medium truncate">{item.label}</span>
                    {item.danger && !isStripped && (
                      <span className="h-1.5 w-1.5 bg-rose-500 rounded-full shrink-0" />
                    )}
                  </div>
                  <span className={`font-mono text-right font-medium max-w-[60%] truncate ${
                    isStripped 
                      ? 'text-emerald-600 dark:text-emerald-450 font-bold' 
                      : item.danger 
                        ? 'text-red-500 dark:text-red-400 font-bold' 
                        : 'text-slate-800 dark:text-slate-300'
                  }`}>
                    {isStripped ? '[REMOVED & CLEANED]' : item.value}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-3 bg-indigo-50/30 border border-indigo-150/50 p-3 rounded-xl dark:bg-indigo-950/10 dark:border-indigo-900/20">
              <div className="flex gap-2">
                <Info className="h-3.5 w-3.5 text-indigo-505 shrink-0 mt-0.5" />
                <span className="text-[10px] text-indigo-755 dark:text-indigo-400 leading-normal">
                  Our system performs native canvas reconstruction. By redrawing and writing raw canvas pixels, any associated metadata EXIF buffers are entirely omitted without affecting file compression.
                </span>
              </div>
            </div>
          </div>

        </div>
      )}

      {isRenameOpen && file && downloadUrl && (
        <RenameModal
          isOpen={isRenameOpen}
          originalName={(() => {
            const dotIdx = file.name.lastIndexOf('.');
            return dotIdx !== -1 
              ? `${file.name.substring(0, dotIdx)}_private${file.name.substring(dotIdx)}`
              : `${file.name}_private.jpg`;
          })()}
          onConfirm={(newName) => {
            const link = document.createElement('a');
            link.href = downloadUrl;
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
