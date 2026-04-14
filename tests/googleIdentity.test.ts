import assert from "node:assert/strict";
import test from "node:test";

import {
  describeGoogleOAuthClientIdIssue,
  isGoogleOAuthClientId,
  isLikelyGoogleApiKey,
} from "../src/utils/googleIdentity";

test("google identity helpers distinguish OAuth client IDs from API keys", () => {
  const clientId = "1234567890-abc123def456.apps.googleusercontent.com";
  const apiKey = "AIzaSyBYb0RnXf6aSjkZnVIRybJJMdCjOu_qHQE";

  assert.equal(isGoogleOAuthClientId(clientId), true);
  assert.equal(isLikelyGoogleApiKey(clientId), false);
  assert.equal(isGoogleOAuthClientId(apiKey), false);
  assert.equal(isLikelyGoogleApiKey(apiKey), true);
});

test("google identity helpers return actionable setup errors", () => {
  assert.equal(
    describeGoogleOAuthClientIdIssue("AIzaSyBYb0RnXf6aSjkZnVIRybJJMdCjOu_qHQE"),
    "Use a Google OAuth Web client ID, not a Google API key. It should end with .apps.googleusercontent.com."
  );
  assert.equal(
    describeGoogleOAuthClientIdIssue("not-a-client-id"),
    "The Google credential is not a valid OAuth Web client ID. Use a client ID that ends with .apps.googleusercontent.com."
  );
  assert.equal(
    describeGoogleOAuthClientIdIssue(""),
    "Enter a Google OAuth client ID before connecting Google services."
  );
});
