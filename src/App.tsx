/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { 
  Plus, 
  Trash2, 
  RefreshCw, 
  ShieldCheck, 
  Layers, 
  Download, 
  Zap,
  Info,
  Sparkles,
  ArrowLeft,
  Maximize2,
  FileCheck,
  User,
  Share2,
  FileText,
  Smartphone,
  Home,
  Menu,
  X,
  Scale
} from 'lucide-react';

import Navbar from './components/Navbar';
import Hero from './components/Hero';
import UploadZone from './components/UploadZone';
import BatchControls from './components/BatchControls';
import ImageItem, { formatBytes } from './components/ImageItem';
import RenameModal from './components/RenameModal';

// Specialized modular utility imports
import SmartCompressor from './components/SmartCompressor';
import EnhancedResizer from './components/EnhancedResizer';
import FormatConverter from './components/FormatConverter';
import PassportMaker from './components/PassportMaker';
import SocialResizer from './components/SocialResizer';
import GovFormTool from './components/GovFormTool';
import AppIconGenerator from './components/AppIconGenerator';
import BlogSystem from './components/BlogSystem';
import LegalContact from './components/LegalContact';

// New V3 Component Imports
import MetadataRemover from './components/MetadataRemover';
import SignatureToolkit from './components/SignatureToolkit';
import QrGenerator from './components/QrGenerator';
import ThumbnailPreview from './components/ThumbnailPreview';
import SeoPages from './components/SeoPages';
import IdCardCombiner from './components/IdCardCombiner';
import BatchStudio from './components/BatchStudio';

// Round 5 Real-World Image Utility Imports
import DocumentOptimizer from './components/DocumentOptimizer';
import ProfilePictureMaker from './components/ProfilePictureMaker';
import CustomCanvasTool from './components/CustomCanvasTool';
import PhotoSheetMaker from './components/PhotoSheetMaker';
import SmartPresetsCatalog from './components/SmartPresetsCatalog';
import { PassportPresetOption } from './components/PassportMaker';

import { getSeoPageConfig } from './config/seoPagesConfig';
import { updateSeoMetadata } from './utils/seoMetadata';
import AdSlot from './components/AdSlot';
import { ADSENSE_CONFIG, initializeAdSense } from './config/adsense';
import ErrorBoundary from './components/ErrorBoundary';
import NotFoundPage from './components/NotFoundPage';

import { ImageSettings, ProcessedFile } from './types';
import { getImageDimensions, processImage } from './utils/imageProcessor';

// Safe localStorage wrappers to prevent security exceptions in sandboxed environments
const safeLocalStorage = {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Ignore
    }
  }
};

export default function App() {
  // PWA & Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = safeLocalStorage.getItem('quickresize-dark');
      if (saved) return saved === 'true';
      if (typeof window !== 'undefined' && window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        return mediaQuery && mediaQuery.matches;
      }
    } catch (e) {
      console.warn('Failed to detect dark mode preference:', e);
    }
    return false;
  });

  const [activeTab, setActiveTab] = useState<'home' | 'dashboard' | 'blog' | 'legal-contact' | 'not-found'>('home');
  const [dashboardMode, setDashboardMode] = useState<
    'catalog' | 'batch' | 'smart-compressor' | 'enhanced-resizer' | 'format-converter' | 'passport-maker' | 'social-resizer' | 'gov-form' | 'app-icon' | 'metadata-remover' | 'signature-toolkit' | 'qr-generator' | 'thumbnail-preview' | 'id-card-combiner' | 'document-optimizer' | 'profile-maker' | 'custom-canvas' | 'photo-sheet' | 'smart-presets'
  >('catalog');
  const [sheetHandoffPhoto, setSheetHandoffPhoto] = useState<{ url: string; preset?: PassportPresetOption } | null>(null);
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isZipRenameOpen, setIsZipRenameOpen] = useState<boolean>(false);
  const [fileToRenameAndDownload, setFileToRenameAndDownload] = useState<ProcessedFile | null>(null);

  // Initialize AdSense only when configured and enabled
  useEffect(() => {
    initializeAdSense();
  }, []);

  // V3 states: Mobile Responsive checks + bottom sheet toggle
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isToolsSheetOpen, setIsToolsSheetOpen] = useState<boolean>(false);
  const [currentPath, setCurrentPath] = useState<string>(() => {
    try {
      return window.location.pathname || '/';
    } catch {
      return '/';
    }
  });

  // Global settings default configuration
  const [globalSettings, setGlobalSettings] = useState<ImageSettings>({
    mode: 'compress',
    targetSizeKB: 100,
    maintainAspectRatio: true,
    quality: 0.8,
    format: 'jpeg',
  });

  // Helper for client-side navigation without full-page reloads
  const navigateTo = (path: string, options?: { tab?: string; mode?: string }) => {
    try {
      if (typeof window !== 'undefined') {
        window.history.pushState({}, '', path);
        setCurrentPath(path);
      }
    } catch (e) {
      console.warn('Unable to push history state:', e);
    }
    if (options?.tab) {
      setActiveTab(options.tab as any);
    }
    if (options?.mode) {
      setDashboardMode(options.mode as any);
    }
  };

  // Track state changes to handle body/html class assignments
  useEffect(() => {
    const root = window.document.documentElement;
    const body = window.document.body;
    if (isDarkMode) {
      root.classList.add('dark');
      body.classList.add('dark');
      safeLocalStorage.setItem('quickresize-dark', 'true');
    } else {
      root.classList.remove('dark');
      body.classList.remove('dark');
      safeLocalStorage.setItem('quickresize-dark', 'false');
    }
  }, [isDarkMode]);

  // Mobile viewport reactive assessment size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Web routing & search parameters listeners
  useEffect(() => {
    const handleLocationChange = () => {
      try {
        const path = window.location.pathname || '/';
        setCurrentPath(path);

        const seoConfig = getSeoPageConfig(path);
        if (seoConfig) {
          setActiveTab('dashboard');
          setDashboardMode(seoConfig.toolType as any);
          if (seoConfig.toolConfig?.initialTargetKB) {
            setGlobalSettings((prev) => ({ ...prev, targetSizeKB: seoConfig.toolConfig!.initialTargetKB }));
          }
        } else if (path === '/blog' || path.startsWith('/blog/')) {
          setActiveTab('blog');
        } else if (['/legal-contact', '/legal', '/privacy', '/terms', '/contact', '/disclaimer'].includes(path)) {
          setActiveTab('legal-contact');
        } else if (path === '/passport-photo-maker') {
          setActiveTab('dashboard');
          setDashboardMode('passport-maker');
        } else if (path === '/ssc-photo-resizer') {
          setActiveTab('dashboard');
          setDashboardMode('gov-form');
        } else if (path === '/signature-resizer') {
          setActiveTab('dashboard');
          setDashboardMode('signature-toolkit');
        } else if (path === '/id-card-combiner' || path === '/aadhaar-card-combiner' || path === '/document-combiner') {
          setActiveTab('dashboard');
          setDashboardMode('id-card-combiner');
        } else if (path === '/youtube-thumbnail-resizer') {
          setActiveTab('dashboard');
          setDashboardMode('thumbnail-preview');
        } else if (['/png-to-jpg', '/jpg-to-png', '/jpg-to-webp', '/webp-to-jpg'].includes(path)) {
          setActiveTab('dashboard');
          setDashboardMode('format-converter');
        } else if (path === '/tools') {
          setActiveTab('dashboard');
          setDashboardMode('catalog');
        } else if (path === '/' || path === '' || path === '/index.html') {
          setActiveTab('home');
        } else {
          // Unknown route: useful 404 page
          setActiveTab('not-found');
        }
      } catch (e) {
        console.warn('Sandbox or cross-origin blocked location path access:', e);
      }
    };

    handleLocationChange();
    try {
      window.addEventListener('popstate', handleLocationChange);
      return () => window.removeEventListener('popstate', handleLocationChange);
    } catch (e) {
      console.warn('Failed to register popstate listener:', e);
    }
  }, []);

  const currentSeoConfig = getSeoPageConfig(currentPath);

  // Sync title and canonical for non-SEO-page tabs
  useEffect(() => {
    if (!currentSeoConfig) {
      if (activeTab === 'home') {
        updateSeoMetadata({
          title: 'QuickResize — Free In-Browser Image Compressor & Resizer',
          description: 'Compress, resize, crop, and convert images directly in your browser. Target exact file sizes like 20KB, 50KB, 100KB without uploading files to remote servers.',
          path: '/',
        });
      } else if (activeTab === 'dashboard' && dashboardMode === 'catalog') {
        updateSeoMetadata({
          title: 'Image Tools Catalog | QuickResize',
          description: 'Explore all QuickResize tools: Target File Size Compressor, WebP/JPG Converter, Passport Photo Maker, Signature Resizer, and Batch Studio.',
          path: '/tools',
        });
      } else if (activeTab === 'legal-contact') {
        updateSeoMetadata({
          title: 'Privacy Policy & Terms | QuickResize',
          description: 'Learn about QuickResize local processing privacy architecture, terms of service, and contact information.',
          path: '/privacy',
        });
      }
    }
  }, [currentSeoConfig, activeTab, dashboardMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  // Handle files selected via upload zones
  const handleFilesSelected = async (newRawFiles: File[]) => {
    const processedList: ProcessedFile[] = [];

    for (const rawFile of newRawFiles) {
      const generatedId = Math.random().toString(36).substring(2, 11);
      const originalUrl = URL.createObjectURL(rawFile);
      const dims = await getImageDimensions(rawFile);

      const itemSettings: ImageSettings = {
        ...globalSettings,
        // Preset height and widths based on initial dimensions
        width: globalSettings.width || dims.width || 800,
        height: globalSettings.height || dims.height || 600,
      };

      processedList.push({
        id: generatedId,
        file: rawFile,
        name: rawFile.name,
        originalSize: rawFile.size,
        originalWidth: dims.width,
        originalHeight: dims.height,
        originalFormat: dims.format,
        originalUrl,
        status: 'idle',
        settings: itemSettings,
      });
    }

    setFiles((prev) => [...prev, ...processedList]);
    setDashboardMode('batch');
    setActiveTab('dashboard'); // Transition immediately to workspace
  };

  // Switch CTA actions on Landpage
  const handleCtaClick = (defaultMode: 'compress' | 'resize') => {
    setGlobalSettings((prev) => ({
      ...prev,
      mode: defaultMode,
    }));
    if (defaultMode === 'compress') {
      setDashboardMode('smart-compressor');
    } else {
      setDashboardMode('batch');
    }
    setActiveTab('dashboard');
  };

  // Remove individual task file and clean up allocated URL objects
  const handleRemoveFile = (id: string) => {
    const matching = files.find((f) => f.id === id);
    if (matching) {
      URL.revokeObjectURL(matching.originalUrl);
      if (matching.outputUrl) {
        URL.revokeObjectURL(matching.outputUrl);
      }
    }
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // Clear all list queue contents safely
  const handleClearAll = () => {
    files.forEach((f) => {
      URL.revokeObjectURL(f.originalUrl);
      if (f.outputUrl) {
        URL.revokeObjectURL(f.outputUrl);
      }
    });
    setFiles([]);
  };

  // Trigger individual overrides settings
  const handleUpdateSettings = (id: string, newSettings: ImageSettings) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, settings: newSettings } : f))
    );
  };

  // Sync settings of all files with global configurations panel
  const handleSyncGlobalSettings = (newGlobalSettings: ImageSettings) => {
    setGlobalSettings(newGlobalSettings);
    // Apply key settings to current files in queue
    setFiles((prev) =>
      prev.map((f) => {
        // If they chose standard templates, apply width/height override
        const updatedSettings: ImageSettings = {
          ...newGlobalSettings,
          width: newGlobalSettings.width || f.originalWidth,
          height: newGlobalSettings.height || f.originalHeight,
        };
        return {
          ...f,
          settings: updatedSettings,
        };
      })
    );
  };

  // Execute processing on a single specific image
  const handleProcessIndividual = async (id: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: 'processing' } : f))
    );

    const f = files.find((item) => item.id === id);
    if (!f) return;

    try {
      // If previous output exists, discard URL to prevent memory leaks
      if (f.outputUrl) {
        URL.revokeObjectURL(f.outputUrl);
      }

      const output = await processImage(f.file, f.settings, f.originalUrl);
      
      const reduction = f.originalSize > 0 
        ? ((f.originalSize - output.size) / f.originalSize) * 100 
        : 0;

      setFiles((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status: 'done',
                outputSize: output.size,
                outputWidth: output.width,
                outputHeight: output.height,
                outputFormat: output.format,
                outputUrl: output.url,
                outputBlob: output.blob,
                reductionPercentage: reduction > 0 ? reduction : 0,
              }
            : item
        )
      );
    } catch (err: any) {
      console.error('Error optimizing image', err);
      setFiles((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, status: 'error', errorMessage: err.message || 'Processing failed' }
            : item
        )
      );
    }
  };

  // Bulk process all queued items
  const handleProcessAll = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);

    for (const f of files) {
      await handleProcessIndividual(f.id);
    }

    setIsProcessing(false);
  };

  // Package all processed items into zip on the fly and trigger download with customizable name
  const handleDownloadZip = async () => {
    const doneFiles = files.filter((f) => f.status === 'done' && f.outputBlob);
    if (doneFiles.length === 0) return;
    setIsZipRenameOpen(true);
  };

  const handleDownloadZipConfirm = async (finalZipName: string) => {
    const doneFiles = files.filter((f) => f.status === 'done' && f.outputBlob);
    if (doneFiles.length === 0) return;

    const zip = new JSZip();
    
    doneFiles.forEach((f) => {
      // Determine new file extension based on settings format
      const targetExtension = f.settings.format;
      
      // Remove original extension and append new formats
      const rawBaseName = f.name.substring(0, f.name.lastIndexOf('.')) || f.name;
      const finalFileName = `${rawBaseName}_optimized.${targetExtension}`;
      
      if (f.outputBlob) {
        zip.file(finalFileName, f.outputBlob);
      }
    });

    try {
      const content = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = URL.createObjectURL(content);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = finalZipName.endsWith('.zip') ? finalZipName : `${finalZipName}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
      setIsZipRenameOpen(false);
    } catch (err) {
      console.error('Failed generating zip folder structure', err);
    }
  };

  // Support renaming files inline
  const handleRenameFile = (id: string, newName: string) => {
    setFiles((prev) =>
      prev.map((item) => (item.id === id ? { ...item, name: newName } : item))
    );
  };

  const hasCompletedFiles = files.some((f) => f.status === 'done');
  const completedCount = files.filter((f) => f.status === 'done').length;

  return (
    <div className={`min-h-screen transition-colors duration-250 ${isDarkMode ? 'dark bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Sticky Top Navbar */}
      <Navbar
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Conditionally Render Content based on actively viewed tab */}
      <main className="pb-16">
        {activeTab === 'home' && (
          <Hero onCtaClick={handleCtaClick} />
        )}

        {/* Blog System Section */}
        {activeTab === 'blog' && (
          <ErrorBoundary fallbackTitle="Optimization Blog">
            <BlogSystem />
          </ErrorBoundary>
        )}

        {/* Legal Pages & Contact Section */}
        {activeTab === 'legal-contact' && (
          <ErrorBoundary fallbackTitle="Legal & Contact Documentation">
            <LegalContact 
              initialTab={
                currentPath === '/terms' ? 'terms' :
                currentPath === '/disclaimer' ? 'disclaimer' :
                currentPath === '/contact' ? 'contact' : 'privacy'
              } 
            />
          </ErrorBoundary>
        )}

        {/* 404 Useful Page */}
        {activeTab === 'not-found' && (
          <ErrorBoundary fallbackTitle="Page Not Found">
            <NotFoundPage 
              onNavigateHome={() => navigateTo('/', { tab: 'home', mode: 'catalog' })}
              onNavigateTool={(path, mode) => navigateTo(path, { tab: 'dashboard', mode })}
            />
          </ErrorBoundary>
        )}

        {/* Dashboard Workspace */}
        {activeTab === 'dashboard' && (
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 relative">
            
            {/* Unified Studio Tool Headers Mode Selector */}
            {(dashboardMode === 'catalog' || dashboardMode === 'batch') && (
              <div className="mb-10 flex justify-center">
                <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80">
                  <button
                    onClick={() => setDashboardMode('catalog')}
                    className={`flex items-center gap-1.5 rounded-lg px-4.5 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                      dashboardMode === 'catalog'
                        ? 'bg-white text-slate-950 shadow-sm dark:bg-slate-800 dark:text-white'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    <Layers className="h-4 w-4 text-indigo-550 dark:text-indigo-400" />
                    <span>All Power Utilities</span>
                  </button>
                  <button
                    onClick={() => setDashboardMode('batch')}
                    className={`flex items-center gap-1.5 rounded-lg px-4.5 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                      dashboardMode === 'batch'
                        ? 'bg-white text-slate-950 shadow-sm dark:bg-slate-800 dark:text-white'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    <Plus className="h-4 w-4 text-teal-500" />
                    <span>Classic Batch Studio</span>
                  </button>
                </div>
              </div>
            )}

            {/* Back to All Tools catalog banner for specialized individual tools */}
            {dashboardMode !== 'catalog' && dashboardMode !== 'batch' && (
              <div className="mb-8 flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-850">
                <button
                  onClick={() => setDashboardMode('catalog')}
                  className="inline-flex items-center gap-2 text-xs font-bold text-indigo-650 dark:text-indigo-400 hover:opacity-85 transition-opacity cursor-pointer"
                >
                  <ArrowLeft className="h-4.5 w-4.5" />
                  <span>Back to All Tools catalog</span>
                </button>
                <span className="font-mono text-[10px] font-bold text-slate-400 bg-slate-50 dark:bg-slate-900/60 p-2 py-1 rounded">
                  Active workspace / {dashboardMode.replace('-', ' ')}
                </span>
              </div>
            )}

            {/* Catalog Bento Mode rendering */}
            {dashboardMode === 'catalog' && (
              <div className="space-y-8 animate-fade-in">
                <div className="text-center max-w-xl mx-auto space-y-2">
                  <h2 className="font-sans text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
                    QuickResize Premium Suite
                  </h2>
                  <p className="text-xs text-slate-450 dark:text-slate-405 leading-relaxed">
                    Select highly optimized browser-side engines to process images instantly and securely.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Card 1: Batch standard studio */}
                  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-all dark:border-slate-900 dark:bg-slate-900/40 flex flex-col justify-between group">
                    <div className="space-y-4">
                      <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-gradient-to-tr from-sky-400 to-teal-500 shadow-sm text-white">
                        <Layers className="h-5 w-5" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Batch Processing Studio</h4>
                          <span className="rounded bg-teal-50 px-1.5 py-0.5 text-[9px] font-bold text-teal-700 dark:bg-teal-950/40 dark:text-teal-400">Multi-Worker</span>
                        </div>
                        <p className="text-xs text-slate-450 dark:text-slate-400 leading-relaxed">
                          Process 100+ images concurrently. Bulk compress to exact KB, resize, transform, and export as flat ZIP.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setDashboardMode('batch')}
                      className="mt-5 w-full rounded-xl bg-slate-50 hover:bg-slate-100 py-2.5 text-xs font-bold text-slate-800 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-750 transition-colors cursor-pointer text-center"
                    >
                      Open Studio
                    </button>
                  </div>

                  {/* Card 2: Target File Size Compressor */}
                  <div className="rounded-2xl border border-indigo-100/80 bg-white p-5 shadow-sm hover:shadow-md transition-all dark:border-slate-900 dark:bg-slate-900/40 flex flex-col justify-between group">
                    <div className="space-y-4">
                      <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-600 shadow-sm text-white">
                        <Scale className="h-5 w-5" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Target File Size Compressor</h4>
                          <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400">Target KB Engine</span>
                        </div>
                        <p className="text-xs text-slate-450 dark:text-slate-400 leading-relaxed">
                          Compress images strictly under 20KB, 50KB, 100KB, 200KB or any custom target with smart quality search and presets.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setDashboardMode('smart-compressor')}
                      className="mt-5 w-full rounded-xl bg-indigo-50 hover:bg-indigo-100 py-2.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 transition-colors cursor-pointer text-center"
                    >
                      Open Compressor
                    </button>
                  </div>

                  {/* Card 3: Enhanced pixel resizer */}
                  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-all dark:border-slate-900 dark:bg-slate-900/40 flex flex-col justify-between group">
                    <div className="space-y-4">
                      <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-400 to-teal-500 shadow-sm text-white">
                        <Maximize2 className="h-5 w-5" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Enhanced Pixel Resizer</h4>
                          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">Pixel Perfect</span>
                        </div>
                        <p className="text-xs text-slate-450 dark:text-slate-400 leading-relaxed">
                          Precision alignments with aspect ratio lock constraints, custom DPI targets, and percentage resizing.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setDashboardMode('enhanced-resizer')}
                      className="mt-5 w-full rounded-xl bg-slate-50 hover:bg-slate-100 py-2.5 text-xs font-bold text-slate-800 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-750 transition-colors cursor-pointer text-center"
                    >
                      Launch Resizer
                    </button>
                  </div>

                  {/* Card 4: Format conversion */}
                  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-all dark:border-slate-900 dark:bg-slate-900/40 flex flex-col justify-between group">
                    <div className="space-y-4">
                      <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-gradient-to-tr from-violet-400 to-indigo-500 shadow-sm text-white">
                        <FileCheck className="h-5 w-5" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Universal Format Converter</h4>
                          <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[9px] font-bold text-violet-750 dark:bg-violet-950/40 dark:text-violet-400">JPG &bull; PNG &bull; WEBP &bull; AVIF</span>
                        </div>
                        <p className="text-xs text-slate-450 dark:text-slate-400 leading-relaxed">
                          Bulk transcoder to exchange JPG, PNG, WebP, and AVIF assets locally with transparency handling &amp; ZIP export.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setDashboardMode('format-converter')}
                      className="mt-5 w-full rounded-xl bg-slate-50 hover:bg-slate-100 py-2.5 text-xs font-bold text-slate-800 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-750 transition-colors cursor-pointer text-center"
                    >
                      Open Converter
                    </button>
                  </div>

                  {/* Card 5: Passport photo maker */}
                  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-all dark:border-slate-900 dark:bg-slate-900/40 flex flex-col justify-between group">
                    <div className="space-y-4">
                      <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-gradient-to-tr from-pink-400 to-rose-500 shadow-sm text-white">
                        <User className="h-5 w-5" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Passport Photo Maker</h4>
                          <span className="rounded bg-pink-50 px-1.5 py-0.5 text-[9px] font-bold text-pink-700 dark:bg-pink-950/40 dark:text-pink-400">Biometric</span>
                        </div>
                        <p className="text-xs text-slate-450 dark:text-slate-400 leading-relaxed">
                          Concentric alignment grids, scaling offsets, and white background fills to comply with state biometric models.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setDashboardMode('passport-maker')}
                      className="mt-5 w-full rounded-xl bg-slate-50 hover:bg-slate-100 py-2.5 text-xs font-bold text-slate-800 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-750 transition-colors cursor-pointer text-center"
                    >
                      Launch Maker
                    </button>
                  </div>

                  {/* Card 5.5: ID Card & Document Combiner */}
                  <div className="rounded-2xl border border-indigo-100/80 bg-white p-5 shadow-sm hover:shadow-md transition-all dark:border-slate-800 dark:bg-slate-900/40 flex flex-col justify-between group relative overflow-hidden">
                    <div className="space-y-4">
                      <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-sky-500 shadow-sm text-white">
                        <span className="text-lg">🪪</span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">ID Card Combiner</h4>
                          <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400">Aadhaar &bull; DL</span>
                        </div>
                        <p className="text-xs text-slate-450 dark:text-slate-400 leading-relaxed">
                          Combine front and back photos of Aadhaar cards, driving licences, and voter IDs into a single image or PDF.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setDashboardMode('id-card-combiner')}
                      className="mt-5 w-full rounded-xl bg-indigo-50 hover:bg-indigo-100 py-2.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900/50 transition-colors cursor-pointer text-center"
                    >
                      Open Tool
                    </button>
                  </div>

                  {/* Card 6: Social resizer */}
                  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-all dark:border-slate-900 dark:bg-slate-900/40 flex flex-col justify-between group">
                    <div className="space-y-4">
                      <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-400 to-purple-500 shadow-sm text-white">
                        <Share2 className="h-5 w-5" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Social Media Resizer</h4>
                          <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400">Creator</span>
                        </div>
                        <p className="text-xs text-slate-450 dark:text-slate-400 leading-relaxed">
                          Compile banners, stories, thumbnails, or avatars for YouTube/Instagram/Facebook simultaneously.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setDashboardMode('social-resizer')}
                      className="mt-5 w-full rounded-xl bg-slate-50 hover:bg-slate-100 py-2.5 text-xs font-bold text-slate-800 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-750 transition-colors cursor-pointer text-center"
                    >
                      Open Social Resizer
                    </button>
                  </div>

                  {/* Card 7: Gov Portal Tool */}
                  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-all dark:border-slate-900 dark:bg-slate-900/40 flex flex-col justify-between group">
                    <div className="space-y-4">
                      <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-400 to-sky-505 shadow-sm text-white">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Government Form Optimizer</h4>
                          <span className="rounded bg-cyan-50 px-1.5 py-0.5 text-[9px] font-bold text-cyan-705 dark:bg-cyan-950/40 dark:text-cyan-400">Portal Ready</span>
                        </div>
                        <p className="text-xs text-slate-450 dark:text-slate-400 leading-relaxed">
                          Enforce exact byte metrics, pixel alignments, and Blue/Black signature ink guidelines for SSC, UPSC, and State Exams.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setDashboardMode('gov-form')}
                      className="mt-5 w-full rounded-xl bg-slate-50 hover:bg-slate-100 py-2.5 text-xs font-bold text-slate-800 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-750 transition-colors cursor-pointer text-center"
                    >
                      Launch Optimizer
                    </button>
                  </div>

                  {/* Card 8: App Icon generator */}
                  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-all dark:border-slate-900 dark:bg-slate-900/40 flex flex-col justify-between group">
                    <div className="space-y-4">
                      <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-gradient-to-tr from-fuchsia-400 to-pink-505 shadow-sm text-white">
                        <Smartphone className="h-5 w-5" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Mobile & App Icon Generator</h4>
                          <span className="rounded bg-fuchsia-50 px-1.5 py-0.5 text-[9px] font-bold text-fuchsia-700 dark:bg-fuchsia-950/40 dark:text-fuchsia-400">Dev Tool</span>
                        </div>
                        <p className="text-xs text-slate-450 dark:text-slate-400 leading-relaxed">
                          Deploy single square design assets into a structured ZIP folders mapping Android mipmaps, Apple iOS, standard favicons, and PWAs.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setDashboardMode('app-icon')}
                      className="mt-5 w-full rounded-xl bg-slate-50 hover:bg-slate-100 py-2.5 text-xs font-bold text-slate-800 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-750 transition-colors cursor-pointer text-center"
                    >
                      Generate Icons
                    </button>
                  </div>

                  {/* Card 9: Metadata EXIF Stripper */}
                  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-all dark:border-slate-900 dark:bg-slate-900/40 flex flex-col justify-between group">
                    <div className="space-y-4">
                      <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-emerald-600 shadow-sm text-white">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Metadata EXIF Stripper</h4>
                          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">Shield</span>
                        </div>
                        <p className="text-xs text-slate-450 dark:text-slate-400 leading-relaxed">
                          Strip device serials, camera lenses, and fine GPS geolocation tags locally from files before uploads.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setDashboardMode('metadata-remover')}
                      className="mt-5 w-full rounded-xl bg-slate-50 hover:bg-slate-100 py-2.5 text-xs font-bold text-slate-800 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-750 transition-colors cursor-pointer text-center"
                    >
                      Open Shield
                    </button>
                  </div>

                  {/* Card 10: Signature Toolkit */}
                  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-all dark:border-slate-900 dark:bg-slate-900/40 flex flex-col justify-between group">
                    <div className="space-y-4">
                      <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-700 shadow-sm text-white">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Portal Signature Optimizer</h4>
                          <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400">Forms</span>
                        </div>
                        <p className="text-xs text-slate-450 dark:text-slate-400 leading-relaxed">
                          Auto crop paper boundaries, clear background shadows to transparency, and conform to ink guidelines.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setDashboardMode('signature-toolkit')}
                      className="mt-5 w-full rounded-xl bg-slate-50 hover:bg-slate-100 py-2.5 text-xs font-bold text-slate-800 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-750 transition-colors cursor-pointer text-center"
                    >
                      Open Signature Tool
                    </button>
                  </div>

                  {/* Card 11: High Density QR Builder */}
                  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-all dark:border-slate-900 dark:bg-slate-900/40 flex flex-col justify-between group">
                    <div className="space-y-4">
                      <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-gradient-to-tr from-slate-755 to-slate-900 shadow-sm text-white">
                        <Maximize2 className="h-5 w-5" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">High Density QR Builder</h4>
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">Utility</span>
                        </div>
                        <p className="text-xs text-slate-450 dark:text-slate-400 leading-relaxed">
                          Build fast barcodes: URLs, custom texts, compliant UPI Pay triggers, WiFi logins, and WhatsApps.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setDashboardMode('qr-generator')}
                      className="mt-5 w-full rounded-xl bg-slate-50 hover:bg-slate-100 py-2.5 text-xs font-bold text-slate-800 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-750 transition-colors cursor-pointer text-center"
                    >
                      Generate QR
                    </button>
                  </div>

                  {/* Card 12: YouTube Video Cover Previewer */}
                  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-all dark:border-slate-900 dark:bg-slate-900/40 flex flex-col justify-between group">
                    <div className="space-y-4">
                      <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-gradient-to-tr from-rose-500 to-red-650 shadow-sm text-white">
                        <Smartphone className="h-5 w-5" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Creator Cover Previewer</h4>
                          <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[9px] font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">Creator</span>
                        </div>
                        <p className="text-xs text-slate-450 dark:text-slate-400 leading-relaxed">
                          Test custom covers on YouTube feeds and grids to detect covered text overlays or bad dimension scaling.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setDashboardMode('thumbnail-preview')}
                      className="mt-5 w-full rounded-xl bg-slate-50 hover:bg-slate-100 py-2.5 text-xs font-bold text-slate-800 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-750 transition-colors cursor-pointer text-center"
                    >
                      Open Previewer
                    </button>
                  </div>

                  {/* Card 13: Document & Form Optimizer */}
                  <div className="rounded-2xl border border-blue-100/80 bg-white p-5 shadow-sm hover:shadow-md transition-all dark:border-slate-800 dark:bg-slate-900/40 flex flex-col justify-between group">
                    <div className="space-y-4">
                      <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 shadow-sm text-white">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Document Optimizer</h4>
                          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">Paper Scan</span>
                        </div>
                        <p className="text-xs text-slate-450 dark:text-slate-400 leading-relaxed">
                          Clean shadows, enhance contrast, convert to high-clarity grayscale or pure B&amp;W, and compress for form uploads.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setDashboardMode('document-optimizer')}
                      className="mt-5 w-full rounded-xl bg-blue-50 hover:bg-blue-100 py-2.5 text-xs font-bold text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 transition-colors cursor-pointer text-center"
                    >
                      Optimize Document
                    </button>
                  </div>

                  {/* Card 14: Profile Picture & Avatar Maker */}
                  <div className="rounded-2xl border border-purple-100/80 bg-white p-5 shadow-sm hover:shadow-md transition-all dark:border-slate-800 dark:bg-slate-900/40 flex flex-col justify-between group">
                    <div className="space-y-4">
                      <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-gradient-to-tr from-purple-500 to-pink-500 shadow-sm text-white">
                        <User className="h-5 w-5" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Profile Picture Maker</h4>
                          <span className="rounded bg-purple-50 px-1.5 py-0.5 text-[9px] font-bold text-purple-700 dark:bg-purple-950/40 dark:text-purple-400">Avatar</span>
                        </div>
                        <p className="text-xs text-slate-450 dark:text-slate-400 leading-relaxed">
                          Crop square or circular avatars with zoom/pan, custom borders, and instant export for Discord, Instagram, and LinkedIn.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setDashboardMode('profile-maker')}
                      className="mt-5 w-full rounded-xl bg-purple-50 hover:bg-purple-100 py-2.5 text-xs font-bold text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 transition-colors cursor-pointer text-center"
                    >
                      Make Profile Photo
                    </button>
                  </div>

                  {/* Card 15: Multi-Copy Photo Sheet Maker */}
                  <div className="rounded-2xl border border-amber-100/80 bg-white p-5 shadow-sm hover:shadow-md transition-all dark:border-slate-800 dark:bg-slate-900/40 flex flex-col justify-between group">
                    <div className="space-y-4">
                      <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 shadow-sm text-white">
                        <Layers className="h-5 w-5" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Photo Sheet Maker</h4>
                          <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">Print Sheet</span>
                        </div>
                        <p className="text-xs text-slate-450 dark:text-slate-400 leading-relaxed">
                          Repeat passport or portrait photos across A4 or 4x6&quot; photo paper with custom cut line guides at 300 DPI.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setDashboardMode('photo-sheet')}
                      className="mt-5 w-full rounded-xl bg-amber-50 hover:bg-amber-100 py-2.5 text-xs font-bold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 transition-colors cursor-pointer text-center"
                    >
                      Create Print Sheet
                    </button>
                  </div>

                  {/* Card 16: Custom Canvas Tool */}
                  <div className="rounded-2xl border border-teal-100/80 bg-white p-5 shadow-sm hover:shadow-md transition-all dark:border-slate-800 dark:bg-slate-900/40 flex flex-col justify-between group">
                    <div className="space-y-4">
                      <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-600 shadow-sm text-white">
                        <Maximize2 className="h-5 w-5" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Custom Canvas &amp; Background</h4>
                          <span className="rounded bg-teal-50 px-1.5 py-0.5 text-[9px] font-bold text-teal-700 dark:bg-teal-950/40 dark:text-teal-400">Framing</span>
                        </div>
                        <p className="text-xs text-slate-450 dark:text-slate-400 leading-relaxed">
                          Place any photo onto custom canvas dimensions (px, mm, cm, in) with solid white, black, custom color, or alpha margins.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setDashboardMode('custom-canvas')}
                      className="mt-5 w-full rounded-xl bg-teal-50 hover:bg-teal-100 py-2.5 text-xs font-bold text-teal-800 dark:bg-teal-950/50 dark:text-teal-300 transition-colors cursor-pointer text-center"
                    >
                      Open Canvas Tool
                    </button>
                  </div>

                  {/* Card 17: Smart Presets Catalog */}
                  <div className="rounded-2xl border border-indigo-100/80 bg-white p-5 shadow-sm hover:shadow-md transition-all dark:border-slate-800 dark:bg-slate-900/40 flex flex-col justify-between group">
                    <div className="space-y-4">
                      <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 shadow-sm text-white">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Dimension Presets Catalog</h4>
                          <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400">Database</span>
                        </div>
                        <p className="text-xs text-slate-450 dark:text-slate-400 leading-relaxed">
                          Browse dozens of standard sizes for Documents, Social Networks, Avatars, Print Sheets, and App Icons.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setDashboardMode('smart-presets')}
                      className="mt-5 w-full rounded-xl bg-indigo-50 hover:bg-indigo-100 py-2.5 text-xs font-bold text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300 transition-colors cursor-pointer text-center"
                    >
                      Browse Presets
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Specialized Modules render targets */}
            {dashboardMode === 'smart-compressor' && (
              <SmartCompressor 
                initialTargetKB={currentSeoConfig?.toolConfig?.initialTargetKB}
                initialFormat={currentSeoConfig?.toolConfig?.initialFormat}
                initialPresetId={currentSeoConfig?.toolConfig?.initialPresetId}
                initialQualityMode={currentSeoConfig?.toolConfig?.initialQualityMode}
              />
            )}
            {dashboardMode === 'enhanced-resizer' && <EnhancedResizer />}
            {dashboardMode === 'format-converter' && (
              <FormatConverter 
                initialTargetFormat={currentSeoConfig?.toolConfig?.initialTargetFormat}
              />
            )}
            {dashboardMode === 'passport-maker' && (
              <PassportMaker 
                onOpenPhotoSheet={(_photoBlob, photoUrl, preset) => {
                  setSheetHandoffPhoto({ url: photoUrl, preset });
                  setDashboardMode('photo-sheet');
                }} 
              />
            )}
            {dashboardMode === 'id-card-combiner' && <IdCardCombiner />}
            {dashboardMode === 'social-resizer' && <SocialResizer />}
            {dashboardMode === 'gov-form' && <GovFormTool />}
            {dashboardMode === 'app-icon' && <AppIconGenerator />}
            {dashboardMode === 'metadata-remover' && <MetadataRemover />}
            {dashboardMode === 'signature-toolkit' && <SignatureToolkit />}
            {dashboardMode === 'qr-generator' && <QrGenerator />}
            {dashboardMode === 'thumbnail-preview' && <ThumbnailPreview />}
            {dashboardMode === 'document-optimizer' && <DocumentOptimizer />}
            {dashboardMode === 'profile-maker' && <ProfilePictureMaker />}
            {dashboardMode === 'custom-canvas' && <CustomCanvasTool />}
            {dashboardMode === 'photo-sheet' && (
              <PhotoSheetMaker 
                initialPhotoUrl={sheetHandoffPhoto?.url} 
                initialPreset={sheetHandoffPhoto?.preset} 
              />
            )}
            {dashboardMode === 'smart-presets' && (
              <SmartPresetsCatalog 
                onNavigateToTool={(toolId) => {
                  if (toolId === 'passport') setDashboardMode('passport-maker');
                  else if (toolId === 'signature') setDashboardMode('signature-toolkit');
                  else if (toolId === 'document') setDashboardMode('document-optimizer');
                  else if (toolId === 'social') setDashboardMode('social-resizer');
                  else if (toolId === 'profile') setDashboardMode('profile-maker');
                  else if (toolId === 'photo-sheet') setDashboardMode('photo-sheet');
                  else if (toolId === 'custom-canvas') setDashboardMode('custom-canvas');
                  else setDashboardMode('enhanced-resizer');
                }}
              />
            )}

            {/* Scenario 2: Active files in Classic Batch Workspace queue or Batch Studio */}
            {dashboardMode === 'batch' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setDashboardMode('catalog')}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:opacity-85 cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back to All Tools catalog
                  </button>
                </div>
                <BatchStudio />
              </div>
            )}

          </div>
        )}

        {Boolean(currentSeoConfig) && (
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-6">
            <SeoPages pathname={currentPath} onNavigateToTab={(tab, mode) => {
              setActiveTab(tab as any);
              if (mode) setDashboardMode(mode as any);
            }} />
          </div>
        )}
        {/* Non-intrusive Homepage Monetization Area */}
        {activeTab === 'home' && (
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <AdSlot slot={ADSENSE_CONFIG.slots.homepage} format="auto" className="my-8" />
          </div>
        )}
      </main>

      {/* Production-grade accessible footer */}
      <footer className="border-t border-slate-100 bg-white py-10 text-center text-slate-400 dark:border-slate-900 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 flex flex-col items-center gap-5">
          
          {/* Trust Reassurance Badge */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <ShieldCheck className="h-4 w-4" />
            <span>Local In-Browser Execution &bull; Privacy Standard</span>
          </div>

          <p className="text-[11px] leading-relaxed max-w-lg text-slate-500 dark:text-slate-400">
            QuickResize processes selected images locally in your browser for supported tools and does not upload the image file to QuickResize's own servers.
          </p>

          {/* Direct Popular Tools Navigation */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400 max-w-3xl">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Popular Tools:</span>
            <button
              onClick={() => navigateTo('/compress-image-to-20kb', { tab: 'dashboard', mode: 'smart-compressor' })}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
            >
              Compress to 20KB
            </button>
            <span>&bull;</span>
            <button
              onClick={() => navigateTo('/compress-image-to-50kb', { tab: 'dashboard', mode: 'smart-compressor' })}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
            >
              Compress to 50KB
            </button>
            <span>&bull;</span>
            <button
              onClick={() => navigateTo('/compress-image-to-100kb', { tab: 'dashboard', mode: 'smart-compressor' })}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
            >
              Compress to 100KB
            </button>
            <span>&bull;</span>
            <button
              onClick={() => navigateTo('/passport-photo-maker', { tab: 'dashboard', mode: 'passport-maker' })}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
            >
              Passport Photo Maker
            </button>
            <span>&bull;</span>
            <button
              onClick={() => navigateTo('/signature-resizer', { tab: 'dashboard', mode: 'signature-toolkit' })}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
            >
              Signature Resizer
            </button>
            <span>&bull;</span>
            <button
              onClick={() => navigateTo('/jpg-to-webp', { tab: 'dashboard', mode: 'format-converter' })}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
            >
              WebP Converter
            </button>
          </div>

          {/* Legal and Support Links */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-900 w-full max-w-xl">
            <button 
              onClick={() => navigateTo('/privacy', { tab: 'legal-contact' })}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <span>&bull;</span>
            <button 
              onClick={() => navigateTo('/terms', { tab: 'legal-contact' })}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
            >
              Terms of Service
            </button>
            <span>&bull;</span>
            <button 
              onClick={() => navigateTo('/disclaimer', { tab: 'legal-contact' })}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
            >
              Disclaimer
            </button>
            <span>&bull;</span>
            <button 
              onClick={() => navigateTo('/contact', { tab: 'legal-contact' })}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
            >
              Contact Support
            </button>
            <span>&bull;</span>
            <button 
              onClick={() => navigateTo('/blog', { tab: 'blog' })}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
            >
              Optimization Blog
            </button>
          </div>

          {/* Brand & Attribution */}
          <div className="pt-2 text-[11px] text-slate-400 dark:text-slate-600">
            <span>QuickResize by <span className="font-semibold text-slate-600 dark:text-slate-400">BanavaLabs</span></span>
            <span className="mx-2">&bull;</span>
            <span>All image optimization executes client-side</span>
          </div>

        </div>
      </footer>

      {/* Zip Rename Dialog */}
      <RenameModal
        isOpen={isZipRenameOpen}
        originalName={`QuickResize_Batch_${Date.now()}.zip`}
        onClose={() => setIsZipRenameOpen(false)}
        onConfirm={handleDownloadZipConfirm}
      />

      {/* Single Image Rename Dialog */}
      {fileToRenameAndDownload && (
        <RenameModal
          isOpen={true}
          originalName={fileToRenameAndDownload.name}
          onClose={() => setFileToRenameAndDownload(null)}
          onConfirm={(confirmedName) => {
            handleRenameFile(fileToRenameAndDownload.id, confirmedName);
            
            const link = document.createElement('a');
            link.href = fileToRenameAndDownload.outputUrl || '';
            link.download = confirmedName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            setFileToRenameAndDownload(null);
          }}
        />
      )}

      {/* V3 Mobile Bottom Navigation and Animated Tools Bottom Sheet */}
      {isMobile && (
        <>
          {/* Bottom Navigation Fixed Bar */}
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-950/95 border-t border-slate-200 dark:border-slate-800 backdrop-blur-md pb-safe">
            <div className="grid grid-cols-5 h-16 items-center px-1 text-center">
              <button
                onClick={() => {
                  setActiveTab('home');
                  setIsToolsSheetOpen(false);
                }}
                className={`flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
                  activeTab === 'home' 
                    ? 'text-indigo-600 dark:text-indigo-400 font-bold' 
                    : 'text-slate-400 dark:text-slate-500 font-medium'
                }`}
              >
                <Home className="h-5 w-5 mx-auto" />
                <span className="text-[10px] tracking-wide select-none">Home</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('dashboard');
                  setDashboardMode('gov-form');
                  setIsToolsSheetOpen(false);
                }}
                className={`flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
                  activeTab === 'dashboard' && dashboardMode === 'gov-form'
                    ? 'text-indigo-600 dark:text-indigo-400 font-bold' 
                    : 'text-slate-400 dark:text-slate-500 font-medium'
                }`}
              >
                <FileText className="h-5 w-5 mx-auto" />
                <span className="text-[10px] tracking-wide select-none">Gov Forms</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('dashboard');
                  setDashboardMode('enhanced-resizer');
                  setIsToolsSheetOpen(false);
                }}
                className={`flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
                  activeTab === 'dashboard' && dashboardMode === 'enhanced-resizer'
                    ? 'text-indigo-600 dark:text-indigo-400 font-bold' 
                    : 'text-slate-400 dark:text-slate-500 font-medium'
                }`}
              >
                <Maximize2 className="h-5 w-5 mx-auto" />
                <span className="text-[10px] tracking-wide select-none">Resize</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('dashboard');
                  setDashboardMode('format-converter');
                  setIsToolsSheetOpen(false);
                }}
                className={`flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
                  activeTab === 'dashboard' && dashboardMode === 'format-converter'
                    ? 'text-indigo-600 dark:text-indigo-400 font-bold' 
                    : 'text-slate-400 dark:text-slate-500 font-medium'
                }`}
              >
                <FileCheck className="h-5 w-5 mx-auto" />
                <span className="text-[10px] tracking-wide select-none">Convert</span>
              </button>

              <button
                onClick={() => setIsToolsSheetOpen(!isToolsSheetOpen)}
                className={`flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
                  isToolsSheetOpen
                    ? 'text-emerald-600 dark:text-emerald-400 font-bold' 
                    : 'text-slate-400 dark:text-slate-500 font-medium'
                }`}
              >
                <Menu className="h-5 w-5 mx-auto" />
                <span className="text-[10px] tracking-wide select-none">Tools</span>
              </button>
            </div>
          </div>

          {/* Tools Slide-Up Bottom Sheet Overlay backdrop */}
          {isToolsSheetOpen && (
            <div 
              className="fixed inset-0 z-45 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
              onClick={() => setIsToolsSheetOpen(false)}
            />
          )}

          {/* Tools Slide-Up Bottom Sheet */}
          <div 
            className={`fixed left-0 right-0 z-50 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-3xl shadow-2xl transition-all duration-300 pb-safe max-h-[80%] overflow-y-auto ${
              isToolsSheetOpen 
                ? 'bottom-16 translate-y-0 opacity-100' 
                : 'bottom-0 translate-y-full opacity-0 pointer-events-none'
            }`}
          >
            {/* Grab Handle */}
            <div className="flex justify-center py-3">
              <div className="w-12 h-1 bg-slate-300 dark:bg-slate-755 rounded-full" />
            </div>

            <div className="px-5 pb-8 space-y-6 text-left">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="font-sans text-sm font-bold text-slate-900 dark:text-white">Image Toolkit Suite</h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">All tools execute 100% locally on your smartphone browser.</p>
                </div>
                <button 
                  onClick={() => setIsToolsSheetOpen(false)}
                  className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Grid of Tools links for bottom sheet */}
              <div className="grid grid-cols-2 gap-3 pb-4">
                <button
                  onClick={() => {
                    setActiveTab('dashboard');
                    setDashboardMode('catalog');
                    setIsToolsSheetOpen(false);
                  }}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50/50 hover:bg-slate-50 border border-slate-100 dark:bg-slate-950/20 dark:border-slate-800 dark:hover:bg-slate-950/30 text-center space-y-1.5 transition-colors cursor-pointer"
                >
                  <Home className="h-5 w-5 text-indigo-500" />
                  <span className="text-[10px] font-bold text-slate-850 dark:text-slate-305">All Tools Catalog</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('dashboard');
                    setDashboardMode('batch');
                    setIsToolsSheetOpen(false);
                  }}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50/50 hover:bg-slate-50 border border-slate-100 dark:bg-slate-950/20 dark:border-slate-800 dark:hover:bg-slate-950/30 text-center space-y-1.5 transition-colors cursor-pointer"
                >
                  <Layers className="h-5 w-5 text-teal-500" />
                  <span className="text-[10px] font-bold text-slate-850 dark:text-slate-305">Batch Studio</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('dashboard');
                    setDashboardMode('passport-maker');
                    setIsToolsSheetOpen(false);
                  }}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50/50 hover:bg-slate-50 border border-slate-100 dark:bg-slate-950/20 dark:border-slate-800 dark:hover:bg-slate-950/30 text-center space-y-1.5 transition-colors cursor-pointer"
                >
                  <User className="h-5 w-5 text-rose-500" />
                  <span className="text-[10px] font-bold text-slate-855 dark:text-slate-305">Passport Maker</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('dashboard');
                    setDashboardMode('id-card-combiner');
                    setIsToolsSheetOpen(false);
                  }}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/40 dark:hover:bg-indigo-950/30 text-center space-y-1.5 transition-colors cursor-pointer"
                >
                  <span className="text-xl">🪪</span>
                  <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400">ID Card Combiner</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('dashboard');
                    setDashboardMode('gov-form');
                    setIsToolsSheetOpen(false);
                  }}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50/50 hover:bg-slate-50 border border-slate-100 dark:bg-slate-950/20 dark:border-slate-800 dark:hover:bg-slate-950/30 text-center space-y-1.5 transition-colors cursor-pointer"
                >
                  <FileText className="h-5 w-5 text-cyan-500" />
                  <span className="text-[10px] font-bold text-slate-855 dark:text-slate-305">Gov Form Resizer</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('dashboard');
                    setDashboardMode('signature-toolkit');
                    setIsToolsSheetOpen(false);
                  }}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50/50 hover:bg-slate-50 border border-slate-100 dark:bg-slate-950/20 dark:border-slate-800 dark:hover:bg-slate-950/30 text-center space-y-1.5 transition-colors cursor-pointer"
                >
                  <FileCheck className="h-5 w-5 text-indigo-500" />
                  <span className="text-[10px] font-bold text-slate-855 dark:text-slate-305">Signature Toolkit</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('dashboard');
                    setDashboardMode('metadata-remover');
                    setIsToolsSheetOpen(false);
                  }}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50/50 hover:bg-slate-50 border border-slate-100 dark:bg-slate-950/20 dark:border-slate-800 dark:hover:bg-slate-950/30 text-center space-y-1.5 transition-colors cursor-pointer"
                >
                  <ShieldCheck className="h-5 w-5 text-emerald-500" />
                  <span className="text-[10px] font-bold text-slate-855 dark:text-slate-305">Metadata Stripper</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('dashboard');
                    setDashboardMode('qr-generator');
                    setIsToolsSheetOpen(false);
                  }}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50/50 hover:bg-slate-50 border border-slate-100 dark:bg-slate-950/20 dark:border-slate-800 dark:hover:bg-slate-950/30 text-center space-y-1.5 transition-colors cursor-pointer"
                >
                  <Maximize2 className="h-5 w-5 text-indigo-650" />
                  <span className="text-[10px] font-bold text-slate-855 dark:text-slate-305">QR Code Creator</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('dashboard');
                    setDashboardMode('thumbnail-preview');
                    setIsToolsSheetOpen(false);
                  }}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50/50 hover:bg-slate-50 border border-slate-100 dark:bg-slate-950/20 dark:border-slate-800 dark:hover:bg-slate-950/30 text-center space-y-1.5 transition-colors cursor-pointer"
                >
                  <Smartphone className="h-5 w-5 text-rose-555" />
                  <span className="text-[10px] font-bold text-slate-855 dark:text-slate-305">Creator Preview</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('dashboard');
                    setDashboardMode('social-resizer');
                    setIsToolsSheetOpen(false);
                  }}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50/50 hover:bg-slate-50 border border-slate-100 dark:bg-slate-950/20 dark:border-slate-800 dark:hover:bg-slate-950/30 text-center space-y-1.5 transition-colors cursor-pointer"
                >
                  <Share2 className="h-5 w-5 text-sky-500" />
                  <span className="text-[10px] font-bold text-slate-855 dark:text-slate-305">Social Presets</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('dashboard');
                    setDashboardMode('document-optimizer');
                    setIsToolsSheetOpen(false);
                  }}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-blue-50/50 hover:bg-blue-50 border border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/40 dark:hover:bg-blue-950/30 text-center space-y-1.5 transition-colors cursor-pointer"
                >
                  <FileText className="h-5 w-5 text-blue-500" />
                  <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400">Doc Optimizer</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('dashboard');
                    setDashboardMode('profile-maker');
                    setIsToolsSheetOpen(false);
                  }}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-purple-50/50 hover:bg-purple-50 border border-purple-100 dark:bg-purple-950/20 dark:border-purple-900/40 dark:hover:bg-purple-950/30 text-center space-y-1.5 transition-colors cursor-pointer"
                >
                  <User className="h-5 w-5 text-purple-500" />
                  <span className="text-[10px] font-bold text-purple-700 dark:text-purple-400">Profile Maker</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('dashboard');
                    setDashboardMode('photo-sheet');
                    setIsToolsSheetOpen(false);
                  }}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-amber-50/50 hover:bg-amber-50 border border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/40 dark:hover:bg-amber-950/30 text-center space-y-1.5 transition-colors cursor-pointer"
                >
                  <Layers className="h-5 w-5 text-amber-500" />
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">Photo Sheet</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('dashboard');
                    setDashboardMode('custom-canvas');
                    setIsToolsSheetOpen(false);
                  }}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-teal-50/50 hover:bg-teal-50 border border-teal-100 dark:bg-teal-950/20 dark:border-teal-900/40 dark:hover:bg-teal-950/30 text-center space-y-1.5 transition-colors cursor-pointer"
                >
                  <Maximize2 className="h-5 w-5 text-teal-500" />
                  <span className="text-[10px] font-bold text-teal-700 dark:text-teal-400">Custom Canvas</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('dashboard');
                    setDashboardMode('smart-presets');
                    setIsToolsSheetOpen(false);
                  }}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/40 dark:hover:bg-indigo-950/30 text-center space-y-1.5 transition-colors cursor-pointer"
                >
                  <Sparkles className="h-5 w-5 text-indigo-500" />
                  <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400">Presets Catalog</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('dashboard');
                    setDashboardMode('app-icon');
                    setIsToolsSheetOpen(false);
                  }}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50/50 hover:bg-slate-50 border border-slate-100 dark:bg-slate-950/20 dark:border-slate-800 dark:hover:bg-slate-950/30 text-center space-y-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="h-5 w-5 text-amber-500" />
                  <span className="text-[10px] font-bold text-slate-855 dark:text-slate-305">App Icon Pack</span>
                </button>
              </div>

              {/* Extra legal details */}
              <div className="pt-3 border-t border-slate-150 dark:border-slate-800 flex justify-between text-[11px] font-bold">
                <button 
                  onClick={() => {
                    setActiveTab('blog');
                    setIsToolsSheetOpen(false);
                  }}
                  className="text-slate-400 hover:text-indigo-505 cursor-pointer"
                >
                  SEO Articles Feed
                </button>
                <button 
                  onClick={() => {
                    setActiveTab('legal-contact');
                    setIsToolsSheetOpen(false);
                  }}
                  className="text-slate-400 hover:text-indigo-505 cursor-pointer"
                >
                  Support & Contact
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
