/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Centralized Google AdSense Configuration
 * Controls script injection, publisher ID validation, and ad slot mapping.
 * 
 * Default is strictly disabled (VITE_ADSENSE_ENABLED=false).
 * Only activate when valid publisher credentials and approvals are secured.
 */

export interface AdSenseConfig {
  enabled: boolean;
  publisherId: string;
  slots: {
    homepage: string;
    article: string;
    tool: string;
  };
}

const rawEnabled = import.meta.env.VITE_ADSENSE_ENABLED;
const rawPublisherId = import.meta.env.VITE_ADSENSE_PUBLISHER_ID || '';

export const ADSENSE_CONFIG: AdSenseConfig = {
  enabled: rawEnabled === 'true' || rawEnabled === true,
  publisherId: rawPublisherId.trim(),
  slots: {
    homepage: (import.meta.env.VITE_ADSENSE_SLOT_HOMEPAGE || '').trim(),
    article: (import.meta.env.VITE_ADSENSE_SLOT_ARTICLE || '').trim(),
    tool: (import.meta.env.VITE_ADSENSE_SLOT_TOOL || '').trim(),
  },
};

/**
 * Validate that a publisher ID matches the standard Google AdSense format: ca-pub-XXXXXXXXXXXXXXXX
 */
export function isValidPublisherId(id: string): boolean {
  if (!id) return false;
  return /^ca-pub-\d{10,20}$/.test(id);
}

/**
 * Verify whether AdSense is both enabled and equipped with a valid publisher ID
 */
export function shouldLoadAdSense(): boolean {
  return ADSENSE_CONFIG.enabled && isValidPublisherId(ADSENSE_CONFIG.publisherId);
}

// Script injection tracker to guarantee no duplicate script elements
let scriptInjected = false;

/**
 * Safely load Google AdSense script only once when enabled with valid publisher configuration
 */
export function initializeAdSense(): void {
  if (typeof window === 'undefined') return;
  if (!shouldLoadAdSense()) return;
  if (scriptInjected) return;

  const existingScript = document.querySelector('script[src*="pagead2.googlesyndication.com"]');
  if (existingScript) {
    scriptInjected = true;
    return;
  }

  try {
    const script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(ADSENSE_CONFIG.publisherId)}`;
    script.onload = () => {
      scriptInjected = true;
    };
    script.onerror = () => {
      console.warn('AdSense script failed to load. Ad display skipped.');
    };
    document.head.appendChild(script);
    scriptInjected = true;
  } catch (err) {
    console.warn('Unable to initialize AdSense:', err);
  }
}
