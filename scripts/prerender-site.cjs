const fs = require("fs");
const path = require("path");
const Module = require("module");
const babel = require("@babel/core");
const presetEnv = require("@babel/preset-env");
const presetReact = require("@babel/preset-react");
const presetTypescript = require("@babel/preset-typescript");
const React = require("react");
const { renderToString } = require("react-dom/server");
const { applySiteMetaTemplate, buildMarketingSiteMeta, normalizeBaseUrl } = require("./site-build-meta.cjs");

const originalTs = Module._extensions[".ts"];
const originalTsx = Module._extensions[".tsx"];

function compileWithBabel(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const transformed = babel.transformSync(source, {
    filename,
    babelrc: false,
    configFile: false,
    sourceMaps: false,
    presets: [
      [presetEnv, { targets: { node: "current" }, modules: "commonjs" }],
      [presetReact, { runtime: "automatic" }],
      presetTypescript,
    ],
  });

  module._compile(transformed ? transformed.code : source, filename);
}

Module._extensions[".ts"] = compileWithBabel;
Module._extensions[".tsx"] = compileWithBabel;

try {
  const sitePath = path.resolve(__dirname, "..", "dist", "site.html");
  if (!fs.existsSync(sitePath)) {
    process.exit(0);
  }

  const { MarketingSite } = require(path.resolve(__dirname, "..", "src", "site", "MarketingSite.tsx"));
  const template = fs.readFileSync(sitePath, "utf8");
  const siteBaseUrl = normalizeBaseUrl(
    process.env.REPORTFORGE_BASE_URL || process.env.REPORTFORGE_PROD_URL || "",
    "https://localhost:3000/"
  );
  const siteMeta = buildMarketingSiteMeta(siteBaseUrl);
  const markup = renderToString(React.createElement(MarketingSite));
  const hydratedTemplate = applySiteMetaTemplate(template, siteMeta);
  const prerendered = hydratedTemplate.replace('<div id="root"></div>', `<div id="root">${markup}</div>`);

  fs.writeFileSync(sitePath, prerendered, "utf8");
} finally {
  Module._extensions[".ts"] = originalTs;
  Module._extensions[".tsx"] = originalTsx;
}
