"use client";

import React, { useMemo, useRef } from 'react';
import Link from 'next/link';
import type { Alert, AlertSeverity } from '../types';

interface AlertRibbonProps {
  alerts: Alert[];
  loading?: boolean;
  maxVisible?: number;
}

const severityConfig: Record<AlertSeverity, { bg: string; text: string; icon: string; border: string }> = {
  critical: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    icon: 'ri-error-warning-fill',
    border: 'border-red-200'
  },
  warning: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    icon: 'ri-alert-fill',
    border: 'border-amber-200'
  },
  info: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    icon: 'ri-information-fill',
    border: 'border-blue-200'
  }
};

/**
 * Zone 0: Alert Ribbon
 * Sticky horizontal scroll of exception alerts
 */
const AlertRibbon: React.FC<AlertRibbonProps> = ({
  alerts,
  loading = false,
  maxVisible = 10
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sort by severity and limit
  const visibleAlerts = useMemo(() => {
    const sorted = [...alerts].sort((a, b) => {
      const order = { critical: 0, warning: 1, info: 2 };
      return order[a.severity] - order[b.severity];
    });
    return sorted.slice(0, maxVisible);
  }, [alerts, maxVisible]);

  // Summary counts
  const summary = useMemo(() => ({
    critical: alerts.filter(a => a.severity === 'critical').length,
    warning: alerts.filter(a => a.severity === 'warning').length,
    info: alerts.filter(a => a.severity === 'info').length
  }), [alerts]);

  // Loading state
  if (loading) {
    return (
      <div className="flex gap-3 overflow-x-auto py-2 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div 
            key={i} 
            className="flex-shrink-0 h-10 bg-gray-100 rounded-lg"
            style={{ width: 200 }}
          />
        ))}
      </div>
    );
  }

  // No alerts - show green status
  if (visibleAlerts.length === 0) {
    return (
      <div className="flex items-center gap-3 py-2 px-4 bg-emerald-50 border border-emerald-200 rounded-lg">
        <i className="ri-checkbox-circle-fill text-emerald-600 text-lg" />
        <span className="text-sm font-medium text-emerald-700">
          All systems operational - No active alerts
        </span>
      </div>
    );
  }

  const scrollLeft = () => {
    scrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' });
  };

  const scrollRight = () => {
    scrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' });
  };

  return (
    <div className="relative group">
      {/* Summary badge */}
      <div className="absolute -top-1 -left-1 z-10 flex items-center gap-1 bg-white rounded-full shadow-sm px-2 py-0.5 text-xs">
        {summary.critical > 0 && (
          <span className="flex items-center gap-0.5 text-red-600">
            <span className="w-2 h-2 bg-red-500 rounded-full" />
            {summary.critical}
          </span>
        )}
        {summary.warning > 0 && (
          <span className="flex items-center gap-0.5 text-amber-600 ml-1">
            <span className="w-2 h-2 bg-amber-500 rounded-full" />
            {summary.warning}
          </span>
        )}
      </div>

      {/* Scroll buttons */}
      {visibleAlerts.length > 3 && (
        <>
          <button
            onClick={scrollLeft}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 border border-gray-200 rounded-full shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <i className="ri-arrow-left-s-line text-gray-600" />
          </button>
          <button
            onClick={scrollRight}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 border border-gray-200 rounded-full shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <i className="ri-arrow-right-s-line text-gray-600" />
          </button>
        </>
      )}

      {/* Alerts scroll container */}
      <div 
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide py-2 px-1 scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {visibleAlerts.map(alert => {
          const config = severityConfig[alert.severity];
          const AlertWrapper = alert.href ? Link : 'div';
          
          return (
            <AlertWrapper
              key={alert.id}
              href={alert.href || '#'}
              className={`
                flex-shrink-0 flex items-center gap-3 px-4 py-2.5 rounded-lg border
                ${config.bg} ${config.border} ${config.text}
                ${alert.href ? 'hover:shadow-md cursor-pointer transition-shadow' : ''}
              `}
            >
              <i className={`${config.icon} text-lg`} />
              <div className="flex flex-col">
                <span className="text-sm font-medium whitespace-nowrap">
                  {alert.title}
                </span>
                {alert.valueLabel && (
                  <span className="text-xs opacity-75 whitespace-nowrap">
                    {alert.valueLabel}
                  </span>
                )}
              </div>
              {alert.href && (
                <i className="ri-arrow-right-s-line ml-2 opacity-50" />
              )}
            </AlertWrapper>
          );
        })}
      </div>
    </div>
  );
};

export default AlertRibbon;
