/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { ADSENSE_CONFIG, shouldLoadAdSense } from '../config/adsense';

declare global {
  interface Window {
    adsbygoogle?: any[];
  }
}

export interface AdSlotProps {
  /**
   * Google AdSense Ad Unit Slot ID (numeric string)
   */
  slot?: string;
  /**
   * Ad display format: auto, fluid, rectangle, horizontal
   */
  format?: 'auto' | 'fluid' | 'rectangle' | 'horizontal';
  /**
   * Whether the ad unit is responsive (defaults to true)
   */
  responsive?: boolean;
  /**
   * Optional custom CSS class for the wrapper container
   */
  className?: string;
  /**
   * Optional layout key for In-feed or In-article ad types
   */
  layoutKey?: string;
}

export default function AdSlot({
  slot,
  format = 'auto',
  responsive = true,
  className = '',
  layoutKey,
}: AdSlotProps) {
  const adRef = useRef<HTMLModElement | null>(null);
  const pushedRef = useRef(false);

  const isAdSenseActive = shouldLoadAdSense() && !!slot;

  useEffect(() => {
    if (!isAdSenseActive || pushedRef.current) return;

    try {
      if (typeof window !== 'undefined') {
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});
        pushedRef.current = true;
      }
    } catch (err) {
      // Gracefully silence ad-blocker or script block exceptions to protect core tool
      console.warn('AdSense slot initialization warning:', err);
    }
  }, [isAdSenseActive, slot]);

  // If monetization is disabled or no slot ID is supplied, render nothing in production
  if (!isAdSenseActive) {
    return null;
  }

  return (
    <div 
      className={`ad-slot-container my-6 mx-auto w-full max-w-5xl overflow-hidden text-center transition-opacity ${className}`}
      aria-hidden="true"
    >
      <ins
        ref={adRef}
        className="adsbygoogle block"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_CONFIG.publisherId}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? 'true' : 'false'}
        {...(layoutKey ? { 'data-ad-layout-key': layoutKey } : {})}
      />
    </div>
  );
}
