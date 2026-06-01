import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ERROR BOUNDARY TRIGGERED', error);
    console.error(`[ErrorBoundary] Catch at ${this.props.componentName || 'Unknown'}:`, error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[200px] w-full flex flex-col items-center justify-center p-8 text-center bg-red-50/50 border border-red-100 rounded-3xl">
          <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 mb-4 shadow-sm">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-2 italic">Interface Failure</h2>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight max-w-[250px] mb-6 leading-relaxed">
            The {this.props.componentName || 'component'} encountered a runtime corruption.
          </p>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-6 py-3 bg-slate-950 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all shadow-lg"
          >
            <RotateCcw size={14} />
            Reboot Interface
          </button>
          {process.env.NODE_ENV !== 'production' && (
            <pre className="mt-6 p-4 bg-slate-900 text-red-400 text-[8px] font-mono rounded-lg overflow-auto max-w-full text-left">
              {this.state.error?.toString()}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
