import {
  Audience,
  DatasetProfile,
  GeneratedEmailBundle,
  PromptInterpretation,
  ReportPlan,
} from "../../shared/types";
import { escapeHtml } from "../../utils/formatting";

export function generateEmailDrafts(
  profile: DatasetProfile,
  prompt: PromptInterpretation,
  plan: ReportPlan
): GeneratedEmailBundle {
  const audiences: Audience[] = uniqueAudiences(prompt.audience);
  const drafts = audiences.map((audience) => buildDraft(audience, plan, profile, prompt));

  return {
    primary: drafts[0],
    variants: drafts.slice(1),
    futureIntegrationNotes: [
      "Wire the draft payload into a lightweight OAuth broker only when Gmail or Graph sending is introduced.",
      "Keep transport concerns separate from generation so the same content can support Outlook, Gmail, and CRM workflows.",
    ],
  };
}

function buildDraft(
  audience: Audience,
  plan: ReportPlan,
  profile: DatasetProfile,
  prompt: PromptInterpretation
) {
  const summaryParagraphs = plan.executiveSummary ?? plan.excel.summaryParagraphs;
  const findings = plan.findings ?? [];
  const subjectPrefix = resolveSubjectPrefix(audience);
  const subject = `${subjectPrefix} | ${plan.title}`;
  const greeting =
    audience === "board"
      ? "Board members,"
      : audience === "cfo"
        ? "CFO team,"
        : audience === "client"
          ? "Hello,"
          : "Team,";
  const close = prompt.tone === "formal" ? "Regards," : "Thanks,";
  const metricLines = plan.excel.kpis
    .slice(0, 4)
    .map((kpi) => `- ${kpi.label}: ${kpi.formattedValue} (${kpi.insight})`)
    .join("\n");
  const evidenceLines = findings
    .slice(0, 3)
    .flatMap((finding) => finding.evidencePoints.slice(0, 1))
    .slice(0, 3)
    .map((line) => `- ${line}`)
    .join("\n");
  const recommendationLines = plan.recommendations.map((item) => `- ${item}`).join("\n");
  const implicationLine = findings[0]?.implication ?? plan.confidenceCaveat ?? "";

  const plainText = `${greeting}

${summaryParagraphs[0] ?? plan.narrativeSummary}

${summaryParagraphs[1] ?? ""}

What matters:
${evidenceLines || metricLines}

Headline metrics:
${metricLines}

Implication:
${implicationLine}

Recommended next steps:
${recommendationLines}

${plan.businessContext ? `Business context: ${plan.businessContext}\n\n` : ""}Source scope: ${profile.dataRowCount.toLocaleString()} rows across ${profile.columnCount} columns.

${close}
ReportForge AI`;

  const html = `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:24px;background:#f5f8f8;font-family:'Segoe UI',Aptos,sans-serif;color:#17353a;">
    <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #d9e7e5;border-radius:20px;padding:24px;">
      <p style="margin:0 0 12px;color:#0f766e;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">${escapeHtml(subjectPrefix)}</p>
      <h1 style="margin:0 0 12px;font-size:28px;">${escapeHtml(plan.title)}</h1>
      <p style="margin:0 0 12px;color:#58767a;">${escapeHtml(summaryParagraphs[0] ?? plan.narrativeSummary)}</p>
      ${
        summaryParagraphs[1]
          ? `<p style="margin:0 0 18px;color:#58767a;">${escapeHtml(summaryParagraphs[1])}</p>`
          : ""
      }
      ${
        plan.businessContext
          ? `<p style="margin:0 0 18px;padding:12px 14px;border-radius:14px;background:#f5fbfa;border:1px solid #d9e7e5;color:#58767a;"><strong style="color:#17353a;">Business context:</strong> ${escapeHtml(plan.businessContext)}</p>`
          : ""
      }
      ${
        implicationLine
          ? `<div style="margin:0 0 18px;padding:14px 16px;border-radius:16px;background:#fffaf0;border:1px solid #f0d7bc;">
              <div style="font-size:12px;color:#b45309;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Implication</div>
              <p style="margin-top:8px;color:#6c541f;">${escapeHtml(implicationLine)}</p>
            </div>`
          : ""
      }
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:18px;">
        ${plan.excel.kpis
          .slice(0, 4)
          .map(
            (
              kpi
            ) => `<div style="border:1px solid #d9e7e5;border-radius:16px;padding:14px;background:#f8fbfb;">
          <div style="font-size:12px;color:#58767a;">${escapeHtml(kpi.label)}</div>
          <div style="margin-top:8px;font-size:24px;color:#0f766e;font-weight:700;">${escapeHtml(kpi.formattedValue)}</div>
          <div style="margin-top:8px;font-size:12px;color:#58767a;">${escapeHtml(kpi.insight)}</div>
        </div>`
          )
          .join("")}
      </div>
      ${
        evidenceLines
          ? `<h2 style="margin:0 0 10px;font-size:18px;">What matters now</h2>
            <ul style="margin:0 0 18px;padding-left:18px;color:#17353a;">
              ${findings
                .slice(0, 3)
                .flatMap((finding) => finding.evidencePoints.slice(0, 1))
                .slice(0, 3)
                .map((item) => `<li style="margin-bottom:8px;">${escapeHtml(item)}</li>`)
                .join("")}
            </ul>`
          : ""
      }
      <h2 style="margin:0 0 10px;font-size:18px;">Recommended next steps</h2>
      <ul style="margin:0 0 18px;padding-left:18px;color:#17353a;">
        ${plan.recommendations
          .map((item) => `<li style="margin-bottom:8px;">${escapeHtml(item)}</li>`)
          .join("")}
      </ul>
      <p style="margin:0;color:#58767a;font-size:13px;">Source scope: ${profile.dataRowCount.toLocaleString()} rows across ${profile.columnCount} columns.</p>
    </div>
  </body>
</html>`;

  return {
    audience,
    subject,
    plainText,
    html,
  };
}

function resolveSubjectPrefix(audience: Audience): string {
  switch (audience) {
    case "board":
      return "Board Brief";
    case "cfo":
      return "Finance Brief";
    case "risk":
      return "Risk Brief";
    case "management":
      return "Management Brief";
    case "client":
      return "Client Brief";
    case "executive":
      return "Executive Update";
    default:
      return "Report Update";
  }
}

function uniqueAudiences(primary: Audience): Audience[] {
  const ordered: Audience[] = [primary, "executive", "cfo"];
  return Array.from(new Set(ordered));
}
