/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ChevronDown, 
  ChevronRight, 
  HelpCircle, 
  CheckCircle2, 
  BookOpen, 
  Layers, 
  FileText,
  Lock,
  Zap,
  Info
} from 'lucide-react';
import { getSeoPageConfig, SeoPageConfig } from '../config/seoPagesConfig';
import { SITE_CONFIG, getCanonicalUrl } from '../config/site';
import { updateSeoMetadata, injectJsonLd } from '../utils/seoMetadata';
import { ADSENSE_CONFIG } from '../config/adsense';
import AdSlot from './AdSlot';
import RelatedTools from './RelatedTools';

interface SeoPagesProps {
  pathname: string;
  onNavigateToTab?: (tab: string, mode?: string) => void;
}

export default function SeoPages({ pathname, onNavigateToTab }: SeoPagesProps) {
  const config: SeoPageConfig | null = getSeoPageConfig(pathname);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Update document title, meta tags, and structured data
  useEffect(() => {
    if (!config) return;

    // 1. Update Title, Meta Description, Canonical URL, OpenGraph
    updateSeoMetadata({
      title: config.title,
      description: config.metaDescription,
      path: config.slug,
      ogImage: SITE_CONFIG.defaultOgImage,
      type: 'website',
    });

    // 2. Structured Data: BreadcrumbList
    const breadcrumbListSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': config.breadcrumbs.map((crumb, idx) => ({
        '@type': 'ListItem',
        'position': idx + 1,
        'name': crumb.name,
        'item': getCanonicalUrl(crumb.url),
      })),
    };
    injectJsonLd('schema-breadcrumbs', breadcrumbListSchema);

    // 3. Structured Data: FAQPage (strictly matching visible FAQs)
    const faqSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      'mainEntity': config.faq.map((item) => ({
        '@type': 'Question',
        'name': item.question,
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': item.answer,
        },
      })),
    };
    injectJsonLd('schema-faq', faqSchema);

    // 4. Structured Data: WebApplication
    const appSchema = {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      'name': `QuickResize — ${config.h1}`,
      'url': getCanonicalUrl(config.slug),
      'applicationCategory': 'MultimediaApplication',
      'operatingSystem': 'All',
      'description': config.metaDescription,
      'browserRequirements': 'Requires HTML5 Canvas support',
      'offers': {
        '@type': 'Offer',
        'price': '0',
        'priceCurrency': 'USD',
      },
    };
    injectJsonLd('schema-application', appSchema);

    // Cleanup schemas on unmount
    return () => {
      injectJsonLd('schema-breadcrumbs', null);
      injectJsonLd('schema-faq', null);
      injectJsonLd('schema-application', null);
    };
  }, [config]);

  if (!config) {
    return null;
  }

  const handleBreadcrumbClick = (e: React.MouseEvent, url: string) => {
    e.preventDefault();
    try {
      window.history.pushState({}, '', url);
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch {
      if (onNavigateToTab) onNavigateToTab('dashboard');
    }
  };

  const handleNavigateSlug = (slug: string) => {
    try {
      window.history.pushState({}, '', slug);
      window.dispatchEvent(new PopStateEvent('popstate'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      if (onNavigateToTab) onNavigateToTab('dashboard');
    }
  };

  return (
    <div className="space-y-12 border-t border-slate-200/80 pt-10 text-slate-800 dark:border-slate-800 dark:text-slate-200">
      
      {/* 1. Visible Breadcrumbs */}
      <nav aria-label="Breadcrumbs" className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
        {config.breadcrumbs.map((crumb, idx) => {
          const isLast = idx === config.breadcrumbs.length - 1;
          return (
            <React.Fragment key={crumb.url}>
              {idx > 0 && <ChevronRight className="h-3 w-3 text-slate-400" aria-hidden="true" />}
              {isLast ? (
                <span className="font-semibold text-slate-900 dark:text-white" aria-current="page">
                  {crumb.name}
                </span>
              ) : (
                <a
                  href={crumb.url}
                  onClick={(e) => handleBreadcrumbClick(e, crumb.url)}
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  {crumb.name}
                </a>
              )}
            </React.Fragment>
          );
        })}
      </nav>

      {/* 2. Page Header & Introduction */}
      <header className="space-y-3">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
          <Lock className="h-3.5 w-3.5" />
          <span>Local Device Processing</span>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl lg:text-4xl">
          {config.h1}
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-400 sm:text-base">
          {config.subtitle}
        </p>
      </header>

      {/* 3. Privacy & Technical Architecture Notice */}
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 dark:border-indigo-950/60 dark:bg-indigo-950/20 sm:p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400 mt-0.5" />
          <div className="space-y-1 text-xs sm:text-sm">
            <p className="font-bold text-indigo-950 dark:text-indigo-200">
              Privacy First: Local In-Browser Execution
            </p>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              QuickResize processes selected images locally in your browser for supported tools and does not upload the image file to QuickResize's own servers. Your photos, signatures, and confidential documents remain on your device throughout compression and resizing.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Key Highlights Grid */}
      <section aria-labelledby="key-highlights-heading" className="space-y-4">
        <h2 id="key-highlights-heading" className="text-lg font-bold tracking-tight text-slate-900 dark:text-white sm:text-xl">
          Key Capabilities & Benefits
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {config.keyPoints.map((point, i) => (
            <div 
              key={i} 
              className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900/60"
            >
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {point.title}
                </h3>
              </div>
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                {point.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Step-by-Step How To Use Guide */}
      <section aria-labelledby="how-to-use-heading" className="space-y-4">
        <h2 id="how-to-use-heading" className="text-lg font-bold tracking-tight text-slate-900 dark:text-white sm:text-xl">
          How to Use this Tool
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {config.howToUse.map((step) => (
            <div 
              key={step.step}
              className="relative flex flex-col justify-between rounded-xl border border-slate-200/70 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/50"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                    {step.step}
                  </span>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                    {step.title}
                  </h3>
                </div>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {step.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Deep Dive: Why File Size Matters & Dimensions Impact */}
      <section aria-labelledby="file-size-matters-heading" className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-900/40 space-y-4">
        <h2 id="file-size-matters-heading" className="text-lg font-bold tracking-tight text-slate-900 dark:text-white sm:text-xl">
          {config.whyFileSizeMatters.heading}
        </h2>
        <p className="text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-350">
          {config.whyFileSizeMatters.text}
        </p>
        {config.whyFileSizeMatters.details && config.whyFileSizeMatters.details.length > 0 && (
          <ul className="space-y-2 pt-2 text-xs text-slate-600 dark:text-slate-400">
            {config.whyFileSizeMatters.details.map((detail, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 shrink-0 mt-1.5" />
                <span>{detail}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 7. Format Recommendations */}
      <section aria-labelledby="format-recommendations-heading" className="space-y-4">
        <h2 id="format-recommendations-heading" className="text-lg font-bold tracking-tight text-slate-900 dark:text-white sm:text-xl">
          {config.formatRecommendations.heading}
        </h2>
        <p className="text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {config.formatRecommendations.text}
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {config.formatRecommendations.formats.map((fmt, idx) => (
            <div 
              key={idx}
              className="rounded-xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60 space-y-1.5"
            >
              <span className="inline-block font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                {fmt.name}
              </span>
              <p className="text-xs font-semibold text-slate-900 dark:text-white">
                Best for: {fmt.bestFor}
              </p>
              <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {fmt.note}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 8. Frequently Asked Questions (Accordion) */}
      <section aria-labelledby="faq-heading" className="space-y-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h2 id="faq-heading" className="text-lg font-bold tracking-tight text-slate-900 dark:text-white sm:text-xl">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="divide-y divide-slate-200/80 rounded-xl border border-slate-200/80 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900/60">
          {config.faq.map((item, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div key={idx} className="p-4 sm:p-5">
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between text-left text-xs sm:text-sm font-bold text-slate-900 dark:text-white transition-colors hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                >
                  <span className="pr-4">{item.question}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-indigo-600 dark:text-indigo-400' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="mt-3 text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-400 animate-fade-in">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Non-intrusive Monetization Area (Renders only if AdSense is enabled) */}
      <AdSlot slot={ADSENSE_CONFIG.slots.tool} format="auto" className="my-8" />

      {/* 9. Reusable Related Tools */}
      <RelatedTools
        currentSlug={config.slug}
        relatedSlugs={config.relatedToolSlugs}
        categoryTitle="Related Image Tools"
        onNavigate={handleNavigateSlug}
      />

    </div>
  );
}
