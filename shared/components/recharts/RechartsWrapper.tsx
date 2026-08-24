"use client";

import React, { useState, useEffect, useCallback, ReactNode } from 'react';
import dynamic from 'next/dynamic';

interface RechartsWrapperProps {
  children: ReactNode;
  height?: number | string;
  minHeight?: number;
  className?: string;
  fallback?: ReactNode;
  onError?: (error: Error) => void;
}

/**
 * Error boundary for Recharts components
 */
class ChartErrorBoundary extends React.Component<
  { children: ReactNode; onError?: (error: Error) => void; fallback?: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; onError?: (error: Error) => void; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Recharts error boundary caught error:', error, errorInfo);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center h-full min-h-[200px] bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-center p-4">
            <i className="ri-error-warning-line text-3xl text-gray-400 mb-2"></i>
            <p className="text-sm text-gray-500">Chart unavailable</p>
            <button 
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-2 text-xs text-purple-600 hover:text-purple-700"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * SSR-safe wrapper for Recharts components
 * Handles hydration, loading states, and error boundaries
 */
const RechartsWrapper: React.FC<RechartsWrapperProps> = ({
  children,
  height = 300,
  minHeight = 200,
  className = '',
  fallback,
  onError
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const defaultFallback = (
    <div 
      className={`flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200 ${className}`}
      style={{ height, minHeight }}
    >
      <div className="text-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 bg-gray-200 rounded-lg mb-3"></div>
          <div className="h-2 w-24 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  );

  if (!mounted) {
    return fallback || defaultFallback;
  }

  return (
    <ChartErrorBoundary onError={onError} fallback={fallback || defaultFallback}>
      <div 
        className={`recharts-wrapper ${className}`}
        style={{ height, minHeight }}
      >
        {children}
      </div>
    </ChartErrorBoundary>
  );
};

export default RechartsWrapper;

/**
 * Higher-order component to make any Recharts component SSR-safe
 */
export function withSSRSafe<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  displayName?: string
) {
  const SSRSafeComponent: React.FC<P & { wrapperProps?: Partial<RechartsWrapperProps> }> = (props) => {
    const { wrapperProps, ...componentProps } = props as any;
    
    return (
      <RechartsWrapper {...wrapperProps}>
        <WrappedComponent {...componentProps} />
      </RechartsWrapper>
    );
  };

  SSRSafeComponent.displayName = displayName || `SSRSafe(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return SSRSafeComponent;
}
