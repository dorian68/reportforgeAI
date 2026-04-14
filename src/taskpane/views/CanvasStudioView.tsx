import React from "react";

import { CanvasLayoutEditor } from "../../components/CanvasLayoutEditor";
import { CollapsiblePanel } from "../../components/CollapsiblePanel";
import { SectionCard } from "../../components/SectionCard";
import { ReportResult, ReportFormat } from "../../reporting-engine";
import { CanvasDocumentComparison, CanvasLayoutIssue } from "../../services/canvas/canvasStudio";
import {
  CanvasDocumentSnapshot,
  CanvasLayoutMode,
  CanvasBlockFrame,
  CanvasBlockSpec,
  CanvasComponentKind,
  CanvasDocument,
  ReportDesignSpec,
} from "../../shared/types";

type CanvasPreviewMode = "report" | "email" | "slides";

interface CanvasStudioViewProps {
  bundleReady: boolean;
  isActionBusy: boolean;
  isBackgroundRefreshing: boolean;
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
  previewMode: CanvasPreviewMode;
  reportPreviewHtml: string;
  emailPreviewHtml: string;
  slidesPreviewHtml: string;
  autosaveStatus: string;
  recoveredDraftAt: string | null;
  snapshots: CanvasDocumentSnapshot[];
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
  onPreviewChange: (mode: CanvasPreviewMode) => void;
  onCanvasLayoutModeChange: (mode: CanvasLayoutMode) => void;
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
}

function describeFormat(format: ReportFormat): string {
  switch (format) {
    case "html":
      return "HTML report";
    case "pptx":
      return "PowerPoint";
    case "pdf":
      return "PDF";
    case "email-html":
      return "Email HTML";
    case "gas-project":
      return "Apps Script";
    case "excel-plan":
      return "Excel plan";
    case "slides-json":
      return "Slides spec";
    default:
      return format;
  }
}

export function CanvasStudioView({
  bundleReady,
  isActionBusy,
  isBackgroundRefreshing,
  isGenerating,
  canvasPrompt,
  canvasTemplateName,
  selectedTemplateId,
  selectedPresetId,
  effectiveBrief,
  effectiveBriefSource,
  businessContext,
  presetOptions,
  savedTemplates,
  result,
  designSpec,
  canvasDocument,
  comparisonDocument,
  canvasLayoutIssues,
  previewMode,
  reportPreviewHtml,
  emailPreviewHtml,
  slidesPreviewHtml,
  autosaveStatus,
  recoveredDraftAt,
  snapshots,
  selectedSnapshotId,
  snapshotComparison,
  snapshotDetails,
  onCanvasPromptChange,
  onCanvasTemplateNameChange,
  onSelectedTemplateChange,
  onPresetChange,
  onSaveTemplate,
  onApplyTemplate,
  onDeleteTemplate,
  onGenerate,
  onGenerateVariation,
  onCanvasAiCoEdit,
  onPreviewChange,
  onCanvasLayoutModeChange,
  onAddCanvasBlock,
  onUpdateCanvasBlock,
  onSetCanvasBlockFrame,
  onNudgeCanvasBlock,
  onRemoveCanvasBlock,
  onReplaceCanvasDocument,
  onCheckpointCanvasHistory,
  onUndoCanvas,
  onRedoCanvas,
  canUndoCanvas,
  canRedoCanvas,
  onResetCanvasLayout,
  onSaveCanvasSnapshot,
  onRestoreCanvasSnapshot,
  onDeleteCanvasSnapshot,
  onSelectedCanvasSnapshotChange,
  onDiscardRecoveredDraft,
  onDownloadArtifact,
  onCopyArtifactText,
}: CanvasStudioViewProps) {
  const isLocked = isActionBusy || isBackgroundRefreshing;
  const warningEntries = result?.logs.filter((entry) => entry.level === "warning") ?? [];
  const previewMarkup =
    previewMode === "email"
      ? emailPreviewHtml
      : previewMode === "slides"
        ? slidesPreviewHtml
        : reportPreviewHtml;
  const selectedPreset = presetOptions.find((preset) => preset.id === selectedPresetId) ?? null;

  return (
    <SectionCard
      id="canvas-studio"
      title="Canvas Studio"
      description="Generate a multi-format reporting pack inside the add-in, with logs, previews, and downloadable artifacts."
      actions={
        <div className="rf-inline-actions">
          <button
            type="button"
            className="rf-button rf-button--primary"
            onClick={onGenerate}
            disabled={!bundleReady || isLocked}
          >
            {isGenerating ? "Generating Canvas Pack..." : "Generate Canvas Pack"}
          </button>
          <button
            type="button"
            className="rf-button"
            onClick={onGenerateVariation}
            disabled={!bundleReady || isLocked}
          >
            Generate AI Variation
          </button>
        </div>
      }
    >
      <div className="rf-grid rf-grid--two">
        <div className="rf-panel">
          <h3>Generation Brief</h3>
          <label>
            Preset
            <select
              value={selectedPresetId}
              disabled={isLocked}
              onChange={(event) => onPresetChange(event.target.value)}
            >
              {presetOptions.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Canvas brief override
            <textarea
              className="rf-textarea"
              value={canvasPrompt}
              disabled={isLocked}
              onChange={(event) => onCanvasPromptChange(event.target.value)}
              placeholder="Example: Build a client decision pack with a premium executive tone, strong KPI headlines, a crisp HTML report, and a persuasive follow-up email."
            />
          </label>
          <p className="rf-note">
            Optional. If left blank, Canvas Studio automatically reuses the main report brief.
          </p>
          {selectedPreset ? (
            <p className="rf-note">Preset guidance: {selectedPreset.promptHint}</p>
          ) : null}
          <div className="rf-panel rf-panel--soft">
            <h3>Brief In Use</h3>
            <p className="rf-note">Source: {effectiveBriefSource}</p>
            <p className="rf-helper">{effectiveBrief}</p>
            <p className="rf-note">
              Business context:{" "}
              {businessContext?.trim()
                ? businessContext.trim()
                : "Inferred from the selected range"}
            </p>
          </div>
          {!bundleReady ? (
            <p className="rf-note">
              Analyze a range first. Canvas Studio is a downstream generator, not a replacement for
              selection analysis.
            </p>
          ) : null}
        </div>
        <div className="rf-panel">
          <h3>Canvas Template Library</h3>
          <label>
            Template name
            <input
              className="rf-input"
              type="text"
              value={canvasTemplateName}
              disabled={isLocked}
              onChange={(event) => onCanvasTemplateNameChange(event.target.value)}
              placeholder="Example: Client Quarterly Decision Pack"
            />
          </label>
          <label>
            Saved templates
            <select
              value={selectedTemplateId}
              disabled={isLocked}
              onChange={(event) => onSelectedTemplateChange(event.target.value)}
            >
              <option value="">Select a saved canvas template</option>
              {savedTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                  {template.styleName ? ` - ${template.styleName}` : ""}
                </option>
              ))}
            </select>
          </label>
          <div className="rf-inline-actions">
            <button
              type="button"
              className="rf-button"
              onClick={onSaveTemplate}
              disabled={isLocked}
            >
              Save Template
            </button>
            <button
              type="button"
              className="rf-button"
              onClick={onApplyTemplate}
              disabled={!selectedTemplateId || isLocked}
            >
              Apply Template
            </button>
            <button
              type="button"
              className="rf-button"
              onClick={onDeleteTemplate}
              disabled={!selectedTemplateId || isLocked}
            >
              Delete Template
            </button>
          </div>
          <p className="rf-note">
            Saved canvas templates keep the brief, the design intent, and the edited layout together
            so users can reuse high-performing packs instead of starting from zero.
          </p>
        </div>
      </div>

      <div className="rf-panel">
        <h3>Run Status</h3>
        {isGenerating ? (
          <p className="rf-helper">
            Canvas generation is running now. ReportForge is using the analyzed Excel selection plus
            the brief shown above.
          </p>
        ) : null}
        {result ? (
          <>
            <ul className="rf-list">
              <li>Status: {result.status}</li>
              <li>Audience: {result.reportPlan.audience}</li>
              <li>Objective: {result.reportPlan.objective}</li>
              <li>Formats: {result.reportPlan.recommendedFormats.join(", ")}</li>
              <li>LLM narrative: {result.usedLlm ? "Yes" : "No"}</li>
              <li>Design style: {designSpec?.styleName ?? "Not available yet"}</li>
              <li>Enterprise lens: {result.semanticProfile.enterpriseLens}</li>
              <li>
                Time dimension: {result.semanticProfile.timeDimension ?? "No reliable trend axis"}
              </li>
            </ul>
            <div className="rf-panel rf-panel--soft">
              <h3>Storyline</h3>
              <ul className="rf-list">
                {result.storyline.map((step) => (
                  <li key={step.id}>
                    <strong>{step.title}</strong>: {step.message}
                  </li>
                ))}
              </ul>
            </div>
            {warningEntries.length > 0 ? (
              <div className="rf-panel rf-panel--soft">
                <h3>Needs Attention</h3>
                {warningEntries.map((entry) => (
                  <p key={`${entry.timestamp}-${entry.step}`} className="rf-note">
                    {entry.message}
                  </p>
                ))}
              </div>
            ) : null}
            <p className="rf-note">{result.reportPlan.confidenceStatement}</p>
            {designSpec ? (
              <div className="rf-panel rf-panel--soft">
                <h3>Design Intent</h3>
                <ul className="rf-list">
                  <li>Tone: {designSpec.designTone}</li>
                  <li>Rhythm: {designSpec.pageRhythm}</li>
                  <li>Summary placement: {designSpec.summaryPlacement}</li>
                  <li>Chart preference: {designSpec.chartPreference}</li>
                </ul>
              </div>
            ) : null}
          </>
        ) : (
          <p className="rf-muted">
            {bundleReady
              ? "Ready to generate. The current selection is already analyzed, and ReportForge will use the brief shown above as soon as you click Generate Canvas Pack."
              : "No canvas pack has been generated yet. Analyze a range first, then return here to generate the pack."}
          </p>
        )}
      </div>

      <div className="rf-grid rf-grid--two">
        <div className="rf-panel rf-panel--soft">
          <h3>Studio Session</h3>
          <ul className="rf-list">
            <li>{autosaveStatus}</li>
            <li>Undo available: {canUndoCanvas ? "Yes" : "No"}</li>
            <li>Redo available: {canRedoCanvas ? "Yes" : "No"}</li>
            <li>Saved snapshots: {snapshots.length}</li>
          </ul>
          {recoveredDraftAt ? (
            <>
              <p className="rf-note">
                Recovered draft from {new Date(recoveredDraftAt).toLocaleString()}.
              </p>
              <button
                type="button"
                className="rf-button"
                onClick={onDiscardRecoveredDraft}
                disabled={isLocked}
              >
                Clear Recovered Draft
              </button>
            </>
          ) : null}
        </div>
        <div className="rf-panel">
          <h3>Version Snapshots</h3>
          <label>
            Snapshot library
            <select
              value={selectedSnapshotId}
              disabled={isLocked}
              onChange={(event) => onSelectedCanvasSnapshotChange(event.target.value)}
            >
              <option value="">Select a saved snapshot</option>
              {snapshots.map((snapshot) => (
                <option key={snapshot.id} value={snapshot.id}>
                  {snapshot.label}
                </option>
              ))}
            </select>
          </label>
          <p className="rf-note">{snapshotComparison}</p>
          {snapshotDetails?.changedPages.length ? (
            <div className="rf-checklist">
              {snapshotDetails.changedPages.slice(0, 4).map((pageChange) => (
                <div key={pageChange.pageId} className="rf-step">
                  <div>
                    <strong>{pageChange.label}</strong>
                    <p className="rf-note">
                      {pageChange.changedBlockTitles.length
                        ? `Changed: ${pageChange.changedBlockTitles.join(", ")}`
                        : pageChange.addedBlockTitles.length
                          ? `Added: ${pageChange.addedBlockTitles.join(", ")}`
                          : `Removed: ${pageChange.removedBlockTitles.join(", ")}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          <div className="rf-inline-actions">
            <button
              type="button"
              className="rf-button"
              onClick={onSaveCanvasSnapshot}
              disabled={isLocked || !canvasDocument}
            >
              Save Snapshot
            </button>
            <button
              type="button"
              className="rf-button"
              onClick={() => onRestoreCanvasSnapshot(selectedSnapshotId)}
              disabled={!selectedSnapshotId || isLocked}
            >
              Restore Snapshot
            </button>
            <button
              type="button"
              className="rf-button"
              onClick={() => onDeleteCanvasSnapshot(selectedSnapshotId)}
              disabled={!selectedSnapshotId || isLocked}
            >
              Delete Snapshot
            </button>
          </div>
        </div>
      </div>

      {canvasLayoutIssues.length > 0 ? (
        <div className="rf-panel rf-panel--soft">
          <h3>Layout Quality Gate</h3>
          <ul className="rf-list">
            {canvasLayoutIssues.map((issue) => (
              <li key={`${issue.pageId}-${issue.code}-${issue.message}`}>
                [{issue.severity}] {issue.message}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rf-panel rf-panel--soft">
          <h3>Layout Quality Gate</h3>
          <p className="rf-muted">
            No layout collisions or obvious visual corruption were detected in the current canvas
            draft.
          </p>
        </div>
      )}

      {canvasDocument ? (
          <CanvasLayoutEditor
            document={canvasDocument}
            comparisonDocument={comparisonDocument}
            designSpec={designSpec}
            isLocked={isLocked}
          canUndo={canUndoCanvas}
          canRedo={canRedoCanvas}
          onLayoutModeChange={onCanvasLayoutModeChange}
          onAddBlock={onAddCanvasBlock}
          onUpdateBlock={onUpdateCanvasBlock}
          onSetBlockFrame={onSetCanvasBlockFrame}
          onNudgeBlock={onNudgeCanvasBlock}
          onRemoveBlock={onRemoveCanvasBlock}
          onReplaceDocument={onReplaceCanvasDocument}
          onCheckpointHistory={onCheckpointCanvasHistory}
          onUndo={onUndoCanvas}
          onRedo={onRedoCanvas}
            onResetToAiLayout={onResetCanvasLayout}
            onGenerateVariation={onGenerateVariation}
            onAiCoEdit={onCanvasAiCoEdit}
          />
      ) : null}

      {result ? (
        <>
          <div className="rf-panel">
            <div className="rf-inline-actions">
              <h3>Preview</h3>
              <div className="rf-inline-actions">
                <button
                  type="button"
                  className="rf-button"
                  onClick={() => onPreviewChange("report")}
                  disabled={previewMode === "report"}
                >
                  HTML Report
                </button>
                <button
                  type="button"
                  className="rf-button"
                  onClick={() => onPreviewChange("email")}
                  disabled={previewMode === "email"}
                >
                  Email
                </button>
                <button
                  type="button"
                  className="rf-button"
                  onClick={() => onPreviewChange("slides")}
                  disabled={previewMode === "slides"}
                >
                  Slides
                </button>
              </div>
            </div>
            <div className="rf-slide-preview">
              <iframe
                className="rf-slide-preview__frame"
                title="Canvas studio preview"
                sandbox=""
                srcDoc={previewMarkup}
              />
            </div>
          </div>

          <div className="rf-grid rf-grid--two">
            <div className="rf-panel">
              <h3>Artifacts</h3>
              <div className="rf-checklist">
                {result.artifacts.map((artifact) => (
                  <div
                    key={artifact.id}
                    className={`rf-step ${artifact.status === "ready" ? "is-done" : ""}`}
                  >
                    <div className="rf-step__header">
                      <span className="rf-step__number">
                        {artifact.status === "ready"
                          ? "OK"
                          : artifact.status === "error"
                            ? "!"
                            : "i"}
                      </span>
                      <div>
                        <h3>{artifact.label}</h3>
                        <p>{artifact.summary}</p>
                        <p className="rf-note">{describeFormat(artifact.format)}</p>
                      </div>
                    </div>
                    <div className="rf-step__footer">
                      {artifact.status === "ready" && artifact.filename ? (
                        <button
                          type="button"
                          className="rf-button"
                          onClick={() => onDownloadArtifact(artifact.id)}
                        >
                          Download
                        </button>
                      ) : null}
                      {artifact.status === "ready" && artifact.textContent ? (
                        <button
                          type="button"
                          className="rf-button"
                          onClick={() =>
                            onCopyArtifactText(artifact.label, artifact.textContent ?? "")
                          }
                        >
                          Copy
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rf-panel">
              <h3>Plan Sections</h3>
              <div className="rf-checklist">
                {result.reportPlan.sections.map((section) => (
                  <div key={section.id} className="rf-step is-done">
                    <div className="rf-step__header">
                      <span className="rf-step__number">OK</span>
                      <div>
                        <h3>{section.title}</h3>
                        <p>{section.purpose}</p>
                        {section.callToAction ? (
                          <p className="rf-note">CTA: {section.callToAction}</p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rf-grid rf-grid--two">
            <div className="rf-panel">
              <h3>Execution Log</h3>
              <ul className="rf-list">
                {result.logs.map((entry) => (
                  <li key={`${entry.timestamp}-${entry.step}`}>
                    [{entry.level}] {entry.step}: {entry.message}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rf-panel">
              <h3>Raw Specs</h3>
              <CollapsiblePanel title="Design spec" defaultOpen={false}>
                <code>{JSON.stringify(designSpec, null, 2)}</code>
              </CollapsiblePanel>
              <CollapsiblePanel title="Slides JSON" defaultOpen={false}>
                <code>{result.bundle.slidesBundle.json}</code>
              </CollapsiblePanel>
              <CollapsiblePanel title="Apps Script Project" defaultOpen={false}>
                <code>{JSON.stringify(result.gasProject, null, 2)}</code>
              </CollapsiblePanel>
            </div>
          </div>
        </>
      ) : null}
    </SectionCard>
  );
}
