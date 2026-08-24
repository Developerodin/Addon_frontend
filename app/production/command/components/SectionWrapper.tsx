"use client";

import React from 'react';
import InfoTooltip from './InfoTooltip';

interface SectionInfo {
  title: string;
  description: string;
  details?: string[];
}

interface SectionWrapperProps {
  children: React.ReactNode;
  info: SectionInfo;
  title?: string;
  className?: string;
  showHeader?: boolean;
}

/**
 * Wrapper component that adds section title with info tooltip
 * Use for sections that don't have built-in headers
 */
const SectionWrapper: React.FC<SectionWrapperProps> = ({
  children,
  info,
  title,
  className = '',
  showHeader = true
}) => {
  if (!showHeader) {
    return <>{children}</>;
  }

  return (
    <div className={className}>
      {title && (
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {title}
          </h3>
          <InfoTooltip
            title={info.title}
            description={info.description}
            details={info.details}
          />
        </div>
      )}
      {!title && (
        <div className="absolute top-3 right-3 z-10">
          <InfoTooltip
            title={info.title}
            description={info.description}
            details={info.details}
          />
        </div>
      )}
      {children}
    </div>
  );
};

export default SectionWrapper;
