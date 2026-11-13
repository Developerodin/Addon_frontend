'use client';

import React from 'react';
import { useShowFactoryInstallButtons } from '@/shared/hooks/useShowFactoryInstallButtons';
import FactoryDesktopAppLink from './FactoryDesktopAppLink';
import FactoryTabAppButton from './FactoryTabAppButton';

const FactoryInstallHeaderButtons = () => {
  const show = useShowFactoryInstallButtons();
  if (!show) return null;

  return (
    <>
      <FactoryDesktopAppLink />
      <FactoryTabAppButton />
    </>
  );
};

export default FactoryInstallHeaderButtons;
