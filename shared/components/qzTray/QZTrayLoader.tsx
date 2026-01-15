"use client";

import { useEffect, useState } from 'react';
import { loadQZScript, isQZLoaded } from '@/shared/utils/qzTray';

/**
 * QZ Tray Script Loader Component
 * Loads QZ Tray script on client-side only
 */
export const QZTrayLoader = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadScript = async () => {
      try {
        if (!isQZLoaded()) {
          await loadQZScript();
        }
        setIsLoading(false);
      } catch (err: any) {
        setError(err?.message || 'Failed to load QZ Tray script');
        setIsLoading(false);
      }
    };

    loadScript();
  }, []);

  // This component doesn't render anything visible
  // It just ensures QZ Tray script is loaded
  return null;
};
