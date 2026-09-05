/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SITE_CONFIG, getCanonicalUrl } from '../config/site';

export interface SeoMetadataOptions {
  title: string;
  description: string;
  path: string;
  ogImage?: string;
  type?: 'website' | 'article';
  noIndex?: boolean;
}

/**
 * Updates DOM head elements dynamically for client-side routing.
 */
export function updateSeoMetadata(options: SeoMetadataOptions): void {
  if (typeof document === 'undefined') return;

  const {
    title,
    description,
    path,
    ogImage = SITE_CONFIG.defaultOgImage,
    type = 'website',
    noIndex = false,
  } = options;

  // 1. Title
  document.title = title;

  // Helper to set or update meta tag
  const setMeta = (selector: string, attrName: string, attrVal: string, content: string) => {
    let el = document.querySelector(selector);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attrName, attrVal);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  // Robots indexing directive
  setMeta('meta[name="robots"]', 'name', 'robots', noIndex ? 'noindex, nofollow' : 'index, follow');

  // 2. Meta description
  setMeta('meta[name="description"]', 'name', 'description', description);

  // 3. Canonical Link
  const canonicalUrl = getCanonicalUrl(path);
  let canonicalEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!canonicalEl) {
    canonicalEl = document.createElement('link');
    canonicalEl.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalEl);
  }
  canonicalEl.setAttribute('href', canonicalUrl);

  // 4. OpenGraph
  setMeta('meta[property="og:title"]', 'property', 'og:title', title);
  setMeta('meta[property="og:description"]', 'property', 'og:description', description);
  setMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
  setMeta('meta[property="og:image"]', 'property', 'og:image', ogImage);
  setMeta('meta[property="og:type"]', 'property', 'og:type', type);
  setMeta('meta[property="og:site_name"]', 'property', 'og:site_name', SITE_CONFIG.siteName);

  // 5. Twitter Card
  setMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
  setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
  setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
  setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', ogImage);
}

/**
 * Injects or updates a JSON-LD structured data script tag with a unique ID.
 */
export function injectJsonLd(id: string, data: object | null): void {
  if (typeof document === 'undefined') return;

  const existing = document.getElementById(id);
  if (!data) {
    if (existing) existing.remove();
    return;
  }

  if (existing) {
    existing.textContent = JSON.stringify(data);
  } else {
    const script = document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
  }
}
