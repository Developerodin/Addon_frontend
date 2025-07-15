import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ReplenishmentErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Replenishment Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="box border-danger/20 bg-danger/5">
          <div className="box-body">
            <div className="flex items-center">
              <i className="ri-error-warning-line text-danger text-xl me-3"></i>
              <div className="flex-1">
                <h4 className="font-medium text-danger">Something went wrong</h4>
                <p className="text-danger/80">
                  An unexpected error occurred while loading the replenishment dashboard.
                </p>
                <button
                  type="button"
                  className="ti-btn ti-btn-sm ti-btn-outline-danger mt-2"
                  onClick={() => window.location.reload()}
                >
                  <i className="ri-refresh-line me-1"></i>
                  Reload Page
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ReplenishmentErrorBoundary; 