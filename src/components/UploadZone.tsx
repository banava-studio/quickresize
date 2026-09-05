/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, ShieldCheck, RefreshCw } from 'lucide-react';

interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void;
}

export default function UploadZone({ onFilesSelected }: UploadZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const validFiles: File[] = [];
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i];
        if (isValidFileType(file)) {
          validFiles.push(file);
        }
      }
      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const validFiles: File[] = [];
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        if (isValidFileType(file)) {
          validFiles.push(file);
        }
      }
      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
    }
  };

  const isValidFileType = (file: File): boolean => {
    const acceptedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    return acceptedTypes.includes(file.type) || /\.(jpg|jpeg|png|webp)$/i.test(file.name);
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      id="upload-container"
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-250 ${
        isDragActive
          ? 'border-indigo-500 bg-indigo-50/40 dark:border-indigo-400 dark:bg-indigo-950/15 scale-[1.01]'
          : 'border-slate-250 bg-white hover:border-slate-400 hover:bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:border-slate-705'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        onChange={handleFileInput}
        className="hidden"
        id="file-selector-input"
      />

      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
        <Upload className="h-7 w-7 animate-bounce-slow" />
      </div>

      <h3 className="mt-6 font-sans text-lg font-bold text-slate-800 dark:text-white">
        Drag & drop your images here
      </h3>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Supports JPG, JPEG, PNG, WEBP (Upto 50MB per file)
      </p>

      <button
        type="button"
        onClick={openFileDialog}
        className="mt-6 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition-all hover:bg-indigo-700 hover:shadow-indigo-300 dark:bg-indigo-500 dark:shadow-none dark:hover:bg-indigo-600"
      >
        Browse Files
      </button>

      {/* Trust reassurance banner directly below input triggers */}
      <div className="mt-6 flex items-center gap-2 rounded-lg bg-emerald-50/80 px-4 py-2 font-sans text-xs font-semibold text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400">
        <ShieldCheck className="h-4 w-4 text-emerald-500" />
        <span>100% Privacy Lock: Your images never leave your browser sandbox</span>
      </div>
    </div>
  );
}
