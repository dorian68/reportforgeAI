import { enhanceBundleWithLlm } from "../../services/ai/enhanceBundle";
import { ReportForgeBundle } from "../../shared/types";
import { canUseLlm } from "../../services/ai/llmClient";
import { buildStoryline } from "../analysis/buildStoryline";
import { extractAnalyticalFindings } from "../analysis/extractAnalyticalFindings";
import { inferSemanticProfile } from "../analysis/inferSemanticProfile";
import {
  AnalyticalFinding,
  DatasetSemanticProfile,
  NormalizedReportRequest,
  StorylineStep,
  ValidationResult,
} from "../domain/types";
import {
  refineBundleForDelivery,
  validateBundleForDelivery,
} from "../validators/reportQualityValidator";

export async function runNarrativeAgent(
  bundle: ReportForgeBundle,
  request: NormalizedReportRequest
): Promise<{
  bundle: ReportForgeBundle;
  usedLlm: boolean;
  warning?: string;
  semanticProfile: DatasetSemanticProfile;
  analyticalFindings: AnalyticalFinding[];
  storyline: StorylineStep[];
  validation: ValidationResult;
}> {
  const semanticProfile = inferSemanticProfile(bundle, request);
  const analyticalFindings = extractAnalyticalFindings(bundle, semanticProfile, request);
  const storyline = buildStoryline(analyticalFindings, semanticProfile, request);
  const fallbackBundle = refineBundleForDelivery(bundle, storyline);

  if (
    !request.enableLlm ||
    !request.llmConfig ||
    !canUseLlm(request.llmConfig, request.llmSecret ?? null)
  ) {
    return {
      bundle: fallbackBundle,
      usedLlm: false,
      semanticProfile,
      analyticalFindings,
      storyline,
      validation: validateBundleForDelivery(fallbackBundle, storyline),
    };
  }

  try {
    const nextBundle = refineBundleForDelivery(
      await enhanceBundleWithLlm(bundle, request.llmConfig, request.llmSecret ?? null, {
        semanticProfile,
        analyticalFindings,
        storyline,
      }),
      storyline
    );
    let validation = validateBundleForDelivery(nextBundle, storyline);
    if (!validation.passed && validation.issues.length > 0) {
      const repairedBundle = refineBundleForDelivery(
        await enhanceBundleWithLlm(nextBundle, request.llmConfig, request.llmSecret ?? null, {
          semanticProfile,
          analyticalFindings,
          storyline,
          qualityIssues: validation.issues,
        }),
        storyline
      );
      validation = validateBundleForDelivery(repairedBundle, storyline);
      return {
        bundle: repairedBundle,
        usedLlm: Boolean(repairedBundle.aiEnhancement),
        semanticProfile,
        analyticalFindings,
        storyline,
        validation,
        warning: validation.passed
          ? undefined
          : "AI narrative completed, but some sections still required the deterministic quality guard.",
      };
    }

    return {
      bundle: nextBundle,
      usedLlm: Boolean(nextBundle.aiEnhancement),
      semanticProfile,
      analyticalFindings,
      storyline,
      validation,
    };
  } catch (error) {
    const warning =
      error instanceof Error
        ? `${error.message} Falling back to the deterministic reporting engine for this run.`
        : "AI enhancement failed. Falling back to the deterministic reporting engine for this run.";
    return {
      bundle: fallbackBundle,
      usedLlm: false,
      warning,
      semanticProfile,
      analyticalFindings,
      storyline,
      validation: validateBundleForDelivery(fallbackBundle, storyline),
    };
  }
}
