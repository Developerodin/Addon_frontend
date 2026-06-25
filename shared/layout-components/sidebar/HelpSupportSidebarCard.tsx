'use client';

import React from 'react';
import Link from 'next/link';
import { useNavigation, canAccessHelpSupport } from '@/shared/contextapi/navigationContext';

const HELP_SUPPORT_PATH = '/help-and-support';

/**
 * Pinned bottom card in the sidebar for Help & Support (opens in a new tab).
 */
export default function HelpSupportSidebarCard() {
  const { permissions, isLoading } = useNavigation();

  if (isLoading || !canAccessHelpSupport(permissions)) {
    return null;
  }

  return (
    <div className="help-support-sidebar-card" aria-label="Help and Support">
      <Link
        href={HELP_SUPPORT_PATH}
        target="_blank"
        rel="noopener noreferrer"
        className="help-support-sidebar-card__link"
        aria-label="Open Help and Support in a new tab"
      >
        <span className="help-support-sidebar-card__icon" aria-hidden>
          <i className="ri-customer-service-2-line" />
        </span>
        <span className="help-support-sidebar-card__content">
          <span className="help-support-sidebar-card__title">Help & Support</span>
          <span className="help-support-sidebar-card__subtitle">Raise a ticket · Get help</span>
        </span>
        <span className="help-support-sidebar-card__arrow" aria-hidden>
          <i className="ri-external-link-line" />
        </span>
      </Link>
    </div>
  );
}
