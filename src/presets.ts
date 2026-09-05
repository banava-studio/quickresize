/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Preset } from './types';
import { SMART_PRESETS } from './core/presets/smartPresets';

export { SMART_PRESETS, physicalToPixels, pixelsToPhysical } from './core/presets/smartPresets';
export type { SmartPreset, PresetCategory, DimensionUnit } from './core/presets/smartPresets';

export const PRESETS: Preset[] = SMART_PRESETS.map((sp) => ({
  id: sp.id,
  name: sp.name,
  category: (sp.category === 'Profile & Avatar' || sp.category === 'Paper & Print' ? 'Documents' : sp.category) as Preset['category'],
  width: sp.width,
  height: sp.height,
  format: sp.format,
  description: sp.description,
  aspectRatioLabel: sp.aspectRatioLabel
}));
