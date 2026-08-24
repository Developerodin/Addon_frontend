"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

interface TvModeConfig {
  autoRefreshInterval?: number;
  carouselInterval?: number;
  totalZones?: number;
}

interface TvModeState {
  isTvMode: boolean;
  isFullscreen: boolean;
  activeZoneIndex: number;
  isPaused: boolean;
}

/**
 * Hook for TV mode - fullscreen auto-cycling dashboard for factory wall
 * Activated via ?tv=1 query parameter
 */
export const useTvMode = (config: TvModeConfig = {}) => {
  const {
    autoRefreshInterval = 60000,
    carouselInterval = 30000,
    totalZones = 6
  } = config;

  const searchParams = useSearchParams();
  const router = useRouter();
  const carouselRef = useRef<NodeJS.Timeout | null>(null);
  const refreshRef = useRef<NodeJS.Timeout | null>(null);

  const [state, setState] = useState<TvModeState>({
    isTvMode: false,
    isFullscreen: false,
    activeZoneIndex: 0,
    isPaused: false
  });

  // Check for TV mode from URL
  useEffect(() => {
    const tvParam = searchParams.get('tv');
    setState(prev => ({ ...prev, isTvMode: tvParam === '1' }));
  }, [searchParams]);

  // Toggle TV mode
  const toggleTvMode = useCallback(() => {
    const newTvMode = !state.isTvMode;
    const params = new URLSearchParams(searchParams.toString());
    
    if (newTvMode) {
      params.set('tv', '1');
    } else {
      params.delete('tv');
    }
    
    router.push(`?${params.toString()}`);
  }, [state.isTvMode, searchParams, router]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setState(prev => ({ ...prev, isFullscreen: true }));
      } else {
        await document.exitFullscreen();
        setState(prev => ({ ...prev, isFullscreen: false }));
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setState(prev => ({ ...prev, isFullscreen: !!document.fullscreenElement }));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Carousel auto-advance
  useEffect(() => {
    if (!state.isTvMode || state.isPaused) {
      if (carouselRef.current) {
        clearInterval(carouselRef.current);
        carouselRef.current = null;
      }
      return;
    }

    carouselRef.current = setInterval(() => {
      setState(prev => ({
        ...prev,
        activeZoneIndex: (prev.activeZoneIndex + 1) % totalZones
      }));
    }, carouselInterval);

    return () => {
      if (carouselRef.current) {
        clearInterval(carouselRef.current);
      }
    };
  }, [state.isTvMode, state.isPaused, carouselInterval, totalZones]);

  // Navigate to specific zone
  const goToZone = useCallback((index: number) => {
    setState(prev => ({ ...prev, activeZoneIndex: index }));
  }, []);

  // Pause/resume carousel
  const togglePause = useCallback(() => {
    setState(prev => ({ ...prev, isPaused: !prev.isPaused }));
  }, []);

  // Reset to first zone
  const resetCarousel = useCallback(() => {
    setState(prev => ({ ...prev, activeZoneIndex: 0 }));
  }, []);

  // Get TV mode classes
  const getTvModeClasses = useCallback(() => {
    if (!state.isTvMode) return '';
    
    return 'tv-mode tv-mode--active text-lg';
  }, [state.isTvMode]);

  return {
    ...state,
    toggleTvMode,
    toggleFullscreen,
    togglePause,
    goToZone,
    resetCarousel,
    getTvModeClasses,
    autoRefreshInterval: state.isTvMode ? autoRefreshInterval : undefined
  };
};

export default useTvMode;
