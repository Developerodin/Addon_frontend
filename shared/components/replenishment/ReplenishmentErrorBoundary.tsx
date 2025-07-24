import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ReplenishmentErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Replenishment Error Boundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full mx-auto">
            <div className="box border-danger/20 bg-danger/5">
              <div className="box-body text-center">
                <div className="w-20 h-20 bg-danger/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <i className="ri-error-warning-line text-3xl text-danger"></i>
                </div>
                
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Something went wrong
                </h2>
                
                <p className="text-gray-600 mb-6">
                  We encountered an unexpected error while loading the replenishment dashboard. 
                  Please try again or contact support if the problem persists.
                </p>

                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="mb-6 text-left">
                    <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
                      Error Details (Development)
                    </summary>
                    <div className="bg-gray-100 rounded-lg p-4 text-xs font-mono text-gray-800 overflow-auto max-h-40">
                      <div className="mb-2">
                        <strong>Error:</strong> {this.state.error.toString()}
                      </div>
                      {this.state.errorInfo && (
                        <div>
                          <strong>Stack Trace:</strong>
                          <pre className="whitespace-pre-wrap mt-1">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                )}

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={this.handleRetry}
                    className="ti-btn ti-btn-primary flex items-center justify-center gap-2"
                  >
                    <i className="ri-refresh-line"></i>
                    Try Again
                  </button>
                  
                  <button
                    onClick={this.handleReload}
                    className="ti-btn ti-btn-outline-secondary flex items-center justify-center gap-2"
                  >
                    <i className="ri-restart-line"></i>
                    Reload Page
                  </button>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-sm text-gray-500">
                    If this problem continues, please contact our support team with the error details above.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
} 