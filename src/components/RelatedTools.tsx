/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowRight, Sparkles, FileText, Minimize2, Camera, Layers, ShieldCheck, Image as ImageIcon } from 'lucide-react';
import { SEO_PAGES } from '../config/seoPagesConfig';

export interface RelatedToolsProps {
  currentSlug: string;
  relatedSlugs?: string[];
  categoryTitle?: string;
  onNavigate?: (slug: string) => void;
}

// Map slug to a suitable icon
function getToolIcon(slug: string) {
  if (slug.includes('signature')) return <FileText className="h-4 w-4" />;
  if (slug.includes('passport') || slug.includes('ssc')) return <Camera className="h-4 w-4" />;
  if (slug.includes('resize') || slug.includes('thumbnail') || slug.includes('social')) return <Minimize2 className="h-4 w-4" />;
  if (slug.includes('png') || slug.includes('jpg') || slug.includes('webp')) return <Layers className="h-4 w-4" />;
  return <Sparkles className="h-4 w-4" />;
}

// Map slug to a descriptive badge
function getToolBadge(slug: string): string {
  if (slug.includes('20kb')) return '20 KB Target';
  if (slug.includes('50kb')) return '50 KB Target';
  if (slug.includes('100kb')) return '100 KB Target';
  if (slug.includes('200kb')) return '200 KB Target';
  if (slug.includes('500kb')) return '500 KB Target';
  if (slug.includes('1mb')) return '1 MB Target';
  if (slug.includes('jpg-to-webp')) return 'WebP Transcoder';
  if (slug.includes('webp-to-jpg')) return 'JPEG Compatibility';
  if (slug.includes('png-to-jpg')) return 'PNG Reducer';
  if (slug.includes('jpg-to-png')) return 'Lossless PNG';
  if (slug.includes('compress-jpg')) return 'JPG Optimizer';
  if (slug.includes('compress-png')) return 'PNG Optimizer';
  if (slug.includes('compress-webp')) return 'WebP Optimizer';
  if (slug.includes('signature')) return 'Signature Tool';
  if (slug.includes('passport')) return 'Passport Sizing';
  if (slug.includes('ssc')) return 'Government Forms';
  if (slug.includes('youtube')) return '16:9 Thumbnail';
  if (slug.includes('social')) return 'Social Dimensions';
  if (slug.includes('resizer')) return 'Dimension Tool';
  return 'Utility';
}

export default function RelatedTools({
  currentSlug,
  relatedSlugs,
  categoryTitle = 'Related Image Tools',
  onNavigate
}: RelatedToolsProps) {
  // If relatedSlugs not provided, choose 4 default pages excluding current
  const slugsToRender = relatedSlugs && relatedSlugs.length > 0
    ? relatedSlugs.filter(s => s !== currentSlug)
    : Object.keys(SEO_PAGES).filter(s => s !== currentSlug).slice(0, 4);

  if (slugsToRender.length === 0) return null;

  const handleClick = (e: React.MouseEvent, slug: string) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate(slug);
    } else {
      window.history.pushState({}, '', slug);
      window.dispatchEvent(new Event('popstate'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <section aria-labelledby="related-tools-heading" className="space-y-4 pt-6">
      <div className="flex items-center justify-between">
        <h2 
          id="related-tools-heading" 
          className="text-lg font-bold tracking-tight text-slate-900 dark:text-white sm:text-xl"
        >
          {categoryTitle}
        </h2>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          In-Browser Tools
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {slugsToRender.map((slug) => {
          const config = SEO_PAGES[slug];
          if (!config) return null;

          const badge = getToolBadge(slug);
          const icon = getToolIcon(slug);

          return (
            <a
              key={slug}
              href={slug}
              onClick={(e) => handleClick(e, slug)}
              className="group flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs transition-all hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-indigo-700/60"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                    {icon}
                    <span>{badge}</span>
                  </span>
                  <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                    Zero Uploads
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                  {config.h1}
                </h3>

                <p className="line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  {config.subtitle || config.metaDescription}
                </p>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-semibold text-indigo-600 dark:border-slate-800 dark:text-indigo-400">
                <span>Open tool</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
