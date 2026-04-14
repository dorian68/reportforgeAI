import { EXCEL_SELECTION_GUARDRAILS } from "../shared/constants";
import { RangeSnapshot } from "../shared/types";

export interface SelectionAssessment {
  blockers: string[];
  warnings: string[];
}

export function assessSelection(snapshot: RangeSnapshot): SelectionAssessment {
  const nonEmptyCellCount = snapshot.text.reduce((sum, row) => {
    return (
      sum +
      row.reduce((rowSum, value) => rowSum + (String(value ?? "").trim().length > 0 ? 1 : 0), 0)
    );
  }, 0);

  const warnings: string[] = [];
  const blockers: string[] = [];

  if (nonEmptyCellCount === 0) {
    blockers.push("The current selection is empty. Select a populated range or table first.");
  }

  if (snapshot.rowCount < 2) {
    warnings.push(
      "Only one row is selected. Include headers and data rows for stronger profiling and report generation."
    );
  }

  if (snapshot.columnCount < 2) {
    warnings.push(
      "Only one column is selected. KPI blocks may still work, but charts and dimensional summaries will be limited."
    );
  }

  if (
    snapshot.rowCount > EXCEL_SELECTION_GUARDRAILS.safeMaxRows ||
    snapshot.columnCount > EXCEL_SELECTION_GUARDRAILS.safeMaxColumns
  ) {
    warnings.push(
      "This is a large selection. Start with a cleaner subset if the task pane or Excel feels slow."
    );
  }

  return {
    blockers,
    warnings,
  };
}

export function toFriendlyErrorMessage(error: unknown): string {
  const rawMessage = error instanceof Error ? error.message : String(error);
  const normalized = rawMessage.trim().toLowerCase();

  if (!normalized) {
    return "An unexpected error occurred. Retry the last step from the top of the task pane.";
  }

  if (normalized.includes("must be loaded inside excel")) {
    return "This add-in only runs inside Excel. Open the workbook in Excel, then launch ReportForge AI from the ribbon.";
  }

  if (
    normalized.includes("google oauth client id") ||
    normalized.includes("save a google oauth client id")
  ) {
    return "Google is not configured yet. Paste a Web application OAuth client ID in Google connection, save it, then retry.";
  }

  if (
    normalized.includes("popup") ||
    normalized.includes("popup_closed") ||
    normalized.includes("popup_failed_to_open")
  ) {
    return "Google sign-in could not open. Allow popups for Excel or the add-in webview, then retry the connection step.";
  }

  if (
    normalized.includes("origin_mismatch") ||
    normalized.includes("redirect_uri_mismatch") ||
    normalized.includes("authorized javascript origin")
  ) {
    return "The Google OAuth client does not trust this add-in URL. Add https://localhost:3000 as an authorized JavaScript origin in Google Cloud, then retry.";
  }

  if (normalized.includes("invalid_client") || normalized.includes("unauthorized_client")) {
    return "The Google OAuth client is not usable for this add-in. Check the client type, published consent setup, and allowed origins, then retry.";
  }

  if (normalized.includes("access_denied")) {
    return "Google access was denied. Complete the consent flow and accept the requested permissions, then retry.";
  }

  if (
    normalized.includes("insufficient authentication scopes") ||
    normalized.includes("request had insufficient authentication scopes")
  ) {
    return "Google granted incomplete permissions. Disconnect Google, reconnect, and accept the requested Gmail or Apps Script scopes.";
  }

  if (normalized.includes("gmail api has not been used") || normalized.includes("gmail api")) {
    return "The Gmail API is not enabled for this Google project. Enable it in Google Cloud, wait a minute, then retry.";
  }

  if (
    normalized.includes("apps script api") ||
    normalized.includes("user has not enabled the apps script api") ||
    normalized.includes("script.googleapis.com") ||
    normalized.includes("script api has not been used")
  ) {
    return "The Apps Script API is not enabled for this Google account or project. Enable it in Google Cloud and in https://script.google.com/home/usersettings, then retry the export.";
  }

  if (
    normalized.includes("unable to load google identity services") ||
    normalized.includes("google identity services did not initialize")
  ) {
    return "Google sign-in could not initialize inside the task pane. Check that Excel can reach accounts.google.com, then retry.";
  }

  if (normalized.includes("google identity services timed out")) {
    return "Google sign-in did not respond in time. Check network access from Excel, then retry the connection step.";
  }

  if (
    normalized.includes("google request timed out") ||
    normalized.includes("google oauth request timed out")
  ) {
    return "Google did not respond in time. Retry after checking network access, popup blockers, and Google API availability.";
  }

  if (
    normalized.includes("google request failed before a response was received") ||
    normalized.includes("google disconnect timed out")
  ) {
    return "Google could not be reached from this Excel runtime. Check network access, then reconnect and retry.";
  }

  if (
    normalized.includes("ai enhancement is not configured") ||
    normalized.includes("save a provider and session api key")
  ) {
    return "AI enhancement is not configured yet. Use the managed AI preset or save an endpoint, model, and provider credentials in the Prompt section.";
  }

  if (
    normalized.includes("llm provider request failed (401)") ||
    normalized.includes("llm provider request failed (403)")
  ) {
    return "The AI provider rejected the request. Check the API key, organization setting, allowed origin, and model name.";
  }

  if (
    normalized.includes("llm provider request failed (429)") ||
    normalized.includes("rate limit")
  ) {
    return "The AI provider rate-limited the request. Retry later, lower concurrency, or switch to a less constrained model.";
  }

  if (normalized.includes("timed out") && normalized.includes("ai enhancement")) {
    return "The AI provider timed out. Retry, choose a faster model, or disable AI enhancement for this run.";
  }

  if (
    normalized.includes("did not return a json object") ||
    normalized.includes("returned malformed json") ||
    normalized.includes("response format is unsupported")
  ) {
    return "The AI provider returned an unusable response. Use an OpenAI-compatible chat completions endpoint or disable AI enhancement.";
  }

  if (normalized.includes("the llm provider returned an empty response")) {
    return "The AI provider returned no usable content. Retry, switch to a more reliable model, or disable AI enhancement for this run.";
  }

  if (
    normalized.includes("powerpoint export bundle did not load") ||
    normalized.includes("powerpoint generation tools could not initialize") ||
    normalized.includes("reading 'default'") ||
    normalized.includes('reading "default"')
  ) {
    return "PowerPoint export could not initialize in this Excel runtime. Retry the Slides export, and if it still fails use the HTML or PDF output while keeping the direct download link visible to the user.";
  }

  if (normalized.includes("failed to fetch") || normalized.includes("networkerror")) {
    return "A network request failed. Check the connection and make sure Excel can access localhost and Google endpoints.";
  }

  if (
    normalized.includes("does not expose the required excel api") ||
    normalized.includes("does not support the required excel api")
  ) {
    return "This Excel host is missing a required Office capability. Try Excel Desktop or Excel on the web with a current Microsoft 365 build.";
  }

  if (normalized.includes("generalexception") || normalized.includes("invalidargument")) {
    return "Excel rejected the current action. Try a simple rectangular range with headers, no merged cells, and no formula errors, then analyze again.";
  }

  if (normalized.includes("analyze a range before")) {
    return rawMessage;
  }

  return rawMessage;
}
