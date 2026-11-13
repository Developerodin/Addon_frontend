'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useNavigation, canAccessSyncConflicts } from '@/shared/contextapi/navigationContext';
import { getFirstAvailableRoute } from '@/shared/utils/routeUtils';

interface RequireSyncConflictsAccessProps {
  children: React.ReactNode;
}

/**
 * Blocks sync conflict pages unless the user has the Sync Conflicts navigation permission.
 */
export function RequireSyncConflictsAccess({ children }: RequireSyncConflictsAccessProps) {
  const router = useRouter();
  const { permissions, isLoading } = useNavigation();
  const allowed = canAccessSyncConflicts(permissions);

  useEffect(() => {
    if (!isLoading && !allowed) {
      router.replace(getFirstAvailableRoute(permissions));
    }
  }, [allowed, isLoading, permissions, router]);

  if (isLoading) {
    return (
      <div
        className="flex min-h-[50vh] items-center justify-center"
        role="status"
        aria-live="polite"
        aria-label="Checking access"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div
        className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-center"
        role="status"
        aria-live="polite"
      >
        <p className="text-sm font-medium text-gray-600">You do not have access to Sync conflicts.</p>
        <p className="text-xs text-gray-500">Redirecting…</p>
      </div>
    );
  }

  return <>{children}</>;
}
