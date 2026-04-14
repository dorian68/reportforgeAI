import React from "react";
import { createRoot } from "react-dom/client";

import { registerInternalReportingEngine } from "../reporting-engine/adapters/registerInternalReportingEngine";
import { App } from "./App";
import { TaskpaneErrorBoundary } from "./TaskpaneErrorBoundary";

let container = document.getElementById("root");

if (!container) {
  container = document.createElement("div");
  container.id = "reportforge-fallback-root";
  document.body.appendChild(container);
}

registerInternalReportingEngine();

createRoot(container).render(
  <TaskpaneErrorBoundary>
    <App />
  </TaskpaneErrorBoundary>
);
