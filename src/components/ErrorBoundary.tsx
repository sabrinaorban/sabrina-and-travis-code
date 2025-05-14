
import React, { Component, ErrorInfo } from 'react';
import { Button } from './ui/button';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { RefreshCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to the console
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      errorInfo
    });

    // You can also log the error to an error reporting service here
    // Example: logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    // Clear localStorage in case that's causing issues
    // localStorage.clear();
    // Refresh the page
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Render fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Something went wrong</AlertTitle>
              <AlertDescription>
                An error occurred in the application. The details have been logged.
              </AlertDescription>
            </Alert>
            
            <div className="bg-muted p-4 rounded-md mb-4 max-h-60 overflow-auto">
              <p className="font-mono text-xs whitespace-pre-wrap">
                {this.state.error?.toString() || 'Unknown error'}
              </p>
              {this.state.errorInfo && (
                <p className="font-mono text-xs whitespace-pre-wrap mt-2">
                  {this.state.errorInfo.componentStack}
                </p>
              )}
            </div>
            
            <Button onClick={this.handleReset} className="w-full">
              <RefreshCcw className="mr-2 h-4 w-4" />
              Reset Application
            </Button>
          </div>
        </div>
      );
    }

    // Normally, just render children
    return this.props.children;
  }
}

export default ErrorBoundary;
