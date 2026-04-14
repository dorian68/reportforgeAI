import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

type PptxTestGlobalScope = typeof globalThis & {
  PptxGenJS?: unknown;
};

export async function ensurePptxBrowserBundleLoaded(): Promise<void> {
  const globalScope = globalThis as PptxTestGlobalScope;
  if (typeof globalScope.PptxGenJS === "function") {
    return;
  }

  const candidatePaths = [
    path.resolve(process.cwd(), ".test-dist/assets/pptxgen.browser.js"),
    path.resolve(process.cwd(), "assets/pptxgen.browser.js"),
  ];
  const bundlePath = candidatePaths.find((candidatePath) => fs.existsSync(candidatePath));
  if (!bundlePath) {
    throw new Error("PowerPoint export bundle is missing from the local test runtime.");
  }

  const bundleSource = fs.readFileSync(bundlePath, "utf8");
  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    Blob,
    URL: {
      createObjectURL: () => "blob://reportforge-pptx",
      revokeObjectURL: () => undefined,
    },
    document: {
      createElement: () => ({
        setAttribute: () => undefined,
        click: () => undefined,
        dataset: {},
      }),
      body: {
        appendChild: () => undefined,
        removeChild: () => undefined,
      },
    },
  } as Record<string, unknown>;

  sandbox.window = sandbox;
  sandbox.global = sandbox;
  sandbox.self = sandbox;

  vm.createContext(sandbox);
  vm.runInContext(bundleSource, sandbox);

  (globalScope as Record<string, unknown>).PptxGenJS = sandbox.PptxGenJS as unknown;
}
