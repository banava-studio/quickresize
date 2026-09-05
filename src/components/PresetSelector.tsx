/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PRESETS } from '../presets';
import { Preset } from '../types';
import { Sparkles, Layers, Share2 } from 'lucide-react';

interface PresetSelectorProps {
  selectedPresetId?: string;
  onSelectPreset: (preset: Preset) => void;
}

export default function PresetSelector({
  selectedPresetId,
  onSelectPreset,
}: PresetSelectorProps) {
  const [activeTab, setActiveTab] = useState<'All' | 'Social' | 'Documents' | 'App' | 'Branding'>('All');

  const filteredPresets = PRESETS.filter((preset) => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Social' && preset.category === 'Social Media') return true;
    if (activeTab === 'Documents' && preset.category === 'Documents') return true;
    if (activeTab === 'App' && preset.category === 'App Icons') return true;
    if (activeTab === 'Branding' && (preset.category === 'Logo / Website' || preset.category === 'Web & Banner')) return true;
    return false;
  });

  return (
    <div id="presets-panel" className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-indigo-500" />
        <h4 className="font-sans text-sm font-bold text-slate-800 dark:text-slate-105">
          Select Standard Preset Dimensions
        </h4>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-slate-100 pb-3 dark:border-slate-800">
        {(['All', 'Social', 'Documents', 'App', 'Branding'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === tab
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-white'
            }`}
          >
            {tab === 'All' && 'All templates'}
            {tab === 'Social' && 'Social Media'}
            {tab === 'Documents' && 'Documents & IDs'}
            {tab === 'App' && 'App Icons'}
            {tab === 'Branding' && 'Logos & Web'}
          </button>
        ))}
      </div>

      {/* Presets List Grid */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2 max-h-[300px] overflow-y-auto pr-1 select-scrollbar">
        {filteredPresets.map((preset) => {
          const isSelected = selectedPresetId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectPreset(preset)}
              className={`flex flex-col items-start rounded-xl p-3.5 text-left transition-all border ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-50/20 shadow-sm dark:border-indigo-500 dark:bg-indigo-950/20'
                  : 'border-slate-100 bg-slate-50/55 hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-900/40 dark:hover:bg-slate-800/80 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex w-full justify-between items-center">
                <span className={`text-xs font-bold ${isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-800 dark:text-slate-150'}`}>
                  {preset.name}
                </span>
                <span className="font-mono text-[10px] bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded">
                  {preset.width} &times; {preset.height}
                </span>
              </div>
              <p className="mt-1.5 text-[11px] leading-normal text-slate-500 dark:text-slate-400 line-clamp-2">
                {preset.description}
              </p>
              {preset.format && (
                <span className="mt-2 text-[9px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50 dark:bg-orange-950/25 dark:text-orange-400 px-1 rounded">
                  Forces {preset.format}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
