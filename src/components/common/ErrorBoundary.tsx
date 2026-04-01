import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = "An unexpected error occurred. Please try again later.";
      try {
        const errorInfo = JSON.parse(this.state.error?.message || '{}');
        if (errorInfo.error) {
          errorMessage = errorInfo.error;
        }
      } catch (e) {
        if (this.state.error?.message.includes('the client is offline')) {
          errorMessage = "Please check your Firebase configuration or internet connection.";
        }
      }

      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-background p-6 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center mb-6 text-red-500">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-text mb-2">Something went wrong</h2>
          <p className="text-muted mb-8 max-w-xs">
            {errorMessage}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20"
          >
            Reload App
          </button>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
