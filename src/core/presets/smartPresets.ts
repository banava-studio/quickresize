/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PresetCategory = 
  | 'Documents'
  | 'Social Media'
  | 'Profile & Avatar'
  | 'Paper & Print'
  | 'Web & Banner'
  | 'App Icons';

export type DimensionUnit = 'px' | 'mm' | 'cm' | 'in';

export interface SmartPreset {
  id: string;
  name: string;
  category: PresetCategory;
  width: number;
  height: number;
  aspectRatioLabel: string;
  description: string;
  format?: 'jpeg' | 'png' | 'webp';
  defaultDPI?: number;
  physicalSize?: {
    width: number;
    height: number;
    unit: DimensionUnit;
  };
  platform?: string;
  targetSizeKB?: number;
}

/**
 * Convert physical dimension to pixels at given DPI
 */
export function physicalToPixels(value: number, unit: DimensionUnit, dpi: number = 300): number {
  if (unit === 'px') return Math.round(value);
  if (unit === 'in') return Math.round(value * dpi);
  if (unit === 'mm') return Math.round((value * dpi) / 25.4);
  if (unit === 'cm') return Math.round((value * 10 * dpi) / 25.4);
  return Math.round(value);
}

/**
 * Convert pixels to physical dimension at given DPI
 */
export function pixelsToPhysical(pixels: number, unit: DimensionUnit, dpi: number = 300): number {
  if (unit === 'px') return pixels;
  if (unit === 'in') return Number((pixels / dpi).toFixed(2));
  if (unit === 'mm') return Number(((pixels * 25.4) / dpi).toFixed(1));
  if (unit === 'cm') return Number(((pixels * 25.4) / (dpi * 10)).toFixed(2));
  return pixels;
}

/**
 * Centralized Smart Presets Database
 */
export const SMART_PRESETS: SmartPreset[] = [
  // ==================== DOCUMENTS & FORMS ====================
  {
    id: 'doc-passport-us',
    name: 'Passport Photo (2" x 2")',
    category: 'Documents',
    width: 600,
    height: 600,
    aspectRatioLabel: '1:1',
    format: 'jpeg',
    defaultDPI: 300,
    physicalSize: { width: 2, height: 2, unit: 'in' },
    description: 'Common 2x2 inch (51x51mm) passport/visa photo format @ 300 DPI (600x600 px).'
  },
  {
    id: 'doc-passport-intl',
    name: 'Passport Photo (35 x 45 mm)',
    category: 'Documents',
    width: 413,
    height: 531,
    aspectRatioLabel: '35:45',
    format: 'jpeg',
    defaultDPI: 300,
    physicalSize: { width: 35, height: 45, unit: 'mm' },
    description: 'Standard 35mm x 45mm international passport & ID specification @ 300 DPI.'
  },
  {
    id: 'doc-passport-3040',
    name: 'ID Photo (30 x 40 mm)',
    category: 'Documents',
    width: 354,
    height: 472,
    aspectRatioLabel: '3:4',
    format: 'jpeg',
    defaultDPI: 300,
    physicalSize: { width: 30, height: 40, unit: 'mm' },
    description: 'Standard 3x4 cm identity badge specification @ 300 DPI.'
  },
  {
    id: 'doc-id-card-small',
    name: 'Small ID Photo (25 x 35 mm)',
    category: 'Documents',
    width: 295,
    height: 413,
    aspectRatioLabel: '2.5:3.5',
    format: 'jpeg',
    defaultDPI: 300,
    physicalSize: { width: 25, height: 35, unit: 'mm' },
    description: 'Standard 2.5x3.5 cm badge / PAN card photo format @ 300 DPI.'
  },
  {
    id: 'doc-visa-standard',
    name: 'Visa Photo (35 x 45 mm)',
    category: 'Documents',
    width: 413,
    height: 531,
    aspectRatioLabel: '35:45',
    format: 'jpeg',
    defaultDPI: 300,
    physicalSize: { width: 35, height: 45, unit: 'mm' },
    description: 'Common Schengen and international visa photo format @ 300 DPI.'
  },
  {
    id: 'doc-signature-exam',
    name: 'Exam / Portal Signature (140 x 60)',
    category: 'Documents',
    width: 140,
    height: 60,
    aspectRatioLabel: '7:3',
    format: 'jpeg',
    targetSizeKB: 20,
    description: 'Common 3.5cm x 1.5cm signature dimension for job & examination portals (10-20 KB).'
  },
  {
    id: 'doc-signature-med',
    name: 'Medium Signature (600 x 200)',
    category: 'Documents',
    width: 600,
    height: 200,
    aspectRatioLabel: '3:1',
    format: 'png',
    description: 'High-clarity signature with transparent background for document insertion.'
  },
  {
    id: 'doc-a4-scan',
    name: 'A4 Document Scan (150 DPI)',
    category: 'Documents',
    width: 1240,
    height: 1754,
    aspectRatioLabel: '1:1.414',
    format: 'jpeg',
    defaultDPI: 150,
    physicalSize: { width: 210, height: 297, unit: 'mm' },
    description: 'Standard ISO 216 A4 page format (1240x1754 px at 150 DPI).'
  },
  {
    id: 'doc-a5-scan',
    name: 'A5 Document Scan (150 DPI)',
    category: 'Documents',
    width: 874,
    height: 1240,
    aspectRatioLabel: '1:1.414',
    format: 'jpeg',
    defaultDPI: 150,
    physicalSize: { width: 148, height: 210, unit: 'mm' },
    description: 'Standard ISO 216 A5 page format (874x1240 px at 150 DPI).'
  },

  // ==================== SOCIAL MEDIA ====================
  {
    id: 'instagram-square',
    name: 'Instagram Square Post',
    category: 'Social Media',
    platform: 'Instagram',
    width: 1080,
    height: 1080,
    aspectRatioLabel: '1:1',
    format: 'jpeg',
    description: 'Standard 1:1 square feed image layout (1080x1080)'
  },
  {
    id: 'instagram-portrait',
    name: 'Instagram Portrait Post',
    category: 'Social Media',
    platform: 'Instagram',
    width: 1080,
    height: 1350,
    aspectRatioLabel: '4:5',
    format: 'jpeg',
    description: 'High-engagement vertical feed portrait (1080x1350)'
  },
  {
    id: 'instagram-story',
    name: 'Instagram Story / Reel',
    category: 'Social Media',
    platform: 'Instagram',
    width: 1080,
    height: 1920,
    aspectRatioLabel: '9:16',
    format: 'jpeg',
    description: 'Full-screen vertical story & reel format (1080x1920)'
  },
  {
    id: 'youtube-thumbnail',
    name: 'YouTube Video Thumbnail',
    category: 'Social Media',
    platform: 'YouTube',
    width: 1280,
    height: 720,
    aspectRatioLabel: '16:9',
    format: 'jpeg',
    description: 'Standard 16:9 HD landscape video cover (1280x720)'
  },
  {
    id: 'youtube-shorts',
    name: 'YouTube Shorts Cover',
    category: 'Social Media',
    platform: 'YouTube',
    width: 1080,
    height: 1920,
    aspectRatioLabel: '9:16',
    format: 'jpeg',
    description: 'Vertical 9:16 Shorts thumbnail format (1080x1920)'
  },
  {
    id: 'youtube-banner',
    name: 'YouTube Channel Banner',
    category: 'Social Media',
    platform: 'YouTube',
    width: 2560,
    height: 1440,
    aspectRatioLabel: '16:9',
    format: 'jpeg',
    description: 'Full desktop channel header backdrop (2560x1440)'
  },
  {
    id: 'facebook-post',
    name: 'Facebook Timeline Post',
    category: 'Social Media',
    platform: 'Facebook',
    width: 1200,
    height: 630,
    aspectRatioLabel: '1.91:1',
    format: 'jpeg',
    description: 'Standard horizontal timeline feed post (1200x630)'
  },
  {
    id: 'facebook-story',
    name: 'Facebook Story',
    category: 'Social Media',
    platform: 'Facebook',
    width: 1080,
    height: 1920,
    aspectRatioLabel: '9:16',
    format: 'jpeg',
    description: 'Vertical 9:16 story display dimension (1080x1920)'
  },
  {
    id: 'facebook-profile',
    name: 'Facebook Profile Picture',
    category: 'Social Media',
    platform: 'Facebook',
    width: 800,
    height: 800,
    aspectRatioLabel: '1:1',
    format: 'jpeg',
    description: 'High-res square profile avatar layout (800x800)'
  },
  {
    id: 'linkedin-post',
    name: 'LinkedIn Feed Post',
    category: 'Social Media',
    platform: 'LinkedIn',
    width: 1200,
    height: 627,
    aspectRatioLabel: '1.91:1',
    format: 'jpeg',
    description: 'Optimal business feed graphic dimension (1200x627)'
  },
  {
    id: 'linkedin-banner',
    name: 'LinkedIn Profile Banner',
    category: 'Social Media',
    platform: 'LinkedIn',
    width: 1584,
    height: 396,
    aspectRatioLabel: '4:1',
    format: 'jpeg',
    description: 'Professional cover header banner (1584x396)'
  },
  {
    id: 'pinterest-pin',
    name: 'Pinterest Standard Pin',
    category: 'Social Media',
    platform: 'Pinterest',
    width: 1000,
    height: 1500,
    aspectRatioLabel: '2:3',
    format: 'jpeg',
    description: 'High-resolution vertical pin standard (1000x1500)'
  },
  {
    id: 'whatsapp-status',
    name: 'WhatsApp Status',
    category: 'Social Media',
    platform: 'WhatsApp',
    width: 1080,
    height: 1920,
    aspectRatioLabel: '9:16',
    format: 'jpeg',
    description: 'Vertical 9:16 full-screen status format (1080x1920)'
  },
  {
    id: 'whatsapp-dp',
    name: 'WhatsApp DP / Avatar',
    category: 'Social Media',
    platform: 'WhatsApp',
    width: 500,
    height: 500,
    aspectRatioLabel: '1:1',
    format: 'jpeg',
    description: 'Square profile avatar layout (500x500)'
  },
  {
    id: 'x-post',
    name: 'X / Twitter In-Stream Post',
    category: 'Social Media',
    platform: 'X/Twitter',
    width: 1200,
    height: 675,
    aspectRatioLabel: '16:9',
    format: 'jpeg',
    description: 'Landscape feed post standard (1200x675)'
  },
  {
    id: 'x-header',
    name: 'X / Twitter Header',
    category: 'Social Media',
    platform: 'X/Twitter',
    width: 1500,
    height: 500,
    aspectRatioLabel: '3:1',
    format: 'jpeg',
    description: 'Profile background header banner (1500x500)'
  },

  // ==================== PROFILE & AVATAR ====================
  {
    id: 'profile-square-hd',
    name: 'High-Res Square Avatar',
    category: 'Profile & Avatar',
    width: 1024,
    height: 1024,
    aspectRatioLabel: '1:1',
    format: 'png',
    description: '1024x1024 pixel high resolution avatar suitable for Discord, Slack, and web profiles.'
  },
  {
    id: 'profile-medium',
    name: 'Standard Profile Picture',
    category: 'Profile & Avatar',
    width: 600,
    height: 600,
    aspectRatioLabel: '1:1',
    format: 'jpeg',
    description: 'Crisp 600x600 profile photo with circular alignment preview.'
  },
  {
    id: 'profile-compact',
    name: 'Compact Thumbnail Avatar',
    category: 'Profile & Avatar',
    width: 300,
    height: 300,
    aspectRatioLabel: '1:1',
    format: 'png',
    description: 'Compact 300x300 avatar with support for alpha transparency.'
  },

  // ==================== PAPER & PRINT ====================
  {
    id: 'print-a4-sheet',
    name: 'A4 Photo Sheet (300 DPI)',
    category: 'Paper & Print',
    width: 2480,
    height: 3508,
    aspectRatioLabel: '1:1.414',
    format: 'jpeg',
    defaultDPI: 300,
    physicalSize: { width: 210, height: 297, unit: 'mm' },
    description: 'Full-resolution A4 print sheet (210x297 mm) @ 300 DPI for photo printing.'
  },
  {
    id: 'print-a5-sheet',
    name: 'A5 Photo Sheet (300 DPI)',
    category: 'Paper & Print',
    width: 1748,
    height: 2480,
    aspectRatioLabel: '1:1.414',
    format: 'jpeg',
    defaultDPI: 300,
    physicalSize: { width: 148, height: 210, unit: 'mm' },
    description: 'Full-resolution A5 print sheet (148x210 mm) @ 300 DPI.'
  },
  {
    id: 'print-4x6-sheet',
    name: '4" x 6" Photo Paper (300 DPI)',
    category: 'Paper & Print',
    width: 1200,
    height: 1800,
    aspectRatioLabel: '2:3',
    format: 'jpeg',
    defaultDPI: 300,
    physicalSize: { width: 4, height: 6, unit: 'in' },
    description: 'Standard 4x6 inch (10x15 cm) photo studio postcard paper @ 300 DPI.'
  },
  {
    id: 'print-letter-sheet',
    name: 'US Letter Print Sheet (300 DPI)',
    category: 'Paper & Print',
    width: 2550,
    height: 3300,
    aspectRatioLabel: '8.5:11',
    format: 'jpeg',
    defaultDPI: 300,
    physicalSize: { width: 8.5, height: 11, unit: 'in' },
    description: 'Standard US Letter paper size (8.5x11 inches) @ 300 DPI.'
  },

  // ==================== WEB & BANNER ====================
  {
    id: 'web-small',
    name: 'Small Web Image',
    category: 'Web & Banner',
    width: 640,
    height: 480,
    aspectRatioLabel: '4:3',
    format: 'webp',
    description: 'Fast-loading compact thumbnail & blog inline (640x480)'
  },
  {
    id: 'web-medium',
    name: 'Medium Web Image',
    category: 'Web & Banner',
    width: 1280,
    height: 720,
    aspectRatioLabel: '16:9',
    format: 'webp',
    description: 'Standard balanced HD web asset (1280x720)'
  },
  {
    id: 'web-large',
    name: 'Full HD Hero Banner',
    category: 'Web & Banner',
    width: 1920,
    height: 1080,
    aspectRatioLabel: '16:9',
    format: 'webp',
    description: 'Full HD hero banner & background (1920x1080)'
  },
  {
    id: 'web-logo',
    name: 'Website Logo (Transparent)',
    category: 'Web & Banner',
    width: 400,
    height: 400,
    aspectRatioLabel: '1:1',
    format: 'png',
    description: 'Square brand mark asset with transparent background (400x400 PNG)'
  },

  // ==================== APP ICONS ====================
  {
    id: 'playstore-icon',
    name: 'Google Play Store App Icon',
    category: 'App Icons',
    width: 512,
    height: 512,
    aspectRatioLabel: '1:1',
    format: 'png',
    description: 'Google Play Console official asset standard (512x512 PNG)'
  },
  {
    id: 'appstore-icon',
    name: 'Apple App Store Icon',
    category: 'App Icons',
    width: 1024,
    height: 1024,
    aspectRatioLabel: '1:1',
    format: 'png',
    description: 'iOS App Store high-res icon asset (1024x1024 PNG)'
  },
  {
    id: 'pwa-icon-192',
    name: 'PWA Home Screen Icon',
    category: 'App Icons',
    width: 192,
    height: 192,
    aspectRatioLabel: '1:1',
    format: 'png',
    description: 'Standard Web App Manifest home screen icon (192x192 PNG)'
  },
  {
    id: 'pwa-icon-512',
    name: 'PWA Splash Screen Icon',
    category: 'App Icons',
    width: 512,
    height: 512,
    aspectRatioLabel: '1:1',
    format: 'png',
    description: 'Standard Web App Manifest splash screen icon (512x512 PNG)'
  },
  {
    id: 'browser-favicon',
    name: 'Browser Favicon',
    category: 'App Icons',
    width: 32,
    height: 32,
    aspectRatioLabel: '1:1',
    format: 'png',
    description: 'Browser tab standard icon resolution (32x32 PNG)'
  }
];

export function getPresetById(id: string): SmartPreset | undefined {
  return SMART_PRESETS.find(p => p.id === id);
}

export function getPresetsByCategory(category: PresetCategory): SmartPreset[] {
  return SMART_PRESETS.filter(p => p.category === category);
}
