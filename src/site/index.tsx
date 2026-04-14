import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";

import { MarketingSite } from "./MarketingSite";

let container = document.getElementById("root");

if (!container) {
  container = document.createElement("div");
  container.id = "reportforge-site-root";
  document.body.appendChild(container);
}

const app = <MarketingSite />;

if (container.hasChildNodes()) {
  hydrateRoot(container, app);
} else {
  createRoot(container).render(app);
}
