"use client"
import React, { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

const PWAInstallButton = () => {
  const [isInstalled, setIsInstalled] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [promptReady, setPromptReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
      setPromptReady(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleClick = useCallback(async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      setPromptReady(false);
      if (outcome === 'accepted') setIsInstalled(true);
    } else {
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 4000);
    }
  }, []);

  if (isInstalled) return null;

  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

  return (
    <div className="header-element py-[1rem] md:px-[0.65rem] px-2 relative">
      <button
        aria-label="Install App"
        onClick={handleClick}
        className="inline-flex flex-shrink-0 justify-center items-center gap-1.5 font-medium text-primary hover:bg-primary/10 dark:hover:bg-black/20 dark:text-white/50 dark:hover:text-white transition-colors px-2.5 py-1.5 rounded-md"
        title="Install Addons App"
      >
        <i className="bx bx-download text-[1.2rem]"></i>
        <span className="hidden sm:inline text-xs font-semibold">Install App</span>
      </button>
      {showTooltip && (
        <div className="absolute top-full right-0 mt-1 w-56 p-3 bg-white dark:bg-bodybg border border-defaultborder dark:border-defaultborder/10 rounded-lg shadow-lg z-[999] text-xs text-defaulttextcolor dark:text-white/70">
          {isIOS ? (
            <p>Tap <i className="bx bx-upload inline-block mx-0.5"></i> Share, then <strong>&quot;Add to Home Screen&quot;</strong></p>
          ) : (
            <p>Open browser menu <i className="bx bx-dots-vertical-rounded inline-block mx-0.5"></i> and select <strong>&quot;Install App&quot;</strong> or <strong>&quot;Add to Home Screen&quot;</strong></p>
          )}
        </div>
      )}
    </div>
  );
};

export default PWAInstallButton;
