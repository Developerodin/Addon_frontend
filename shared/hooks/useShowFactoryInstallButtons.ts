'use client';

import { useEffect, useState } from 'react';
import { shouldShowFactoryInstallButtons } from '@/shared/utils/factoryInstallVisibility';

export function useShowFactoryInstallButtons(): boolean {
  const [show, setShow] = useState(() => {
    if (typeof window === 'undefined') return false;
    return shouldShowFactoryInstallButtons();
  });

  useEffect(() => {
    setShow(shouldShowFactoryInstallButtons());
  }, []);

  return show;
}
