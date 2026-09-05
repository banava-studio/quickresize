/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Search, 
  Clock, 
  ArrowLeft, 
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
  ExternalLink,
  Layers,
  FileText
} from 'lucide-react';
import { SITE_CONFIG, getCanonicalUrl } from '../config/site';
import { updateSeoMetadata, injectJsonLd } from '../utils/seoMetadata';
import { ADSENSE_CONFIG } from '../config/adsense';
import AdSlot from './AdSlot';

export interface BlogArticle {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  datePublished: string;
  dateModified: string;
  author: string;
  publisher: string;
  toolLinks: { title: string; url: string }[];
  sections: {
    heading: string;
    paragraphs: string[];
    sublist?: string[];
  }[];
  faq?: { question: string; answer: string }[];
}

export const BLOG_ARTICLES: BlogArticle[] = [
  {
    slug: 'how-to-compress-image-to-100kb',
    title: 'How to Compress an Image to 100KB Without Losing Too Much Quality',
    excerpt: 'A practical guide to balancing pixel dimensions, quantization levels, and file formats to achieve a sharp 100 KB image for resumes, forms, and web publishing.',
    category: 'Image Compression',
    readTime: '6 min read',
    datePublished: '2026-06-15',
    dateModified: '2026-08-20',
    author: 'QuickResize Editorial Team',
    publisher: 'BanavaLabs',
    toolLinks: [
      { title: 'Compress to 100KB Tool', url: '/compress-image-to-100kb' },
      { title: 'JPG Compressor', url: '/compress-jpg' },
      { title: 'WebP Compressor', url: '/compress-webp' }
    ],
    sections: [
      {
        heading: 'Why 100 KB is the Standard Web Benchmark',
        paragraphs: [
          'In web development, email marketing, and online applications, 100 KB is considered an optimal target file size. A 100 KB image loads in less than 50 milliseconds over standard mobile networks, avoiding page stutter and layout shifts. At the same time, 100 KB provides sufficient byte budget to preserve clear text, clean portrait contours, and vibrant colors on modern Retina displays.',
          'However, compressing an image down to 100 KB directly from a 10 MB camera capture without the right technique often produces blurry, pixelated results. Understanding how file size is calculated helps achieve this target with minimal visual degradation.'
        ]
      },
      {
        heading: 'Step 1: Adjust Dimensions Before Quality Compression',
        paragraphs: [
          'File size is fundamentally determined by the number of pixels in your image. A 4000×3000 photo contains 12 million pixels. Attempting to fit 12 million pixels into 100 kilobytes requires compressing each pixel down to a fraction of a bit, which causes heavy JPEG block artifacts.',
          'Before compressing quality, resize the pixel dimensions to match your actual use case:'
        ],
        sublist: [
          'For resume headshots and profile photos: 400×400 to 600×600 pixels is more than enough.',
          'For blog post illustrations and website graphics: 1200×800 pixels is optimal.',
          'For email newsletters: 600 to 800 pixels width fits standard email client reading panes.'
        ]
      },
      {
        heading: 'Step 2: Choose the Optimal Output Format',
        paragraphs: [
          'The format you select has a direct impact on the quality achievable at 100 KB:',
          'JPEG is the universal choice for photographs and application forms. It discards high-frequency details that human vision rarely perceives, allowing photos to retain clear facial details at 100 KB.',
          'WebP provides modern predictive compression. In many cases, WebP produces files 20% to 30% smaller than JPEG at comparable visual quality, making it the preferred choice for websites and blogs.',
          'Avoid saving photographic images as PNG when aiming for 100 KB. PNG is lossless and will struggle to reach 100 KB unless dimensions are extremely small.'
        ]
      },
      {
        heading: 'Step 3: Use Iterative Binary Search Optimization',
        paragraphs: [
          'Rather than guessing quality percentages with arbitrary sliders, automated target-size tools like QuickResize test multiple encoding quality levels in fractions of a second inside your browser memory.',
          'By testing quality factor boundaries iteratively, the engine identifies the highest possible visual quality setting that produces a file at or immediately under your 100 KB threshold.'
        ]
      },
      {
        heading: 'Practical Example: Headshot Optimization',
        paragraphs: [
          'Take a 4.2 MB smartphone portrait (3024×4032 pixels). Uploading this directly to a job board often triggers an upload error. First, crop the image to a 1:1 square centered on the face. Next, scale dimensions down to 600×600 pixels. Finally, apply 82% JPEG compression.',
          'The result is a crisp 78 KB file that satisfies portal constraints while looking sharp and professional on high-resolution screens.'
        ]
      }
    ],
    faq: [
      {
        question: 'Will compressing to 100KB make text blurry?',
        answer: 'Text on documents remains legible at 100KB if pixel dimensions are maintained around 1000 to 1400 pixels width. For pure text documents, grayscale encoding also saves bytes.'
      },
      {
        question: 'Can I compress multiple images to 100KB at once?',
        answer: 'Yes. QuickResize supports batch processing, allowing you to drop multiple files and optimize them to 100 KB simultaneously in your browser.'
      }
    ]
  },
  {
    slug: 'jpg-vs-png-vs-webp-comparison',
    title: 'JPG vs PNG vs WebP: Which Image Format Should You Use?',
    excerpt: 'An objective breakdown of JPEG, PNG, and WebP image formats: compression algorithms, transparency support, browser compatibility, and best use cases.',
    category: 'Image Optimization',
    readTime: '7 min read',
    datePublished: '2026-06-10',
    dateModified: '2026-08-18',
    author: 'QuickResize Editorial Team',
    publisher: 'BanavaLabs',
    toolLinks: [
      { title: 'JPG to WebP Converter', url: '/jpg-to-webp' },
      { title: 'PNG to JPG Converter', url: '/png-to-jpg' },
      { title: 'WebP to JPG Converter', url: '/webp-to-jpg' }
    ],
    sections: [
      {
        heading: 'The Modern Image Format Landscape',
        paragraphs: [
          'Choosing the right file format is one of the most effective ways to optimize web performance and ensure seamless compatibility across devices. While JPEG has been the internet standard for three decades and PNG has served as the staple for transparent graphics, WebP has become the modern standard for web delivery.',
          'Each format uses different compression algorithms tailored to specific types of visual content.'
        ]
      },
      {
        heading: 'JPEG: The Universal Standard for Photography',
        paragraphs: [
          'JPEG (Joint Photographic Experts Group) uses lossy compression based on the Discrete Cosine Transform (DCT). It separates brightness (luminance) from color (chrominance) and selectively discards color data that human eyes are less sensitive to.',
          'Strengths: Universal compatibility across every operating system, email client, photo frame, and government form validator. Highly efficient for complex scenes, landscapes, and portraits.',
          'Weaknesses: No transparency support (transparent backgrounds turn solid white or black). Repeatedly saving a JPEG causes generational loss. Sharp text and vector lines can show fuzzy halo artifacts.'
        ]
      },
      {
        heading: 'PNG: The Lossless Format for Graphics & Transparency',
        paragraphs: [
          'PNG (Portable Network Graphics) uses the lossless DEFLATE compression algorithm. It preserves every single pixel value exactly as created and includes an 8-bit alpha channel supporting 256 levels of transparency.',
          'Strengths: Perfect pixel fidelity. Essential for company logos, app icons, UI screenshots, and diagrams with fine text where blurry edges are unacceptable.',
          'Weaknesses: Significantly larger file sizes for photographic content. Storing complex camera photos as PNG often produces files 5 to 10 times larger than equivalent JPEGs.'
        ]
      },
      {
        heading: 'WebP: The High-Efficiency Modern Format',
        paragraphs: [
          'Developed by Google, WebP employs predictive coding derived from the VP8 video codec. It predicts pixel values from neighboring blocks and only encodes the difference, supporting both lossy and lossless modes as well as alpha transparency.',
          'Strengths: Often produces files 25% to 34% smaller than comparable JPEGs and PNGs at similar visual quality. Supports transparent backgrounds in lossy mode.',
          'Weaknesses: Some legacy offline software, desktop photo viewers, and older government upload portals do not accept .webp files.'
        ]
      },
      {
        heading: 'Quick Decision Matrix',
        paragraphs: [
          'Use JPEG for: Government application forms, passport photos, printing, and general camera photo sharing.',
          'Use PNG for: Logos, website favicons, software screenshots, and vector icons requiring transparent backgrounds.',
          'Use WebP for: Production websites, e-commerce product catalogs, blog articles, and mobile web applications.'
        ]
      }
    ],
    faq: [
      {
        question: 'Does converting PNG to JPEG reduce file size?',
        answer: 'Yes. For photographs and camera images, converting PNG to JPEG can reduce file size by 70% to 90%. Note that transparent areas will be filled with a solid background color.'
      },
      {
        question: 'Do all modern browsers support WebP?',
        answer: 'Yes. Chrome, Safari, Firefox, Edge, and mobile browsers have all natively supported WebP since 2020.'
      }
    ]
  },
  {
    slug: 'reduce-image-size-for-online-forms',
    title: 'How to Reduce Image File Size for Online Forms & Recruitment Portals',
    excerpt: 'Step-by-step instructions to meet strict 20KB, 50KB, and 100KB requirements on government, academic, and banking recruitment portals without rejection.',
    category: 'Government Form Guides',
    readTime: '8 min read',
    datePublished: '2026-06-05',
    dateModified: '2026-08-15',
    author: 'QuickResize Editorial Team',
    publisher: 'BanavaLabs',
    toolLinks: [
      { title: 'Compress to 20KB', url: '/compress-image-to-20kb' },
      { title: 'Compress to 50KB', url: '/compress-image-to-50kb' },
      { title: 'Signature Resizer', url: '/signature-resizer' },
      { title: 'Government Form Resizer', url: '/ssc-photo-resizer' }
    ],
    sections: [
      {
        heading: 'Why Online Portals Enforce Strict Upload Ceilings',
        paragraphs: [
          'When public service recruitment boards, banking exam authorities, and university admission portals open applications, they often receive hundreds of thousands of submissions in a matter of days. To prevent server crashes and keep database storage manageable, upload systems enforce strict limits—typically between 20 KB and 50 KB for candidate photos, and 10 KB to 20 KB for signatures.',
          'Portal validation scripts automatically inspect uploaded files. If an image exceeds the ceiling by even a single kilobyte, or if dimensions do not match specifications, the portal immediately rejects the file.'
        ]
      },
      {
        heading: 'Common Portal Specifications Checklist',
        paragraphs: [
          'While exact requirements vary by notification, commonly used guidelines include:'
        ],
        sublist: [
          'Candidate Passport Photo: Commonly 20 KB to 50 KB, JPEG format, 3.5cm × 4.5cm dimensions (approx. 350×450 pixels).',
          'Candidate Signature: Commonly 10 KB to 20 KB, JPEG format, approx. 140×60 or 300×150 pixels on white background.',
          'Scanned Certificates & Marksheets: Commonly 100 KB to 200 KB, JPEG or PDF format.'
        ]
      },
      {
        heading: 'Troubleshooting Common Rejection Causes',
        paragraphs: [
          '1. "File exceeds maximum size": If your file is 52 KB for a 50 KB limit, use a target-size compressor like QuickResize to set an explicit 48 KB ceiling.',
          '2. "Invalid file format": Even if a file is named photo.jpg, it might actually be a PNG or WebP with a renamed extension. Re-encode the image properly using a format converter rather than manually changing the file extension.',
          '3. "Signature unclear or blurry": Taking a photo of a signature in low light creates a dark gray background. Crop tightly around the pen strokes and increase contrast so the paper turns pure white and the ink stands out sharply.'
        ]
      },
      {
        heading: 'Privacy and Safety for Official Documents',
        paragraphs: [
          'Uploading government ID cards, passport portraits, and signature scans to untrusted online conversion websites can expose sensitive personal data to third-party databases.',
          'Always use tools that execute entirely in your local browser sandbox. QuickResize processes selected images locally on your device, ensuring your identity credentials never leave your computer.'
        ]
      }
    ],
    faq: [
      {
        question: 'What format is most universally accepted by official portals?',
        answer: 'Standard JPEG (.jpg) is universally accepted by almost all recruitment, admission, and visa portals.'
      },
      {
        question: 'How can I ensure my signature meets a 10KB to 20KB limit?',
        answer: 'Crop tightly around the signature to remove empty paper borders, resize to around 300×150 pixels, and save as JPEG with balanced quality.'
      }
    ]
  },
  {
    slug: 'compress-photos-for-email-and-websites',
    title: 'How to Compress Photos for Email Attachments and Website Performance',
    excerpt: 'Techniques for shrinking high-resolution camera photos so they send instantly via email and load quickly on mobile websites without bounce-backs.',
    category: 'Image Optimization',
    readTime: '6 min read',
    datePublished: '2026-05-28',
    dateModified: '2026-08-10',
    author: 'QuickResize Editorial Team',
    publisher: 'BanavaLabs',
    toolLinks: [
      { title: 'Compress to 200KB', url: '/compress-image-to-200kb' },
      { title: 'Compress to 500KB', url: '/compress-image-to-500kb' },
      { title: 'Image Resizer', url: '/image-resizer' }
    ],
    sections: [
      {
        heading: 'The Problem with Uncompressed Photos in Email',
        paragraphs: [
          'Modern smartphone cameras take photos that range from 5 MB to 15 MB each. Attaching four or five uncompressed photos to an email easily exceeds the typical 25 MB message limit enforced by Gmail, Outlook, and corporate mail servers.',
          'Even when an email goes through, large attachments consume recipients\' mobile data, take minutes to download on slow connections, and clutter inbox quotas. Compressing photos before sending solves these issues.'
        ]
      },
      {
        heading: 'Targeting the Right File Size for Email',
        paragraphs: [
          'For email communication, aim for between 200 KB and 500 KB per photo:',
          'At 300 KB, a 1920×1280 image appears crisp and full-screen on desktop monitors and phones, yet sends almost instantaneously.',
          'Ten photos optimized to 300 KB total just 3 MB, comfortably within any email provider\'s attachment limit.'
        ]
      },
      {
        heading: 'Optimizing Images for Website Speed and SEO',
        paragraphs: [
          'For website owners, unoptimized images are the single biggest cause of slow page load times. Google includes Core Web Vitals (specifically Largest Contentful Paint) in its search ranking algorithms.',
          'Key practices for web images include:'
        ],
        sublist: [
          'Never serve raw camera dimensions (4000px+) unless offering a full-resolution download.',
          'Cap full-width hero banners at 1920 pixels width and under 200 KB in WebP or JPEG format.',
          'Keep thumbnail images under 50 KB and inline blog graphics under 100 KB.'
        ]
      }
    ],
    faq: [
      {
        question: 'What is the maximum attachment limit for Gmail and Outlook?',
        answer: 'Both Gmail and Outlook typically enforce a 25 MB limit for total email attachments. Keeping photos under 500 KB each avoids bounce-backs.'
      },
      {
        question: 'Can I package multiple compressed photos into a ZIP file?',
        answer: 'Yes. QuickResize allows you to compress a batch of photos and download them packaged in a single organized ZIP folder.'
      }
    ]
  },
  {
    slug: 'how-image-compression-affects-quality-dimensions',
    title: 'How Image Compression Affects Quality, Artifacts, and Pixel Dimensions',
    excerpt: 'An engineering overview of lossy vs lossless compression, spatial frequency quantization, and why resizing dimensions is more effective than aggressive quality reduction.',
    category: 'Image Optimization',
    readTime: '7 min read',
    datePublished: '2026-05-15',
    dateModified: '2026-08-05',
    author: 'QuickResize Editorial Team',
    publisher: 'BanavaLabs',
    toolLinks: [
      { title: 'Target File Size Compressor', url: '/image-compressor' },
      { title: 'Dimension Resizer', url: '/image-resizer' },
      { title: 'JPG Compressor', url: '/compress-jpg' }
    ],
    sections: [
      {
        heading: 'The Mathematics of Image Compression',
        paragraphs: [
          'Digital images are grids of pixels. In an uncompressed 24-bit RGB image, every pixel requires 3 bytes of data (one byte each for Red, Green, and Blue). A standard 12-megapixel photograph contains 12,000,000 pixels, equating to 36 megabytes of uncompressed raw data.',
          'To transmit and store these images efficiently, compression algorithms identify and discard redundancy.'
        ]
      },
      {
        heading: 'Lossless vs Lossy Compression',
        paragraphs: [
          'Lossless compression (such as PNG and GIF) looks for repetitive patterns in the data without discarding any visual information. When decompressed, the image is mathematically identical to the original. However, lossless compression rarely achieves file size reductions greater than 40% to 60% for natural photographs.',
          'Lossy compression (such as JPEG, WebP, and AVIF) permanently discards visual information that the human visual system is least capable of perceiving. This allows for file size reductions of 80% to 95% while retaining perceived visual clarity.'
        ]
      },
      {
        heading: 'Why Resizing Dimensions is Better Than Extreme Compression',
        paragraphs: [
          'When users need to reduce file size dramatically (e.g. from 5 MB to 50 KB), they often try setting the JPEG quality slider to 10% or 15%. This results in severe compression artifacts: 8×8 pixel grid blocks, color banding in gradients, and ringing around high-contrast edges.',
          'A far better approach is reducing pixel dimensions first:'
        ],
        sublist: [
          'Halving the width and height of an image reduces total pixel count by 75%.',
          'With 75% fewer pixels to encode, the compression algorithm can operate at 80% quality rather than 15%, producing a significantly clearer, sharper image at the exact same target byte weight.'
        ]
      },
      {
        heading: 'Understanding Compression Artifacts',
        paragraphs: [
          'Blockiness: JPEG divides images into 8×8 pixel blocks. When bit budgets are exhausted, boundaries between these blocks become visible.',
          'Color Banding (Posterization): Occurs in smooth gradients (like skies) when subtle color transitions are quantized into abrupt steps.',
          'Ringing (Mosquito Noise): Blurry oscillations that appear along sharp edges, such as dark text on a white background.'
        ]
      }
    ],
    faq: [
      {
        question: 'Does downscaling dimensions permanently lose original quality?',
        answer: 'Downscaling discards pixels to fit smaller screens. However, because QuickResize operates locally on a copy in browser memory, your original master file on your disk remains untouched.'
      },
      {
        question: 'What is the optimal JPEG quality setting for general use?',
        answer: 'A quality setting between 75% and 85% is generally considered the sweet spot, providing substantial file size reduction with virtually no noticeable visual artifacts to the human eye.'
      }
    ]
  }
];

export default function BlogSystem() {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Check URL pathname on mount to support direct link e.g. /blog/how-to-compress-image-to-100kb
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/blog/')) {
      const slug = path.replace('/blog/', '').trim();
      const article = BLOG_ARTICLES.find(a => a.slug === slug);
      if (article) {
        setSelectedSlug(article.slug);
      }
    }
  }, []);

  const currentArticle = BLOG_ARTICLES.find(a => a.slug === selectedSlug) || null;

  // Update SEO metadata and BlogPosting JSON-LD when article changes
  useEffect(() => {
    if (currentArticle) {
      const canonicalPath = `/blog/${currentArticle.slug}`;
      updateSeoMetadata({
        title: `${currentArticle.title} | QuickResize`,
        description: currentArticle.excerpt,
        path: canonicalPath,
        type: 'article',
      });

      // Truthful BlogPosting structured data
      const articleSchema = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        'headline': currentArticle.title,
        'description': currentArticle.excerpt,
        'datePublished': currentArticle.datePublished,
        'dateModified': currentArticle.dateModified,
        'mainEntityOfPage': {
          '@type': 'WebPage',
          '@id': getCanonicalUrl(canonicalPath),
        },
        'author': {
          '@type': 'Organization',
          'name': currentArticle.author,
          'url': SITE_CONFIG.baseUrl,
        },
        'publisher': {
          '@type': 'Organization',
          'name': currentArticle.publisher,
          'url': SITE_CONFIG.baseUrl,
        },
      };
      injectJsonLd('schema-blog-article', articleSchema);
    } else {
      updateSeoMetadata({
        title: 'Image Optimization & Compression Blog | QuickResize',
        description: 'Practical guides and tutorials on image compression, target file size optimization, format comparisons, and web performance.',
        path: '/blog',
        type: 'website',
      });
      injectJsonLd('schema-blog-article', null);
    }

    return () => {
      injectJsonLd('schema-blog-article', null);
    };
  }, [currentArticle]);

  const handleSelectArticle = (slug: string) => {
    setSelectedSlug(slug);
    try {
      window.history.pushState({}, '', `/blog/${slug}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      // Fallback in case pushState fails in preview sandbox
    }
  };

  const handleBackToDirectory = () => {
    setSelectedSlug(null);
    try {
      window.history.pushState({}, '', '/blog');
      window.dispatchEvent(new PopStateEvent('popstate'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      // Fallback
    }
  };

  const categories = ['All', 'Image Compression', 'Image Optimization', 'Government Form Guides'];

  const filteredArticles = BLOG_ARTICLES.filter(art => {
    const matchesSearch = art.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          art.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || art.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Render Single Article
  if (currentArticle) {
    const relatedArticles = BLOG_ARTICLES.filter(a => a.slug !== currentArticle.slug).slice(0, 3);

    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 animate-fade-in">
        
        {/* Back navigation */}
        <button
          onClick={handleBackToDirectory}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:opacity-85 mb-8 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to All Articles</span>
        </button>

        {/* Article Editorial */}
        <article className="space-y-8">
          
          <header className="space-y-3">
            <span className="inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
              {currentArticle.category}
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl lg:text-4xl leading-tight">
              {currentArticle.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500 dark:text-slate-400 pt-1">
              <span>By {currentArticle.author}</span>
              <span>&bull;</span>
              <span>Published: {currentArticle.datePublished}</span>
              <span>&bull;</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {currentArticle.readTime}
              </span>
            </div>
          </header>

          {/* Clean Graphic Banner */}
          <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/5 p-6 sm:p-8 dark:border-indigo-900/50">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white sm:text-base">
                  Practical Engineering & Optimization Guide
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Published by {currentArticle.publisher} &bull; Browser-side execution techniques
                </p>
              </div>
            </div>
          </div>

          {/* Quick Tool Links Box */}
          {currentArticle.toolLinks && currentArticle.toolLinks.length > 0 && (
            <div className="rounded-xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60 space-y-2.5">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                Featured QuickResize Tools for this Guide
              </span>
              <div className="flex flex-wrap gap-2">
                {currentArticle.toolLinks.map((tool, i) => (
                  <a
                    key={i}
                    href={tool.url}
                    onClick={(e) => {
                      e.preventDefault();
                      window.history.pushState({}, '', tool.url);
                      window.dispatchEvent(new PopStateEvent('popstate'));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900/60 transition-colors"
                  >
                    <span>{tool.title}</span>
                    <ArrowRight className="h-3 w-3" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Core Content Sections */}
          <div className="space-y-8 text-sm leading-relaxed text-slate-700 dark:text-slate-300 sm:text-base font-sans">
            {currentArticle.sections.map((section, idx) => (
              <section key={idx} className="space-y-3">
                <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white sm:text-xl">
                  {section.heading}
                </h2>
                {section.paragraphs.map((p, pIdx) => (
                  <p key={pIdx} className="leading-relaxed">
                    {p}
                  </p>
                ))}
                {section.sublist && (
                  <ul className="space-y-2 pt-1 pl-4">
                    {section.sublist.map((item, itemIdx) => (
                      <li key={itemIdx} className="flex items-start gap-2 text-xs sm:text-sm">
                        <CheckCircle2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          {/* FAQs section in article if present */}
          {currentArticle.faq && currentArticle.faq.length > 0 && (
            <section className="space-y-4 pt-6 border-t border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  Frequently Asked Questions
                </h2>
              </div>
              <div className="space-y-3">
                {currentArticle.faq.map((item, idx) => (
                  <div key={idx} className="rounded-xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60 space-y-1.5">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      {item.question}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {item.answer}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Privacy Callout */}
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5 dark:border-indigo-950/60 dark:bg-indigo-950/20">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400 mt-0.5" />
              <div className="space-y-1 text-xs sm:text-sm">
                <h4 className="font-bold text-indigo-950 dark:text-indigo-200">
                  QuickResize Privacy Standard
                </h4>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  QuickResize processes selected images locally in your browser for supported tools and does not upload the image file to QuickResize's own servers. Your personal photos, signatures, and identity scans remain private on your computer.
                </p>
              </div>
            </div>
          </div>

          {/* Non-intrusive Monetization Area */}
          <AdSlot slot={ADSENSE_CONFIG.slots.article} format="auto" className="my-8" />

          {/* Related Articles */}
          {relatedArticles.length > 0 && (
            <section className="space-y-4 pt-8 border-t border-slate-200/80 dark:border-slate-800">
              <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white sm:text-xl">
                Related Optimization Articles
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {relatedArticles.map((rel) => (
                  <button
                    key={rel.slug}
                    onClick={() => handleSelectArticle(rel.slug)}
                    className="flex flex-col justify-between text-left rounded-xl border border-slate-200/80 bg-white p-4 transition-all hover:border-indigo-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-indigo-700/60 cursor-pointer"
                  >
                    <div className="space-y-2">
                      <span className="inline-block text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                        {rel.category}
                      </span>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-2">
                        {rel.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {rel.excerpt}
                      </p>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span>Read article</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

        </article>
      </div>
    );
  }

  // Render Article Directory
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      
      {/* Blog Directory Header */}
      <header className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
          <BookOpen className="h-3.5 w-3.5" />
          <span>Engineering & Optimization Library</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          QuickResize Optimization Blog
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          Practical tutorials, image format deep-dives, and file size optimization guides for developers, applicants, and creators.
        </p>
      </header>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tutorials and guides..."
            className="w-full rounded-xl border border-slate-200/80 bg-white py-2 pl-9 pr-4 text-xs text-slate-900 outline-none transition-colors focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Article Cards Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredArticles.map((article) => (
          <article
            key={article.slug}
            onClick={() => handleSelectArticle(article.slug)}
            className="group flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs transition-all hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-indigo-700/60 cursor-pointer"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                  {article.category}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Clock className="h-3 w-3" />
                  {article.readTime}
                </span>
              </div>

              <h2 className="text-base font-bold text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                {article.title}
              </h2>

              <p className="line-clamp-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                {article.excerpt}
              </p>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-semibold text-indigo-600 dark:border-slate-800 dark:text-indigo-400">
              <span>Read guide</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </article>
        ))}
      </div>

    </div>
  );
}
