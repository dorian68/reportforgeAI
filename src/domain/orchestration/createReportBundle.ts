import { profileRangeData } from "../dataProfiling/profileRangeData";
import { buildReportPlan } from "../planning/buildReportPlan";
import { interpretPrompt } from "../prompt/interpretPrompt";
import { generateEmailDrafts } from "../../generators/email/generateEmailDrafts";
import { generateGasProject } from "../../generators/gas/generateGasProject";
import { generateSlideOutline } from "../../generators/slides/generateSlideOutline";
import { buildStoryline } from "../../reporting-engine/analysis/buildStoryline";
import { extractAnalyticalFindings } from "../../reporting-engine/analysis/extractAnalyticalFindings";
import { inferSemanticProfile } from "../../reporting-engine/analysis/inferSemanticProfile";
import {
  NormalizedReportRequest,
  ReportAudience,
  ReportObjective,
  ReportTone,
} from "../../reporting-engine/domain/types";
import { refineBundleForDelivery } from "../../reporting-engine/validators/reportQualityValidator";
import {
  DatasetProfile,
  Audience,
  GenerationOptions,
  ReportBrief,
  RangeSnapshot,
  ReportForgeBundle,
  Tone,
} from "../../shared/types";

function mapAudience(audience: Audience): ReportAudience {
  switch (audience) {
    case "executive":
      return "ceo";
    case "cfo":
      return "cfo";
    case "board":
      return "board";
    case "client":
      return "client";
    case "management":
      return "operations";
    case "operations":
      return "operations";
    default:
      return "general";
  }
}

function mapTone(tone: Tone): ReportTone {
  switch (tone) {
    case "formal":
      return "formal";
    case "neutral":
      return "executive";
    default:
      return "analytical";
  }
}

function createEngineView(
  snapshot: RangeSnapshot,
  profile: DatasetProfile,
  bundle: ReportForgeBundle,
  promptText: string,
  businessContext: string,
  options: GenerationOptions,
  slideCount: number,
  audience: Audience,
  tone: Tone
): NormalizedReportRequest {
  return {
    sourceSnapshot: snapshot,
    existingBundle: bundle,
    profile,
    promptText,
    businessContext,
    brief: bundle.plan.brief,
    audience: mapAudience(audience),
    objective: "summarize" satisfies ReportObjective,
    tone: mapTone(tone),
    language: "en",
    preferredFormats: ["html", "pptx", "email-html"],
    maxSlides: slideCount,
    mode: options.mode,
    variationSeed: options.variationSeed,
    enableLlm: false,
    requestId: "base-bundle",
  };
}

export function createReportBundle(
  snapshot: RangeSnapshot,
  promptText: string,
  options: GenerationOptions,
  existingProfile?: DatasetProfile,
  businessContext = "",
  briefOverrides: Partial<ReportBrief> = {}
): ReportForgeBundle {
  const profile = existingProfile ?? profileRangeData(snapshot);
  const prompt = interpretPrompt(promptText, options, businessContext);
  const plan = buildReportPlan(snapshot, profile, prompt, options, briefOverrides);
  const baseBundle: ReportForgeBundle = {
    snapshot,
    profile,
    prompt,
    plan,
    gasProject: generateGasProject(snapshot, profile, prompt, plan),
    emailBundle: generateEmailDrafts(profile, prompt, plan),
    slidesBundle: generateSlideOutline(profile, prompt, plan),
  };
  const engineView = createEngineView(
    snapshot,
    profile,
    baseBundle,
    promptText,
    businessContext,
    options,
    prompt.slideCount,
    prompt.audience,
    prompt.tone
  );
  const semanticProfile = inferSemanticProfile(baseBundle, engineView);
  const analyticalFindings = extractAnalyticalFindings(baseBundle, semanticProfile, engineView);
  const storyline = buildStoryline(analyticalFindings, semanticProfile, engineView);

  return refineBundleForDelivery(baseBundle, storyline);
}
