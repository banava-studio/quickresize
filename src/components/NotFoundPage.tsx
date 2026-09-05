/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Home, ArrowRight, Compass, Zap, ShieldCheck } from 'lucide-react';
import { updateSeoMetadata } from '../utils/seoMetadata';

interface NotFoundPageProps {
  onNavigateHome: () => void;
  onNavigateTool: (path: string, toolMode?: string) => void;
}

export default function NotFoundPage({ onNavigateHome, onNavigateTool }: NotFoundPageProps) {
  useEffect(() => {
    updateSeoMetadata({
      title: 'Page Not Found (404) | QuickResize',
      description: 'The requested page could not be found. Explore QuickResize free in-browser image optimization tools.',
      path: '/404',
      noIndex: true, // Crucial: Never index 404 pages
    });
  }, []);

  const popularTools = [
    { title: 'Compress to 20KB', desc: 'SSC, UPSC, and official portal photo limits', path: '/compress-image-to-20kb', mode: 'smart-compressor' },
    { title: 'Compress to 50KB', desc: 'Government portal signature and photo requirements', path: '/compress-image-to-50kb', mode: 'smart-compressor' },
    { title: 'Compress to 100KB', desc: 'Standard web and application upload size target', path: '/compress-image-to-100kb', mode: 'smart-compressor' },
    { title: 'Passport Photo Maker', desc: 'Crop 2x2 inch and 35x45mm international headshots', path: '/passport-photo-maker', mode: 'passport-maker' },
    { title: 'Signature Resizer', desc: 'Clean, transparent, thresholded sign for forms', path: '/signature-resizer', mode: 'signature-toolkit' },
    { title: 'Format Converter', desc: 'Convert between WebP, PNG, JPG, and AVIF', path: '/jpg-to-webp', mode: 'format-converter' },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 text-center animate-fade-in">
      <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 mb-6">
        <Compass className="h-8 w-8" />
      </div>

      <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
        404 — Page Not Found
      </h1>

      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
        The link you followed may be broken, or the page may have been relocated. QuickResize's full suite of local image optimization tools is available below.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={onNavigateHome}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition-colors shadow-sm cursor-pointer"
        >
          <Home className="h-4 w-4" />
          Go to QuickResize Home
        </button>
      </div>

      {/* Popular Tools Direct Grid */}
      <div className="mt-14 text-left">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
          <Zap className="h-3.5 w-3.5 text-amber-500" />
          <span>Popular Image Tools</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {popularTools.map((tool) => (
            <button
              key={tool.title}
              onClick={() => onNavigateTool(tool.path, tool.mode)}
              className="group flex flex-col p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-indigo-700 transition-all text-left cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {tool.title}
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                {tool.desc}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-12 flex items-center justify-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
        <ShieldCheck className="h-3.5 w-3.5" />
        <span>All image processing remains 100% private in your browser.</span>
      </div>
    </div>
  );
}
