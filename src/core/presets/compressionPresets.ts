/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CompressionSmartPreset {
  id: string;
  name: string;
  shortName: string;
  description: string;
  recommendationNote: string;
  targetSizeKB: number;
  availableSizesKB: number[];
  preferredFormat: 'jpeg' | 'webp' | 'png' | 'avif' | 'auto';
  qualityMode: 'auto' | 'high' | 'balanced' | 'smallest';
  maxDimension?: number;
  fixedWidth?: number;
  fixedHeight?: number;
  aspectRatioLabel?: string;
  badge?: string;
}

export const TARGET_SIZE_PRESETS = [
  { label: '20 KB', valueKB: 20 },
  { label: '50 KB', valueKB: 50 },
  { label: '100 KB', valueKB: 100 },
  { label: '200 KB', valueKB: 200 },
  { label: '500 KB', valueKB: 500 },
  { label: '1 MB', valueKB: 1024 },
] as const;

/**
 * Smart Presets for real-world usage.
 * NOTE: These are recommendations based on common platform guidelines, not official statutory guarantees.
 */
export const COMPRESSION_SMART_PRESETS: CompressionSmartPreset[] = [
  {
    id: 'government',
    name: 'Government Form',
    shortName: 'Government',
    badge: 'Forms & Portals',
    description: 'Optimized for official application portals (SSC, UPSC, State PSC, Visa, Exams).',
    recommendationNote: 'Recommendation based on common portal guidelines (typically 20 KB to 100 KB JPEG). Verify your specific portal requirements.',
    targetSizeKB: 50,
    availableSizesKB: [20, 50, 100],
    preferredFormat: 'jpeg',
    qualityMode: 'balanced',
    maxDimension: 1000,
  },
  {
    id: 'passport',
    name: 'Passport Photo',
    shortName: 'Passport',
    badge: 'Biometric',
    description: 'Biometric standard proportions (2×2" / 35×45mm) with clean facial clarity.',
    recommendationNote: 'Recommendation for biometric portrait photos. Official dimensions (e.g. 600×600 px or 413×531 px) should be checked against issuing authority rules.',
    targetSizeKB: 50,
    availableSizesKB: [20, 50, 100],
    preferredFormat: 'jpeg',
    qualityMode: 'high',
    maxDimension: 800,
    aspectRatioLabel: '1:1 / 35:45',
  },
  {
    id: 'signature',
    name: 'Signature Scan',
    shortName: 'Signature',
    badge: 'Document',
    description: 'Crisp ink lines on white paper without grey artifacting for digital signatures.',
    recommendationNote: 'Recommendation for document signature uploads. Target sizes are typically 10 KB to 50 KB.',
    targetSizeKB: 20,
    availableSizesKB: [10, 20, 50],
    preferredFormat: 'jpeg',
    qualityMode: 'balanced',
    maxDimension: 600,
    aspectRatioLabel: '2:1 or 3:1',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Share',
    shortName: 'WhatsApp',
    badge: 'Messaging',
    description: 'Balanced compression prioritizing visual quality and fast transfer over micro-sizes.',
    recommendationNote: 'Recommendation for chat sharing. Keeps photos sharp at ~200 KB while avoiding messaging app heavy re-compression.',
    targetSizeKB: 200,
    availableSizesKB: [100, 200, 400],
    preferredFormat: 'jpeg',
    qualityMode: 'high',
    maxDimension: 1600,
  },
  {
    id: 'instagram',
    name: 'Instagram & Social',
    shortName: 'Instagram',
    badge: 'Social Media',
    description: 'Optimized for Instagram feeds and stories with rich color balance up to 1080px.',
    recommendationNote: 'Recommendation for social feeds. Preserves vibrant colors and avoids feed compression artifacts.',
    targetSizeKB: 500,
    availableSizesKB: [300, 500, 800],
    preferredFormat: 'jpeg',
    qualityMode: 'high',
    maxDimension: 1080,
    aspectRatioLabel: '1:1 or 4:5',
  },
  {
    id: 'website',
    name: 'Website & Blog',
    shortName: 'Website',
    badge: 'Web Performance',
    description: 'Modern WebP compression for rapid page loads, Core Web Vitals, and SEO.',
    recommendationNote: 'Recommendation for web publishing. WebP format delivers superior compression with rich transparency support.',
    targetSizeKB: 100,
    availableSizesKB: [50, 100, 200],
    preferredFormat: 'webp',
    qualityMode: 'balanced',
    maxDimension: 1600,
  },
  {
    id: 'email',
    name: 'Email Attachment',
    shortName: 'Email',
    badge: 'Inbox Friendly',
    description: 'Compact file size to easily pass through strict email server attachment limits.',
    recommendationNote: 'Recommendation for email attachments. Ensures quick sending and avoids mailbox storage quotas.',
    targetSizeKB: 100,
    availableSizesKB: [50, 100, 200],
    preferredFormat: 'jpeg',
    qualityMode: 'smallest',
    maxDimension: 1000,
  },
  {
    id: 'youtube',
    name: 'YouTube Thumbnail',
    shortName: 'YouTube',
    badge: 'Thumbnail',
    description: 'Preserves 1280×720 (16:9) crispness under the 2 MB YouTube upload limit.',
    recommendationNote: 'Recommendation for video thumbnails. Retains high resolution (1280×720) while remaining safely below the 2 MB cap.',
    targetSizeKB: 500,
    availableSizesKB: [300, 500, 1024],
    preferredFormat: 'jpeg',
    qualityMode: 'high',
    maxDimension: 1280,
    fixedWidth: 1280,
    fixedHeight: 720,
    aspectRatioLabel: '16:9',
  },
];
