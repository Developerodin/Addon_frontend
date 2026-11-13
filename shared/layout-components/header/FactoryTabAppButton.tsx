"use client"
import React from 'react';

const FACTORY_TAB_APP_URL =
  'https://vsc-files-storage.s3.ap-south-1.amazonaws.com/android/Addon-Factory-Tab-1.0.0.apk';

const linkClassName =
  'inline-flex flex-shrink-0 justify-center items-center gap-1.5 font-medium text-primary hover:bg-primary/10 dark:hover:bg-black/20 dark:text-white/50 dark:hover:text-white transition-colors px-2.5 py-1.5 rounded-md';

const FactoryTabAppButton = () => {
  return (
    <div className="header-element py-[1rem] md:px-[0.65rem] px-2 relative">
      <a
        href={FACTORY_TAB_APP_URL}
        aria-label="Factory Tab App"
        title="Download the Addon Factory app for Android"
        className={linkClassName}
      >
        <i className="bx bx-mobile-landscape text-[1.2rem]" aria-hidden />
        <span className="hidden sm:inline text-xs font-semibold">Factory Tab App</span>
      </a>
    </div>
  );
};

export default FactoryTabAppButton;
