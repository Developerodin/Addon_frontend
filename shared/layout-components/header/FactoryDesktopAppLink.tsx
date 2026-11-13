"use client"
import React from 'react';

const DESKTOP_INSTALLER_URL =
  'https://vsc-files-storage.s3.ap-south-1.amazonaws.com/desktop/Addon-Factory-Setup-1.0.0.exe';

const FactoryDesktopAppLink = () => {
  return (
    <div className="header-element py-[1rem] md:px-[0.65rem] px-2 relative">
      <a
        href={DESKTOP_INSTALLER_URL}
        download
        aria-label="Download Factory Desktop App"
        title="Download Addon Factory desktop app for Windows"
        className="inline-flex flex-shrink-0 justify-center items-center gap-1.5 font-medium text-primary hover:bg-primary/10 dark:hover:bg-black/20 dark:text-white/50 dark:hover:text-white transition-colors px-2.5 py-1.5 rounded-md"
      >
        <i className="bx bx-windows text-[1.2rem]"></i>
        <span className="hidden sm:inline text-xs font-semibold">Factory Desktop App</span>
      </a>
    </div>
  );
};

export default FactoryDesktopAppLink;
