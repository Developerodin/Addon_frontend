"use client"
import React, { useEffect, useState } from 'react';

const DESKTOP_INSTALLER_URL =
  'https://vsc-files-storage.s3.ap-south-1.amazonaws.com/desktop/Addon-Factory-Setup-1.0.0.exe';

function useInsideElectronApp(): boolean {
  const [inside, setInside] = useState(false);
  useEffect(() => {
    setInside(navigator.userAgent.includes('AddonFactoryDesktop'));
  }, []);
  return inside;
}

const FactoryDesktopAppLink = () => {
  const insideElectron = useInsideElectronApp();
  if (insideElectron) return null;

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
