import React, { ReactNode } from "react";

interface CollapsiblePanelProps {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function CollapsiblePanel({
  title,
  summary,
  defaultOpen = false,
  children,
}: CollapsiblePanelProps) {
  return (
    <details className="rf-collapsible" open={defaultOpen}>
      <summary className="rf-collapsible__summary">
        <span className="rf-collapsible__title">{title}</span>
        {summary ? <span className="rf-collapsible__meta">{summary}</span> : null}
      </summary>
      <div className="rf-collapsible__body">{children}</div>
    </details>
  );
}
