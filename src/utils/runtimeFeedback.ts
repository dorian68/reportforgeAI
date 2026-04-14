import { toFriendlyErrorMessage } from "./userFeedback";

export function shouldIgnoreRuntimeIssue(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.trim().toLowerCase();
  const name = error instanceof Error ? error.name : "";

  return (
    name === "AbortError" ||
    normalized === "aborterror" ||
    normalized.includes("signal is aborted") ||
    (normalized.includes("abort") && normalized.includes("request"))
  );
}

export function createRuntimeRecoveryMessage(error: unknown): string {
  const friendly = toFriendlyErrorMessage(error).trim();
  return friendly || "An unexpected task pane error interrupted the last action.";
}

export function buildRuntimeIssueSignature(error: unknown): string {
  return createRuntimeRecoveryMessage(error).toLowerCase();
}
