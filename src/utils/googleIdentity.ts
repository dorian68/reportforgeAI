export function normalizeGoogleOAuthClientId(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

export function isLikelyGoogleApiKey(value: string | null | undefined): boolean {
  return /^AIza[0-9A-Za-z\-_]{20,}$/.test(normalizeGoogleOAuthClientId(value));
}

export function isGoogleOAuthClientId(value: string | null | undefined): boolean {
  const normalized = normalizeGoogleOAuthClientId(value);
  return /^[0-9A-Za-z._-]+\.apps\.googleusercontent\.com$/i.test(normalized);
}

export function describeGoogleOAuthClientIdIssue(value: string | null | undefined): string {
  const normalized = normalizeGoogleOAuthClientId(value);

  if (!normalized) {
    return "Enter a Google OAuth client ID before connecting Google services.";
  }

  if (isLikelyGoogleApiKey(normalized)) {
    return "Use a Google OAuth Web client ID, not a Google API key. It should end with .apps.googleusercontent.com.";
  }

  if (!isGoogleOAuthClientId(normalized)) {
    return "The Google credential is not a valid OAuth Web client ID. Use a client ID that ends with .apps.googleusercontent.com.";
  }

  return "";
}
