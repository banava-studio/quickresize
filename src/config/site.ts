/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Centralized Site and SEO Configuration for QuickResize
 * Primary Production Domain: https://quickresize.banavalabs.com
 */
const envSiteUrl = import.meta.env.VITE_SITE_URL;
const envSiteName = import.meta.env.VITE_SITE_NAME;
const envContactEmail = import.meta.env.VITE_CONTACT_EMAIL;

export const SITE_CONFIG = {
  baseUrl: (envSiteUrl && typeof envSiteUrl === 'string' && envSiteUrl.startsWith('http')) 
    ? envSiteUrl.replace(/\/+$/, '') 
    : 'https://quickresize.banavalabs.com',
  siteName: (envSiteName && typeof envSiteName === 'string') 
    ? envSiteName 
    : 'QuickResize',
  publisher: 'BanavaLabs',
  brandTagline: 'QuickResize by BanavaLabs',
  contactEmail: 'banavalabs@gmail.com',
  supportEmail: 'banavalabs@gmail.com',
  author: 'QuickResize Editorial Team',
  defaultTitle: 'QuickResize — Fast, Private In-Browser Image Compressor & Resizer',
  defaultDescription: 'Compress, resize, and convert images locally in your browser with complete privacy. No server uploads, zero sign-ups, instant results.',
  defaultOgImage: 'https://quickresize.banavalabs.com/icons/icon-512x512.png',
  twitterHandle: '@BanavaLabs',
  themeColor: '#4f46e5',
};

export function getCanonicalUrl(path: string = ''): string {
  if (!path || path === '/' || path === '/index.html') {
    return SITE_CONFIG.baseUrl;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  // Remove any trailing slash unless it's just the root
  const normalized = cleanPath.length > 1 && cleanPath.endsWith('/') 
    ? cleanPath.slice(0, -1) 
    : cleanPath;
  return `${SITE_CONFIG.baseUrl}${normalized}`;
}
