"use client"
import { useState, useEffect, useCallback } from 'react';
import {
  getStoredInstallPrompt,
  subscribePWAInstallable,
  triggerPWAInstall,
  isPWAStandalone,
} from '@/shared/utils/pwaInstall';

export function usePWAInstall() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  const syncFromStore = useCallback(() => {
    setIsInstallable(!!getStoredInstallPrompt());
    setIsInstalled(isPWAStandalone());
  }, []);

  useEffect(() => {
    if (isPWAStandalone()) {
      setIsInstalled(true);
      return;
    }
    syncFromStore();
    return subscribePWAInstallable(syncFromStore);
  }, [syncFromStore]);

  const install = useCallback(async () => {
    const outcome = await triggerPWAInstall();
    syncFromStore();
    if (outcome === 'accepted') {
      setIsInstalled(true);
      return true;
    }
    return outcome === 'dismissed' ? false : false;
  }, [syncFromStore]);

  return { isInstallable, isInstalled, install };
}
