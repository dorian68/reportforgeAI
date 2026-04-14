/* eslint-disable no-undef */

import { getPublicRuntimeConfig } from "../../shared/publicRuntimeConfig";
import type { generateReport as generateReportFn } from "../orchestrator/generateReport";

declare global {
  interface Window {
    __REPORTFORGE_INTERNAL_ENGINE__?: {
      generateReport: typeof generateReportFn;
      enabledAt: string;
      hook: string;
    };
  }
}

export function registerInternalReportingEngine(): void {
  if (typeof window === "undefined") {
    return;
  }

  const runtimeConfig = getPublicRuntimeConfig();
  if (!runtimeConfig.internalReportingEngine.enabled) {
    return;
  }

  window.__REPORTFORGE_INTERNAL_ENGINE__ = {
    generateReport: async (request) => {
      const engine = await import("../orchestrator/generateReport");
      return engine.generateReport(request);
    },
    enabledAt: new Date().toISOString(),
    hook: "__REPORTFORGE_INTERNAL_ENGINE__",
  };
}
