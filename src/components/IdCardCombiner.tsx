/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Upload,
  Camera,
  Trash2,
  RefreshCw,
  Download,
  Check,
  Info,
  X,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Sliders,
  FileText,
  Image as ImageIcon,
  Sparkles,
  ArrowLeftRight,
  RotateCcw as ResetIcon,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  ShieldCheck,
  Columns,
  Rows,
  Move,
  Eye,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  ImageSlotState,
  CompositionSettings,
  PdfSettingsState,
  CombinerLayout,
  ExportFormat,
  FitMode,
  BgType,
  COLOR_SWATCHES,
} from './idCard/idCardTypes';
import {
  loadAndDecodeImage,
  renderCompositionToCanvas,
} from './idCard/compositionRenderer';
import PdfPaperPreview from './idCard/PdfPaperPreview';
import IdCardExportModal from './idCard/IdCardExportModal';
import { exportCombinedPdf } from './idCard/pdfRenderer';

const PREFS_STORAGE_KEY = 'quickresize_id_combiner_prefs';

export default function IdCardCombiner(): React.JSX.Element {
  // Mode: Simple vs Advanced
  const [uiMode, setUiMode] = useState<'simple' | 'advanced'>('simple');

  // Preview Mode: 'pdf' (A4 paper) vs 'image' (exact composition)
  const [previewMode, setPreviewMode] = useState<'pdf' | 'image'>('pdf');

  // Before / After inspection mode
  const [viewState, setViewState] = useState<'combined' | 'original'>('combined');

  // Fullscreen Preview Modal
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Slot States
  const [frontImage, setFrontImage] = useState<ImageSlotState | null>(null);
  const [backImage, setBackImage] = useState<ImageSlotState | null>(null);

  // Remember non-sensitive settings preference
  const [rememberSettings, setRememberSettings] = useState<boolean>(() => {
    try {
      return localStorage.getItem(PREFS_STORAGE_KEY) !== null;
    } catch {
      return false;
    }
  });

  // Composition Settings
  const [layout, setLayout] = useState<CombinerLayout>('side-by-side');
  const [gap, setGap] = useState<number>(16);
  const [padding, setPadding] = useState<number>(16);
  const [bgType, setBgType] = useState<BgType>('white');
  const [customBgColor, setCustomBgColor] = useState<string>('#ffffff');
  const [borderEnabled, setBorderEnabled] = useState<boolean>(false);
  const [borderWidth, setBorderWidth] = useState<number>(1);
  const [borderColor, setBorderColor] = useState<string>('#cbd5e1');
  const [cornerRadius, setCornerRadius] = useState<number>(0);
  const [cardShadow, setCardShadow] = useState<boolean>(false);
  const [hAlign, setHAlign] = useState<'left' | 'center' | 'right'>('center');
  const [vAlign, setVAlign] = useState<'top' | 'center' | 'bottom'>('center');

  // Manual Positioning
  const [manualPos, setManualPos] = useState({
    frontScale: 1.0,
    frontX: 0,
    frontY: 0,
    backScale: 1.0,
    backX: 0,
    backY: 0,
  });
  const [selectedSlot, setSelectedSlot] = useState<'front' | 'back'>('front');

  // PDF Page Settings
  const [pdfSettings, setPdfSettings] = useState<PdfSettingsState>({
    paperSize: 'a4',
    orientation: 'portrait',
    horizontalPos: 'center',
    verticalPos: 'center',
    margin: 'small',
    docSize: 'fit',
    customScale: 80,
  });

  // Export Settings
  const [exportFileName, setExportFileName] = useState<string>('My_ID_Card');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [jpegQuality, setJpegQuality] = useState<number>(92);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  // Preview Zoom & State
  const [previewZoom, setPreviewZoom] = useState<number>(1.0);
  const [compositionDataUrl, setCompositionDataUrl] = useState<string | null>(null);
  const [canvasDimensions, setCanvasDimensions] = useState<{ width: number; height: number }>({
    width: 800,
    height: 500,
  });
  const [estimatedSizeStr, setEstimatedSizeStr] = useState<string>('~250 KB');

  // UI Feedback
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Mobile Accordion Sections
  const [expandedSections, setExpandedSections] = useState({
    uploads: true,
    layout: true,
    styling: false,
    pdf: false,
  });

  // DOM Refs
  const frontInputRef = useRef<HTMLInputElement>(null);
  const frontCameraInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const backCameraInputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialManualPosRef = useRef(manualPos);

  // Format bytes helper
  const formatBytes = (bytes: number, decimals = 1) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Restore non-sensitive preferences from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PREFS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.layout) setLayout(parsed.layout);
        if (parsed.gap !== undefined) setGap(parsed.gap);
        if (parsed.padding !== undefined) setPadding(parsed.padding);
        if (parsed.bgType) setBgType(parsed.bgType);
        if (parsed.cornerRadius !== undefined) setCornerRadius(parsed.cornerRadius);
        if (parsed.borderEnabled !== undefined) setBorderEnabled(parsed.borderEnabled);
        if (parsed.pdfSettings) setPdfSettings((prev) => ({ ...prev, ...parsed.pdfSettings }));
      }
    } catch {
      // Ignore
    }
  }, []);

  // Save non-sensitive preferences if rememberSettings is enabled
  useEffect(() => {
    if (!rememberSettings) {
      try {
        localStorage.removeItem(PREFS_STORAGE_KEY);
      } catch {
        // Ignore
      }
      return;
    }
    try {
      const prefs = {
        layout,
        gap,
        padding,
        bgType,
        cornerRadius,
        borderEnabled,
        pdfSettings,
      };
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // Ignore
    }
  }, [rememberSettings, layout, gap, padding, bgType, cornerRadius, borderEnabled, pdfSettings]);

  // Combined Composition Settings Object
  const currentCompositionSettings: CompositionSettings = useMemo(
    () => ({
      layout,
      gap,
      padding,
      bgType,
      customBgColor,
      borderEnabled,
      borderWidth,
      borderColor,
      cornerRadius,
      cardShadow,
      hAlign,
      vAlign,
      manualPos,
    }),
    [
      layout,
      gap,
      padding,
      bgType,
      customBgColor,
      borderEnabled,
      borderWidth,
      borderColor,
      cornerRadius,
      cardShadow,
      hAlign,
      vAlign,
      manualPos,
    ]
  );

  // File Upload Processor using validated loadAndDecodeImage pipeline
  const processUploadedFile = async (file: File, slot: 'front' | 'back') => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please upload a valid image file (JPG, PNG, or WEBP).');
      return;
    }

    setErrorMessage(null);

    // Initial placeholder state while decoding
    const initialSlotState: ImageSlotState = {
      file,
      url: '',
      imgElement: null,
      width: 0,
      height: 0,
      size: file.size,
      name: file.name,
      format: file.name.split('.').pop()?.toUpperCase() || 'JPG',
      rotation: 0,
      flipH: false,
      flipV: false,
      fitMode: 'contain',
      isLoading: true,
      error: null,
    };

    if (slot === 'front') {
      if (frontImage?.url) URL.revokeObjectURL(frontImage.url);
      setFrontImage(initialSlotState);
    } else {
      if (backImage?.url) URL.revokeObjectURL(backImage.url);
      setBackImage(initialSlotState);
    }

    try {
      const decoded = await loadAndDecodeImage(file);
      const readyState: ImageSlotState = {
        ...initialSlotState,
        url: decoded.url,
        imgElement: decoded.img,
        width: decoded.width,
        height: decoded.height,
        format: decoded.format,
        isLoading: false,
        error: null,
      };

      if (slot === 'front') {
        setFrontImage(readyState);
      } else {
        setBackImage(readyState);
      }
    } catch (err: any) {
      console.error('Image load failed:', err);
      const errorState: ImageSlotState = {
        ...initialSlotState,
        isLoading: false,
        error: 'Unable to load this image. Please try another file.',
      };
      if (slot === 'front') setFrontImage(errorState);
      else setBackImage(errorState);
      setErrorMessage('Unable to process the image. Please select a valid JPG or PNG file.');
    }
  };

  // Drag & drop handlers
  const handleDrop = (e: React.DragEvent<HTMLDivElement>, slot?: 'front' | 'back') => {
    e.preventDefault();
    e.stopPropagation();
    const files = (Array.from(e.dataTransfer.files) as File[]).filter((f) =>
      f.type.startsWith('image/')
    );
    if (files.length === 0) return;

    if (slot === 'front') {
      processUploadedFile(files[0], 'front');
      if (files.length > 1 && !backImage) {
        processUploadedFile(files[1], 'back');
      }
    } else if (slot === 'back') {
      processUploadedFile(files[0], 'back');
    } else {
      processUploadedFile(files[0], 'front');
      if (files.length > 1) {
        processUploadedFile(files[1], 'back');
      }
    }
  };

  // Single Source of Truth: Render Master Composition
  const updateCompositionRendering = useCallback(() => {
    const hasFront = !!(frontImage && frontImage.imgElement && frontImage.width > 0);
    const hasBack = !!(backImage && backImage.imgElement && backImage.width > 0);

    if (!hasFront && !hasBack) {
      setCompositionDataUrl(null);
      setCanvasDimensions({ width: 800, height: 500 });
      return;
    }

    // Render directly using master renderer
    const canvas = renderCompositionToCanvas(
      hasFront ? frontImage : null,
      hasBack ? backImage : null,
      currentCompositionSettings,
      previewCanvasRef.current || undefined,
      layout === 'manual' ? selectedSlot : null
    );

    setCanvasDimensions({ width: canvas.width, height: canvas.height });

    try {
      const dataUrl = canvas.toDataURL('image/png');
      setCompositionDataUrl(dataUrl);

      // Estimate compressed output size
      canvas.toBlob(
        (blob) => {
          if (blob) {
            setEstimatedSizeStr(formatBytes(blob.size));
          }
        },
        'image/png'
      );
    } catch (e) {
      console.warn('Canvas export preview warning:', e);
    }
  }, [frontImage, backImage, currentCompositionSettings, layout, selectedSlot]);

  // Re-run composition rendering whenever any input changes
  useEffect(() => {
    updateCompositionRendering();
  }, [updateCompositionRendering]);

  // Image Slot Transformation Handlers
  const handleRotate = (slot: 'front' | 'back', delta: number) => {
    const updater = (prev: ImageSlotState | null): ImageSlotState | null => {
      if (!prev) return null;
      const newRotation = (prev.rotation + delta + 360) % 360;
      return { ...prev, rotation: newRotation };
    };
    if (slot === 'front') setFrontImage(updater);
    else setBackImage(updater);
  };

  const handleFlip = (slot: 'front' | 'back', axis: 'h' | 'v') => {
    const updater = (prev: ImageSlotState | null): ImageSlotState | null => {
      if (!prev) return null;
      if (axis === 'h') return { ...prev, flipH: !prev.flipH };
      return { ...prev, flipV: !prev.flipV };
    };
    if (slot === 'front') setFrontImage(updater);
    else setBackImage(updater);
  };

  const handleFitModeChange = (slot: 'front' | 'back', mode: FitMode) => {
    const updater = (prev: ImageSlotState | null): ImageSlotState | null => {
      if (!prev) return null;
      return { ...prev, fitMode: mode };
    };
    if (slot === 'front') setFrontImage(updater);
    else setBackImage(updater);
  };

  // Swap Front & Back
  const handleSwapSides = () => {
    if (!frontImage && !backImage) return;
    const tempFront = frontImage;
    setFrontImage(backImage);
    setBackImage(tempFront);
    setSuccessToast('Swapped Front and Back sides');
    setTimeout(() => setSuccessToast(null), 2500);
  };

  // Auto Arrange based on image proportions
  const handleAutoArrange = () => {
    if (!frontImage && !backImage) {
      setErrorMessage('Upload images to use Auto Arrange.');
      return;
    }

    const frontAspect = frontImage ? frontImage.width / (frontImage.height || 1) : 1.4;
    const backAspect = backImage ? backImage.width / (backImage.height || 1) : 1.4;
    const avgAspect = (frontAspect + backAspect) / 2;

    if (avgAspect >= 1.08) {
      // Landscape ID Card proportions -> Side-by-Side
      setLayout('side-by-side');
      setGap(16);
      setPadding(16);
      setSuccessToast('Auto Arranged: Side-by-Side ID Card Layout');
    } else {
      // Portrait / Document proportions -> Top-Bottom
      setLayout('top-bottom');
      setGap(20);
      setPadding(16);
      setSuccessToast('Auto Arranged: Top & Bottom Document Layout');
    }
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Reset All State
  const handleResetAll = () => {
    if (frontImage?.url) URL.revokeObjectURL(frontImage.url);
    if (backImage?.url) URL.revokeObjectURL(backImage.url);
    setFrontImage(null);
    setBackImage(null);
    setLayout('side-by-side');
    setGap(16);
    setPadding(16);
    setBgType('white');
    setCustomBgColor('#ffffff');
    setBorderEnabled(false);
    setBorderWidth(1);
    setBorderColor('#cbd5e1');
    setCornerRadius(0);
    setCardShadow(false);
    setHAlign('center');
    setVAlign('center');
    setManualPos({
      frontScale: 1.0,
      frontX: 0,
      frontY: 0,
      backScale: 1.0,
      backX: 0,
      backY: 0,
    });
    setSelectedSlot('front');
    setPdfSettings({
      paperSize: 'a4',
      orientation: 'portrait',
      horizontalPos: 'center',
      verticalPos: 'center',
      margin: 'small',
      docSize: 'fit',
      customScale: 80,
    });
    setPreviewMode('pdf');
    setPreviewZoom(1.0);
    setErrorMessage(null);
    setSuccessToast('All settings and images have been reset.');
    setTimeout(() => setSuccessToast(null), 2500);
  };

  // Manual Canvas Dragging Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (layout !== 'manual') return;
    isDraggingRef.current = true;
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    initialManualPosRef.current = { ...manualPos };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current || layout !== 'manual') return;

    const deltaX = (e.clientX - dragStartPosRef.current.x) / previewZoom;
    const deltaY = (e.clientY - dragStartPosRef.current.y) / previewZoom;

    if (selectedSlot === 'front') {
      setManualPos((prev) => ({
        ...prev,
        frontX: Math.round(initialManualPosRef.current.frontX + deltaX),
        frontY: Math.round(initialManualPosRef.current.frontY + deltaY),
      }));
    } else {
      setManualPos((prev) => ({
        ...prev,
        backX: Math.round(initialManualPosRef.current.backX + deltaX),
        backY: Math.round(initialManualPosRef.current.backY + deltaY),
      }));
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
    }
  };

  // Sanitize Filename
  const sanitizeFilename = (input: string): string => {
    const sanitized = input.replace(/[/\\:*?"<>|«»]/g, '').trim();
    return sanitized || 'My_ID_Card';
  };

  // Execute Final Export & Download
  const handleExecuteDownload = async () => {
    const hasFront = !!(frontImage && frontImage.imgElement);
    const hasBack = !!(backImage && backImage.imgElement);
    if (!hasFront && !hasBack) return;

    setIsDownloading(true);
    setErrorMessage(null);

    const safeBaseName = sanitizeFilename(exportFileName);

    try {
      // Always render a fresh master export canvas without UI selection highlight rings
      const exportCanvas = renderCompositionToCanvas(
        frontImage,
        backImage,
        currentCompositionSettings,
        undefined,
        null
      );

      if (exportFormat === 'png') {
        const finalUrl = exportCanvas.toDataURL('image/png');
        const fileName = `${safeBaseName}.png`;

        const link = document.createElement('a');
        link.href = finalUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setIsExportDialogOpen(false);
        setSuccessToast(`Saved: ${fileName}`);
      } else if (exportFormat === 'jpeg') {
        let jpgCanvas = exportCanvas;
        if (bgType === 'transparent') {
          jpgCanvas = document.createElement('canvas');
          jpgCanvas.width = exportCanvas.width;
          jpgCanvas.height = exportCanvas.height;
          const jctx = jpgCanvas.getContext('2d');
          if (jctx) {
            jctx.fillStyle = '#ffffff';
            jctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
            jctx.drawImage(exportCanvas, 0, 0);
          }
        }

        const qualityVal = Math.max(0.5, Math.min(1.0, jpegQuality / 100));
        const finalUrl = jpgCanvas.toDataURL('image/jpeg', qualityVal);
        const fileName = `${safeBaseName}.jpg`;

        const link = document.createElement('a');
        link.href = finalUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setIsExportDialogOpen(false);
        setSuccessToast(`Saved: ${fileName}`);
      } else if (exportFormat === 'pdf') {
        const fileName = `${safeBaseName}.pdf`;
        await exportCombinedPdf(exportCanvas, fileName, pdfSettings);

        setIsExportDialogOpen(false);
        setSuccessToast(`Saved: ${fileName}`);
      }
    } catch (err: any) {
      console.error('Export failed:', err);
      setErrorMessage('Export failed. Please try a different format.');
    } finally {
      setIsDownloading(false);
    }
  };

  const hasAnyImage = !!(
    (frontImage && frontImage.imgElement) ||
    (backImage && backImage.imgElement)
  );

  const toggleSection = (sec: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  return (
    <div id="id-combiner-root" className="space-y-6 animate-fade-in pb-20">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🪪</span>
            <h2 className="font-sans text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              ID Card &amp; Document Combiner
            </h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400">
              <Sparkles className="h-3 w-3" /> Updated
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Combine front &amp; back images of Aadhaar cards, Driving Licences, Voter IDs, and official forms.
          </p>
        </div>

        {/* Header Badges & Mode Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Simple vs Advanced Toggle */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/70 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setUiMode('simple')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                uiMode === 'simple'
                  ? 'bg-white text-indigo-700 shadow-2xs dark:bg-slate-900 dark:text-indigo-300'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              Simple
            </button>
            <button
              type="button"
              onClick={() => setUiMode('advanced')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                uiMode === 'advanced'
                  ? 'bg-white text-indigo-700 shadow-2xs dark:bg-slate-900 dark:text-indigo-300'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              Advanced
            </button>
          </div>

          <div
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200/60 bg-emerald-50/80 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:border-emerald-950/40 dark:bg-emerald-950/30 dark:text-emerald-400 shadow-2xs"
            title="Images are processed locally in your browser. No files are uploaded to any server."
          >
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="hidden sm:inline">Processed locally on your device</span>
            <span className="sm:hidden">Local &amp; Safe</span>
          </div>
        </div>
      </div>

      {/* Top Quick Actions Bar */}
      <div className="flex items-center justify-between gap-2 p-3 bg-slate-50 dark:bg-slate-850/60 rounded-2xl border border-slate-200/70 dark:border-slate-800 overflow-x-auto">
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleAutoArrange}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 text-xs font-bold transition-all cursor-pointer border border-indigo-200/60 dark:border-indigo-800"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Auto Arrange</span>
          </button>

          <button
            type="button"
            onClick={handleSwapSides}
            disabled={!hasAnyImage}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer border border-slate-200 dark:border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            <span>Swap Sides</span>
          </button>

          <button
            type="button"
            onClick={handleResetAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-rose-400 text-xs font-bold transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
          >
            <ResetIcon className="h-3.5 w-3.5" />
            <span>Reset</span>
          </button>
        </div>

        {/* Quick Layout Presets */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[11px] font-bold text-slate-400 mr-1 hidden md:inline">Layout:</span>
          {(
            [
              { id: 'side-by-side', label: 'Side by Side', icon: Columns },
              { id: 'top-bottom', label: 'Top & Bottom', icon: Rows },
              { id: 'manual', label: 'Manual', icon: Move },
            ] as { id: CombinerLayout; label: string; icon: any }[]
          ).map((item) => {
            const IconComp = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setLayout(item.id)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  layout === item.id
                    ? 'bg-slate-900 text-white shadow-2xs dark:bg-white dark:text-slate-900'
                    : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <IconComp className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Success Toast */}
      {successToast && (
        <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 animate-fade-in">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="p-1 hover:opacity-75 cursor-pointer">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="flex items-center justify-between rounded-xl bg-rose-50 border border-rose-200 px-4 py-2.5 text-xs font-bold text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300 animate-fade-in">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="p-1 hover:opacity-75 cursor-pointer">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Hidden File Inputs */}
      <input
        ref={frontInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            processUploadedFile(e.target.files[0], 'front');
          }
        }}
      />
      <input
        ref={frontCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            processUploadedFile(e.target.files[0], 'front');
          }
        }}
      />
      <input
        ref={backInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            processUploadedFile(e.target.files[0], 'back');
          }
        }}
      />
      <input
        ref={backCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            processUploadedFile(e.target.files[0], 'back');
          }
        }}
      />

      {/* MAIN TWO-COLUMN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Controls & Uploads (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* SECTION 1: TWO-IMAGE UPLOAD CARDS */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900/50 space-y-4">
            <div
              className="flex items-center justify-between cursor-pointer select-none"
              onClick={() => toggleSection('uploads')}
            >
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-indigo-500" />
                1. Upload Front &amp; Back Images
              </h3>
              <button type="button" className="text-slate-400 p-1">
                {expandedSections.uploads ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            </div>

            {expandedSections.uploads && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* FRONT IMAGE SLOT */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, 'front')}
                  className={`rounded-2xl border p-4 transition-all ${
                    frontImage?.imgElement
                      ? 'border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/40'
                      : 'border-dashed border-slate-300 bg-slate-50/80 hover:border-indigo-400 hover:bg-indigo-50/20 dark:border-slate-700 dark:bg-slate-900/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-indigo-500" />
                      Front Side
                    </span>
                    {frontImage?.imgElement ? (
                      <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                        Ready
                      </span>
                    ) : frontImage?.isLoading ? (
                      <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold animate-pulse">
                        Decoding...
                      </span>
                    ) : null}
                  </div>

                  {frontImage?.imgElement ? (
                    <div className="space-y-3">
                      {/* Image Preview Thumbnail */}
                      <div className="relative h-32 w-full rounded-xl bg-slate-200/60 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden flex items-center justify-center p-1">
                        <img
                          src={frontImage.url}
                          alt="Front Document"
                          className="max-h-full max-w-full object-contain rounded-md"
                          style={{
                            transform: `rotate(${frontImage.rotation}deg) scale(${frontImage.flipH ? -1 : 1}, ${frontImage.flipV ? -1 : 1})`,
                          }}
                        />
                      </div>

                      {/* Technical Info */}
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={frontImage.name}>
                          {frontImage.name}
                        </p>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                          <span>{frontImage.width} × {frontImage.height} px</span>
                          <span>&bull;</span>
                          <span>{frontImage.format}</span>
                          <span>&bull;</span>
                          <span>{formatBytes(frontImage.size)}</span>
                        </div>
                        {frontImage.width < 400 && (
                          <p className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1 pt-0.5 font-medium">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            Low resolution image. Export quality may be limited.
                          </p>
                        )}
                      </div>

                      {/* Compact Image Controls */}
                      <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleRotate('front', -90)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                            title="Rotate ↺ 90° Left"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRotate('front', 90)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                            title="Rotate ↻ 90° Right"
                          >
                            <RotateCw className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFlip('front', 'h')}
                            className={`p-1.5 rounded-lg border text-slate-700 dark:text-slate-200 cursor-pointer ${
                              frontImage.flipH
                                ? 'bg-indigo-50 border-indigo-400 text-indigo-600 dark:bg-indigo-950/40 dark:border-indigo-600'
                                : 'border-slate-200 bg-white hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800'
                            }`}
                            title="Flip Horizontally"
                          >
                            <FlipHorizontal className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFlip('front', 'v')}
                            className={`p-1.5 rounded-lg border text-slate-700 dark:text-slate-200 cursor-pointer ${
                              frontImage.flipV
                                ? 'bg-indigo-50 border-indigo-400 text-indigo-600 dark:bg-indigo-950/40 dark:border-indigo-600'
                                : 'border-slate-200 bg-white hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800'
                            }`}
                            title="Flip Vertically"
                          >
                            <FlipVertical className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => frontInputRef.current?.click()}
                            className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                            title="Replace Front Image"
                          >
                            <RefreshCw className="h-3 w-3 inline mr-1" />
                            Replace
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (frontImage.url) URL.revokeObjectURL(frontImage.url);
                              setFrontImage(null);
                            }}
                            className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 dark:border-rose-900/60 dark:hover:bg-rose-950/30 cursor-pointer"
                            title="Remove Front Image"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-center space-y-2.5">
                      <div className="h-10 w-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <Upload className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Upload Front Side
                        </p>
                        <p className="text-[11px] text-slate-400">
                          JPG, PNG, or WEBP
                        </p>
                      </div>
                      <div className="flex items-center gap-2 w-full pt-1">
                        <button
                          type="button"
                          onClick={() => frontInputRef.current?.click()}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 text-xs shadow-2xs transition-all cursor-pointer"
                        >
                          Browse File
                        </button>
                        <button
                          type="button"
                          onClick={() => frontCameraInputRef.current?.click()}
                          className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                          title="Capture with camera"
                        >
                          <Camera className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* BACK IMAGE SLOT */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, 'back')}
                  className={`rounded-2xl border p-4 transition-all ${
                    backImage?.imgElement
                      ? 'border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/40'
                      : 'border-dashed border-slate-300 bg-slate-50/80 hover:border-sky-400 hover:bg-sky-50/20 dark:border-slate-700 dark:bg-slate-900/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-sky-500" />
                      Back Side
                    </span>
                    {backImage?.imgElement ? (
                      <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                        Ready
                      </span>
                    ) : backImage?.isLoading ? (
                      <span className="text-[10px] font-mono text-sky-600 dark:text-sky-400 font-bold animate-pulse">
                        Decoding...
                      </span>
                    ) : null}
                  </div>

                  {backImage?.imgElement ? (
                    <div className="space-y-3">
                      {/* Image Preview Thumbnail */}
                      <div className="relative h-32 w-full rounded-xl bg-slate-200/60 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden flex items-center justify-center p-1">
                        <img
                          src={backImage.url}
                          alt="Back Document"
                          className="max-h-full max-w-full object-contain rounded-md"
                          style={{
                            transform: `rotate(${backImage.rotation}deg) scale(${backImage.flipH ? -1 : 1}, ${backImage.flipV ? -1 : 1})`,
                          }}
                        />
                      </div>

                      {/* Technical Info */}
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={backImage.name}>
                          {backImage.name}
                        </p>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                          <span>{backImage.width} × {backImage.height} px</span>
                          <span>&bull;</span>
                          <span>{backImage.format}</span>
                          <span>&bull;</span>
                          <span>{formatBytes(backImage.size)}</span>
                        </div>
                        {backImage.width < 400 && (
                          <p className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1 pt-0.5 font-medium">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            Low resolution image. Export quality may be limited.
                          </p>
                        )}
                      </div>

                      {/* Compact Image Controls */}
                      <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleRotate('back', -90)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                            title="Rotate ↺ 90° Left"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRotate('back', 90)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                            title="Rotate ↻ 90° Right"
                          >
                            <RotateCw className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFlip('back', 'h')}
                            className={`p-1.5 rounded-lg border text-slate-700 dark:text-slate-200 cursor-pointer ${
                              backImage.flipH
                                ? 'bg-sky-50 border-sky-400 text-sky-600 dark:bg-sky-950/40 dark:border-sky-600'
                                : 'border-slate-200 bg-white hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800'
                            }`}
                            title="Flip Horizontally"
                          >
                            <FlipHorizontal className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFlip('back', 'v')}
                            className={`p-1.5 rounded-lg border text-slate-700 dark:text-slate-200 cursor-pointer ${
                              backImage.flipV
                                ? 'bg-sky-50 border-sky-400 text-sky-600 dark:bg-sky-950/40 dark:border-sky-600'
                                : 'border-slate-200 bg-white hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800'
                            }`}
                            title="Flip Vertically"
                          >
                            <FlipVertical className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => backInputRef.current?.click()}
                            className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                            title="Replace Back Image"
                          >
                            <RefreshCw className="h-3 w-3 inline mr-1" />
                            Replace
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (backImage.url) URL.revokeObjectURL(backImage.url);
                              setBackImage(null);
                            }}
                            className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 dark:border-rose-900/60 dark:hover:bg-rose-950/30 cursor-pointer"
                            title="Remove Back Image"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-center space-y-2.5">
                      <div className="h-10 w-10 rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                        <Upload className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Upload Back Side
                        </p>
                        <p className="text-[11px] text-slate-400">
                          JPG, PNG, or WEBP
                        </p>
                      </div>
                      <div className="flex items-center gap-2 w-full pt-1">
                        <button
                          type="button"
                          onClick={() => backInputRef.current?.click()}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 text-xs shadow-2xs transition-all cursor-pointer"
                        >
                          Browse File
                        </button>
                        <button
                          type="button"
                          onClick={() => backCameraInputRef.current?.click()}
                          className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                          title="Capture with camera"
                        >
                          <Camera className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: ADVANCED ADJUSTMENTS (Visible in Advanced mode) */}
          {uiMode === 'advanced' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900/50 space-y-4 animate-fade-in">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Sliders className="h-3.5 w-3.5 text-indigo-500" />
                2. Spacing, Borders &amp; Canvas Style
              </h3>

              {/* Quick Gap Controls */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Image Gap:</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400">{gap} px</span>
                </div>
                <div className="flex items-center gap-2">
                  {[0, 8, 16, 24, 32].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGap(g)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        gap === g
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {g}px
                    </button>
                  ))}
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={gap}
                    onChange={(e) => setGap(parseInt(e.target.value, 10))}
                    className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg accent-indigo-600 cursor-pointer"
                  />
                </div>
              </div>

              {/* Quick Padding Controls */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Image Padding:</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400">{padding} px</span>
                </div>
                <div className="flex items-center gap-2">
                  {[
                    { label: 'None', val: 0 },
                    { label: 'Small', val: 16 },
                    { label: 'Medium', val: 32 },
                    { label: 'Large', val: 48 },
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => setPadding(p.val)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        padding === p.val
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                  <input
                    type="range"
                    min="0"
                    max="120"
                    value={padding}
                    onChange={(e) => setPadding(parseInt(e.target.value, 10))}
                    className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg accent-indigo-600 cursor-pointer"
                  />
                </div>
              </div>

              {/* Background Color & Transparent */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Background Color:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setBgType('white')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      bgType === 'white'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    Solid White
                  </button>
                  <button
                    type="button"
                    onClick={() => setBgType('black')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      bgType === 'black'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    Solid Black
                  </button>
                  <button
                    type="button"
                    onClick={() => setBgType('transparent')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      bgType === 'transparent'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    Transparent (PNG)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBgType('custom')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      bgType === 'custom'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    Custom Color
                  </button>
                </div>

                {bgType === 'custom' && (
                  <div className="flex items-center gap-2 pt-2 animate-fade-in">
                    <div className="flex items-center gap-1.5">
                      {COLOR_SWATCHES.map((swatch) => (
                        <button
                          key={swatch.value}
                          type="button"
                          onClick={() => setCustomBgColor(swatch.value)}
                          className={`h-7 w-7 rounded-full border-2 transition-transform cursor-pointer ${
                            customBgColor === swatch.value
                              ? 'scale-110 border-indigo-600'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}
                          style={{ backgroundColor: swatch.value }}
                          title={swatch.label}
                        />
                      ))}
                    </div>
                    <input
                      type="color"
                      value={customBgColor}
                      onChange={(e) => setCustomBgColor(e.target.value)}
                      className="h-8 w-10 p-0 rounded border border-slate-200 dark:border-slate-700 cursor-pointer"
                      title="Choose custom hex color"
                    />
                  </div>
                )}
              </div>

              {/* Corner Radius & Border Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    <span>Corner Radius (Default 0):</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400">{cornerRadius} px</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[0, 4, 8, 12, 20].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setCornerRadius(r)}
                        className={`flex-1 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                          cornerRadius === r
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    <span>Document Border:</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400">
                      {borderEnabled ? `${borderWidth}px` : 'OFF'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setBorderEnabled(false)}
                      className={`flex-1 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                        !borderEnabled
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      OFF
                    </button>
                    {[1, 2, 3].map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => {
                          setBorderEnabled(true);
                          setBorderWidth(b);
                        }}
                        className={`flex-1 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                          borderEnabled && borderWidth === b
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {b}px
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Fit Modes & Remember Settings */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 flex-wrap gap-2">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberSettings}
                    onChange={(e) => setRememberSettings(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>Remember layout &amp; margin preferences</span>
                </label>

                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-400 text-[11px]">ID Fit Mode:</span>
                  {(['contain', 'cover', 'original'] as FitMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        handleFitModeChange('front', mode);
                        handleFitModeChange('back', mode);
                      }}
                      className={`px-2 py-0.5 text-[11px] font-bold rounded capitalize border transition-all cursor-pointer ${
                        (frontImage?.fitMode || 'contain') === mode
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                          : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* MANUAL POSITIONING NUDGE (When Manual Mode is active) */}
          {layout === 'manual' && (
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/20 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                  <Move className="h-3.5 w-3.5" />
                  Manual Positioning Controls
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSelectedSlot('front')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedSlot === 'front'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Front Slot
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSlot('back')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedSlot === 'back'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Back Slot
                  </button>
                </div>
              </div>

              {/* Nudge Buttons */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Nudge Position:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedSlot === 'front') setManualPos((p) => ({ ...p, frontX: p.frontX - 20 }));
                      else setManualPos((p) => ({ ...p, backX: p.backX - 20 }));
                    }}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 text-xs font-bold cursor-pointer"
                  >
                    &larr; Left
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedSlot === 'front') setManualPos((p) => ({ ...p, frontX: p.frontX + 20 }));
                      else setManualPos((p) => ({ ...p, backX: p.backX + 20 }));
                    }}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 text-xs font-bold cursor-pointer"
                  >
                    Right &rarr;
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedSlot === 'front') setManualPos((p) => ({ ...p, frontY: p.frontY - 20 }));
                      else setManualPos((p) => ({ ...p, backY: p.backY - 20 }));
                    }}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 text-xs font-bold cursor-pointer"
                  >
                    &uarr; Up
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedSlot === 'front') setManualPos((p) => ({ ...p, frontY: p.frontY + 20 }));
                      else setManualPos((p) => ({ ...p, backY: p.backY + 20 }));
                    }}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 text-xs font-bold cursor-pointer"
                  >
                    Down &darr;
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Live Master Preview & Save Action (5 Cols, Sticky) */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-20">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/50 space-y-4">
            {/* Top Preview Switcher Tabs */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPreviewMode('pdf')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    previewMode === 'pdf'
                      ? 'bg-white text-indigo-700 shadow-2xs dark:bg-slate-900 dark:text-indigo-300'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>PDF Paper Preview</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('image')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    previewMode === 'image'
                      ? 'bg-white text-indigo-700 shadow-2xs dark:bg-slate-900 dark:text-indigo-300'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  <span>Image Preview</span>
                </button>
              </div>

              {/* Preview Action Buttons (Zoom / Fullscreen) */}
              <div className="flex items-center gap-1">
                {previewMode === 'image' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setPreviewZoom((z) => Math.max(0.4, Number((z - 0.15).toFixed(2))))}
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                      title="Zoom Out"
                    >
                      <ZoomOut className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewZoom(1.0)}
                      className="text-[10px] font-mono text-slate-500 px-1 py-1 hover:text-slate-800 cursor-pointer"
                      title="Reset Zoom (100%)"
                    >
                      {Math.round(previewZoom * 100)}%
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewZoom((z) => Math.min(2.0, Number((z + 0.15).toFixed(2))))}
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                      title="Zoom In"
                    >
                      <ZoomIn className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setIsFullscreen(true)}
                  disabled={!hasAnyImage}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer disabled:opacity-40"
                  title="Fullscreen Preview"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Before / After Inspection Toggle */}
            {hasAnyImage && (
              <div className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-850 p-1.5 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-500 pl-1">View:</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setViewState('combined')}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                      viewState === 'combined'
                        ? 'bg-white text-indigo-700 shadow-2xs dark:bg-slate-900 dark:text-indigo-300'
                        : 'text-slate-500'
                    }`}
                  >
                    Combined Final
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewState('original')}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                      viewState === 'original'
                        ? 'bg-white text-indigo-700 shadow-2xs dark:bg-slate-900 dark:text-indigo-300'
                        : 'text-slate-500'
                    }`}
                  >
                    Original Sides
                  </button>
                </div>
              </div>
            )}

            {/* PREVIEW CONTAINER */}
            {viewState === 'original' && hasAnyImage ? (
              /* ORIGINAL SIDES COMPARISON VIEW */
              <div className="space-y-3 p-3 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 block">Front Original:</span>
                    <div className="h-28 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center p-1 overflow-hidden">
                      {frontImage?.url ? (
                        <img src={frontImage.url} alt="Front" className="max-h-full max-w-full object-contain" />
                      ) : (
                        <span className="text-[10px] text-slate-400">Empty</span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 block">Back Original:</span>
                    <div className="h-28 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center p-1 overflow-hidden">
                      {backImage?.url ? (
                        <img src={backImage.url} alt="Back" className="max-h-full max-w-full object-contain" />
                      ) : (
                        <span className="text-[10px] text-slate-400">Empty</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : previewMode === 'pdf' ? (
              /* PDF PAPER PREVIEW (Real Pixels on A4 Paper with Safe Margins) */
              <PdfPaperPreview
                compositionDataUrl={compositionDataUrl}
                canvasDimensions={canvasDimensions}
                settings={pdfSettings}
                hasImages={hasAnyImage}
                onPositionChange={(h, v) => setPdfSettings((s) => ({ ...s, horizontalPos: h, verticalPos: v }))}
              />
            ) : (
              /* RAW IMAGE CANVAS PREVIEW */
              <div
                className="relative w-full min-h-[300px] max-h-[420px] rounded-2xl bg-slate-100/90 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 overflow-auto flex items-center justify-center p-4"
                style={{
                  backgroundImage:
                    bgType === 'transparent'
                      ? 'repeating-conic-gradient(#e2e8f0 0% 25%, transparent 0% 50%) 50% / 16px 16px'
                      : 'none',
                }}
              >
                {/* Real Live Canvas Rendering */}
                <canvas
                  ref={previewCanvasRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  className={`max-w-full shadow-md rounded transition-transform ${
                    layout === 'manual' ? 'cursor-grab active:cursor-grabbing' : ''
                  }`}
                  style={{
                    transform: `scale(${previewZoom})`,
                    transformOrigin: 'center center',
                  }}
                />

                {!hasAnyImage && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-400 dark:text-slate-500 space-y-2 pointer-events-none">
                    <div className="h-10 w-10 rounded-full bg-slate-200/70 dark:bg-slate-800 flex items-center justify-center">
                      <ImageIcon className="h-5 w-5" />
                    </div>
                    <p className="text-xs font-bold">Image Composition Canvas</p>
                    <p className="text-[11px] max-w-xs">
                      Upload Front &amp; Back images to preview the generated combined composition.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Metrics Bar */}
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs font-mono dark:bg-slate-850/60 border border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-slate-400 text-[10px] block">Composition:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {canvasDimensions.width} &times; {canvasDimensions.height} px
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 text-[10px] block">Estimated Size:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {estimatedSizeStr}
                </span>
              </div>
            </div>

            {/* Primary Action Button: "Save As & Export" */}
            <button
              type="button"
              onClick={() => setIsExportDialogOpen(true)}
              disabled={!hasAnyImage}
              className={`w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold shadow-lg transition-all duration-150 cursor-pointer ${
                hasAnyImage
                  ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/15 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-600'
              }`}
            >
              <Download className="h-4 w-4" />
              Save As &amp; Export
            </button>

            {/* Privacy Note */}
            <div className="pt-1 text-center">
              <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
                🔒 Your images are processed on your device and are not stored by QuickResize.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FULLSCREEN PREVIEW MODAL */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-md p-4 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between text-white pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">Fullscreen Preview</span>
              <span className="text-xs text-slate-400 font-mono">
                ({canvasDimensions.width} × {canvasDimensions.height} px)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewZoom((z) => Math.max(0.4, Number((z - 0.2).toFixed(2))))}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewZoom(1.0)}
                className="px-2 py-1 text-xs font-mono bg-slate-800 rounded-lg text-slate-200 cursor-pointer"
              >
                100%
              </button>
              <button
                type="button"
                onClick={() => setPreviewZoom((z) => Math.min(2.5, Number((z + 0.2).toFixed(2))))}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 ml-2 cursor-pointer"
                title="Close Fullscreen"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Fullscreen Body */}
          <div className="flex-1 flex items-center justify-center overflow-auto p-4">
            {compositionDataUrl ? (
              <img
                src={compositionDataUrl}
                alt="Fullscreen Preview"
                className="max-h-[85vh] max-w-[90vw] object-contain rounded-sm shadow-2xl transition-transform"
                style={{ transform: `scale(${previewZoom})` }}
              />
            ) : (
              <p className="text-slate-400 text-xs">No image loaded</p>
            )}
          </div>
        </div>
      )}

      {/* EXPORT DIALOG / MODAL */}
      <IdCardExportModal
        isOpen={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        fileName={exportFileName}
        onFileNameChange={setExportFileName}
        exportFormat={exportFormat}
        onExportFormatChange={setExportFormat}
        jpegQuality={jpegQuality}
        onJpegQualityChange={setJpegQuality}
        pdfSettings={pdfSettings}
        onPdfSettingsChange={setPdfSettings}
        canvasDimensions={canvasDimensions}
        isDownloading={isDownloading}
        onExecuteDownload={handleExecuteDownload}
        sanitizeFilename={sanitizeFilename}
      />
    </div>
  );
}
