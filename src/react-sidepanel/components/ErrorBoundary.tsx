import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class SidepanelErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error for debugging
    console.error('🚨 React Error Boundary caught an error:', error);
    console.error('Error Info:', errorInfo);

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="m-0 p-2 bg-gray-100 text-white font-sans">
          <main role="main" aria-label="Error state">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-medium text-gray-700">React Sidepanel Error</h2>
                <p className="text-xs text-gray-500">Something went wrong</p>
              </div>
            </div>
            
            <div className="text-red-600 text-sm p-3 bg-red-50 border border-red-200 rounded-md" role="alert">
              <div className="flex items-start space-x-2">
                <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <p className="font-medium">React Component Error</p>
                  <p className="text-xs mt-1">
                    {this.state.error?.message || 'An unexpected error occurred'}
                  </p>
                  
                  {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs font-medium">Error Details</summary>
                      <pre className="text-xs mt-1 p-2 bg-red-100 rounded overflow-auto max-h-32">
                        {this.state.error?.stack}
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                  
                  <div className="mt-3 space-x-2">
                    <button
                      onClick={this.handleReset}
                      className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={() => window.location.reload()}
                      className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                      Reload Sidepanel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      );
    }

    return this.props.children;
  }
}