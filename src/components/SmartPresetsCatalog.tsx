/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Search, 
  Grid, 
  Layers, 
  Share2, 
  FileText, 
  UserCircle2, 
  Printer, 
  Globe, 
  Smartphone,
  ExternalLink,
  Check,
  Sparkles
} from 'lucide-react';
import { SMART_PRESETS, SmartPreset, PresetCategory } from '../core/presets/smartPresets';

export interface SmartPresetsCatalogProps {
  onSelectPreset?: (preset: SmartPreset) => void;
  onNavigateToTool?: (toolId: string) => void;
}

const CATEGORY_TABS: { id: PresetCategory | 'All'; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'All', label: 'All Presets', icon: Grid },
  { id: 'Documents', label: 'Documents & ID', icon: FileText },
  { id: 'Social Media', label: 'Social Media', icon: Share2 },
  { id: 'Profile & Avatar', label: 'Profile Avatars', icon: UserCircle2 },
  { id: 'Paper & Print', label: 'Paper & Print', icon: Printer },
  { id: 'Web & Banner', label: 'Web & Banners', icon: Globe },
  { id: 'App Icons', label: 'App Icons', icon: Smartphone }
];

export default function SmartPresetsCatalog({ onSelectPreset, onNavigateToTool }: SmartPresetsCatalogProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<PresetCategory | 'All'>('All');

  const filteredPresets = SMART_PRESETS.filter((preset) => {
    const matchesCategory = activeCategory === 'All' || preset.category === activeCategory;
    const matchesQuery = 
      preset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      preset.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (preset.platform && preset.platform.toLowerCase().includes(searchQuery.toLowerCase())) ||
      `${preset.width}x${preset.height}`.includes(searchQuery);
    return matchesCategory && matchesQuery;
  });

  const getToolAction = (preset: SmartPreset): { label: string; toolId: string } => {
    if (preset.category === 'Documents') {
      if (preset.id.includes('signature')) {
        return { label: 'Open in Signature Maker', toolId: 'signature' };
      }
      if (preset.id.includes('passport') || preset.id.includes('id-photo') || preset.id.includes('visa')) {
        return { label: 'Open in Passport / ID Maker', toolId: 'passport' };
      }
      return { label: 'Open in Document Optimizer', toolId: 'document' };
    }
    if (preset.category === 'Social Media') {
      return { label: 'Open in Social Resizer', toolId: 'social' };
    }
    if (preset.category === 'Profile & Avatar') {
      return { label: 'Open in Profile Picture Maker', toolId: 'profile' };
    }
    if (preset.category === 'Paper & Print') {
      return { label: 'Open in Photo Sheet Maker', toolId: 'photo-sheet' };
    }
    return { label: 'Open in Custom Canvas', toolId: 'custom-canvas' };
  };

  return (
    <div className="space-y-6 select-none animate-fade-in">
      {/* Header Search & Filter Bar */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/40 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-sans text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-500" />
              Standard Dimension &amp; Preset Catalog
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Explore {SMART_PRESETS.length} presets for documents, social networks, avatars, print sheets, and icons.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search preset, size or platform..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs font-medium rounded-xl border bg-slate-50/70 dark:bg-slate-950/40 border-slate-200 dark:border-slate-750 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-t border-slate-100 dark:border-slate-800 pt-3">
          {CATEGORY_TABS.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategory(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Presets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPresets.map((preset) => {
          const action = getToolAction(preset);

          return (
            <div
              key={preset.id}
              className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/40 flex flex-col justify-between space-y-4 hover:border-slate-200 transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded">
                    {preset.category}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                    {preset.width} × {preset.height} px
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    {preset.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {preset.description}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 text-[10px] font-mono text-slate-400 pt-1">
                  <span>Aspect: {preset.aspectRatioLabel}</span>
                  {preset.defaultDPI && <span>• {preset.defaultDPI} DPI</span>}
                  {preset.format && <span className="uppercase">• {preset.format}</span>}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    if (onSelectPreset) onSelectPreset(preset);
                    if (onNavigateToTool) onNavigateToTool(action.toolId);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-indigo-500" />
                  {action.label}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
