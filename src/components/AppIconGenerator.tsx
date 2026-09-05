/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import JSZip from 'jszip';
import { 
  Download, 
  Upload, 
  RefreshCw, 
  Sparkles, 
  Smartphone,
  CheckCircle, 
  FolderIcon,
  HelpCircle,
  FileSpreadsheet,
  Settings
} from 'lucide-react';
import { processImage, getImageDimensions } from '../utils/imageProcessor';
import RenameModal from './RenameModal';
import { ImageSettings } from '../types';

interface IconPreset {
  sizes: number[];
  folder: string;
  prefix: string;
  format: 'png' | 'ico' | 'jpeg';
  label: string;
}

const ICON_PRESETS: { [key: string]: IconPreset } = {
  android: {
    sizes: [48, 72, 96, 144, 192],
    folder: 'android',
    prefix: 'ic_launcher_',
    format: 'png',
    label: 'Android Launcher Asset Mipmaps (48px - 192px)'
  },
  playstore: {
    sizes: [512],
    folder: 'google-play',
    prefix: 'play_store_icon_',
    format: 'png',
    label: 'Google Play Store official asset (512px)'
  },
  ios: {
    sizes: [120, 152, 167, 180],
    folder: 'ios',
    prefix: 'apple-touch-icon-',
    format: 'png',
    label: 'Standard iOS App & App Store requirements (120px - 180px)'
  },
  favicon: {
    sizes: [16, 32, 48],
    folder: 'web-favicons',
    prefix: 'favicon-',
    format: 'png',
    label: 'Browser tab favicons & shortcuts (16px - 48px)'
  },
  pwa: {
    sizes: [192, 512],
    folder: 'pwa-manifest',
    prefix: 'pwa-icon-',
    format: 'png',
    label: 'Installable PWA Webapp Manifest criteria (192px & 512px)'
  }
};

export default function AppIconGenerator() {
  const [file, setFile] = useState<File | null>(null);
  const [selectedTargets, setSelectedTargets] = useState<string[]>(['android', 'playstore', 'ios', 'favicon', 'pwa']);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [downloadZipBlob, setDownloadZipBlob] = useState<Blob | null>(null);
  const [downloadZipUrl, setDownloadZipUrl] = useState<string>('');
  const [isRenameOpen, setIsRenameOpen] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setDownloadZipBlob(null);
      setDownloadZipUrl('');
    }
  };

  const toggleTarget = (key: string) => {
    setSelectedTargets(prev =>
      prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key]
    );
  };

  const generateIcons = async () => {
    if (!file || selectedTargets.length === 0) return;
    setIsProcessing(true);

    const zip = new JSZip();
    const origUrl = URL.createObjectURL(file);

    // Create a readme file inside the icons zip
    zip.file('README-ICONS.txt', `QuickResize - PWA & Mobile Icon Generator\nGenerated: ${new Date().toLocaleString()}\nPlatform files mapped inside descriptive standard sub-folders.`);

    for (const targetKey of selectedTargets) {
      const config = ICON_PRESETS[targetKey];
      
      for (const size of config.sizes) {
        try {
          const settings: ImageSettings = {
            mode: 'resize',
            width: size,
            height: size,
            maintainAspectRatio: false, // Icon must be exactly square
            quality: 0.95,
            format: config.format === 'jpeg' ? 'jpeg' : 'png'
          };

          const processed = await processImage(file, settings, origUrl);

          // Place inside proper target hierarchy
          const filename = `${config.prefix}${size}x${size}.png`;
          const filePath = `${config.folder}/${filename}`;

          if (processed.blob) {
            zip.file(filePath, processed.blob);
          }
        } catch (e) {
          console.error('Error generating size launcher icon', size, e);
        }
      }
    }

    URL.revokeObjectURL(origUrl);

    try {
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      setDownloadZipBlob(content);
      setDownloadZipUrl(url);
    } catch (err) {
      console.error('ZIP generation error', err);
    }
    setIsProcessing(false);
  };

  const downloadPackage = () => {
    if (!downloadZipUrl) return;
    setIsRenameOpen(true);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 select-none">
      {/* Parameters */}
      <div className="lg:col-span-5 space-y-6">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/40 space-y-5">
          <h3 className="font-sans text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="h-5 w-5 text-indigo-505" />
            Launcher Packages
          </h3>

          <div className="space-y-2">
            {Object.entries(ICON_PRESETS).map(([key, value]) => {
              const isChecked = selectedTargets.includes(key);
              return (
                <button
                  key={key}
                  onClick={() => toggleTarget(key)}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isChecked
                      ? 'border-indigo-405 bg-indigo-50/10'
                      : 'border-slate-150 bg-slate-50/50 hover:bg-slate-100/50 dark:border-slate-800 dark:bg-slate-900'
                  }`}
                >
                  <div className="mt-0.5 h-4.5 w-4.5 rounded border border-slate-300 dark:border-slate-700 flex items-center justify-center shrink-0">
                    {isChecked && <div className="h-2.5 w-2.5 bg-indigo-600 rounded-sm" />}
                  </div>
                  <div>
                    <span className="text-xs font-bold block text-slate-800 dark:text-white capitalize">{key} Target Bundle</span>
                    <span className="text-[10px] text-slate-450 block mt-1">{value.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="lg:col-span-7 space-y-6">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/40 space-y-6">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Source Illustration selection</span>

          {!file ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl border-2 border-dashed border-slate-205 py-14 text-center hover:bg-slate-50/50 dark:border-slate-800 dark:hover:bg-slate-900/10 cursor-pointer transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500">
                <Upload className="h-5 w-5" />
              </div>
              <h4 className="mt-3.5 text-xs font-bold text-slate-700 dark:text-white">Upload square master design</h4>
              <p className="text-[10px] text-slate-400 mt-1">Recommended: 1024x1024 pixels, centered graphic, PNG format</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-5 items-center bg-slate-50/50 p-4 rounded-xl border border-slate-100 dark:bg-slate-950/20 dark:border-slate-850">
                <div className="h-24 w-24 bg-slate-100 border dark:bg-slate-905 overflow-hidden shrink-0 flex items-center justify-center rounded-lg">
                  <img src={URL.createObjectURL(file)} alt="Master preview" className="max-w-full max-h-full object-contain" />
                </div>
                <div className="flex-1 space-y-1.5 text-xs">
                  <h5 className="font-sans font-bold text-slate-800 dark:text-white">Master file loaded</h5>
                  <div className="font-mono text-[10.5px] text-slate-405 font-medium">
                    <div>Filename: <span className="text-slate-700 dark:text-slate-300">{file.name}</span></div>
                    <div>Original file weight: <span className="text-slate-700 dark:text-slate-300">{(file.size / 1024).toFixed(1)} KB</span></div>
                    <div className="text-emerald-600 dark:text-emerald-400 font-sans font-semibold mt-1 flex items-center gap-0.5">
                      <CheckCircle className="h-3 w-3" /> Fully ready vector canvas
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={generateIcons}
                  disabled={isProcessing || selectedTargets.length === 0}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 hover:bg-slate-900 px-5 py-3.5 text-xs font-bold text-white shadow-md dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 cursor-pointer"
                >
                  <RefreshCw className={`h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} />
                  {isProcessing ? 'Binarizing package grids...' : `Generate ${selectedTargets.length} Platform Package`}
                </button>
                <button
                  onClick={() => {
                    setFile(null);
                    setDownloadZipUrl('');
                  }}
                  className="rounded-xl border border-slate-205 py-3 px-4 text-xs font-semibold hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 cursor-pointer"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          {downloadZipUrl && (
            <div className="border-t border-slate-100 pt-6 dark:border-slate-800 space-y-4 animate-fade-in">
              <div className="rounded-xl bg-emerald-50/50 p-4 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-950 flex gap-3.5">
                <FolderIcon className="h-10 w-10 text-emerald-505 shrink-0" />
                <div className="text-xs">
                  <h5 className="font-bold text-emerald-900 dark:text-emerald-305">Compilation finished!</h5>
                  <p className="text-slate-500 mt-1 leading-normal">
                    Icons are ready packed in nested subfolders inside the zip archive file structure. Extract directly inside your dev project roots `/android` or PWA directories.
                  </p>
                </div>
              </div>

              <div>
                <button
                  onClick={downloadPackage}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-755 text-white font-bold py-2.5 px-5 text-xs shadow-soft transition-colors cursor-pointer"
                >
                  <Download className="h-4 w-4" /> Download Complete ZIP Package
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {isRenameOpen && (
        <RenameModal
          isOpen={isRenameOpen}
          originalName={`QuickResize_AppIcon_Package_${Date.now()}.zip`}
          onConfirm={(newName) => {
            const link = document.createElement('a');
            link.href = downloadZipUrl;
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
