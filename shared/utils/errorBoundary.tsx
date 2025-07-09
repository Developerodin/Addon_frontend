import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/**
 * Global error boundary component to catch React errors
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Check if this is an ApexCharts-related error
    const isApexChartsError = error.message && (
      error.message.includes('toString') ||
      error.message.includes('apexcharts') ||
      error.message.includes('Cannot read properties of undefined') ||
      error.message.includes('TypeError') ||
      error.message.includes('images')
    );

    if (isApexChartsError) {
      console.error('ApexCharts error caught by error boundary:', error);
      // For ApexCharts errors, we might want to handle them differently
      // or just log them without showing the error UI
      return;
    }

    console.error('Error caught by error boundary:', error, errorInfo);
    this.setState({ error, errorInfo });
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
      }

      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center max-w-md mx-auto">
            <div className="bg-red-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <i className="ri-error-warning-line text-2xl text-red-500"></i>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h3>
            <p className="text-gray-600 mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button 
              onClick={this.resetError}
              className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors duration-200"
            >
              <i className="ri-refresh-line mr-2"></i>
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook to handle global errors (including ApexCharts errors)
 */
export const useGlobalErrorHandler = () => {
  React.useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      // Check if this is an ApexCharts-related error
      if (error.message && (
        error.message.includes('toString') || 
        error.message.includes('apexcharts') ||
        error.message.includes('Cannot read properties of undefined') ||
        error.message.includes('images')
      )) {
        console.error('ApexCharts error detected:', error);
        // Prevent the error from being thrown
        error.preventDefault();
        return;
      }
      
      console.error('Global error:', error);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Check if this is an ApexCharts-related promise rejection
      if (event.reason && (
        event.reason.message?.includes('toString') ||
        event.reason.message?.includes('apexcharts') ||
        event.reason.message?.includes('Cannot read properties of undefined') ||
        event.reason.message?.includes('images')
      )) {
        console.error('ApexCharts promise rejection:', event.reason);
        // Prevent the rejection from being thrown
        event.preventDefault();
        return;
      }
      
      console.error('Unhandled promise rejection:', event.reason);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
};

/**
 * HOC to wrap components with error handling
 */
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}; 