declare const require: (path: string) => unknown;

const bundleImport = require("../../assets/pptxgen.browser.js") as { default?: unknown } | unknown;

function unwrapModuleDefault(moduleImport: unknown): unknown {
  if (!moduleImport || typeof moduleImport !== "object") {
    return moduleImport;
  }

  if ("default" in moduleImport) {
    const defaultExport = (moduleImport as { default?: unknown }).default;
    return defaultExport ?? moduleImport;
  }

  return moduleImport;
}

const PptxGenJS = unwrapModuleDefault(unwrapModuleDefault(bundleImport));

if (!PptxGenJS) {
  throw new Error("PowerPoint export bundle did not load in this Excel runtime.");
}

export default PptxGenJS;
