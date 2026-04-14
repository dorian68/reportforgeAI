import assert from "node:assert/strict";
import test from "node:test";

import { profileRangeData } from "../src/domain/dataProfiling/profileRangeData";
import { createSalesSnapshot } from "./fixtures";

test("profileRangeData detects headers, measures, dimensions, KPIs, and charts", () => {
  const profile = profileRangeData(createSalesSnapshot());

  assert.equal(profile.hasHeaders, true);
  assert.equal(profile.primaryMeasures.includes("Revenue"), true);
  assert.equal(profile.primaryDimensions.includes("Month"), true);
  assert.equal(profile.columns.find((column) => column.header === "Revenue")?.kind, "numeric");
  assert.equal(profile.kpis.length > 0, true);
  assert.equal(profile.chartCandidates.length > 0, true);
});
