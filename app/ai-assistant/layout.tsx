'use client';

import type { ReactNode } from 'react';
import ContentLayout from '@/app/(components)/(contentlayout)/layout';

/**
 * Shell for the production assistant. Not linked from the sidebar.
 * @param {{ children: ReactNode }} props
 * @returns {JSX.Element}
 */
export default function AiAssistantLayout({ children }: { children: ReactNode }) {
  return <ContentLayout>{children}</ContentLayout>;
}
