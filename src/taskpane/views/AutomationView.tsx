import React from "react";

import { SectionCard } from "../../components/SectionCard";
import { StatusPill } from "../../components/StatusPill";
import { AgentExecutionResult } from "../../services/office/executeAgentPlan";
import { AgentPlan } from "../../shared/types";

interface AutomationViewProps {
  agentActionHint: string;
  agentPromptText: string;
  agentPlan: AgentPlan | null;
  agentExecutionResult: AgentExecutionResult | null;
  isPlanReady: boolean;
  isActionBusy: boolean;
  isBackgroundRefreshing: boolean;
  onAgentPromptChange: (value: string) => void;
  onPreviewAgentPlan: () => void;
  onRunAgentPlan: () => void;
}

export function AutomationView({
  agentActionHint,
  agentPromptText,
  agentPlan,
  agentExecutionResult,
  isPlanReady,
  isActionBusy,
  isBackgroundRefreshing,
  onAgentPromptChange,
  onPreviewAgentPlan,
  onRunAgentPlan,
}: AutomationViewProps) {
  const isActionLocked = isActionBusy || isBackgroundRefreshing;

  return (
    <>
      <div className="rf-panel rf-panel--soft">
        <div className="rf-grid rf-grid--two">
          <div>
            <h3>Automate Carefully</h3>
            <p className="rf-helper">
              Agent Mode is separate from planning so workbook automation never feels mixed into the
              basic reporting flow.
            </p>
          </div>
          <div className="rf-grid rf-grid--stats">
            <div className="rf-stat">
              <span className="rf-stat__label">Plan status</span>
              <strong>{agentPlan ? "Previewed" : isPlanReady ? "Ready" : "Locked"}</strong>
              <p>Automation preview</p>
            </div>
            <div className="rf-stat">
              <span className="rf-stat__label">Execution</span>
              <strong>{agentExecutionResult ? "Run complete" : "Not executed"}</strong>
              <p>Workbook actions</p>
            </div>
          </div>
        </div>
      </div>

      <SectionCard
        id="agent-mode"
        title="Agent Mode"
        description="Preview a bounded Excel action plan from a prompt, then approve execution."
        actions={
          <div className="rf-inline-actions">
            <button
              type="button"
              className="rf-button"
              onClick={onPreviewAgentPlan}
              disabled={!isPlanReady || isActionBusy}
            >
              Preview Agent Plan
            </button>
            <button
              type="button"
              className="rf-button rf-button--primary"
              onClick={onRunAgentPlan}
              disabled={!agentPlan || !isPlanReady || isActionLocked}
            >
              Execute Approved Plan
            </button>
          </div>
        }
      >
        <p className="rf-helper">{agentActionHint}</p>
        <div className="rf-panel">
          <h3>Automation Prompt</h3>
          <textarea
            className="rf-textarea"
            value={agentPromptText}
            disabled={isActionBusy}
            onChange={(event) => onAgentPromptChange(event.target.value)}
          />
          <p className="rf-note">
            The agent is intentionally bounded. It only works on the active selection and on the
            report sheets it creates.
          </p>
          {isBackgroundRefreshing ? (
            <p className="rf-note">
              Report planning is still refreshing in the background. You can keep refining the
              automation prompt while workbook actions stay locked.
            </p>
          ) : null}
        </div>
        {agentPlan ? (
          <>
            <div className="rf-panel">
              <h3>{agentPlan.title}</h3>
              <p className="rf-muted">{agentPlan.summary}</p>
              <div className="rf-chip-list">
                {agentPlan.steps.map((step) => (
                  <span key={step.id} className="rf-chip">
                    {step.impact === "new-sheets"
                      ? "Creates Sheets"
                      : step.impact === "worksheet"
                        ? "Updates Worksheet"
                        : "Updates Selection"}
                  </span>
                ))}
              </div>
            </div>
            <div className="rf-grid rf-grid--two">
              <div className="rf-panel">
                <h3>Planned Steps</h3>
                <div className="rf-checklist">
                  {agentPlan.steps.map((step, index) => (
                    <div key={step.id} className="rf-step">
                      <div className="rf-step__header">
                        <span className="rf-step__number">{index + 1}</span>
                        <div>
                          <h3>{step.title}</h3>
                          <p>{step.description}</p>
                        </div>
                      </div>
                      <div className="rf-step__footer">
                        <StatusPill
                          label={
                            step.impact === "new-sheets"
                              ? "Creates Sheets"
                              : step.impact === "worksheet"
                                ? "Worksheet"
                                : "Selection"
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rf-panel">
                <h3>Safety Notes</h3>
                {agentPlan.warnings.length > 0 ? (
                  <ul className="rf-list">
                    {agentPlan.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="rf-muted">
                    No extra warnings were raised for this plan. The agent still stays inside its
                    bounded reporting toolset.
                  </p>
                )}
                <ul className="rf-list">
                  {agentPlan.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        ) : (
          <div className="rf-panel rf-panel--soft">
            <h3>What Agent Mode Can Do</h3>
            <ul className="rf-list">
              <li>Structure a clean range as an Excel table.</li>
              <li>Apply reporting-friendly formatting to the current selection.</li>
              <li>Freeze the header row for easier review.</li>
              <li>Create the workbook report sheets from the current reporting plan.</li>
            </ul>
          </div>
        )}
        {agentExecutionResult ? (
          <div className="rf-panel">
            <h3>Execution Log</h3>
            <div className="rf-checklist">
              {agentExecutionResult.stepResults.map((step) => (
                <div
                  key={`${step.stepId}-${step.status}`}
                  className={`rf-step ${step.status === "completed" ? "is-done" : ""}`}
                >
                  <div className="rf-step__header">
                    <span className="rf-step__number">
                      {step.status === "completed" ? "OK" : step.status === "failed" ? "!" : "-"}
                    </span>
                    <div>
                      <h3>{step.title}</h3>
                      <p>{step.message}</p>
                    </div>
                  </div>
                  <div className="rf-step__footer">
                    <StatusPill
                      label={step.status}
                      tone={step.status === "completed" ? "success" : "warning"}
                    />
                  </div>
                </div>
              ))}
            </div>
            {agentExecutionResult.reportResult ? (
              <p className="rf-note">
                Workbook report created in {agentExecutionResult.reportResult.reportSheetName} and{" "}
                {agentExecutionResult.reportResult.detailSheetName}.
              </p>
            ) : null}
          </div>
        ) : null}
      </SectionCard>
    </>
  );
}
