import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

/**
 * Global Error Boundary — catches React render-time errors and shows a
 * recoverable error UI instead of a blank screen.
 * 
 * Wraps the entire application in App.jsx to ensure no unhandled render
 * error produces a silent blank page.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error for diagnostics without exposing sensitive data
    console.error('[WorkLogy ErrorBoundary] Caught render error:', error?.message);
    console.error('[WorkLogy ErrorBoundary] Component stack:', errorInfo?.componentStack);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      const isDev = import.meta.env?.DEV;
      const message = this.state.error?.message || 'An unexpected error occurred.';

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
          <div className="max-w-lg w-full bg-white border border-slate-200 rounded-2xl p-8 shadow-lg text-center space-y-5">
            {/* Icon */}
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7 text-rose-500" />
            </div>

            {/* Heading */}
            <div className="space-y-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Something went wrong
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed">
                This page encountered an unexpected error. You can try refreshing
                or navigate back to your dashboard.
              </p>
            </div>

            {/* Dev-only error detail */}
            {isDev && (
              <div className="text-left p-3 rounded-xl bg-rose-50 border border-rose-200">
                <p className="text-xs font-mono font-bold text-rose-800 break-all">{message}</p>
                {this.state.errorInfo?.componentStack && (
                  <pre className="text-[10px] text-rose-600 mt-2 overflow-auto max-h-32 leading-relaxed">
                    {this.state.errorInfo.componentStack.trim()}
                  </pre>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-center pt-1">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <a
                href="/"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition"
              >
                <Home className="w-4 h-4" />
                Go Home
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
