declare global {
  interface Window {
    ReactNativeWebView?: unknown;
  }
}

/** Windows Electron shell (see windowsAppexe user-agent suffix). */
export function isFactoryDesktopShell(): boolean {
  if (typeof navigator === 'undefined') return false;
  return navigator.userAgent.includes('AddonFactoryDesktop');
}

/** Android factory tab app (React Native WebView injects this bridge). */
export function isFactoryTabShell(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.ReactNativeWebView !== undefined) return true;
  if (typeof navigator !== 'undefined' && navigator.userAgent.includes('AddonFactoryTab')) {
    return true;
  }
  return false;
}

/**
 * Site is served from the on-prem factory frontend (e.g. http://192.168.0.140:3000).
 * Install buttons are hidden — desks/tablets use the packaged apps instead.
 */
export function isFactoryLanWebApp(): boolean {
  if (typeof window === 'undefined') return false;
  const { hostname, port } = window.location;
  if (port !== '3000') return false;
  return /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname);
}

export function shouldShowFactoryInstallButtons(): boolean {
  if (isFactoryDesktopShell() || isFactoryTabShell()) return false;
  if (isFactoryLanWebApp()) return false;
  return true;
}
