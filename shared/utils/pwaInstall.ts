/** Captures beforeinstallprompt as early as possible (see layout inline script). */

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface Window {
    __addonsPWA?: {
      deferredPrompt: BeforeInstallPromptEvent | null;
    };
  }
}

const INSTALLABLE_EVENT = 'addons-pwa-installable';
const INSTALLED_EVENT = 'addons-pwa-installed';

export function getStoredInstallPrompt(): BeforeInstallPromptEvent | null {
  if (typeof window === 'undefined') return null;
  return window.__addonsPWA?.deferredPrompt ?? null;
}

export function subscribePWAInstallable(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => onChange();
  window.addEventListener(INSTALLABLE_EVENT, handler);
  window.addEventListener(INSTALLED_EVENT, handler);
  return () => {
    window.removeEventListener(INSTALLABLE_EVENT, handler);
    window.removeEventListener(INSTALLED_EVENT, handler);
  };
}

export function clearStoredInstallPrompt(): void {
  if (window.__addonsPWA) window.__addonsPWA.deferredPrompt = null;
}

export async function triggerPWAInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const prompt = getStoredInstallPrompt();
  if (!prompt) return 'unavailable';
  await prompt.prompt();
  const { outcome } = await prompt.userChoice;
  clearStoredInstallPrompt();
  return outcome;
}

export function isPWAStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
