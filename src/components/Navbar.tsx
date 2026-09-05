/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sun, Moon, Shield, Sparkles, Layers, FileImage } from 'lucide-react';

interface NavbarProps {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  activeTab: 'home' | 'dashboard' | 'blog' | 'legal-contact' | 'not-found';
  setActiveTab: (tab: 'home' | 'dashboard' | 'blog' | 'legal-contact' | 'not-found') => void;
}

export default function Navbar({
  isDarkMode,
  toggleDarkMode,
  activeTab,
  setActiveTab,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/70 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/70">
      <div id="nav-container" className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo and Title */}
        <div 
          id="brand-logo" 
          className="flex cursor-pointer items-center gap-2 transition-opacity hover:opacity-90 shrink-0"
          onClick={() => setActiveTab('home')}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 shadow-md shadow-indigo-200 dark:shadow-none">
            <Layers className="h-5.5 w-5.5 text-white" />
          </div>
          <div className="hidden xs:block sm:block">
            <span className="font-sans text-base sm:text-lg md:text-xl font-bold tracking-tight text-slate-950 dark:text-white">
              Quick<span className="bg-gradient-to-r from-sky-500 to-indigo-500 bg-clip-text text-transparent">Resize</span>
            </span>
            <div className="flex items-center gap-1 font-mono text-[9px] font-medium tracking-wide text-indigo-600 uppercase dark:text-indigo-400">
              <Shield className="h-2.5 w-2.5" /> Local Processing
            </div>
          </div>
        </div>

        {/* Navigation Menus */}
        <nav className="flex items-center gap-1 text-xs md:text-sm font-medium mx-1 overflow-x-auto select-none select-scrollbar">
          <button
            id="nav-btn-home"
            onClick={() => setActiveTab('home')}
            className={`rounded-lg px-2 py-1.5 md:px-4 md:py-2 transition-colors duration-150 cursor-pointer ${
              activeTab === 'home'
                ? 'bg-slate-100 text-slate-950 font-bold dark:bg-slate-800 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            Home
          </button>
          <button
            id="nav-btn-optimizer"
            onClick={() => setActiveTab('dashboard')}
            className={`rounded-lg px-2 py-1.5 md:px-4 md:py-2 transition-colors duration-150 cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-slate-100 text-slate-950 font-bold dark:bg-slate-800 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            <span>All Tools</span>
          </button>
          
          {/* Blogs */}
          <button
            id="nav-btn-blog"
            onClick={() => setActiveTab('blog')}
            className={`rounded-lg px-2 py-1.5 md:px-4 md:py-2 transition-colors duration-155 cursor-pointer ${
              activeTab === 'blog'
                ? 'bg-slate-100 text-slate-950 font-bold dark:bg-slate-800 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            <span>Blog</span>
          </button>

          {/* Legal / Contact */}
          <button
            id="nav-btn-legal-contact"
            onClick={() => setActiveTab('legal-contact')}
            className={`rounded-lg px-2 py-1.5 md:px-4 md:py-2 transition-colors duration-155 shrink-0 cursor-pointer ${
              activeTab === 'legal-contact'
                ? 'bg-slate-100 text-slate-950 font-bold dark:bg-slate-800 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            <span>Support</span>
          </button>
        </nav>

        {/* Action Items */}
        <div id="nav-actions" className="flex items-center gap-3">
          {/* Trust Banner (Inline snippet for browser validation) */}
          <div className="hidden lg:flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1.5 text-xs text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
            <Shield className="h-4 w-4 text-emerald-500" />
            <span className="font-medium">Your images never leave your device</span>
          </div>

          {/* Theme Toggler */}
          <button
            id="theme-toggler"
            onClick={toggleDarkMode}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700/80"
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle theme color"
          >
            {isDarkMode ? (
              <Sun className="h-5 w-5 text-amber-400" />
            ) : (
              <Moon className="h-5 w-5 text-slate-600" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
