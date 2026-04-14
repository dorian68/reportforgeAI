import {
  AppsScriptDeploymentOptions,
  AppsScriptProjectResult,
  GeneratedGasProject,
  GoogleTokenRecord,
} from "../../shared/types";

import { callGoogleApi } from "./googleApi";

interface AppsScriptProjectCreateResponse {
  scriptId: string;
  title: string;
}

interface AppsScriptVersionResponse {
  versionNumber: number;
}

interface AppsScriptDeploymentResponse {
  deploymentId: string;
  entryPoints?: Array<{
    entryPointType?: string;
    webApp?: {
      url?: string;
    };
  }>;
}

interface AppsScriptFilePayload {
  name: string;
  type: "SERVER_JS" | "HTML" | "JSON";
  source: string;
}

export async function exportAppsScriptProject(
  project: GeneratedGasProject,
  token: GoogleTokenRecord,
  options: AppsScriptDeploymentOptions
): Promise<AppsScriptProjectResult> {
  const projectTitle = options.scriptTitle.trim() || project.title;
  const projectResponse = await callGoogleApi<AppsScriptProjectCreateResponse>(
    token,
    "https://script.googleapis.com/v1/projects",
    {
      method: "POST",
      body: JSON.stringify({
        title: projectTitle,
      }),
    }
  );

  const files = mapGasProjectToAppsScriptFiles(project, options);
  await callGoogleApi<void>(
    token,
    `https://script.googleapis.com/v1/projects/${projectResponse.scriptId}/content`,
    {
      method: "PUT",
      body: JSON.stringify({ files }),
    }
  );

  const result: AppsScriptProjectResult = {
    scriptId: projectResponse.scriptId,
    scriptTitle: projectTitle,
    scriptUrl: `https://script.google.com/d/${projectResponse.scriptId}/edit`,
  };

  if (!options.deployAsWebApp) {
    return result;
  }

  const version = await callGoogleApi<AppsScriptVersionResponse>(
    token,
    `https://script.googleapis.com/v1/projects/${projectResponse.scriptId}/versions`,
    {
      method: "POST",
      body: JSON.stringify({
        description: options.deploymentDescription || "ReportForge AI deployment",
      }),
    }
  );

  const deployment = await callGoogleApi<AppsScriptDeploymentResponse>(
    token,
    `https://script.googleapis.com/v1/projects/${projectResponse.scriptId}/deployments`,
    {
      method: "POST",
      body: JSON.stringify({
        versionNumber: version.versionNumber,
        manifestFileName: "appsscript",
        description: options.deploymentDescription || "ReportForge AI deployment",
      }),
    }
  );

  return {
    ...result,
    versionNumber: version.versionNumber,
    deploymentId: deployment.deploymentId,
    webAppUrl:
      deployment.entryPoints?.find(
        (entryPoint) => entryPoint.entryPointType === "WEB_APP" || Boolean(entryPoint.webApp?.url)
      )?.webApp?.url ?? undefined,
  };
}

export function mapGasProjectToAppsScriptFiles(
  project: GeneratedGasProject,
  options?: Pick<AppsScriptDeploymentOptions, "webAppAccess" | "executeAs">
): AppsScriptFilePayload[] {
  return project.files.map((file) => {
    const source =
      file.filename === "appsscript.json"
        ? applyAppsScriptDeploymentSettings(file.content, options)
        : file.content;

    if (file.filename.endsWith(".gs")) {
      return {
        name: stripExtension(file.filename),
        type: "SERVER_JS",
        source,
      };
    }

    if (file.filename.endsWith(".html")) {
      return {
        name: stripExtension(file.filename),
        type: "HTML",
        source,
      };
    }

    return {
      name: stripExtension(file.filename),
      type: "JSON",
      source,
    };
  });
}

function stripExtension(filename: string): string {
  return filename.replace(/\.[^.]+$/, "");
}

function applyAppsScriptDeploymentSettings(
  manifestSource: string,
  options?: Pick<AppsScriptDeploymentOptions, "webAppAccess" | "executeAs">
): string {
  if (!options) {
    return manifestSource;
  }

  try {
    const manifest = JSON.parse(manifestSource) as {
      webapp?: {
        access?: string;
        executeAs?: string;
      };
    };

    manifest.webapp = {
      access: options.webAppAccess,
      executeAs: options.executeAs,
    };

    return JSON.stringify(manifest, null, 2);
  } catch {
    return manifestSource;
  }
}
