import React, { useState, useEffect, useRef } from 'react';
import { X, FileText, Download, AlertCircle } from 'lucide-react';

interface RenameModalProps {
  isOpen: boolean;
  originalName: string;
  onConfirm: (newName: string) => void;
  onClose: () => void;
}

export default function RenameModal({
  isOpen,
  originalName,
  onConfirm,
  onClose,
}: RenameModalProps) {
  // Extract base name and extension safely
  const dotIndex = originalName.lastIndexOf('.');
  const initialBaseName = dotIndex !== -1 ? originalName.substring(0, dotIndex) : originalName;
  const extension = dotIndex !== -1 ? originalName.substring(dotIndex) : '';

  const [newName, setNewName] = useState(initialBaseName);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setNewName(initialBaseName);
      setError(null);
      // Auto-focus input on open
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen, originalName]);

  // Support escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();

    if (!trimmed) {
      setError('Filename cannot be empty');
      return;
    }

    // Sanitize illegal filename characters: \ / : * ? " < > |
    const illegalChars = /[\\/:*?"<>|]/;
    if (illegalChars.test(trimmed)) {
      setError('Name cannot contain illegal characters: \\ / : * ? " < > |');
      return;
    }

    setError(null);
    onConfirm(trimmed + extension);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-all" 
        onClick={onClose}
      />

      {/* Modal Dialog Card */}
      <div 
        className="relative w-full max-w-md transform overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <X className="h-4.5 w-4.5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Rename & Download
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Please enter a name for your processed asset below
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">
              File Name
            </label>
            <div className="relative flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/15 dark:border-slate-800 dark:bg-slate-950">
              <input
                ref={inputRef}
                type="text"
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Enter filename"
                className="w-full bg-transparent pr-12 text-sm font-medium text-slate-900 outline-none dark:text-white"
              />
              <span className="absolute right-3.5 select-none rounded bg-slate-200 px-1.5 py-0.5 text-[9px] font-extrabold text-slate-600 dark:bg-slate-800 dark:text-slate-450">
                {extension || '.bin'}
              </span>
            </div>

            {error && (
              <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-bold text-red-500">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-center text-xs font-bold text-slate-550 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-350 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 py-2.5 text-center text-xs font-bold text-white shadow-md shadow-indigo-100 transition-all dark:shadow-none cursor-pointer"
            >
              <Download className="h-4 w-4" />
              Download & Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
