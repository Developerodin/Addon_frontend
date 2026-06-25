'use client';

import { RequireAuth } from '@/shared/components/auth/RequireAuth';
import { RequireHelpSupportAccess } from '@/shared/components/auth/RequireHelpSupportAccess';
import Link from 'next/link';

/**
 * Standalone layout for Help & Support — opens in its own tab without the main app sidebar.
 */
export default function HelpSupportLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <RequireHelpSupportAccess>
        <div className="min-h-screen bg-gray-50">
          <header className="sticky top-0 z-50 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2">
              <i className="ri-customer-service-2-line text-xl text-purple-600" aria-hidden />
              <span className="font-bold text-gray-900">Addons Help & Support</span>
            </div>
            <Link
              href="/dashboards/main"
              className="text-xs font-semibold text-purple-600 hover:text-purple-800 hover:underline"
            >
              ← Back to main app
            </Link>
          </header>
          <main>{children}</main>
        </div>
      </RequireHelpSupportAccess>
    </RequireAuth>
  );
}
