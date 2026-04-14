import React, { ErrorInfo, ReactNode } from "react";

import { recordDiagnosticEvent } from "../services/diagnostics/clientDiagnostics";

interface TaskpaneErrorBoundaryProps {
  children: ReactNode;
}

interface TaskpaneErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class TaskpaneErrorBoundary extends React.Component<
  TaskpaneErrorBoundaryProps,
  TaskpaneErrorBoundaryState
> {
  constructor(props: TaskpaneErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      message: "",
    };
  }

  static getDerivedStateFromError(error: Error): TaskpaneErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || "Unexpected task pane failure.",
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    recordDiagnosticEvent(
      "error",
      "startup",
      "Task pane render failure",
      `${error.message}\n${errorInfo.componentStack}`
    );
  }

  override render() {
    if (this.state.hasError) {
      return (
        <main className="rf-shell">
          <section className="rf-error rf-error--fatal">
            <strong>ReportForge AI could not finish loading.</strong>
            <span>{this.state.message}</span>
            <p className="rf-banner__next">
              Close and reopen the task pane. If the error persists, export diagnostics and review
              storage restrictions, Office host compatibility, and recent configuration changes.
            </p>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
