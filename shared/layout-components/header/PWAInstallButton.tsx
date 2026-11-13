"use client"
import React from 'react';
import { usePWAInstall } from '@/shared/hooks/usePWAInstall';

const PWAInstallButton = () => {
  const { isInstallable, isInstalled, install } = usePWAInstall();

  if (isInstalled) return null;

  const handleClick = () => {
    if (!isInstallable) return;
    void install();
  };

  return (
    <div className="header-element py-[1rem] md:px-[0.65rem] px-2 relative">
      <button
        type="button"
        aria-label="Install App"
        onClick={handleClick}
        className="inline-flex flex-shrink-0 justify-center items-center gap-1.5 font-medium text-primary hover:bg-primary/10 dark:hover:bg-black/20 dark:text-white/50 dark:hover:text-white transition-colors px-2.5 py-1.5 rounded-md"
        title="Install Addons App"
      >
        <i className="bx bx-download text-[1.2rem]"></i>
        <span className="hidden sm:inline text-xs font-semibold">Install App</span>
      </button>
    </div>
  );
};

export default PWAInstallButton;
