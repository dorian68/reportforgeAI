import React, { Dispatch, SetStateAction } from "react";

import { CollapsiblePanel } from "../../components/CollapsiblePanel";
import { SectionCard } from "../../components/SectionCard";
import { WorkspaceTabs } from "../../components/WorkspaceTabs";
import {
  LlmProviderConfig,
  LlmSessionSecret,
  ReportIntakeState,
  ReportForgeBundle,
  ReportMode,
  SavedTemplate,
} from "../../shared/types";
import { PlanWorkspaceId, WorkspaceTabModel } from "../workspaceNavigation";
import { requiresLlmClientSecret } from "../../services/ai/llmClient";

interface PromptStarter {
  label: string;
  prompt: string;
  mode: ReportMode;
}

interface PlanViewProps {
  activeWorkspace: PlanWorkspaceId;
  workspaceTabs: WorkspaceTabModel<PlanWorkspaceId>[];
  onWorkspaceChange: (workspace: PlanWorkspaceId) => void;
  mode: ReportMode;
  isActionBusy: boolean;
  isBackgroundRefreshing: boolean;
  isPlanReady: boolean;
  promptStarters: PromptStarter[];
  promptText: string;
  businessContext: string;
  reportIntake: ReportIntakeState | null;
  intakeMessage: string;
  bundle: ReportForgeBundle | null;
  variationSeed: number;
  templateName: string;
  templates: SavedTemplate[];
  selectedTemplateId: string;
  selectedTemplate: SavedTemplate | null;
  aiStatusLabel: string;
  hasPendingAiChanges: boolean;
  aiActionHint: string;
  llmConfig: LlmProviderConfig;
  llmSecret: LlmSessionSecret | null;
  hasManagedPreset: boolean;
  managedPresetSummary: string;
  onModeChange: (mode: ReportMode) => void;
  onApplyPromptStarter: (starter: PromptStarter) => void;
  onPromptChange: (prompt: string) => void;
  onBusinessContextChange: (value: string) => void;
  onIntakeMessageChange: (value: string) => void;
  onSubmitIntakeMessage: () => void;
  onGenerateNow: () => void;
  onOpenOutputs: () => void;
  onShuffleVariation: () => void;
  onTemplateNameChange: (value: string) => void;
  onSelectedTemplateChange: (templateId: string) => void;
  onSaveTemplate: () => void;
  onApplyTemplate: () => void;
  onDeleteTemplate: () => void;
  onLlmConfigChange: Dispatch<SetStateAction<LlmProviderConfig>>;
  onLlmSecretChange: Dispatch<SetStateAction<LlmSessionSecret | null>>;
  onSaveAiSettings: () => void;
  onRestoreManagedPreset: () => void;
  onTestAiConnection: () => void;
  onClearAiKey: () => void;
}

export function PlanView({
  activeWorkspace,
  workspaceTabs,
  onWorkspaceChange,
  mode,
  isActionBusy,
  isBackgroundRefreshing,
  isPlanReady,
  promptStarters,
  promptText,
  businessContext,
  reportIntake,
  intakeMessage,
  bundle,
  variationSeed,
  templateName,
  templates,
  selectedTemplateId,
  selectedTemplate,
  aiStatusLabel,
  hasPendingAiChanges,
  aiActionHint,
  llmConfig,
  llmSecret,
  hasManagedPreset,
  managedPresetSummary,
  onModeChange,
  onApplyPromptStarter,
  onPromptChange,
  onBusinessContextChange,
  onIntakeMessageChange,
  onSubmitIntakeMessage,
  onGenerateNow,
  onOpenOutputs,
  onShuffleVariation,
  onTemplateNameChange,
  onSelectedTemplateChange,
  onSaveTemplate,
  onApplyTemplate,
  onDeleteTemplate,
  onLlmConfigChange,
  onLlmSecretChange,
  onSaveAiSettings,
  onRestoreManagedPreset,
  onTestAiConnection,
  onClearAiKey,
}: PlanViewProps) {
  const isActionLocked = isActionBusy || isBackgroundRefreshing;
  const requiresSessionKey = requiresLlmClientSecret(llmConfig);
  const understoodBrief = reportIntake?.brief ?? bundle?.plan.brief ?? null;

  return (
    <>
      <div className="rf-panel rf-panel--soft">
        <div className="rf-grid rf-grid--two">
          <div>
            <h3>Plan The Workflow</h3>
            <p className="rf-helper">
              Keep planning focused: define the brief first, reuse templates for repeat work, then
              enable AI only if you want narrative enhancement.
            </p>
          </div>
          <div className="rf-grid rf-grid--stats">
            <div className="rf-stat">
              <span className="rf-stat__label">Mode</span>
              <strong>{mode}</strong>
              <p>Current planning mode</p>
            </div>
            <div className="rf-stat">
              <span className="rf-stat__label">Templates</span>
              <strong>{templates.length}</strong>
              <p>Saved configurations</p>
            </div>
            <div className="rf-stat">
              <span className="rf-stat__label">AI</span>
              <strong>{aiStatusLabel}</strong>
              <p>Narrative assistance status</p>
            </div>
          </div>
        </div>
        <WorkspaceTabs
          tabs={workspaceTabs}
          activeTab={activeWorkspace}
          onChange={onWorkspaceChange}
          ariaLabel="Planning workspace"
        />
      </div>

      {activeWorkspace === "brief" ? (
        <SectionCard
          id="plan-brief"
          title="Planning Brief"
          description="Guide the layout and audience with a short prompt. ReportForge keeps the rest of the plan structured."
          actions={
            <button
              type="button"
              className="rf-button rf-button--primary"
              onClick={onOpenOutputs}
              disabled={!isPlanReady}
            >
              Review Outputs
            </button>
          }
        >
          <div className="rf-grid rf-grid--two">
            <div className="rf-panel">
              <h3>Planning Controls</h3>
              <label>
                Mode
                <select
                  value={mode}
                  disabled={isActionBusy}
                  onChange={(event) => onModeChange(event.target.value as ReportMode)}
                >
                  <option value="automatic">Automatic</option>
                  <option value="prompt-guided">Prompt-guided</option>
                  <option value="variation">Variation</option>
                </select>
              </label>
              <div className="rf-section-label">Prompt Starters</div>
              <div className="rf-inline-actions">
                {promptStarters.map((starter) => (
                  <button
                    key={starter.label}
                    type="button"
                    className="rf-button rf-button--ghost"
                    onClick={() => onApplyPromptStarter(starter)}
                    disabled={isActionBusy}
                  >
                    {starter.label}
                  </button>
                ))}
              </div>
              <p className="rf-note">
                Start with one of these if you want a fast, structured first pass.
              </p>
              <div className="rf-panel rf-panel--soft">
                <h3>Variation Generator</h3>
                <p className="rf-helper">
                  Current seed: {variationSeed}. Use variation mode when you want alternate report
                  shapes, then shuffle to explore another version quickly.
                </p>
                <button
                  type="button"
                  className="rf-button"
                  onClick={onShuffleVariation}
                  disabled={isActionBusy}
                >
                  Randomize Report
                </button>
              </div>
            </div>
            <div className="rf-panel">
              <h3>Detected Direction</h3>
              {bundle ? (
                <div className="rf-grid rf-grid--stats">
                  <div className="rf-stat">
                    <span className="rf-stat__label">Audience</span>
                    <strong>{bundle.prompt.audience}</strong>
                    <p>Detected audience</p>
                  </div>
                  <div className="rf-stat">
                    <span className="rf-stat__label">Tone</span>
                    <strong>{bundle.prompt.tone}</strong>
                    <p>Writing style</p>
                  </div>
                  <div className="rf-stat">
                    <span className="rf-stat__label">Style</span>
                    <strong>{bundle.prompt.reportStyle}</strong>
                    <p>Report framing</p>
                  </div>
                  <div className="rf-stat">
                    <span className="rf-stat__label">Slides</span>
                    <strong>{bundle.prompt.slideCount}</strong>
                    <p>Requested outline length</p>
                  </div>
                </div>
              ) : (
                <p className="rf-muted">
                  The interpreted brief will appear here after you analyze a selection.
                </p>
              )}
            </div>
          </div>
          <div className="rf-panel">
            <h3>Instruction</h3>
            <textarea
              className="rf-textarea"
              value={promptText}
              disabled={isActionBusy}
              onChange={(event) => onPromptChange(event.target.value)}
            />
            <p className="rf-note">
              The plan refreshes automatically while you edit this brief. English and French prompt
              cues are supported for audience, tone, layout, and output intent.
            </p>
            <h3>Business Context</h3>
            <textarea
              className="rf-textarea"
              value={businessContext}
              disabled={isActionBusy}
              onChange={(event) => onBusinessContextChange(event.target.value)}
              placeholder="Optional. Example: Monthly claims performance by branch and product category, with a focus on severity and renewal quality."
            />
            <p className="rf-note">
              Optional but high-value. Use this field to explain what the data represent so the
              report, email, slides, and canvas outputs can sound more like a real analyst write-up
              and less like a generic template.
            </p>
            <div className="rf-grid rf-grid--two">
              <div className="rf-panel rf-panel--soft">
                <h3>Conversation Intake</h3>
                <p className="rf-helper">
                  Answer naturally. ReportForge will ask only for the missing context that changes
                  the story plan. Say &quot;generate now&quot; whenever you want to stop.
                </p>
                {reportIntake ? (
                  <>
                    <div className="rf-intake-status">
                      <span className={`rf-pill ${reportIntake.intakeComplete ? "rf-pill--success" : ""}`}>
                        {reportIntake.intakeComplete ? "Ready to generate" : "Brief still open"}
                      </span>
                      <span className="rf-chip">Next: {reportIntake.nextPrompt}</span>
                    </div>
                    {reportIntake.turns.length > 0 ? (
                      <div className="rf-conversation-log">
                        {reportIntake.turns.slice(-6).map((turn) => (
                          <div
                            key={`${turn.role}-${turn.timestamp}`}
                            className={`rf-conversation-turn rf-conversation-turn--${turn.role}`}
                          >
                            <strong>{turn.role === "assistant" ? "ReportForge" : "You"}</strong>
                            <p>{turn.text}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="rf-note">
                        No follow-up answers yet. The current prompt and business context already
                        seed the brief below.
                      </p>
                    )}
                    <label>
                      Add context or answer the next question
                      <textarea
                        className="rf-textarea"
                        value={intakeMessage}
                        disabled={isActionLocked}
                        onChange={(event) => onIntakeMessageChange(event.target.value)}
                        placeholder={reportIntake.nextPrompt}
                      />
                    </label>
                    <div className="rf-inline-actions">
                      <button
                        type="button"
                        className="rf-button"
                        onClick={onSubmitIntakeMessage}
                        disabled={isActionLocked || !intakeMessage.trim()}
                      >
                        Add Detail
                      </button>
                      <button
                        type="button"
                        className="rf-button rf-button--primary"
                        onClick={onGenerateNow}
                        disabled={isActionLocked || !isPlanReady}
                      >
                        Generate Now
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="rf-muted">
                    Analyze a selection first. The intake panel uses the detected data profile and
                    your prompt to decide what to ask next.
                  </p>
                )}
              </div>
              <div className="rf-panel">
                <h3>Understood Brief</h3>
                {understoodBrief ? (
                  <>
                    <p className="rf-helper">{reportIntake?.summary ?? understoodBrief.datasetSummary}</p>
                    <div className="rf-chip-list">
                      <span className="rf-chip">Audience: {understoodBrief.audience}</span>
                      <span className="rf-chip">Style: {understoodBrief.outputStyle}</span>
                      <span className="rf-chip">Tone: {understoodBrief.tone}</span>
                      <span className="rf-chip">Density: {understoodBrief.visualDensity}</span>
                    </div>
                    <div className="rf-brief-columns">
                      <div>
                        <div className="rf-section-label">Decision</div>
                        <p className="rf-note">{understoodBrief.keyDecision}</p>
                      </div>
                      <div>
                        <div className="rf-section-label">KPIs</div>
                        <div className="rf-chip-list">
                          {understoodBrief.preferredKpis.slice(0, 6).map((kpi) => (
                            <span key={kpi} className="rf-chip">
                              {kpi}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="rf-section-label">Focus Areas</div>
                        <div className="rf-chip-list">
                          {understoodBrief.focusAreas.length > 0 ? (
                            understoodBrief.focusAreas.map((focus) => (
                              <span key={focus} className="rf-chip">
                                {focus}
                              </span>
                            ))
                          ) : (
                            <span className="rf-chip">general performance</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="rf-section-label">Assumptions</div>
                        <ul className="rf-list">
                          {reportIntake?.assumptions.slice(0, 4).map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="rf-section-label">Still Missing</div>
                        <div className="rf-chip-list">
                          {(reportIntake?.missingRequired ?? []).map((item) => (
                            <span key={item} className="rf-chip">
                              Required: {item}
                            </span>
                          ))}
                          {(reportIntake?.missingOptional ?? []).slice(0, 4).map((item) => (
                            <span key={item} className="rf-chip">
                              Optional: {item}
                            </span>
                          ))}
                          {(reportIntake?.missingRequired.length ?? 0) === 0 &&
                          (reportIntake?.missingOptional.length ?? 0) === 0 ? (
                            <span className="rf-chip rf-chip--success">No major gaps</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="rf-muted">
                    The shared report brief will appear here after you analyze a selection.
                  </p>
                )}
              </div>
            </div>
            {isBackgroundRefreshing ? (
              <p className="rf-note">
                AI enhancement is still running in the background. You can keep editing this brief
                while the deterministic plan stays available.
              </p>
            ) : null}
          </div>
        </SectionCard>
      ) : null}

      {activeWorkspace === "templates" ? (
        <SectionCard
          id="plan-templates"
          title="Templates"
          description="Reuse repeatable setups instead of rewriting prompts and delivery preferences each time."
        >
          <div className="rf-grid rf-grid--two">
            <div className="rf-panel">
              <h3>Save Current Setup</h3>
              <label>
                Template name
                <input
                  className="rf-input"
                  type="text"
                  value={templateName}
                  disabled={isActionBusy}
                  onChange={(event) => onTemplateNameChange(event.target.value)}
                  placeholder="Board pack"
                />
              </label>
              <button
                type="button"
                className="rf-button rf-button--primary"
                onClick={onSaveTemplate}
                disabled={isActionBusy}
              >
                Save Current Template
              </button>
              <p className="rf-note">
                Templates keep the prompt, generation mode, and delivery defaults together.
              </p>
            </div>
            <div className="rf-panel">
              <h3>Saved Templates</h3>
              <label>
                Template
                <select
                  value={selectedTemplateId}
                  disabled={isActionBusy}
                  onChange={(event) => onSelectedTemplateChange(event.target.value)}
                >
                  <option value="">Choose a template</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="rf-inline-actions">
                <button
                  type="button"
                  className="rf-button"
                  onClick={onApplyTemplate}
                  disabled={!selectedTemplate || isActionBusy}
                >
                  Apply
                </button>
                <button
                  type="button"
                  className="rf-button"
                  onClick={onDeleteTemplate}
                  disabled={!selectedTemplate || isActionBusy}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
          <div className="rf-panel">
            <h3>Template Preview</h3>
            {selectedTemplate ? (
              <ul className="rf-list">
                <li>Mode: {selectedTemplate.mode}</li>
                <li>Prompt: {selectedTemplate.promptText}</li>
                <li>Business context: {selectedTemplate.businessContext || "None"}</li>
                <li>Apps Script title: {selectedTemplate.appsScriptTitle || "None"}</li>
                <li>Email To: {selectedTemplate.emailTo || "None"}</li>
                <li>Updated: {new Date(selectedTemplate.updatedAt).toLocaleString()}</li>
              </ul>
            ) : (
              <p className="rf-muted">
                Select a saved template to review what it will restore before applying it.
              </p>
            )}
          </div>
        </SectionCard>
      ) : null}

      {activeWorkspace === "ai" ? (
        <SectionCard
          id="plan-ai"
          title="AI Enhancement"
          description="Use the managed AI reporting layer to upgrade the narrative, titles, and recommendations without asking end users for credentials."
        >
          <div className="rf-panel">
            <h3>AI Status</h3>
            <p className="rf-helper">{aiActionHint}</p>
            {hasPendingAiChanges ? (
              <p className="rf-note">
                These AI edits are still local drafts. Save AI Settings before expecting the active
                report workflow to change.
              </p>
            ) : null}
            {hasManagedPreset ? (
              <p className="rf-note">
                Managed provider preset available: {managedPresetSummary}. This deployment is meant
                to work out of the box for end users.
              </p>
            ) : null}
            {!requiresSessionKey && llmConfig.enabled ? (
              <p className="rf-note">
                This provider runs through a managed relay. End users do not need to enter a client
                API key.
              </p>
            ) : null}
            <label className="rf-toggle">
              <input
                type="checkbox"
                checked={llmConfig.enabled}
                disabled={isActionBusy}
                onChange={(event) =>
                  onLlmConfigChange((current) => ({
                    ...current,
                    enabled: event.target.checked,
                  }))
                }
              />
              <span>Enable AI narrative enhancement</span>
            </label>
          </div>
          <div className="rf-grid rf-grid--two">
            <div className="rf-panel">
              <h3>{hasManagedPreset && !requiresSessionKey ? "Managed AI Engine" : "Provider"}</h3>
              {hasManagedPreset && !requiresSessionKey ? (
                <div className="rf-list">
                  <p className="rf-helper">
                    ReportForge already knows which AI provider to use for standard generation.
                  </p>
                  <ul className="rf-list">
                    <li>Provider: {llmConfig.providerLabel || "ReportForge Managed AI"}</li>
                    <li>Model: {llmConfig.model || "Managed by deployment"}</li>
                    <li>Endpoint: {llmConfig.endpoint || "Managed by deployment"}</li>
                  </ul>
                  <p className="rf-note">
                    End users do not need to enter an API key. Leave advanced overrides collapsed
                    unless you are testing a non-standard provider.
                  </p>
                </div>
              ) : null}
              <CollapsiblePanel
                title={
                  hasManagedPreset && !requiresSessionKey
                    ? "Advanced Provider Overrides"
                    : "Provider Settings"
                }
                defaultOpen={!hasManagedPreset || requiresSessionKey}
              >
                <div className="rf-form-grid">
                  <label>
                    Provider label
                    <input
                      className="rf-input"
                      type="text"
                      value={llmConfig.providerLabel}
                      disabled={isActionBusy}
                      onChange={(event) =>
                        onLlmConfigChange((current) => ({
                          ...current,
                          providerLabel: event.target.value,
                        }))
                      }
                      placeholder="OpenAI-Compatible Gateway"
                    />
                  </label>
                  <label>
                    Endpoint
                    <input
                      className="rf-input"
                      type="text"
                      value={llmConfig.endpoint}
                      disabled={isActionBusy}
                      onChange={(event) =>
                        onLlmConfigChange((current) => ({
                          ...current,
                          endpoint: event.target.value,
                        }))
                      }
                      placeholder="https://api.openai.com/v1/chat/completions"
                    />
                  </label>
                  <label>
                    Model
                    <input
                      className="rf-input"
                      type="text"
                      value={llmConfig.model}
                      disabled={isActionBusy}
                      onChange={(event) =>
                        onLlmConfigChange((current) => ({
                          ...current,
                          model: event.target.value,
                        }))
                      }
                      placeholder="gpt-4.1-mini"
                    />
                  </label>
                  <label>
                    Temperature
                    <input
                      className="rf-input"
                      type="number"
                      min="0"
                      max="1.5"
                      step="0.1"
                      value={llmConfig.temperature}
                      disabled={isActionBusy}
                      onChange={(event) =>
                        onLlmConfigChange((current) => ({
                          ...current,
                          temperature: Number.parseFloat(event.target.value || "0.3"),
                        }))
                      }
                    />
                  </label>
                </div>
              </CollapsiblePanel>
            </div>
            <div className="rf-panel">
              <h3>{requiresSessionKey ? "Security" : "Activation"}</h3>
              {requiresSessionKey || !hasManagedPreset ? (
                <div className="rf-form-grid">
                  <label>
                    API key header
                    <input
                      className="rf-input"
                      type="text"
                      value={llmConfig.apiKeyHeader}
                      disabled={isActionBusy}
                      onChange={(event) =>
                        onLlmConfigChange((current) => ({
                          ...current,
                          apiKeyHeader: event.target.value,
                        }))
                      }
                      placeholder="Authorization"
                    />
                  </label>
                  <label>
                    API key prefix
                    <input
                      className="rf-input"
                      type="text"
                      value={llmConfig.apiKeyPrefix}
                      disabled={isActionBusy}
                      onChange={(event) =>
                        onLlmConfigChange((current) => ({
                          ...current,
                          apiKeyPrefix: event.target.value,
                        }))
                      }
                      placeholder="Bearer"
                    />
                  </label>
                  <label>
                    Organization header value
                    <input
                      className="rf-input"
                      type="text"
                      value={llmConfig.organization ?? ""}
                      disabled={isActionBusy}
                      onChange={(event) =>
                        onLlmConfigChange((current) => ({
                          ...current,
                          organization: event.target.value,
                        }))
                      }
                      placeholder="Optional"
                    />
                  </label>
                  <label>
                    Session API key
                    <input
                      className="rf-input"
                      type="password"
                      value={llmSecret?.apiKey ?? ""}
                      disabled={isActionBusy}
                      onChange={(event) =>
                        onLlmSecretChange(
                          event.target.value
                            ? {
                                apiKey: event.target.value,
                              }
                            : null
                        )
                      }
                      placeholder="Stored only for this browser session"
                    />
                  </label>
                </div>
              ) : (
                <p className="rf-note">
                  AI generation is already wired to the deployment-managed relay. End users can
                  generate reports without entering any credential here.
                </p>
              )}
              <div className="rf-inline-actions">
                <button
                  type="button"
                  className="rf-button"
                  onClick={onSaveAiSettings}
                  disabled={isActionBusy}
                >
                  Save AI Settings
                </button>
                <button
                  type="button"
                  className="rf-button"
                  onClick={onTestAiConnection}
                  disabled={
                    !llmConfig.enabled || (requiresSessionKey && !llmSecret) || isActionLocked
                  }
                >
                  Test Connection
                </button>
                {hasManagedPreset ? (
                  <button
                    type="button"
                    className="rf-button"
                    onClick={onRestoreManagedPreset}
                    disabled={isActionBusy}
                  >
                    Restore Managed Defaults
                  </button>
                ) : null}
                {requiresSessionKey ? (
                  <button
                    type="button"
                    className="rf-button"
                    onClick={onClearAiKey}
                    disabled={!llmSecret || isActionBusy}
                  >
                    Clear Session Key
                  </button>
                ) : null}
              </div>
              <p className="rf-note">
                {requiresSessionKey
                  ? "Provider settings stay local. The API key is kept in session storage only."
                  : "Provider settings stay local. The managed relay keeps secrets out of the task pane UX."}
              </p>
            </div>
          </div>
        </SectionCard>
      ) : null}
    </>
  );
}
