'use client';

import ContentLayout from '@/app/(components)/(contentlayout)/layout';
import { RequireSyncConflictsAccess } from '@/shared/components/auth/RequireSyncConflictsAccess';

/**
 * App shell for the sync admin screens.
 */
export default function SyncLayout({ children }: { children: React.ReactNode }) {
  return (
    <ContentLayout>
      <RequireSyncConflictsAccess>{children}</RequireSyncConflictsAccess>
    </ContentLayout>
  );
}
