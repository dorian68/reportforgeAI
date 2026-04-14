import React, { Dispatch, SetStateAction } from "react";

import { CollapsiblePanel } from "../../components/CollapsiblePanel";
import { FileTabs } from "../../components/FileTabs";
import { SectionCard } from "../../components/SectionCard";
import { ReportResult } from "../../reporting-engine";
import { WorkspaceTabs } from "../../components/WorkspaceTabs";
import { ExcelPlanSummary } from "../../generators/excel/summarizeExcelPlan";
import { ExcelRenderResult } from "../../services/office/renderExcelReport";
import {
  AppsScriptDeploymentOptions,
  CanvasBlockFrame,
  CanvasBlockSpec,
  CanvasComponentKind,
  CanvasDocument,
  AppsScriptProjectResult,
  EmailDraft,
  GmailDraftRecipients,
  GmailDraftResult,
  GoogleConnectionState,
  GoogleOAuthConfig,
  GoogleOAuthRuntimeState,
  GoogleTokenRecord,
  ReportDesignSpec,
  ReportForgeBundle,
} from "../../shared/types";
import { OutputWorkspaceId, WorkspaceTabModel } from "../workspaceNavigation";
import { CanvasStudioView } from "./CanvasStudioView";
import { CanvasDocumentComparison, CanvasLayoutIssue } from "../../services/canvas/canvasStudio";

interface OutputSummary {
  label: string;
  value: string;
  detail: string;
}

interface OutputsViewProps {
  activeWorkspace: OutputWorkspaceId;
  workspaceTabs: WorkspaceTabModel<OutputWorkspaceId>[];
  onWorkspaceChange: (workspace: OutputWorkspaceId) => void;
  bundle: ReportForgeBundle | null;
  outputSummary: OutputSummary[];
  isPlanReady: boolean;
  isActionBusy: boolean;
  isBackgroundRefreshing: boolean;
  onCopyText: (text: string, label: string) => void;
  excel: {
    excelSummary: ExcelPlanSummary | null;
    complexitySummary: { rowCount: number; columnCount: number; chartCount: number } | null;
    renderResult: ExcelRenderResult | null;
    isReportEligible: boolean;
    excelSupported: boolean;
    actionHint: string;
    onBuildReport: () => void;
    onOpenReportSheet: () => void;
    onOpenDetailSheet: () => void;
  };
  webApp: {
    actionHint: string;
    googleConfig: GoogleOAuthConfig;
    googleToken: GoogleTokenRecord | null;
    googleConnection: GoogleConnectionState;
    googleAuthState: GoogleOAuthRuntimeState;
    isGoogleConfigured: boolean;
    isManagedClientId: boolean;
    googleSetupIssue: string;
    googleScopeState: {
      gmail: boolean;
      script: boolean;
      deploy: boolean;
    };
    appsScriptOptions: AppsScriptDeploymentOptions;
    appsScriptResult: AppsScriptProjectResult | null;
    onGoogleConfigChange: Dispatch<SetStateAction<GoogleOAuthConfig>>;
    onAppsScriptOptionsChange: Dispatch<SetStateAction<AppsScriptDeploymentOptions>>;
    onSaveGoogleSettings: () => void;
    onConnectGoogle: () => void;
    onDisconnectGoogle: () => void;
    onExportProject: (deployAsWebApp: boolean) => void;
    exportActionLabel: string;
    deployActionLabel: string;
  };
  email: {
    actionHint: string;
    activeEmail: EmailDraft | null;
    selectedAudience: string;
    emailRecipients: GmailDraftRecipients;
    gmailDraftResult: GmailDraftResult | null;
    hasRecipients: boolean;
    actionLabel: string;
    onAudienceChange: (value: string) => void;
    onRecipientsChange: Dispatch<SetStateAction<GmailDraftRecipients>>;
    onCreateDraft: () => void;
  };
  slides: {
    html: string;
    markdown: string;
    json: string;
    title: string;
    powerPointDownloadUrl: string | null;
    powerPointDownloadFilename: string;
    slides: ReportForgeBundle["slidesBundle"]["slides"];
    templateName: string;
    templateDescription: string;
    templateAudienceLabel: string;
    templateNarrativeStyle: string;
    templateVisualDirection: string;
    templateStorytellingDirective: string;
    templateSourcePrompt: string;
    templatePromptHint: string;
    templateOptions: Array<{
      id: string;
      name: string;
      description: string;
      isCustom: boolean;
    }>;
    selectedTemplateId: string;
    slideTemplatePrompt: string;
    pdfPreviewUrl: string | null;
    canGenerateTemplate: boolean;
    canDeleteSelectedTemplate: boolean;
    onSelectedTemplateChange: (templateId: string) => void;
    onSlideTemplatePromptChange: (value: string) => void;
    onGenerateTemplate: () => void;
    onDeleteSelectedTemplate: () => void;
    onClearPdfPreview: () => void;
    onOpenHtmlPreview: () => void;
    onDownloadPowerPoint: () => void;
    onOpenPdfPreview: () => void;
    onDownloadPdf: () => void;
    onDownloadHtml: () => void;
    onDownloadMarkdown: () => void;
    onDownloadJson: () => void;
    onCopyMarkdown: () => void;
  };
  canvas?: {
    isGenerating: boolean;
    canvasPrompt: string;
    canvasTemplateName: string;
    selectedTemplateId: string;
    selectedPresetId: string;
    effectiveBrief: string;
    effectiveBriefSource: string;
    businessContext?: string;
    presetOptions: Array<{
      id: string;
      label: string;
      promptHint: string;
    }>;
    savedTemplates: Array<{
      id: string;
      name: string;
      presetId: string;
      styleName?: string;
    }>;
    result: ReportResult | null;
    designSpec: ReportDesignSpec | null;
    canvasDocument: CanvasDocument | null;
    comparisonDocument: CanvasDocument | null;
    canvasLayoutIssues: CanvasLayoutIssue[];
    previewMode: "report" | "email" | "slides";
    reportPreviewHtml: string;
    emailPreviewHtml: string;
    slidesPreviewHtml: string;
    autosaveStatus: string;
    recoveredDraftAt: string | null;
    snapshots: Array<{
      id: string;
      label: string;
      createdAt: string;
      document: CanvasDocument;
      designSpecId?: string;
    }>;
    selectedSnapshotId: string;
    snapshotComparison: string;
    snapshotDetails: CanvasDocumentComparison | null;
    onCanvasPromptChange: (value: string) => void;
    onCanvasTemplateNameChange: (value: string) => void;
    onSelectedTemplateChange: (templateId: string) => void;
    onPresetChange: (presetId: string) => void;
    onSaveTemplate: () => void;
    onApplyTemplate: () => void;
    onDeleteTemplate: () => void;
    onGenerate: () => void;
    onGenerateVariation: () => void;
    onCanvasAiCoEdit: (request: {
      scope: "selection" | "page";
      pageId: string;
      blockIds: string[];
      instruction: string;
      preset?: "executive" | "analytical" | "visual" | "narrative";
    }) => Promise<string> | string;
    onPreviewChange: (mode: "report" | "email" | "slides") => void;
    onCanvasLayoutModeChange: (mode: CanvasDocument["layoutMode"]) => void;
    onAddCanvasBlock: (pageId: string, kind: CanvasComponentKind) => void;
    onUpdateCanvasBlock: (
      pageId: string,
      blockId: string,
      patch: Partial<CanvasBlockSpec>
    ) => void;
    onSetCanvasBlockFrame: (
      pageId: string,
      blockId: string,
      frame: CanvasBlockFrame,
      options?: { recordHistory?: boolean }
    ) => void;
    onNudgeCanvasBlock: (pageId: string, blockId: string, dx: number, dy: number) => void;
    onRemoveCanvasBlock: (pageId: string, blockId: string) => void;
    onReplaceCanvasDocument: (
      nextDocument: CanvasDocument,
      options?: { recordHistory?: boolean; statusMessage?: string }
    ) => void;
    onCheckpointCanvasHistory: () => void;
    onUndoCanvas: () => void;
    onRedoCanvas: () => void;
    canUndoCanvas: boolean;
    canRedoCanvas: boolean;
    onResetCanvasLayout: () => void;
    onSaveCanvasSnapshot: () => void;
    onRestoreCanvasSnapshot: (snapshotId: string) => void;
    onDeleteCanvasSnapshot: (snapshotId: string) => void;
    onSelectedCanvasSnapshotChange: (snapshotId: string) => void;
    onDiscardRecoveredDraft: () => void;
    onDownloadArtifact: (artifactId: string) => void;
    onCopyArtifactText: (label: string, text: string) => void;
  };
}

export function OutputsView({
  activeWorkspace,
  workspaceTabs,
  onWorkspaceChange,
  bundle,
  outputSummary,
  isPlanReady,
  isActionBusy,
  isBackgroundRefreshing,
  onCopyText,
  excel,
  webApp,
  email,
  slides,
  canvas,
}: OutputsViewProps) {
  const isActionLocked = isActionBusy || isBackgroundRefreshing;

  return (
    <>
      <div className="rf-panel rf-panel--soft">
        <div className="rf-grid rf-grid--two">
          <div>
            <h3>Delivery Channels</h3>
            <p className="rf-helper">
              Choose one output at a time. The workbook report is the fastest first deliverable,
              then the other channels can be reviewed without scanning one long screen.
            </p>
          </div>
          <div className="rf-grid rf-grid--stats">
            {outputSummary.map((item) => (
              <div key={item.label} className="rf-stat">
                <span className="rf-stat__label">{item.label}</span>
                <strong>{item.value}</strong>
                <p>{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
        <WorkspaceTabs
          tabs={workspaceTabs}
          activeTab={activeWorkspace}
          onChange={onWorkspaceChange}
          ariaLabel="Output channels"
        />
      </div>

      {activeWorkspace === "excel" ? (
        <SectionCard
          id="excel-report"
          title="Excel Report"
          description="Create workbook-native reports first. This is the fastest path to a usable output."
          actions={
            <div className="rf-inline-actions">
              <button
                type="button"
                className="rf-button rf-button--primary"
                onClick={excel.onBuildReport}
                disabled={!excel.isReportEligible || !excel.excelSupported || isActionLocked}
              >
                Write Workbook Report
              </button>
              <button
                type="button"
                className="rf-button"
                onClick={excel.onOpenReportSheet}
                disabled={!excel.renderResult || isActionBusy}
              >
                Open Report Sheet
              </button>
              <button
                type="button"
                className="rf-button"
                onClick={excel.onOpenDetailSheet}
                disabled={!excel.renderResult || isActionBusy}
              >
                Open Detail Sheet
              </button>
            </div>
          }
        >
          <p className="rf-helper">{excel.actionHint}</p>
          {bundle && excel.excelSummary ? (
            <div className="rf-grid rf-grid--two">
              <div className="rf-panel">
                <h3>Plan</h3>
                <ul className="rf-list">
                  <li>Sheets: {excel.excelSummary.sheetCount}</li>
                  <li>KPIs: {excel.excelSummary.kpiCount}</li>
                  <li>Charts: {excel.excelSummary.chartCount}</li>
                  {excel.complexitySummary ? (
                    <li>
                      Scope: {excel.complexitySummary.rowCount.toLocaleString()} rows x{" "}
                      {excel.complexitySummary.columnCount} columns
                    </li>
                  ) : null}
                </ul>
              </div>
              <div className="rf-panel">
                <h3>Workbook Output</h3>
                {excel.renderResult ? (
                  <>
                    <ul className="rf-list">
                      <li>{excel.renderResult.reportSheetName}</li>
                      <li>{excel.renderResult.detailSheetName}</li>
                      <li>{excel.renderResult.supportSheetName} (hidden)</li>
                    </ul>
                    {excel.renderResult.notes.length > 0 ? (
                      <p className="rf-note">{excel.renderResult.notes.join(" ")}</p>
                    ) : null}
                    <p className="rf-note">
                      These sheets are already in the current workbook. Look for new tabs with the
                      names above.
                    </p>
                  </>
                ) : (
                  <p className="rf-muted">
                    Preview only for now. Click Write Workbook Report to create visible sheets in
                    the workbook.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="rf-muted">Analyze a range to preview the Excel report plan.</p>
          )}
        </SectionCard>
      ) : null}

      {activeWorkspace === "webapp" ? (
        <SectionCard
          id="google-web-app"
          title="Google Web App"
          description="Review the generated Apps Script scaffold here. Google connection is only required for authenticated export."
        >
          <p className="rf-helper">{webApp.actionHint}</p>
          <div className="rf-grid rf-grid--two">
            <div className="rf-panel">
              <h3>Google Connection</h3>
              {webApp.isManagedClientId ? (
                <div className="rf-panel rf-panel--soft">
                  <h3>Google Sign-In Ready</h3>
                  <p className="rf-helper">
                    This deployment already includes Google sign-in. Users can connect directly from
                    this add-in without configuring anything in Google Cloud Console.
                  </p>
                  <p className="rf-note">
                    The first Gmail or Apps Script action can open Google sign-in automatically.
                  </p>
                </div>
              ) : (
                <label>
                  OAuth Client ID
                  <input
                    className="rf-input"
                    type="text"
                    value={webApp.googleConfig.clientId}
                    disabled={isActionBusy}
                    onChange={(event) =>
                      webApp.onGoogleConfigChange({ clientId: event.target.value })
                    }
                    placeholder="1234567890-abc.apps.googleusercontent.com"
                  />
                </label>
              )}
              <div className="rf-inline-actions">
                {!webApp.isManagedClientId ? (
                  <button
                    type="button"
                    className="rf-button"
                    onClick={webApp.onSaveGoogleSettings}
                    disabled={isActionBusy}
                  >
                    Save Settings
                  </button>
                ) : null}
                <button
                  type="button"
                  className="rf-button"
                  onClick={webApp.onConnectGoogle}
                  disabled={!webApp.isGoogleConfigured || isActionLocked}
                >
                  {webApp.googleConnection.status === "connected"
                    ? "Reconnect Google"
                    : "Connect Google"}
                </button>
                <button
                  type="button"
                  className="rf-button"
                  onClick={webApp.onDisconnectGoogle}
                  disabled={!webApp.googleToken || isActionLocked}
                >
                  Disconnect
                </button>
              </div>
              <div className="rf-panel rf-panel--soft">
                <h3>OAuth Session</h3>
                <ul className="rf-list">
                  <li>Status: {webApp.googleAuthState.status}</li>
                  <li>
                    Requested scopes:{" "}
                    {webApp.googleAuthState.requestedScopes.length > 0
                      ? webApp.googleAuthState.requestedScopes.length
                      : 0}
                  </li>
                  <li>
                    Granted scopes:{" "}
                    {webApp.googleAuthState.grantedScopes.length > 0
                      ? webApp.googleAuthState.grantedScopes.length
                      : 0}
                  </li>
                  <li>
                    Last completion:{" "}
                    {webApp.googleAuthState.completedAt
                      ? new Date(webApp.googleAuthState.completedAt).toLocaleString()
                      : "None"}
                  </li>
                </ul>
                {webApp.googleAuthState.lastError ? (
                  <p className="rf-note">{webApp.googleAuthState.lastError}</p>
                ) : (
                  <p className="rf-note">
                    First use is autonomous once the OAuth client ID is available. ReportForge will
                    request only the Gmail or Apps Script scopes needed for the action you trigger.
                  </p>
                )}
              </div>
              {webApp.googleSetupIssue ? (
                <p className="rf-note">{webApp.googleSetupIssue}</p>
              ) : null}
              <div className="rf-chip-list">
                <span
                  className={`rf-chip ${webApp.googleScopeState.gmail ? "rf-chip--success" : ""}`}
                >
                  Gmail
                </span>
                <span
                  className={`rf-chip ${webApp.googleScopeState.script ? "rf-chip--success" : ""}`}
                >
                  Script
                </span>
                <span
                  className={`rf-chip ${webApp.googleScopeState.deploy ? "rf-chip--success" : ""}`}
                >
                  Deploy
                </span>
              </div>
              <p className="rf-note">
                {webApp.isManagedClientId
                  ? "Google tokens are stored only for the current browser session."
                  : "Use a Web application OAuth client. Add `https://localhost:3000` as an authorized JavaScript origin during local development. Google tokens are stored only for the current browser session."}
              </p>
            </div>
            <div className="rf-panel">
              <h3>Export Settings</h3>
              <label>
                Script title
                <input
                  className="rf-input"
                  type="text"
                  value={webApp.appsScriptOptions.scriptTitle}
                  disabled={isActionBusy}
                  onChange={(event) =>
                    webApp.onAppsScriptOptionsChange((current) => ({
                      ...current,
                      scriptTitle: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Deployment description
                <input
                  className="rf-input"
                  type="text"
                  value={webApp.appsScriptOptions.deploymentDescription}
                  disabled={isActionBusy}
                  onChange={(event) =>
                    webApp.onAppsScriptOptionsChange((current) => ({
                      ...current,
                      deploymentDescription: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="rf-toggle">
                <input
                  type="checkbox"
                  checked={webApp.appsScriptOptions.deployAsWebApp}
                  disabled={isActionBusy}
                  onChange={(event) =>
                    webApp.onAppsScriptOptionsChange((current) => ({
                      ...current,
                      deployAsWebApp: event.target.checked,
                    }))
                  }
                />
                <span>Enable web app deployment</span>
              </label>
              <label>
                Web app access
                <select
                  value={webApp.appsScriptOptions.webAppAccess}
                  disabled={isActionBusy}
                  onChange={(event) =>
                    webApp.onAppsScriptOptionsChange((current) => ({
                      ...current,
                      webAppAccess: event.target
                        .value as AppsScriptDeploymentOptions["webAppAccess"],
                    }))
                  }
                >
                  <option value="MYSELF">Private to me</option>
                  <option value="DOMAIN">Domain only</option>
                  <option value="ANYONE">Anyone with access</option>
                </select>
              </label>
              <label>
                Execute as
                <select
                  value={webApp.appsScriptOptions.executeAs}
                  disabled={isActionBusy}
                  onChange={(event) =>
                    webApp.onAppsScriptOptionsChange((current) => ({
                      ...current,
                      executeAs: event.target.value as AppsScriptDeploymentOptions["executeAs"],
                    }))
                  }
                >
                  <option value="USER_ACCESSING">User accessing the app</option>
                  <option value="USER_DEPLOYING">User deploying the app</option>
                </select>
              </label>
              <p className="rf-note">
                Safe default: keep web app deployment disabled or private until a security review is
                complete.
              </p>
              <div className="rf-inline-actions">
                <button
                  type="button"
                  className="rf-button"
                  onClick={() => webApp.onExportProject(false)}
                  disabled={!isPlanReady || isActionLocked}
                >
                  {webApp.exportActionLabel}
                </button>
                <button
                  type="button"
                  className="rf-button rf-button--primary"
                  onClick={() => webApp.onExportProject(true)}
                  disabled={
                    !isPlanReady || !webApp.appsScriptOptions.deployAsWebApp || isActionLocked
                  }
                >
                  {webApp.deployActionLabel}
                </button>
              </div>
              {!webApp.isGoogleConfigured ? (
                <p className="rf-note">
                  Google sign-in is not enabled in this deployment yet. Ask the workspace
                  administrator to enable it for end users.
                </p>
              ) : null}
            </div>
          </div>
          {bundle ? (
            <>
              <div className="rf-panel">
                <h3>Generated Files</h3>
                <FileTabs files={bundle.gasProject.files} />
              </div>
              <div className="rf-grid rf-grid--two">
                <div className="rf-panel">
                  <h3>Manual Deployment Steps</h3>
                  <ol className="rf-list rf-list--ordered">
                    {bundle.gasProject.deploymentSteps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </div>
                <div className="rf-panel">
                  <h3>Authenticated Export Result</h3>
                  {webApp.appsScriptResult ? (
                    <ul className="rf-list">
                      <li>Script ID: {webApp.appsScriptResult.scriptId}</li>
                      <li>
                        <a
                          href={webApp.appsScriptResult.scriptUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open project editor
                        </a>
                      </li>
                      {webApp.appsScriptResult.deploymentId ? (
                        <li>Deployment ID: {webApp.appsScriptResult.deploymentId}</li>
                      ) : null}
                      {webApp.appsScriptResult.webAppUrl ? (
                        <li>
                          <a
                            href={webApp.appsScriptResult.webAppUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open deployed web app
                          </a>
                        </li>
                      ) : null}
                    </ul>
                  ) : (
                    <p className="rf-muted">
                      The scaffold preview is ready below, but no authenticated Apps Script export
                      has run yet.
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <p className="rf-muted">Apps Script files will appear here after analysis.</p>
          )}
        </SectionCard>
      ) : null}

      {activeWorkspace === "email" ? (
        <SectionCard
          id="email"
          title="Email"
          description="Review the generated draft here. Google is only required if you want a real Gmail draft."
          actions={
            email.activeEmail ? (
              <div className="rf-inline-actions">
                <button
                  type="button"
                  className="rf-button"
                  onClick={() => onCopyText(email.activeEmail!.subject, "Email subject")}
                >
                  Copy Subject
                </button>
                <button
                  type="button"
                  className="rf-button"
                  onClick={() => onCopyText(email.activeEmail!.plainText, "Email draft")}
                >
                  Copy Plain Text
                </button>
                <button
                  type="button"
                  className="rf-button"
                  onClick={() => onCopyText(email.activeEmail!.html, "HTML email")}
                >
                  Copy HTML
                </button>
                <button
                  type="button"
                  className="rf-button rf-button--primary"
                  onClick={email.onCreateDraft}
                  disabled={!isPlanReady || !email.hasRecipients || isActionLocked}
                >
                  {email.actionLabel}
                </button>
              </div>
            ) : null
          }
        >
          <p className="rf-helper">{email.actionHint}</p>
          {bundle && email.activeEmail ? (
            <>
              <div className="rf-grid rf-grid--two">
                <div className="rf-panel">
                  <h3>Email Variant</h3>
                  <p className="rf-note">
                    Subject: <strong>{email.activeEmail.subject}</strong>
                  </p>
                  <label>
                    Audience
                    <select
                      value={email.selectedAudience}
                      disabled={isActionBusy}
                      onChange={(event) => email.onAudienceChange(event.target.value)}
                    >
                      <option value="primary">
                        Primary ({bundle.emailBundle.primary.audience})
                      </option>
                      {bundle.emailBundle.variants.map((draft) => (
                        <option key={draft.audience} value={draft.audience}>
                          {draft.audience}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="rf-panel">
                  <h3>Recipients</h3>
                  <label>
                    To
                    <input
                      className="rf-input"
                      type="text"
                      value={email.emailRecipients.to}
                      disabled={isActionBusy}
                      onChange={(event) =>
                        email.onRecipientsChange((current) => ({
                          ...current,
                          to: event.target.value,
                        }))
                      }
                      placeholder="ceo@company.com"
                    />
                  </label>
                  <label>
                    Cc
                    <input
                      className="rf-input"
                      type="text"
                      value={email.emailRecipients.cc}
                      disabled={isActionBusy}
                      onChange={(event) =>
                        email.onRecipientsChange((current) => ({
                          ...current,
                          cc: event.target.value,
                        }))
                      }
                      placeholder="finance@company.com"
                    />
                  </label>
                  <label>
                    Bcc
                    <input
                      className="rf-input"
                      type="text"
                      value={email.emailRecipients.bcc}
                      disabled={isActionBusy}
                      onChange={(event) =>
                        email.onRecipientsChange((current) => ({
                          ...current,
                          bcc: event.target.value,
                        }))
                      }
                      placeholder="audit@company.com"
                    />
                  </label>
                  <p className="rf-note">
                    Commas, semicolons, and line breaks are all accepted for recipient lists.
                  </p>
                  {!webApp.isGoogleConfigured ? (
                    <p className="rf-note">
                      Google sign-in is not enabled in this deployment yet. You can still review the
                      generated email here.
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="rf-grid rf-grid--two">
                <div className="rf-panel">
                  <h3>Plain Text</h3>
                  <CollapsiblePanel
                    title="Plain text draft"
                    summary="Collapsed by default for a cleaner taskpane"
                  >
                    <pre className="rf-code-block">
                      <code>{email.activeEmail.plainText}</code>
                    </pre>
                  </CollapsiblePanel>
                </div>
                <div className="rf-panel">
                  <h3>Rendered Preview</h3>
                  <div className="rf-email-preview">
                    <div className="rf-email-preview__meta">
                      <strong>{email.activeEmail.subject}</strong>
                      <span>Preview of the generated email before Gmail draft creation.</span>
                    </div>
                    <iframe
                      className="rf-email-preview__frame"
                      title="Generated email preview"
                      sandbox=""
                      srcDoc={email.activeEmail.html}
                    />
                  </div>
                </div>
              </div>
              <div className="rf-panel">
                <h3>HTML Source</h3>
                <CollapsiblePanel
                  title="HTML email source"
                  summary="Open only if you need to inspect or copy the raw markup"
                >
                  <pre className="rf-code-block">
                    <code>{email.activeEmail.html}</code>
                  </pre>
                </CollapsiblePanel>
              </div>
              <div className="rf-panel">
                <h3>Gmail Result</h3>
                {email.gmailDraftResult ? (
                  <ul className="rf-list">
                    <li>Draft ID: {email.gmailDraftResult.id}</li>
                    {email.gmailDraftResult.messageId ? (
                      <li>Message ID: {email.gmailDraftResult.messageId}</li>
                    ) : null}
                    <li>Encoded payload size: {email.gmailDraftResult.encodedSize}</li>
                  </ul>
                ) : (
                  <p className="rf-muted">
                    The email content is ready below, but no real Gmail draft has been created yet.
                  </p>
                )}
              </div>
            </>
          ) : (
            <p className="rf-muted">Email drafts will appear here after analysis.</p>
          )}
        </SectionCard>
      ) : null}

      {activeWorkspace === "slides" ? (
        <SectionCard
          id="slides"
          title="Slides"
          description="Preview the deck visually, then export a real PowerPoint or PDF artifact."
          actions={
            bundle ? (
              <div className="rf-inline-actions">
                <button
                  type="button"
                  className="rf-button rf-button--primary"
                  onClick={slides.onDownloadPowerPoint}
                >
                  Download PowerPoint
                </button>
                <button type="button" className="rf-button" onClick={slides.onOpenPdfPreview}>
                  Open PDF Preview
                </button>
                <button type="button" className="rf-button" onClick={slides.onDownloadPdf}>
                  Download PDF
                </button>
                <button type="button" className="rf-button" onClick={slides.onOpenHtmlPreview}>
                  Open HTML Preview
                </button>
                <button type="button" className="rf-button" onClick={slides.onDownloadHtml}>
                  Download HTML
                </button>
                <button type="button" className="rf-button" onClick={slides.onDownloadMarkdown}>
                  Download Markdown
                </button>
                <button type="button" className="rf-button" onClick={slides.onDownloadJson}>
                  Download JSON
                </button>
              </div>
            ) : undefined
          }
        >
          {bundle ? (
            <div className="rf-grid">
              <div className="rf-panel">
                <h3>{slides.title}</h3>
                <p className="rf-helper">
                  This deck is now previewable in the add-in and exportable as a real PowerPoint
                  deck, a PDF preview, standalone HTML, markdown, or JSON.
                </p>
                <div className="rf-inline-actions">
                  <button type="button" className="rf-button" onClick={slides.onCopyMarkdown}>
                    Copy Markdown
                  </button>
                </div>
              </div>
              {slides.powerPointDownloadUrl || slides.pdfPreviewUrl ? (
                <div className="rf-panel rf-panel--soft">
                  <h3>Export Status</h3>
                  <p className="rf-helper">
                    Office WebViews do not always start downloads visibly. If nothing opened after
                    clicking an export button, use the direct links below.
                  </p>
                  <div className="rf-inline-actions">
                    {slides.powerPointDownloadUrl ? (
                      <>
                        <a
                          className="rf-button"
                          href={slides.powerPointDownloadUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open PowerPoint File
                        </a>
                        <a
                          className="rf-button rf-button--primary"
                          href={slides.powerPointDownloadUrl}
                          download={slides.powerPointDownloadFilename}
                        >
                          Download PowerPoint Directly
                        </a>
                      </>
                    ) : null}
                    {slides.pdfPreviewUrl ? (
                      <a
                        className="rf-button"
                        href={slides.pdfPreviewUrl}
                        download={`${slides.title}.pdf`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open Or Download PDF Directly
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}
              <div className="rf-grid rf-grid--two">
                <div className="rf-panel">
                  <h3>Template</h3>
                  <label>
                    Deck template
                    <select
                      value={slides.selectedTemplateId}
                      disabled={isActionBusy}
                      onChange={(event) => slides.onSelectedTemplateChange(event.target.value)}
                    >
                      {slides.templateOptions.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                          {template.isCustom ? " (Custom)" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="rf-note">
                    <strong>{slides.templateName}</strong>: {slides.templateDescription}
                  </p>
                  <ul className="rf-list">
                    <li>Audience: {slides.templateAudienceLabel}</li>
                    <li>Narrative style: {slides.templateNarrativeStyle}</li>
                    <li>Visual direction: {slides.templateVisualDirection}</li>
                  </ul>
                  <p className="rf-note">{slides.templateStorytellingDirective}</p>
                  {slides.templateSourcePrompt ? (
                    <p className="rf-note">
                      Generated from brief: <strong>{slides.templateSourcePrompt}</strong>
                    </p>
                  ) : null}
                  <p className="rf-note">{slides.templatePromptHint}</p>
                </div>
                <div className="rf-panel">
                  <h3>Generate Template With AI</h3>
                  <label>
                    Template brief
                    <textarea
                      className="rf-textarea"
                      value={slides.slideTemplatePrompt}
                      disabled={isActionBusy}
                      onChange={(event) => slides.onSlideTemplatePromptChange(event.target.value)}
                      placeholder="Example: Investor-ready template with strong KPI header, premium neutral palette, and compact insight cards."
                    />
                  </label>
                  <p className="rf-note">
                    Use this when you want the deck visual system to adapt to a target audience or
                    client style, then save it for reuse. When AI enhancement is enabled, the
                    selected template also guides slide wording and visual direction.
                  </p>
                  <div className="rf-inline-actions">
                    <button
                      type="button"
                      className="rf-button rf-button--primary"
                      onClick={slides.onGenerateTemplate}
                      disabled={!slides.canGenerateTemplate || isActionLocked}
                    >
                      Generate Template
                    </button>
                    <button
                      type="button"
                      className="rf-button"
                      onClick={slides.onDeleteSelectedTemplate}
                      disabled={!slides.canDeleteSelectedTemplate || isActionLocked}
                    >
                      Delete Custom Template
                    </button>
                  </div>
                  {!slides.canGenerateTemplate ? (
                    <p className="rf-note">
                      Enable and save AI settings first if you want template generation to run from
                      the configured provider.
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="rf-panel">
                <h3>Live Deck Preview</h3>
                <div className="rf-slide-preview">
                  <iframe
                    className="rf-slide-preview__frame"
                    title="Generated slide deck preview"
                    sandbox=""
                    srcDoc={slides.html}
                  />
                </div>
              </div>
              {slides.pdfPreviewUrl ? (
                <div className="rf-panel">
                  <div className="rf-inline-actions">
                    <h3>PDF Preview</h3>
                    <button
                      type="button"
                      className="rf-button"
                      onClick={slides.onClearPdfPreview}
                      disabled={isActionBusy}
                    >
                      Clear PDF Preview
                    </button>
                  </div>
                  <p className="rf-helper">
                    The generated PDF is rendered directly inside the add-in so the preview stays
                    visible even when Office blocks external popups.
                  </p>
                  <div className="rf-slide-preview">
                    <iframe
                      className="rf-slide-preview__frame"
                      title="Generated slide PDF preview"
                      src={slides.pdfPreviewUrl}
                    />
                  </div>
                </div>
              ) : null}
              <div className="rf-slide-grid">
                {slides.slides.map((slide) => (
                  <article key={slide.index} className="rf-slide-card">
                    <div className="rf-slide-card__eyebrow">Slide {slide.index}</div>
                    <h3>{slide.title}</h3>
                    {slide.subtitle ? <p className="rf-muted">{slide.subtitle}</p> : null}
                    <div className="rf-slide-card__section">
                      <strong>Story Beat</strong>
                      <p className="rf-muted">{slide.storyBeat}</p>
                    </div>
                    <div className="rf-slide-card__section">
                      <strong>Visible Message</strong>
                      <p className="rf-muted">{slide.takeaway}</p>
                    </div>
                    <div className="rf-slide-card__section">
                      <strong>Evidence</strong>
                      <ul className="rf-list">
                        {(slide.evidencePoints ?? slide.bullets).map((bullet) => (
                          <li key={`${slide.index}-${bullet}`}>{bullet}</li>
                        ))}
                      </ul>
                    </div>
                    {slide.visual ? (
                      <div className="rf-slide-card__section">
                        <strong>Data Visual</strong>
                        <p className="rf-muted">
                          {slide.visual.title} ({slide.visual.kind})
                        </p>
                      </div>
                    ) : null}
                    <div className="rf-slide-card__section">
                      <strong>Visual Direction</strong>
                      <p className="rf-muted">{slide.chartCaption ?? slide.chartSuggestion}</p>
                    </div>
                    <div className="rf-slide-card__section">
                      <strong>Implication</strong>
                      <p className="rf-muted">{slide.implication ?? slide.speakerNotes}</p>
                    </div>
                    {slide.recommendation ? (
                      <div className="rf-slide-card__section">
                        <strong>Recommendation</strong>
                        <p className="rf-muted">{slide.recommendation}</p>
                      </div>
                    ) : null}
                    {slide.confidenceCaveat ? (
                      <div className="rf-slide-card__section">
                        <strong>Caveat</strong>
                        <p className="rf-muted">{slide.confidenceCaveat}</p>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
              <div className="rf-grid rf-grid--two">
                <div className="rf-panel">
                  <h3>Markdown Export</h3>
                  <CollapsiblePanel
                    title="Markdown deck outline"
                    summary="Raw export is folded by default"
                  >
                    <pre className="rf-code-block">
                      <code>{slides.markdown}</code>
                    </pre>
                  </CollapsiblePanel>
                </div>
                <div className="rf-panel">
                  <h3>JSON Export</h3>
                  <CollapsiblePanel
                    title="JSON deck payload"
                    summary="Open for integrations or debugging"
                  >
                    <pre className="rf-code-block">
                      <code>{slides.json}</code>
                    </pre>
                  </CollapsiblePanel>
                </div>
              </div>
              <div className="rf-panel">
                <h3>HTML Deck</h3>
                <CollapsiblePanel
                  title="HTML deck source"
                  summary="Open to inspect the rendered deck markup"
                >
                  <pre className="rf-code-block">
                    <code>{slides.html}</code>
                  </pre>
                </CollapsiblePanel>
              </div>
            </div>
          ) : (
            <p className="rf-muted">Slide output will appear here after analysis.</p>
          )}
        </SectionCard>
      ) : null}

      {activeWorkspace === "canvas" && canvas ? (
        <CanvasStudioView
          bundleReady={isPlanReady}
          isActionBusy={isActionBusy}
          isBackgroundRefreshing={isBackgroundRefreshing}
          isGenerating={canvas.isGenerating}
          canvasPrompt={canvas.canvasPrompt}
          canvasTemplateName={canvas.canvasTemplateName}
          selectedTemplateId={canvas.selectedTemplateId}
          selectedPresetId={canvas.selectedPresetId}
          effectiveBrief={canvas.effectiveBrief}
          effectiveBriefSource={canvas.effectiveBriefSource}
          businessContext={canvas.businessContext}
          presetOptions={canvas.presetOptions}
          savedTemplates={canvas.savedTemplates}
            result={canvas.result}
            designSpec={canvas.designSpec}
            canvasDocument={canvas.canvasDocument}
            comparisonDocument={canvas.comparisonDocument}
            canvasLayoutIssues={canvas.canvasLayoutIssues}
          previewMode={canvas.previewMode}
          reportPreviewHtml={canvas.reportPreviewHtml}
          emailPreviewHtml={canvas.emailPreviewHtml}
          slidesPreviewHtml={canvas.slidesPreviewHtml}
          autosaveStatus={canvas.autosaveStatus}
          recoveredDraftAt={canvas.recoveredDraftAt}
            snapshots={canvas.snapshots}
            selectedSnapshotId={canvas.selectedSnapshotId}
            snapshotComparison={canvas.snapshotComparison}
            snapshotDetails={canvas.snapshotDetails}
          onCanvasPromptChange={canvas.onCanvasPromptChange}
          onCanvasTemplateNameChange={canvas.onCanvasTemplateNameChange}
          onSelectedTemplateChange={canvas.onSelectedTemplateChange}
          onPresetChange={canvas.onPresetChange}
          onSaveTemplate={canvas.onSaveTemplate}
          onApplyTemplate={canvas.onApplyTemplate}
          onDeleteTemplate={canvas.onDeleteTemplate}
            onGenerate={canvas.onGenerate}
            onGenerateVariation={canvas.onGenerateVariation}
            onCanvasAiCoEdit={canvas.onCanvasAiCoEdit}
            onPreviewChange={canvas.onPreviewChange}
          onCanvasLayoutModeChange={canvas.onCanvasLayoutModeChange}
          onAddCanvasBlock={canvas.onAddCanvasBlock}
          onUpdateCanvasBlock={canvas.onUpdateCanvasBlock}
          onSetCanvasBlockFrame={canvas.onSetCanvasBlockFrame}
          onNudgeCanvasBlock={canvas.onNudgeCanvasBlock}
          onRemoveCanvasBlock={canvas.onRemoveCanvasBlock}
          onReplaceCanvasDocument={canvas.onReplaceCanvasDocument}
          onCheckpointCanvasHistory={canvas.onCheckpointCanvasHistory}
          onUndoCanvas={canvas.onUndoCanvas}
          onRedoCanvas={canvas.onRedoCanvas}
          canUndoCanvas={canvas.canUndoCanvas}
          canRedoCanvas={canvas.canRedoCanvas}
          onResetCanvasLayout={canvas.onResetCanvasLayout}
          onSaveCanvasSnapshot={canvas.onSaveCanvasSnapshot}
          onRestoreCanvasSnapshot={canvas.onRestoreCanvasSnapshot}
          onDeleteCanvasSnapshot={canvas.onDeleteCanvasSnapshot}
          onSelectedCanvasSnapshotChange={canvas.onSelectedCanvasSnapshotChange}
          onDiscardRecoveredDraft={canvas.onDiscardRecoveredDraft}
          onDownloadArtifact={canvas.onDownloadArtifact}
          onCopyArtifactText={canvas.onCopyArtifactText}
        />
      ) : null}
    </>
  );
}
