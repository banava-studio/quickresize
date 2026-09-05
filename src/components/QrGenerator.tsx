/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import QRCode from 'qrcode';
import { QrCode, Download, Settings, RefreshCw, Sparkles, AlertCircle, CheckCircle } from 'lucide-react';
import RenameModal from './RenameModal';

export default function QrGenerator() {
  const [qrType, setQrType] = useState<'url' | 'upi' | 'whatsapp' | 'wifi' | 'text'>('url');
  const [isRenameOpen, setIsRenameOpen] = useState<boolean>(false);
  const [downloadTarget, setDownloadTarget] = useState<'png' | 'svg' | null>(null);
  
  // URL details
  const [url, setUrl] = useState<string>('https://quickresize.com');
  
  // UPI details
  const [upiId, setUpiId] = useState<string>('merchant@upi');
  const [upiName, setUpiName] = useState<string>('Quick Payee');
  const [upiAmount, setUpiAmount] = useState<string>('');
  
  // WhatsApp details
  const [phone, setPhone] = useState<string>('919876543210');
  const [waMessage, setWaMessage] = useState<string>('Hello! Preloaded text message.');
  
  // WiFi details
  const [wifiSsid, setWifiSsid] = useState<string>('HomeWiFi_5G');
  const [wifiPassword, setWifiPassword] = useState<string>('admin1234');
  const [wifiEncryption, setWifiEncryption] = useState<'WPA' | 'WEP' | 'nopass'>('WPA');
  
  // Custom text details
  const [text, setText] = useState<string>('Plain text payload in scanner.');

  // Visual parameters
  const [qrColor, setQrColor] = useState<string>('#0f172a'); // default charcoal slate
  const [bgColor, setbgColor] = useState<string>('#ffffff');
  const [qrSize, setQrSize] = useState<number>(350); // pixels
  const [marginSize, setMarginSize] = useState<number>(2);

  const [pngUrl, setPngUrl] = useState<string>('');
  const [svgContent, setSvgContent] = useState<string>('');
  const [svgUrl, setSvgUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Re-generate QR on any details state modifications
  useEffect(() => {
    generateQR();
  }, [qrType, url, upiId, upiName, upiAmount, phone, waMessage, wifiSsid, wifiPassword, wifiEncryption, text, qrColor, bgColor, qrSize, marginSize]);

  // Clean up URL objects to prevent memory hog
  useEffect(() => {
    return () => {
      if (pngUrl) URL.revokeObjectURL(pngUrl);
      if (svgUrl) URL.revokeObjectURL(svgUrl);
    };
  }, [pngUrl, svgUrl]);

  const compilePayload = () => {
    switch (qrType) {
      case 'url':
        return url.startsWith('http') ? url : `https://${url}`;
      case 'upi': {
        const uNameStr = encodeURIComponent(upiName || 'Payee');
        const amountStr = upiAmount ? `&am=${upiAmount}` : '';
        return `upi://pay?pa=${upiId}&pn=${uNameStr}${amountStr}&cu=INR`;
      }
      case 'whatsapp': {
        const cleanPhone = phone.replace('+', '').replace(/\s/g, '');
        const msgStr = encodeURIComponent(waMessage);
        return `https://wa.me/${cleanPhone}?text=${msgStr}`;
      }
      case 'wifi': {
        return `WIFI:T:${wifiEncryption};S:${wifiSsid};P:${wifiPassword};;`;
      }
      case 'text':
        return text;
      default:
        return 'QuickResize QR';
    }
  };

  const generateQR = async () => {
    setIsGenerating(true);
    const payload = compilePayload();
    const options: QRCode.QRCodeRenderersOptions = {
      width: qrSize,
      margin: marginSize,
      color: {
        dark: qrColor,
        light: bgColor
      },
      errorCorrectionLevel: 'H'
    };

    try {
      // 1. Draw into canvas for PNG asset creation
      const canvas = canvasRef.current;
      if (canvas) {
        await QRCode.toCanvas(canvas, payload, options);
        canvas.toBlob((blob) => {
          if (blob) {
            if (pngUrl) URL.revokeObjectURL(pngUrl);
            setPngUrl(URL.createObjectURL(blob));
          }
        }, 'image/png');
      }

      // 2. Compile into SVG text vector format
      const svgString = await QRCode.toString(payload, {
        ...options,
        type: 'svg'
      });
      setSvgContent(svgString);

      // Create downloadable URL for SVG file
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      if (svgUrl) URL.revokeObjectURL(svgUrl);
      setSvgUrl(URL.createObjectURL(svgBlob));

    } catch (err) {
      console.error('Error compiling QR layout', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPng = () => {
    if (!pngUrl) return;
    setDownloadTarget('png');
    setIsRenameOpen(true);
  };

  const downloadSvg = () => {
    if (!svgUrl) return;
    setDownloadTarget('svg');
    setIsRenameOpen(true);
  };

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/40 space-y-6">
      <div className="flex items-center gap-2.5">
        <div className="h-9 w-9 bg-indigo-500/10 text-indigo-555 rounded-xl flex items-center justify-center">
          <QrCode className="h-5 w-5 text-indigo-500" />
        </div>
        <div>
          <h3 className="font-sans text-base font-bold text-slate-900 dark:text-white">
            High Density QR Code Generator & Vectors
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Create high-contrast URL links, mobile UPI payment scans, direct WiFi connects, and WhatsApp message codes instantly. No server required.
          </p>
        </div>
      </div>

      {/* QR Category Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-slate-50 dark:bg-slate-950/40 rounded-xl max-w-2xl border border-slate-200/50 dark:border-slate-850">
        {(['url', 'upi', 'whatsapp', 'wifi', 'text'] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setQrType(type)}
            className={`px-3 py-1.5 text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
              qrType === type
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                : 'text-slate-555 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            {type === 'upi' ? 'UPI Pay' : type}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left column: Parameters mapping based on category selected */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20 space-y-4">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">QR Core Payload Details</span>
            
            {qrType === 'url' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-450">Destination Link URL:</label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="e.g., example.com"
                  className="w-full text-xs font-bold p-2 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 outline-none focus:border-indigo-500"
                />
              </div>
            )}

            {qrType === 'upi' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-450">UPI VPA ID (Virtual Payment Address):</label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="merchant@upi or phone@paytm"
                    className="w-full text-xs font-bold p-2 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-450">Payee Name:</label>
                  <input
                    type="text"
                    value={upiName}
                    onChange={(e) => setUpiName(e.target.value)}
                    placeholder="e.g., John Stores"
                    className="w-full text-xs font-bold p-2 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-450">Optional Amount (INR):</label>
                  <input
                    type="number"
                    value={upiAmount}
                    onChange={(e) => setUpiAmount(e.target.value)}
                    placeholder="Leave blank for generic pay scanner"
                    className="w-full text-xs font-bold p-2 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            {qrType === 'whatsapp' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-450">WhatsApp Number (with Country Code):</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g., 919876543210 (No + characters)"
                    className="w-full text-xs font-bold p-2 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-450">Message Body Template:</label>
                  <textarea
                    rows={2}
                    value={waMessage}
                    onChange={(e) => setWaMessage(e.target.value)}
                    className="w-full text-xs font-semibold p-2 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            {qrType === 'wifi' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-450">Network SS-ID (Name):</label>
                  <input
                    type="text"
                    value={wifiSsid}
                    onChange={(e) => setWifiSsid(e.target.value)}
                    placeholder="e.g., Home_Net"
                    className="w-full text-xs font-bold p-2 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-450">WiFi Password:</label>
                  <input
                    type="password"
                    value={wifiPassword}
                    onChange={(e) => setWifiPassword(e.target.value)}
                    placeholder="WiFi key"
                    className="w-full text-xs font-bold p-2 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-450">Encryption model:</label>
                  <select
                    value={wifiEncryption}
                    onChange={(e: any) => setWifiEncryption(e.target.value)}
                    className="w-full text-xs font-bold p-2 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 outline-none focus:border-indigo-500"
                  >
                    <option value="WPA">WPA / WPA2 (Standard)</option>
                    <option value="WEP">WEP (Legacy)</option>
                    <option value="nopass">Unsecured (No Password)</option>
                  </select>
                </div>
              </div>
            )}

            {qrType === 'text' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-450">Plain Text Payload:</label>
                <textarea
                  rows={4}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Enter notes, copy cards, hashes..."
                  className="w-full text-xs font-semibold p-2 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 outline-none focus:border-indigo-500"
                />
              </div>
            )}
          </div>

          {/* Quick styling configs */}
          <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white/20 space-y-3.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">QR Code Aesthetic Settings</span>
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Foreground color:</label>
                <input
                  type="color"
                  value={qrColor}
                  onChange={(e) => setQrColor(e.target.value)}
                  className="w-full h-8 rounded border border-slate-200 cursor-pointer p-0 bg-transparent"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Background color:</label>
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setbgColor(e.target.value)}
                  className="w-full h-8 rounded border border-slate-200 cursor-pointer p-0 bg-transparent"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Resolution size ({qrSize}px)</label>
                <select
                  value={qrSize}
                  onChange={(e) => setQrSize(parseInt(e.target.value, 10))}
                  className="w-full text-[11px] font-bold p-1 rounded border bg-transparent"
                >
                  <option value={200}>200x200 px</option>
                  <option value={350}>350x350 px</option>
                  <option value={600}>600x600 px</option>
                  <option value={1000}>1000x1000 px</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Clear margins padding</label>
                <select
                  value={marginSize}
                  onChange={(e) => setMarginSize(parseInt(e.target.value, 10))}
                  className="w-full text-[11px] font-bold p-1 rounded border bg-transparent"
                >
                  <option value={1}>Narrow (1)</option>
                  <option value={2}>Standard (2)</option>
                  <option value={4}>Wide (4)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Rendering stage */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center p-6 border border-slate-100 rounded-2xl bg-slate-50/40 dark:border-slate-800 dark:bg-slate-900/10 min-h-[360px] text-center space-y-6">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Compiled Real-Time Barcode Matrix</span>
          
          <div className="p-4 rounded-xl shadow-lg border border-slate-150 inline-block" style={{ backgroundColor: bgColor }}>
            <canvas ref={canvasRef} className="max-w-[280px] h-auto object-contain shrink-0" />
          </div>

          <div className="flex flex-wrap gap-2 justify-center w-full max-w-sm">
            <button
              onClick={downloadPng}
              type="button"
              className="flex-1 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-bold text-xs py-3 hover:opacity-90 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <Download className="h-4 w-4" />
              Download PNG
            </button>
            <button
              onClick={downloadSvg}
              type="button"
              className="flex-1 rounded-xl bg-indigo-600 text-white font-bold text-xs py-3 hover:bg-indigo-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <Download className="h-4 w-4" />
              Download Vector SVG
            </button>
          </div>

          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
            <span>Scan type: {qrType.toUpperCase()}</span>
            <span>&bull;</span>
            <span>Correction level: High (H)</span>
          </div>
        </div>

      </div>

      {isRenameOpen && downloadTarget && (
        <RenameModal
          isOpen={isRenameOpen}
          originalName={`QuickResize_QR_${qrType}_${Date.now()}.${downloadTarget}`}
          onConfirm={(newName) => {
            const link = document.createElement('a');
            link.href = downloadTarget === 'png' ? pngUrl : svgUrl;
            link.download = newName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setIsRenameOpen(false);
            setDownloadTarget(null);
          }}
          onClose={() => {
            setIsRenameOpen(false);
            setDownloadTarget(null);
          }}
        />
      )}
    </div>
  );
}
