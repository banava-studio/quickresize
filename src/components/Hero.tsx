/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Sparkles, 
  Zap, 
  Smartphone, 
  Crop, 
  Lock, 
  Activity, 
  ArrowRight,
  Minimize2,
  FileImage,
  UploadCloud,
  Sliders,
  CheckCircle,
  HelpCircle,
  Key,
  Database,
  Briefcase
} from 'lucide-react';

interface HeroProps {
  onCtaClick: (defaultMode: 'compress' | 'resize') => void;
}

export default function Hero({ onCtaClick }: HeroProps) {
  const WHATS_WE_DO = [
    "🚀 Compress photos to exact KB/MB requirements (e.g. 20KB, 50KB, 100KB) with offline binary search",
    "📸 Auto-fit biometric Passport photos with exact face & shoulder alignment guidemaps",
    "🪪 Combine front & back photos of Aadhaar cards, driving licences & IDs into one image or PDF",
    "📝 Prepare and autoconvert scan files to mandated sizes for official Government recruitment portals",
    "🖋️ Extract signatures with transparent paper removal and compliant color pen filters",
    "🔄 Batch transcode images instantly between PNG, JPG, WEBP, GIF, BMP, and PDF files",
    "🔐 Sanitize sensitive photos by stripping hidden camera EXIF geolocation metadata"
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % WHATS_WE_DO.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div id="home-landing-root" className="relative overflow-hidden bg-slate-50 py-16 dark:bg-slate-950 sm:py-24 select-none">
      {/* Visual Background Elements */}
      <div className="absolute top-0 left-1/2 -z-10 h-[600px] w-[1000px] -translate-x-1/2 rounded-full bg-indigo-50/50 blur-3xl dark:bg-indigo-950/10" />
      <div className="absolute top-32 right-1/4 -z-10 h-[400px] w-[600px] rounded-full bg-sky-50/50 blur-3xl dark:bg-sky-950/10" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Tagline / Badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50/80 px-3.5 py-1.5 text-xs font-semibold text-indigo-750 dark:bg-indigo-950/40 dark:text-indigo-300">
            <Sparkles className="h-3.5 w-3.5 animate-spin-slow" />
            <span>Modern & Secure Web Image Resizer</span>
          </div>

          {/* Heading */}
          <h1 className="mt-6 font-sans text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-6xl md:text-7xl">
            Quick<span className="bg-gradient-to-r from-sky-500 via-indigo-500 to-indigo-600 bg-clip-text text-transparent">Resize</span>
          </h1>

          {/* Subtitle */}
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 dark:text-slate-300 sm:text-xl">
            Compress, Resize and Optimize Images in Seconds.
          </p>

          {/* What We Do - Animated Typography */}
          <div className="mx-auto mt-6 max-w-2xl min-h-[64px] flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="text-xs sm:text-sm font-semibold text-indigo-650 dark:text-indigo-400 bg-indigo-500/5 dark:bg-indigo-400/5 px-4.5 py-3 rounded-2xl border border-indigo-500/10 dark:border-indigo-400/10 shadow-sm leading-relaxed"
              >
                {WHATS_WE_DO[currentIndex]}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Trust Line */}
          <div className="mx-auto mt-5 max-w-md">
            <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-110 bg-emerald-50/70 px-4.5 py-2.5 text-sm font-medium text-emerald-800 shadow-sm shadow-emerald-50 dark:border-emerald-950/30 dark:bg-emerald-950/20 dark:text-emerald-400 dark:shadow-none animate-fade-in">
              <Shield className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>&ldquo;Your images never leave your device.&rdquo;</span>
            </div>
            <p className="mt-1.5 font-mono text-[10.5px] text-slate-400 dark:text-slate-500">
              Processed locally using your browser&apos;s Canvas engine. No files are uploaded.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <button
              onClick={() => onCtaClick('compress')}
              className="group flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-4.5 text-base font-semibold text-white shadow-xl shadow-slate-900/15 transition-all duration-155 hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:shadow-none dark:hover:bg-white cursor-pointer"
            >
              <Minimize2 className="h-5 w-5 text-sky-450 shrink-0" />
              Compress Image
              <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5 shrink-0" />
            </button>
            
            <button
              onClick={() => onCtaClick('resize')}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-4.5 text-base font-semibold text-slate-705 shadow-lg shadow-gray-100/50 transition-all duration-155 hover:-translate-y-0.5 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:shadow-none dark:hover:bg-slate-800 cursor-pointer"
            >
              <Crop className="h-5 w-5 text-indigo-500 shrink-0" />
              Resize Image
            </button>
          </div>
        </div>

        {/* Feature Grid */}
        <div id="landing-features" className="mt-20 border-t border-slate-100 pt-16 dark:border-slate-900">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Feature 1 */}
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-md transition-shadow hover:shadow-lg dark:border-slate-900 dark:bg-slate-900/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-500 dark:bg-sky-950/40">
                <Minimize2 className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-sans text-base font-bold text-slate-900 dark:text-white">
                Targeted Compression
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                Enter your desired size in KB or MB (e.g., 100 KB) and the encoder automatically balances quality to match.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-md transition-shadow hover:shadow-lg dark:border-slate-900 dark:bg-slate-900/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-500 dark:bg-violet-950/40">
                <Crop className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-sans text-base font-bold text-slate-900 dark:text-white">
                Proportional Scaling
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                Resize by custom width, height, or use instant fit locks. Maintain aspect ratios intelligently.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-md transition-shadow hover:shadow-lg dark:border-slate-900 dark:bg-slate-900/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500 dark:bg-indigo-950/40">
                <Zap className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-sans text-base font-bold text-slate-900 dark:text-white">
                Ready-Made Presets
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                Generate high-quality App Icons, WhatsApp Profile fits, Youtube thumbnails, and social layouts instantly.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-md transition-shadow hover:shadow-lg dark:border-slate-900 dark:bg-slate-900/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500 dark:bg-emerald-950/40">
                <Shield className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-sans text-base font-bold text-slate-900 dark:text-white">
                100% Privacy Lock
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                Files are processed locally in your sandbox with web workers. No trackers, no logins, no API server calls.
              </p>
            </div>
          </div>
        </div>

        {/* Section: Simple Interactive Pipeline */}
        <div id="interactive-pipeline" className="mt-24 border-t border-slate-100 pt-16 dark:border-slate-900 text-center max-w-5xl mx-auto">
          <div className="space-y-3">
            <h2 className="font-sans text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              How the Local Pipeline Works
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
              Get pixel-perfect results in three simple browser-side steps without ever exposing private visual metadata.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3 relative">
            {/* Step 1 */}
            <div className="relative flex flex-col items-center bg-white dark:bg-slate-900/30 p-6 rounded-2xl border border-slate-100 dark:border-slate-900 shadow-sm">
              <div className="h-12 w-12 flex items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-sm font-bold">
                <UploadCloud className="h-5 w-5" />
              </div>
              <div className="absolute right-0 top-10 hidden md:block h-0.5 w-1/3 bg-slate-100 dark:bg-slate-800" />
              <h4 className="mt-5 text-sm font-bold text-slate-900 dark:text-white">1. Select Images</h4>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed text-center">
                Drag-and-drop your images, vectors, or forms directly into the editor boundaries. Supports PNG, JPG, WebP.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative flex flex-col items-center bg-white dark:bg-slate-900/30 p-6 rounded-2xl border border-slate-100 dark:border-slate-900 shadow-sm">
              <div className="h-12 w-12 flex items-center justify-center rounded-full bg-amber-50 dark:bg-amber-955 text-amber-600 dark:text-amber-400 text-sm font-bold">
                <Sliders className="h-5 w-5" />
              </div>
              <div className="absolute right-0 top-10 hidden md:block h-0.5 w-1/3 bg-slate-100 dark:bg-slate-800" />
              <h4 className="mt-5 text-sm font-bold text-slate-900 dark:text-white">2. Specify Limits</h4>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed text-center">
                Configure exact target kilobytes (e.g. 50 KB), lock dimensional aspect ratios, or crop for passport standards.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative flex flex-col items-center bg-white dark:bg-slate-900/30 p-6 rounded-2xl border border-slate-100 dark:border-slate-900 shadow-sm">
              <div className="h-12 w-12 flex items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-450 text-sm font-bold">
                <CheckCircle className="h-5 w-5" />
              </div>
              <h4 className="mt-5 text-sm font-bold text-slate-900 dark:text-white">3. Local Compilation</h4>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed text-center">
                Our in-memory canvas engine re-encodes, scales, or keys the pixels locally and serves your processed download directly back to your device.
              </p>
            </div>
          </div>
        </div>

        {/* Section: Why Offline Matters (Detailed visual grid card) */}
        <div id="privacy-standards-section" className="mt-24 border-t border-slate-100 pt-16 dark:border-slate-900">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                <Lock className="h-3 w-3" />
                <span>Next-Gen Security Benchmark</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl leading-snug">
                Why Offline Client-Side Graphic Processing is the Safest Standard
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Most web-based image tools require uploading your confidential payloads to external cloud storage systems. There, they can be crawled, inspected, or temporarily cached. QuickResize handles all image math 100% locally inside your client session memory.
              </p>
              
              <div className="space-y-4 pt-2">
                <div className="flex gap-3">
                  <div className="h-5 w-5 shrink-0 rounded-full bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mt-1">
                    <Key className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">No Corporate File Collection</h5>
                    <p className="text-xs text-slate-400 mt-0.5">We don&apos;t run background server handlers. Your personal photos, legal signatures, or tax docs stay exclusively on your hardware.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="h-5 w-5 shrink-0 rounded-full bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mt-1">
                    <Database className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">No Account Sign-Ups Needed</h5>
                    <p className="text-xs text-slate-400 mt-0.5">Skip creating usernames or linking social credentials. Enter our workspace and optimize instantly for zero premium locks.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="h-5 w-5 shrink-0 rounded-full bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mt-1">
                    <Briefcase className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Candidate & Business Approved</h5>
                    <p className="text-xs text-slate-400 mt-0.5">Prepare high-resolution, precise files up to government specs without compression degradation or noise artifacting.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Specs Drawer Showcase */}
            <div className="rounded-2xl border border-slate-100 bg-white dark:border-slate-900 dark:bg-slate-900/35 p-6 shadow-lg space-y-5">
              <h4 className="font-sans text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 pb-3 dark:border-slate-800">
                Core Dynamic Resolution Specs
              </h4>
              
              <div className="space-y-4 text-xs font-medium bg-transparent">
                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-850 p-2.5 rounded-lg">
                  <span className="text-slate-800 dark:text-slate-200">Biometric Passport Overlay</span>
                  <span className="text-[11px] font-mono font-bold bg-indigo-50 text-indigo-750 dark:bg-indigo-950 dark:text-indigo-400 p-1 rounded">3.5 &times; 4.5 cm / 2x2&quot;</span>
                </div>

                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-850 p-2.5 rounded-lg">
                  <span className="text-slate-800 dark:text-slate-200">App Store Asset Slices</span>
                  <span className="text-[11px] font-mono font-bold bg-amber-50 text-amber-700 dark:bg-amber-955 dark:text-amber-400 p-1 rounded">LDPI to XXHDPI Sizes</span>
                </div>

                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-850 p-2.5 rounded-lg">
                  <span className="text-slate-800 dark:text-slate-200">YouTube Video Frame Thumbnail</span>
                  <span className="text-[11px] font-mono font-bold bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-400 p-1 rounded">1280 &times; 720 px</span>
                </div>

                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-850 p-2.5 rounded-lg">
                  <span className="text-slate-800 dark:text-slate-200">Instagram Feed Square Overlay</span>
                  <span className="text-[11px] font-mono font-bold bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-450 p-1 rounded">1080 &times; 1080 px</span>
                </div>

                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-850 p-2.5 rounded-lg">
                  <span className="text-slate-800 dark:text-slate-200">WhatsApp Profile Background</span>
                  <span className="text-[11px] font-mono font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 p-1 rounded">500 &times; 500 px</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 font-normal leading-normal italic text-center pt-2">
                * All calculations generate automated DPI properties aligned to international form regulations.
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
