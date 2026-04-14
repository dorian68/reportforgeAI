import React from "react";

import { TaskpaneViewId, TaskpaneViewModel } from "../taskpane/navigation";

interface TaskpaneTabsProps {
  views: TaskpaneViewModel[];
  activeView: TaskpaneViewId;
  onChange: (view: TaskpaneViewId) => void;
}

export function TaskpaneTabs({ views, activeView, onChange }: TaskpaneTabsProps) {
  return (
    <nav className="rf-tab-nav" aria-label="ReportForge sections" role="tablist">
      {views.map((view) => (
        <button
          key={view.id}
          type="button"
          id={`rf-tab-${view.id}`}
          role="tab"
          aria-selected={view.id === activeView}
          aria-controls={`rf-view-${view.id}`}
          className={`rf-tab ${view.id === activeView ? "is-active" : ""}`}
          onClick={() => onChange(view.id)}
          disabled={view.disabled}
          title={view.description}
        >
          <span className="rf-tab__label">{view.label}</span>
          <span className="rf-tab__meta">{view.badge}</span>
        </button>
      ))}
    </nav>
  );
}
