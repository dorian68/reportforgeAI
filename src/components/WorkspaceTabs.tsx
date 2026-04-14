import React from "react";

import { WorkspaceTabModel } from "../taskpane/workspaceNavigation";

interface WorkspaceTabsProps<T extends string> {
  tabs: WorkspaceTabModel<T>[];
  activeTab: T;
  onChange: (tab: T) => void;
  ariaLabel: string;
}

export function WorkspaceTabs<T extends string>({
  tabs,
  activeTab,
  onChange,
  ariaLabel,
}: WorkspaceTabsProps<T>) {
  return (
    <div className="rf-subtab-nav" role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={tab.id === activeTab}
          className={`rf-subtab ${tab.id === activeTab ? "is-active" : ""}`}
          onClick={() => onChange(tab.id)}
          disabled={tab.disabled}
          title={tab.description}
        >
          <span className="rf-subtab__label">{tab.label}</span>
          <span className="rf-subtab__meta">{tab.badge}</span>
        </button>
      ))}
    </div>
  );
}
