/* global window */

export type LaunchRequestState = {
  fullName: string;
  workEmail: string;
  company: string;
  teamSize: string;
  selectedPlan: string;
  useCase: string;
  notes: string;
};

export type LaunchRequestField =
  | "fullName"
  | "workEmail"
  | "company"
  | "teamSize"
  | "selectedPlan"
  | "useCase"
  | "notes";

export type LaunchRequestErrors = Partial<Record<LaunchRequestField, string>>;

export interface LaunchRequestPayload {
  source: "reportforge-marketing-site";
  submittedAt: string;
  fullName: string;
  workEmail: string;
  company: string;
  teamSize: string;
  selectedPlan: string;
  useCase: string;
  notes: string;
  brief: string;
  pageUrl?: string;
  userAgent?: string;
}

export interface LeadSubmissionResult {
  ok: boolean;
  message: string;
}

function normalizeValue(value: string): string {
  return value.trim();
}

export function hasConfiguredSalesEmail(value: string): boolean {
  return /\S+@\S+\.\S+/.test(value.trim());
}

export function hasConfiguredLeadEndpoint(value: string): boolean {
  const normalized = value.trim();
  return /^https?:\/\//i.test(normalized) || normalized.startsWith("/");
}

export function buildLaunchBrief(form: LaunchRequestState): string {
  return [
    "ReportForge AI Launch Request",
    `Plan: ${normalizeValue(form.selectedPlan) || "Not selected"}`,
    `Full name: ${normalizeValue(form.fullName) || "Not provided"}`,
    `Work email: ${normalizeValue(form.workEmail) || "Not provided"}`,
    `Company: ${normalizeValue(form.company) || "Not provided"}`,
    `Team size: ${normalizeValue(form.teamSize) || "Not provided"}`,
    `Primary use case: ${normalizeValue(form.useCase) || "Not provided"}`,
    `Notes: ${normalizeValue(form.notes) || "No extra notes"}`,
  ].join("\n");
}

export function validateLaunchRequest(form: LaunchRequestState): LaunchRequestErrors {
  const errors: LaunchRequestErrors = {};

  if (!normalizeValue(form.fullName)) {
    errors.fullName = "Full name is required.";
  }

  if (!normalizeValue(form.workEmail)) {
    errors.workEmail = "Work email is required.";
  } else if (!/\S+@\S+\.\S+/.test(form.workEmail.trim())) {
    errors.workEmail = "Enter a valid work email.";
  }

  if (!normalizeValue(form.company)) {
    errors.company = "Company is required.";
  }

  if (!normalizeValue(form.selectedPlan)) {
    errors.selectedPlan = "Choose a plan.";
  }

  if (!normalizeValue(form.useCase)) {
    errors.useCase = "Choose a primary use case.";
  }

  return errors;
}

export function buildLaunchRequestPayload(
  form: LaunchRequestState,
  options: { pageUrl?: string; userAgent?: string } = {}
): LaunchRequestPayload {
  return {
    source: "reportforge-marketing-site",
    submittedAt: new Date().toISOString(),
    fullName: normalizeValue(form.fullName),
    workEmail: normalizeValue(form.workEmail),
    company: normalizeValue(form.company),
    teamSize: normalizeValue(form.teamSize),
    selectedPlan: normalizeValue(form.selectedPlan),
    useCase: normalizeValue(form.useCase),
    notes: normalizeValue(form.notes),
    brief: buildLaunchBrief(form),
    pageUrl: options.pageUrl?.trim() || undefined,
    userAgent: options.userAgent?.trim() || undefined,
  };
}

export function buildSalesMailto(form: LaunchRequestState, salesEmail: string): string {
  const subject = `${normalizeValue(form.selectedPlan) || "Launch"} request for ReportForge AI`;
  const body = buildLaunchBrief(form);
  return `mailto:${salesEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function resolveResponseMessage(responseBody: unknown): string {
  if (responseBody && typeof responseBody === "object" && "message" in responseBody) {
    const message = (responseBody as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return "";
}

export async function submitLaunchRequest(
  endpoint: string,
  payload: LaunchRequestPayload,
  fetchImpl?: typeof window.fetch
): Promise<LeadSubmissionResult> {
  const activeFetch =
    fetchImpl ??
    (typeof window !== "undefined" && typeof window.fetch === "function"
      ? window.fetch.bind(window)
      : undefined);
  if (typeof activeFetch !== "function") {
    throw new Error("Fetch API is unavailable in this runtime.");
  }

  const response = await activeFetch(endpoint, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  let responseBody: unknown = null;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    responseBody = await response.json().catch(() => null);
  } else {
    const text = await response.text().catch(() => "");
    responseBody = text ? { message: text } : null;
  }

  const message = resolveResponseMessage(responseBody);
  if (!response.ok) {
    throw new Error(message || "Lead capture request failed.");
  }

  return {
    ok: true,
    message: message || "Launch request submitted. We will follow up soon.",
  };
}
