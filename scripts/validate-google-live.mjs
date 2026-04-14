import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import http from "node:http";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const DEFAULT_CREDENTIALS_PATH = "C:\\Users\\Labry\\Downloads\\cdp.json";
const REQUESTED_SCOPES = [
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/script.projects",
  "https://www.googleapis.com/auth/script.deployments",
];

function loadJson(text) {
  return JSON.parse(text);
}

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

async function loadCredentials(credentialsPath) {
  const raw = await readFile(credentialsPath, "utf8");
  const parsed = loadJson(raw);
  const web = parsed?.web;

  if (!web) {
    throw new Error("The credential file does not contain a web OAuth client.");
  }

  const clientId = normalizeString(web.client_id);
  const clientSecret = normalizeString(web.client_secret);
  const redirectUri = normalizeString(web.redirect_uris?.[0]);
  const authUri = normalizeString(web.auth_uri) || "https://accounts.google.com/o/oauth2/v2/auth";
  const tokenUri = normalizeString(web.token_uri) || "https://oauth2.googleapis.com/token";

  if (!clientId.endsWith(".apps.googleusercontent.com")) {
    throw new Error("The credential file does not expose a usable Google Web OAuth client ID.");
  }

  if (!clientSecret) {
    throw new Error("The credential file is missing the Google client secret required for the live validation harness.");
  }

  if (!redirectUri) {
    throw new Error("The credential file does not include a redirect URI.");
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    authUri,
    tokenUri,
  };
}

function openBrowser(url) {
  if (process.platform === "win32") {
    try {
      spawn("powershell.exe", ["-NoProfile", "-Command", `Start-Process '${url.replace(/'/g, "''")}'`], {
        detached: true,
        stdio: "ignore",
      }).unref();
      return;
    } catch {
      spawn("cmd", ["/c", "start", "", url], {
        detached: true,
        stdio: "ignore",
      }).unref();
      return;
    }
  }

  console.log(`Open this URL manually: ${url}`);
}

function waitForAuthorizationCode(redirectUri, expectedState, timeoutMs = 600_000) {
  const redirect = new URL(redirectUri);

  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (callback) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      server.close(() => callback());
    };

    const server = http.createServer((request, response) => {
      const requestUrl = new URL(request.url ?? "/", redirect.origin);

      if (requestUrl.pathname !== redirect.pathname) {
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Not found.");
        return;
      }

      const state = requestUrl.searchParams.get("state") ?? "";
      const code = requestUrl.searchParams.get("code") ?? "";
      const error = requestUrl.searchParams.get("error") ?? "";
      const errorDescription = requestUrl.searchParams.get("error_description") ?? "";

      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(
        "<html><body><h1>Google validation complete</h1><p>You can close this window and return to ReportForge validation.</p></body></html>"
      );

      if (state !== expectedState) {
        settle(() => reject(new Error("Google OAuth state mismatch during live validation.")));
        return;
      }

      if (error) {
        settle(() =>
          reject(new Error(errorDescription || error || "Google OAuth authorization failed."))
        );
        return;
      }

      if (!code) {
        settle(() => reject(new Error("Google OAuth callback returned without an authorization code.")));
        return;
      }

      settle(() => resolve(code));
    });

    server.on("error", (error) => {
      settle(() => reject(error));
    });

    server.listen(Number.parseInt(redirect.port || "80", 10), redirect.hostname, () => undefined);

    const timeout = setTimeout(() => {
      settle(() => reject(new Error("Timed out waiting for Google OAuth authorization.")));
    }, timeoutMs);
  });
}

async function exchangeAuthorizationCode(credentials, code) {
  const response = await fetch(credentials.tokenUri, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: credentials.redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed (${response.status}): ${await response.text()}`);
  }

  const payload = await response.json();
  if (!payload.access_token) {
    throw new Error("Google token exchange succeeded without an access token.");
  }

  return {
    accessToken: payload.access_token,
    tokenType: payload.token_type || "Bearer",
    scope: normalizeString(payload.scope) || REQUESTED_SCOPES.join(" "),
    expiresAt: new Date(Date.now() + Number(payload.expires_in || 3600) * 1000).toISOString(),
  };
}

async function importCompiledModule(relativePath) {
  const absolutePath = path.join(process.cwd(), ".test-dist", relativePath);
  try {
    await access(absolutePath);
  } catch {
    throw new Error(`Missing compiled module at ${absolutePath}. Run npm run build:test first.`);
  }

  return import(pathToFileURL(absolutePath).href);
}

async function buildLiveValidationBundle() {
  const [{ createSalesSnapshot }, { createReportBundle }] = await Promise.all([
    importCompiledModule(path.join("tests", "fixtures.js")),
    importCompiledModule(path.join("src", "domain", "orchestration", "createReportBundle.js")),
  ]);

  return createReportBundle(
    createSalesSnapshot(),
    "Create an executive update with Gmail-ready summary and a private Google web app.",
    {
      mode: "prompt-guided",
      variationSeed: 1,
    }
  );
}

async function runValidation(token) {
  const [{ createGmailDraft }, { exportAppsScriptProject }] = await Promise.all([
    importCompiledModule(path.join("src", "services", "google", "gmailDrafts.js")),
    importCompiledModule(path.join("src", "services", "google", "appsScriptProjects.js")),
  ]);

  const bundle = await buildLiveValidationBundle();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const scriptTitle = `ReportForge QA ${timestamp}`;

  const gmailDraft = await createGmailDraft(
    bundle.emailBundle.primary,
    {
      to: "qa-reportforge@example.com",
      cc: "",
      bcc: "",
    },
    token
  );

  const appsScript = await exportAppsScriptProject(bundle.gasProject, token, {
    scriptTitle,
    deploymentDescription: "ReportForge live validation",
    deployAsWebApp: true,
    webAppAccess: "MYSELF",
    executeAs: "USER_DEPLOYING",
  });

  return {
    promptStyle: bundle.prompt.reportStyle,
    emailSubject: bundle.emailBundle.primary.subject,
    gmailDraftId: gmailDraft.id,
    gmailMessageId: gmailDraft.messageId ?? null,
    appsScriptId: appsScript.scriptId,
    appsScriptDeploymentId: appsScript.deploymentId ?? null,
    appsScriptWebAppUrl: appsScript.webAppUrl ?? null,
    scriptTitle: appsScript.scriptTitle,
    grantedScopes: token.scope.split(/\s+/).filter(Boolean),
  };
}

async function main() {
  const credentialsPath = process.argv[2] || process.env.GOOGLE_OAUTH_JSON_PATH || DEFAULT_CREDENTIALS_PATH;
  const credentials = await loadCredentials(credentialsPath);
  const redirect = new URL(credentials.redirectUri);
  const state = randomUUID();
  const authUrl = new URL(credentials.authUri);

  authUrl.searchParams.set("client_id", credentials.clientId);
  authUrl.searchParams.set("redirect_uri", credentials.redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", REQUESTED_SCOPES.join(" "));
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("include_granted_scopes", "true");
  authUrl.searchParams.set("prompt", "consent");

  console.log(`Listening for Google OAuth callback on ${redirect.origin}${redirect.pathname}`);
  console.log(`Authorization URL: ${authUrl.toString()}`);
  openBrowser(authUrl.toString());
  const code = await waitForAuthorizationCode(credentials.redirectUri, state);
  const token = await exchangeAuthorizationCode(credentials, code);
  const result = await runValidation(token);

  console.log(
    JSON.stringify(
      {
        success: true,
        provider: "google-live",
        result,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2
    )
  );
  process.exitCode = 1;
});
