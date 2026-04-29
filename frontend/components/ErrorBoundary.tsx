import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full card p-8 text-center animate-scale-in">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
              <AlertTriangle className="h-7 w-7 text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              An unexpected error occurred. This has been noted. Please try refreshing the page.
            </p>
            {this.state.error && (
              <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3 mb-6 font-mono text-left break-all">
                {this.state.error.message}
              </p>
            )}
            <button
              onClick={() => window.location.reload()}
              className="btn-primary w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Inline error card for partial errors (inside pages)
export function ErrorCard({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="card p-6 text-center animate-fade-in">
      <AlertTriangle className="mx-auto h-8 w-8 text-amber-400 mb-3" />
      <p className="text-sm font-medium text-gray-700 mb-1">
        {message || 'Something went wrong'}
      </p>
      <p className="text-xs text-gray-400 mb-4">Please try again or refresh the page.</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary text-sm">
          <RefreshCw className="h-3.5 w-3.5" />
          Try again
        </button>
      )}
    </div>
  );
}
