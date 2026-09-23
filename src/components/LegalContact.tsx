/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  FileText, 
  AlertTriangle, 
  Mail, 
  Send, 
  CheckCircle,
  Copy,
  ExternalLink
} from 'lucide-react';
import { SITE_CONFIG } from '../config/site';

export interface LegalContactProps {
  initialTab?: 'privacy' | 'terms' | 'disclaimer' | 'contact';
}

export default function LegalContact({ initialTab = 'privacy' }: LegalContactProps) {
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms' | 'disclaimer' | 'contact'>(initialTab);

  // Sync if initialTab changes dynamically
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  
  // Contact state
  const [contactName, setContactName] = useState<string>('');
  const [contactSenderEmail, setContactSenderEmail] = useState<string>('');
  const [contactSubject, setContactSubject] = useState<string>('');
  const [contactMsg, setContactMsg] = useState<string>('');
  const [copiedEmail, setCopiedEmail] = useState<boolean>(false);

  const supportEmail = 'banavalabs@gmail.com';

  const handleCopyEmail = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(supportEmail);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  const buildMailDetails = () => {
    const subject = contactSubject.trim() || `QuickResize Inquiry from ${contactName.trim() || 'User'}`;
    const bodyLines = [
      `Sender Name: ${contactName.trim() || 'Not specified'}`,
      `Sender Email: ${contactSenderEmail.trim() || 'Not specified'}`,
      '',
      'Message:',
      contactMsg.trim() || '(No message body provided)'
    ];
    const body = bodyLines.join('\n');
    return { subject, body };
  };

  const handleOpenMailto = (e: React.FormEvent) => {
    e.preventDefault();
    const { subject, body } = buildMailDetails();
    window.location.href = `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleOpenGmailWeb = () => {
    const { subject, body } = buildMailDetails();
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(supportEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(gmailUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1 space-y-2">
          <div className="rounded-2xl border border-slate-100 bg-white p-4.5 shadow-sm dark:border-slate-850 dark:bg-slate-900/40 space-y-1">
            <button
              onClick={() => setActiveTab('privacy')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'privacy'
                  ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950'
                  : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-850'
              }`}
            >
              <ShieldCheck className="h-4.5 w-4.5" />
              Privacy Policy
            </button>

            <button
              onClick={() => setActiveTab('terms')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'terms'
                  ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950'
                  : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-850'
              }`}
            >
              <FileText className="h-4.5 w-4.5" />
              Terms of Service
            </button>

            <button
              onClick={() => setActiveTab('disclaimer')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'disclaimer'
                  ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950'
                  : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-850'
              }`}
            >
              <AlertTriangle className="h-4.5 w-4.5" />
              Disclaimer Notes
            </button>

            <button
              onClick={() => setActiveTab('contact')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'contact'
                  ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950'
                  : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-850'
              }`}
            >
              <Mail className="h-4.5 w-4.5" />
              Contact Support
            </button>
          </div>
        </div>

        {/* Core Document view */}
        <div className="lg:col-span-3">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-850 dark:bg-slate-900/40 min-h-[400px]">
            
            {activeTab === 'privacy' && (
              <div className="space-y-5 animate-fade-in font-sans">
                <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Privacy Policy</h3>
                  <p className="text-[11px] text-slate-400 mt-1">Last revised: September 2026 &bull; QuickResize Privacy Standard</p>
                </div>
                
                <div className="prose prose-slate dark:prose-invert text-xs sm:text-sm text-slate-650 dark:text-slate-350 space-y-4 leading-relaxed">
                  <p className="font-semibold text-slate-850 dark:text-slate-200">
                    QuickResize is designed to provide fast, convenient image compression, resizing, and conversion while respecting user privacy. This Privacy Policy explains what information may be processed when you use our website.
                  </p>
                  
                  <div className="space-y-2 pt-2">
                    <h4 className="font-bold text-slate-800 dark:text-slate-205 text-sm">1. Local In-Browser Image Processing</h4>
                    <p>
                      QuickResize processes selected images locally inside your browser using standard client-side Web APIs (such as HTML5 Canvas, Web Workers, and OffscreenCanvas). For all standard image optimization tools (including target-size compression, resizing, format conversion, passport cropping, signature processing, and batch studio), your image files are not uploaded to, stored on, or transmitted to QuickResize servers. Processing happens on your device.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-800 dark:text-slate-205 text-sm">2. Third-Party Advertising & Google AdSense</h4>
                    <p>
                      When advertising is enabled on QuickResize, we may partner with third-party advertising networks, specifically Google AdSense, to display advertisements.
                    </p>
                    <ul className="list-disc pl-5 space-y-1 mt-1 text-slate-600 dark:text-slate-400">
                      <li>Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to this website or other websites on the Internet.</li>
                      <li>Google's use of advertising cookies enables it and its partners to serve ads to users based on their visits to our site and/or other sites across the web.</li>
                      <li>These third-party advertising scripts do not have access to the local image files you process within the QuickResize application workspace.</li>
                    </ul>
                    <p className="mt-2">
                      Users may opt out of personalized advertising by visiting <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 underline">Google Ads Settings</a>. Alternatively, you can opt out of third-party vendor use of cookies for personalized advertising by visiting <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 underline">aboutads.info</a>.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-800 dark:text-slate-205 text-sm">3. Local Storage and Preferences</h4>
                    <p>
                      QuickResize uses browser `localStorage` solely to remember user interface preferences, such as your dark/light theme setting and temporary tool configuration choices. This data remains on your device and is not synchronized to an external identity profile.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-800 dark:text-slate-205 text-sm">4. Contact Inquiries & Support Communications</h4>
                    <p>
                      When you reach out to our team via email at <strong className="font-semibold text-slate-800 dark:text-slate-200">banavalabs@gmail.com</strong> (via direct email, mailto link, or webmail draft), we receive the name, email address, and message content you provide. We use this information solely to respond to your questions, address bug reports, and improve our services. We do not sell or rent contact information to third parties.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-800 dark:text-slate-205 text-sm">5. Updates to This Policy</h4>
                    <p>
                      We may update this Privacy Policy from time to time to reflect changes in our practices or applicable legal requirements. The updated policy will be posted on this page with an updated revision date.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'terms' && (
              <div className="space-y-5 animate-fade-in font-sans">
                <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Terms of Service</h3>
                  <p className="text-[11px] text-slate-400 mt-1">Last revised: September 2026</p>
                </div>

                <div className="prose prose-slate dark:prose-invert text-xs sm:text-sm text-slate-650 dark:text-slate-350 space-y-4 leading-relaxed">
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-800 dark:text-slate-205 text-sm">1. Acceptance of Terms</h4>
                    <p>
                      By accessing and using QuickResize, you agree to these Terms of Service. If you do not agree with any part of these terms, please discontinue use of the service.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-800 dark:text-slate-205 text-sm">2. Permitted Use</h4>
                    <p>
                      QuickResize is provided free of charge for personal, educational, and commercial image processing purposes. You may use the tools to compress, resize, crop, convert, and format images that you have the lawful right to edit and utilize.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-800 dark:text-slate-205 text-sm">3. Acceptable Use & Conduct</h4>
                    <p>
                      You agree not to use the service for any unlawful purpose, not to attempt to circumvent security measures, not to initiate automated denial-of-service or scraping attacks that disrupt service availability, and not to infringe upon third-party intellectual property rights.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-800 dark:text-slate-205 text-sm">4. Disclaimer of Warranties</h4>
                    <p>
                      QuickResize is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis without warranties of any kind, either express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-800 dark:text-slate-205 text-sm">5. Limitation of Liability</h4>
                    <p>
                      In no event shall QuickResize or BanavaLabs be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your access to or use of, or inability to access or use, the application or tools.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'disclaimer' && (
              <div className="space-y-5 animate-fade-in font-sans">
                <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Disclaimer Notes</h3>
                  <p className="text-[11px] text-slate-400 mt-1">Last revised: September 2026</p>
                </div>

                <div className="prose prose-slate dark:prose-invert text-xs sm:text-sm text-slate-650 dark:text-slate-350 space-y-4 leading-relaxed">
                  <p className="font-semibold text-slate-850 dark:text-slate-200">
                    All tools, presets, calculators, and informational guides on QuickResize are provided for convenience and general informational purposes.
                  </p>
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-800 dark:text-slate-205 text-sm">Government & Application Portal Notice</h4>
                    <p>
                      QuickResize includes presets modeled after publicly available official exam and portal guidelines (such as SSC, UPSC, State PSC, US Passport, and Indian Passport specifications). However, official organizations periodically update their image dimension, background color, file size, or biometric requirements. You are solely responsible for reviewing the official guidelines of the issuing agency or application portal before submitting any image or document.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-800 dark:text-slate-205 text-sm">Non-Affiliation Notice</h4>
                    <p>
                      QuickResize is an independent utility provided by BanavaLabs. QuickResize is not affiliated with, sponsored by, authorized by, or endorsed by any government entity, testing agency, or passport authority.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-800 dark:text-slate-205 text-sm">Client Hardware Performance</h4>
                    <p>
                      Because image rendering occurs locally on your machine, processing speed depends on your device hardware (CPU, RAM, and browser GPU canvas support). Processing extremely high-resolution photos on memory-constrained mobile devices may take additional time or require smaller batch sizes.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'contact' && (
              <div className="space-y-5 animate-fade-in font-sans">
                <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Contact & Support</h3>
                  <p className="text-[11px] text-slate-400 mt-1">Direct developer support and inquiries for QuickResize</p>
                </div>

                {/* Direct Contact Card */}
                <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 dark:bg-slate-850/50 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-200">Direct Email Address</div>
                    <a 
                      href={`mailto:${supportEmail}`}
                      className="text-sm font-mono font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      {supportEmail}
                    </a>
                    <div className="text-[11px] text-slate-500 mt-0.5">Operated by BanavaLabs &bull; General turnaround: 24-48 hours</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyEmail}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer transition-colors"
                    >
                      {copiedEmail ? <CheckCircle className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedEmail ? 'Copied' : 'Copy Email'}</span>
                    </button>
                    <a
                      href={`mailto:${supportEmail}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Open Mail</span>
                    </a>
                  </div>
                </div>

                {/* Draft Email Form with Mailto & Gmail Web Triggers */}
                <form onSubmit={handleOpenMailto} className="space-y-4 max-w-lg pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Your Name</label>
                      <input
                        type="text"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white px-4 py-2.5 dark:border-slate-850 dark:bg-slate-900 outline-none focus:border-indigo-500 dark:text-white"
                        placeholder="Your name or organization"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Your Email</label>
                      <input
                        type="email"
                        value={contactSenderEmail}
                        onChange={(e) => setContactSenderEmail(e.target.value)}
                        className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white px-4 py-2.5 dark:border-slate-850 dark:bg-slate-900 outline-none focus:border-indigo-500 dark:text-white"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Subject</label>
                    <input
                      type="text"
                      value={contactSubject}
                      onChange={(e) => setContactSubject(e.target.value)}
                      className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white px-4 py-2.5 dark:border-slate-850 dark:bg-slate-900 outline-none focus:border-indigo-500 dark:text-white"
                      placeholder="e.g. Feature request, preset suggestion, or inquiry"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Message</label>
                    <textarea
                      required
                      rows={4}
                      value={contactMsg}
                      onChange={(e) => setContactMsg(e.target.value)}
                      className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white px-4 py-2.5 dark:border-slate-850 dark:bg-slate-900 outline-none focus:border-indigo-500 dark:text-white leading-relaxed"
                      placeholder="Describe your suggestion, feedback, or question..."
                    />
                  </div>

                  <div className="pt-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-900 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 cursor-pointer transition-colors shadow"
                      >
                        <Send className="h-4 w-4" />
                        Send via Email App
                      </button>

                      <button
                        type="button"
                        onClick={handleOpenGmailWeb}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors shadow-sm"
                      >
                        <ExternalLink className="h-4 w-4 text-red-500" />
                        Send via Gmail (Web)
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2.5">
                      All messages are received at <strong className="font-semibold text-slate-700 dark:text-slate-200">{supportEmail}</strong>. Clicking will open your preferred mail client with your details pre-filled.
                    </p>
                  </div>
                </form>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
