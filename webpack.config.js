/* eslint-disable no-undef */

const fs = require("fs");
const path = require("path");
const devCerts = require("office-addin-dev-certs");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const webpack = require("webpack");
const { buildMarketingSiteMeta, normalizeBaseUrl } = require("./scripts/site-build-meta.cjs");

const urlDev = "https://localhost:3000/";
const urlDevOrigin = "https://localhost:3000";
const managedLlmDevPath = "/api/reportforge/llm/chat/completions";
const managedSiteLeadDevPath = "/api/reportforge/site/lead";

function normalize(value) {
  return value?.trim?.() ?? "";
}

function normalizeHostedBaseUrl(value) {
  const normalizedValue = normalize(value);
  if (!normalizedValue) {
    return "";
  }

  if (/^https?:\/\//i.test(normalizedValue)) {
    return normalizeBaseUrl(normalizedValue);
  }

  return normalizeBaseUrl(`https://${normalizedValue.replace(/^\/+/, "")}`);
}

function resolveProductionBaseUrl(runtimeEnv) {
  return (
    normalizeHostedBaseUrl(runtimeEnv.REPORTFORGE_BASE_URL) ||
    normalizeHostedBaseUrl(runtimeEnv.REPORTFORGE_PROD_URL) ||
    normalizeHostedBaseUrl(runtimeEnv.CF_PAGES_URL)
  );
}

async function getHttpsOptions() {
  const httpsOptions = await devCerts.getHttpsServerOptions();
  return { ca: httpsOptions.ca, key: httpsOptions.key, cert: httpsOptions.cert };
}

function loadEnvFile(filename) {
  const filePath = path.resolve(__dirname, filename);
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .reduce((accumulator, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        return accumulator;
      }

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex <= 0) {
        return accumulator;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const rawValue = trimmed.slice(separatorIndex + 1).trim();
      const normalizedValue = rawValue.replace(/^['"]|['"]$/g, "");
      accumulator[key] = normalizedValue;
      return accumulator;
    }, {});
}

function loadJsonFile(filename) {
  const filePath = path.resolve(__dirname, filename);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function loadGoogleOAuthClientId() {
  const config =
    loadJsonFile("config/google-oauth.client.json") || loadJsonFile("config/cdp.json");
  if (!config || typeof config !== "object") {
    return "";
  }

  return normalize(config.client_id) || normalize(config.web?.client_id) || normalize(config.installed?.client_id);
}

function resolveManagedLlmConfig(runtimeEnv, dev) {
  const explicitEndpoint = normalize(runtimeEnv.REPORTFORGE_LLM_ENDPOINT);
  const explicitProviderLabel = normalize(runtimeEnv.REPORTFORGE_LLM_PROVIDER_LABEL);
  const explicitModel = normalize(runtimeEnv.REPORTFORGE_LLM_MODEL);
  const explicitApiKeyHeader = normalize(runtimeEnv.REPORTFORGE_LLM_API_KEY_HEADER);
  const explicitApiKeyPrefix = normalize(runtimeEnv.REPORTFORGE_LLM_API_KEY_PREFIX);
  const explicitOrganization = normalize(runtimeEnv.REPORTFORGE_LLM_ORGANIZATION);
  const serverOpenAiKey = normalize(runtimeEnv.OPENAI_API_KEY);

  if (explicitEndpoint) {
    return {
      providerLabel: explicitProviderLabel || "ReportForge Managed AI",
      endpoint: explicitEndpoint,
      model: explicitModel || "gpt-4.1-mini",
      apiKeyHeader: explicitApiKeyHeader,
      apiKeyPrefix: explicitApiKeyPrefix,
      organization: explicitOrganization,
      serverOpenAiKey,
    };
  }

  if (!dev || !serverOpenAiKey) {
    return {
      providerLabel: "",
      endpoint: "",
      model: "",
      apiKeyHeader: "",
      apiKeyPrefix: "",
      organization: "",
      serverOpenAiKey,
    };
  }

  return {
    providerLabel: "ReportForge Managed AI",
    endpoint: managedLlmDevPath,
    model: explicitModel || "gpt-4.1-mini",
    apiKeyHeader: "",
    apiKeyPrefix: "",
    organization: explicitOrganization,
    serverOpenAiKey,
  };
}

function resolveSiteLeadEndpoint(runtimeEnv, dev) {
  return normalize(runtimeEnv.REPORTFORGE_SITE_LEAD_ENDPOINT) || (dev ? managedSiteLeadDevPath : "");
}

async function handleManagedLlmRequest(req, res, managedLlmConfig) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": urlDevOrigin,
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST,OPTIONS",
    });
    res.end();
    return;
  }

  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Method not allowed." }));
    return;
  }

  if (!managedLlmConfig.serverOpenAiKey) {
    res.writeHead(503, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Managed AI is not configured on the server." }));
    return;
  }

  try {
    const chunks = [];
    await new Promise((resolve, reject) => {
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", resolve);
      req.on("error", reject);
    });

    const rawBody = Buffer.concat(chunks).toString("utf8");
    const payload = JSON.parse(rawBody || "{}");
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${managedLlmConfig.serverOpenAiKey}`,
    };

    if (managedLlmConfig.organization) {
      headers["OpenAI-Organization"] = managedLlmConfig.organization;
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...payload,
        model: payload.model || managedLlmConfig.model || "gpt-4.1-mini",
      }),
    });

    const responseText = await response.text();
    res.writeHead(response.status, {
      "Content-Type": response.headers.get("content-type") || "application/json",
      "Access-Control-Allow-Origin": urlDevOrigin,
    });
    res.end(responseText);
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Managed AI relay failed.",
      })
    );
  }
}

async function handleSiteLeadRequest(req, res) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": urlDevOrigin,
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST,OPTIONS",
    });
    res.end();
    return;
  }

  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Method not allowed." }));
    return;
  }

  try {
    const chunks = [];
    await new Promise((resolve, reject) => {
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", resolve);
      req.on("error", reject);
    });

    const rawBody = Buffer.concat(chunks).toString("utf8");
    const payload = JSON.parse(rawBody || "{}");
    const requiredFields = ["fullName", "workEmail", "company", "selectedPlan", "useCase"];
    const missingFields = requiredFields.filter((field) => !normalize(payload[field]));

    if (missingFields.length > 0) {
      res.writeHead(400, {
        "Access-Control-Allow-Origin": urlDevOrigin,
        "Content-Type": "application/json",
      });
      res.end(
        JSON.stringify({
          message: `Missing required lead fields: ${missingFields.join(", ")}.`,
        })
      );
      return;
    }

    console.log("[reportforge] Marketing lead received", {
      fullName: payload.fullName,
      workEmail: payload.workEmail,
      company: payload.company,
      selectedPlan: payload.selectedPlan,
      useCase: payload.useCase,
    });

    res.writeHead(202, {
      "Access-Control-Allow-Origin": urlDevOrigin,
      "Content-Type": "application/json",
    });
    res.end(
      JSON.stringify({
        message: "Launch request captured by the local ReportForge lead endpoint.",
      })
    );
  } catch (error) {
    res.writeHead(500, {
      "Access-Control-Allow-Origin": urlDevOrigin,
      "Content-Type": "application/json",
    });
    res.end(
      JSON.stringify({
        message: error instanceof Error ? error.message : "Lead capture failed.",
      })
    );
  }
}

module.exports = async (env, options) => {
  const dev = options.mode === "development";
  const fileEnv = {
    ...loadEnvFile(".env"),
    ...loadEnvFile(".env.local"),
  };
  const runtimeEnv = {
    ...fileEnv,
    ...process.env,
  };
  const urlProd = resolveProductionBaseUrl(runtimeEnv);
  const urlProdOrigin = urlProd ? urlProd.replace(/\/$/, "") : "";

  if (!dev && !urlProd) {
    throw new Error(
      "REPORTFORGE_BASE_URL (or REPORTFORGE_PROD_URL) is required for production builds. On Cloudflare Pages, CF_PAGES_URL can also be used automatically if it is present."
    );
  }

  const googleOAuthClientId =
    normalize(runtimeEnv.REPORTFORGE_GOOGLE_CLIENT_ID) || loadGoogleOAuthClientId();
  const managedLlmConfig = resolveManagedLlmConfig(runtimeEnv, dev);
  const siteLeadEndpoint = resolveSiteLeadEndpoint(runtimeEnv, dev);
  const marketingSiteMeta = buildMarketingSiteMeta(dev ? urlDev : urlProd);

  const config = {
    devtool: "source-map",
    entry: {
      polyfill: ["core-js/stable", "regenerator-runtime/runtime"],
      taskpane: ["./src/taskpane/index.tsx", "./src/taskpane/taskpane.html"],
      site: "./src/site/index.tsx",
      commands: "./src/commands/commands.ts",
    },
    output: {
      clean: true,
    },
    resolve: {
      extensions: [".ts", ".tsx", ".html", ".js"],
      alias: {
        "../../vendor/pptxgenResolved$": path.resolve(__dirname, "src/vendor/pptxgenBrowser.ts"),
        "node:fs": false,
        "node:https": false,
      },
      fallback: {
        fs: false,
        https: false,
        path: false,
        os: false,
      },
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          use: {
            loader: "babel-loader"
          },
        },
        {
          test: /\.html$/,
          exclude: /node_modules/,
          use: "html-loader",
        },
        {
          test: /\.(png|jpg|jpeg|gif|ico)$/,
          type: "asset/resource",
          generator: {
            filename: "assets/[name][ext][query]",
          },
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        filename: "taskpane.html",
        template: "./src/taskpane/taskpane.html",
        chunks: ["polyfill", "taskpane"],
      }),
      new HtmlWebpackPlugin({
        filename: "index.html",
        template: "./src/site/site.html",
        chunks: ["polyfill", "site"],
        siteMeta: marketingSiteMeta,
      }),
      new HtmlWebpackPlugin({
        filename: "site.html",
        template: "./src/site/site.html",
        chunks: ["polyfill", "site"],
        siteMeta: marketingSiteMeta,
      }),
      new webpack.DefinePlugin({
        "process.env.REPORTFORGE_SALES_EMAIL": JSON.stringify(
          normalize(runtimeEnv.REPORTFORGE_SALES_EMAIL)
        ),
        "process.env.REPORTFORGE_SITE_LEAD_ENDPOINT": JSON.stringify(siteLeadEndpoint),
        "process.env.REPORTFORGE_GOOGLE_CLIENT_ID": JSON.stringify(
          googleOAuthClientId
        ),
        "process.env.REPORTFORGE_INTERNAL_REPORTING_ENGINE": JSON.stringify(
          normalize(runtimeEnv.REPORTFORGE_INTERNAL_REPORTING_ENGINE)
        ),
        "process.env.REPORTFORGE_LLM_PROVIDER_LABEL": JSON.stringify(
          managedLlmConfig.providerLabel
        ),
        "process.env.REPORTFORGE_LLM_ENDPOINT": JSON.stringify(
          managedLlmConfig.endpoint
        ),
        "process.env.REPORTFORGE_LLM_MODEL": JSON.stringify(
          managedLlmConfig.model
        ),
        "process.env.REPORTFORGE_LLM_API_KEY_HEADER": JSON.stringify(
          managedLlmConfig.apiKeyHeader
        ),
        "process.env.REPORTFORGE_LLM_API_KEY_PREFIX": JSON.stringify(
          managedLlmConfig.apiKeyPrefix
        ),
        "process.env.REPORTFORGE_LLM_ORGANIZATION": JSON.stringify(
          managedLlmConfig.organization
        ),
      }),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: "assets/*",
            to: "assets/[name][ext][query]",
          },
          {
            from: "support.html",
            to: "support.html",
          },
          {
            from: "manifest*.xml",
            to: "[name]" + "[ext]",
            transform(content) {
              if (dev) {
                return content;
              } else {
                return content
                  .toString()
                  .replace(new RegExp(urlDev, "g"), urlProd)
                  .replace(new RegExp(urlDevOrigin, "g"), urlProdOrigin);
              }
            },
          },
        ],
      }),
      new HtmlWebpackPlugin({
        filename: "commands.html",
        template: "./src/commands/commands.html",
        chunks: ["polyfill", "commands"],
      }),
    ],
    devServer: {
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      setupMiddlewares(middlewares, devServer) {
        if (
          dev &&
          devServer?.app &&
          managedLlmConfig.endpoint === managedLlmDevPath
        ) {
          devServer.app.use(managedLlmDevPath, (req, res) =>
            handleManagedLlmRequest(req, res, managedLlmConfig)
          );
        }

        if (dev && devServer?.app && siteLeadEndpoint === managedSiteLeadDevPath) {
          devServer.app.use(managedSiteLeadDevPath, handleSiteLeadRequest);
        }

        return middlewares;
      },
      server: {
        type: "https",
        options: env.WEBPACK_BUILD || options.https !== undefined ? options.https : await getHttpsOptions(),
      },
      port: process.env.npm_package_config_dev_server_port || 3000,
    },
  };

  return config;
};
