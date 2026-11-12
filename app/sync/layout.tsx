'use client';

import ContentLayout from '@/app/(components)/(contentlayout)/layout';

/**
 * App shell for the sync admin screens.
 */
export default function SyncLayout({ children }: { children: React.ReactNode }) {
  return <ContentLayout>{children}</ContentLayout>;
}
