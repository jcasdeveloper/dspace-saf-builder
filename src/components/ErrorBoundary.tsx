import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex h-screen items-center justify-center bg-background p-8">
            <div className="max-w-md text-center">
              <p className="mb-2 text-lg font-semibold text-destructive">Something went wrong</p>
              <p className="mb-4 text-sm text-muted-foreground">
                {this.state.error?.message || "An unexpected error occurred."}
              </p>
              <Button onClick={() => window.location.reload()}>Reload App</Button>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}

import { Button } from "@/components/ui/button";

export default ErrorBoundary;
