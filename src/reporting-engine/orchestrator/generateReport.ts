import { createReportBundle } from "../../domain/orchestration/createReportBundle";
import { getPublicRuntimeConfig } from "../../shared/publicRuntimeConfig";
import { ReportForgeBundle } from "../../shared/types";
import { runDesignAgent } from "../agents/designAgent";
import { runNarrativeAgent } from "../agents/narrativeAgent";
import { runReportPlannerAgent } from "../agents/reportPlannerAgent";
import { buildArtifactWarnings } from "../adapters/mapBundleToReportPlan";
import { NormalizedReportRequest, ReportRequest, ReportResult } from "../domain/types";
import { buildEnginePrompt } from "../prompts/buildEnginePrompt";
import { renderGasProjectArtifact } from "../renderers/renderGasProjectArtifact";
import { renderArtifacts } from "../renderers/renderArtifacts";
import { validateAndNormalizeReportRequest } from "../schemas/validateRequest";

function log(level: "info" | "warning" | "error", step: string, message: string) {
  return {
    level,
    step,
    message,
    timestamp: new Date().toISOString(),
  } as const;
}

function shouldReuseBundle(
  existingBundle: ReportForgeBundle | null,
  promptText: string,
  brief?: NormalizedReportRequest["brief"]
): boolean {
  return Boolean(
    existingBundle &&
    existingBundle.prompt.rawPrompt.trim() === promptText.trim() &&
    (!brief ||
      Object.keys(brief).length === 0 ||
      JSON.stringify(existingBundle.plan.brief) === JSON.stringify(brief))
  );
}

export async function generateReport(request: ReportRequest): Promise<ReportResult> {
  const normalizedRequest: NormalizedReportRequest = validateAndNormalizeReportRequest(request);
  const runtimeConfig = getPublicRuntimeConfig();
  const logs = [log("info", "normalize-request", "The reporting engine request was normalized.")];
  const promptText = buildEnginePrompt(normalizedRequest);

  let bundle = normalizedRequest.existingBundle;
  if (!shouldReuseBundle(bundle, promptText, normalizedRequest.brief)) {
    logs.push(
      log("info", "create-bundle", "Creating the base reporting bundle from the source data.")
    );
    bundle = createReportBundle(
      normalizedRequest.sourceSnapshot,
      promptText,
      {
        mode: normalizedRequest.mode,
        variationSeed: normalizedRequest.variationSeed,
      },
      normalizedRequest.profile ?? undefined,
      normalizedRequest.businessContext,
      normalizedRequest.brief ?? {}
    );
  } else {
    logs.push(
      log("info", "reuse-bundle", "Reusing the existing report bundle as the engine input.")
    );
  }

  if (!bundle) {
    throw new Error("The reporting engine could not initialize a report bundle.");
  }

  const hydratedRequest: NormalizedReportRequest = {
    ...normalizedRequest,
    existingBundle: bundle,
    brief: bundle.plan.brief,
  };

  logs.push(
    log(
      "info",
      "semantic-inference",
      "Inferring the dataset semantics and enterprise reporting lens."
    )
  );
  const narrativePass = await runNarrativeAgent(bundle, hydratedRequest);
  bundle = narrativePass.bundle;
  logs.push(
    log(
      "info",
      "findings-engine",
      `Extracted ${narrativePass.analyticalFindings.length} analytical finding(s) for the reporting story.`
    )
  );
  logs.push(
    log(
      "info",
      "story-planner",
      `Built a ${narrativePass.storyline.length}-step storyline before artifact rendering.`
    )
  );
  if (narrativePass.warning) {
    logs.push(log("warning", "narrative-agent", narrativePass.warning));
    logs.push(
      log("info", "narrative-agent", "The deterministic narrative path was used after AI fallback.")
    );
  } else {
    logs.push(
      narrativePass.usedLlm
        ? log("info", "narrative-agent", "The LLM narrative agent upgraded the report bundle.")
        : log("info", "narrative-agent", "The deterministic narrative path was used.")
    );
  }
  narrativePass.validation.issues.forEach((issue) => {
    logs.push(
      log(issue.severity === "critical" ? "warning" : "info", "quality-gate", issue.message)
    );
  });
  logs.push(
    log(
      "info",
      "quality-gate",
      narrativePass.validation.passed
        ? "The reporting quality gate passed before rendering."
        : "The reporting quality gate raised issues and the deterministic guard refined the narrative."
    )
  );

  const reportPlan = runReportPlannerAgent(bundle, hydratedRequest);
  logs.push(
    log("info", "report-planner", "The report planner built the multi-format report plan.")
  );

  const designPass = await runDesignAgent(
    bundle,
    hydratedRequest,
    reportPlan,
    narrativePass.semanticProfile,
    narrativePass.analyticalFindings,
    narrativePass.storyline
  );
  logs.push(
    designPass.usedLlm
      ? log(
          "info",
          "design-agent",
          "The AI design layer produced the composition spec for the reporting artifacts."
        )
      : log(
          "info",
          "design-agent",
          "The deterministic design layer produced the composition spec for the reporting artifacts."
        )
  );
  if (designPass.warning) {
    logs.push(log("warning", "design-agent", designPass.warning));
  }

  const composedGasProject = renderGasProjectArtifact(bundle, designPass.designSpec);

  const artifacts = await renderArtifacts({
    request: {
      ...hydratedRequest,
      promptText,
    },
    bundle,
    corePlan: bundle.plan,
    reportPlan,
    designSpec: designPass.designSpec,
    canvasDocument: designPass.canvasDocument,
    semanticProfile: narrativePass.semanticProfile,
    analyticalFindings: narrativePass.analyticalFindings,
    storyline: narrativePass.storyline,
    validation: narrativePass.validation,
    gasProject: composedGasProject,
    slidesBundle: bundle.slidesBundle,
    logs,
    featureFlagEnabled: runtimeConfig.internalReportingEngine.enabled,
    usedLlm: narrativePass.usedLlm || designPass.usedLlm,
  });

  const warnings = buildArtifactWarnings(artifacts);
  warnings.forEach((warning) => logs.push(log("warning", "render-artifacts", warning)));
  logs.push(
    log(
      "info",
      "render-artifacts",
      `Rendered ${artifacts.filter((artifact) => artifact.status === "ready").length} artifact(s).`
    )
  );

  const readyCount = artifacts.filter((artifact) => artifact.status === "ready").length;
  const status =
    readyCount === 0
      ? "failed"
      : artifacts.some((artifact) => artifact.status === "error")
        ? "partial"
        : "success";

  return {
    status,
    request: {
      ...hydratedRequest,
      promptText,
    },
    bundle,
    corePlan: bundle.plan,
    reportPlan,
    designSpec: designPass.designSpec,
    canvasDocument: designPass.canvasDocument,
    semanticProfile: narrativePass.semanticProfile,
    analyticalFindings: narrativePass.analyticalFindings,
    storyline: narrativePass.storyline,
    validation: narrativePass.validation,
    slidesBundle: bundle.slidesBundle,
    gasProject: composedGasProject,
    artifacts,
    logs,
    featureFlagEnabled: runtimeConfig.internalReportingEngine.enabled,
    usedLlm: narrativePass.usedLlm || designPass.usedLlm,
  };
}
