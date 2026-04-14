import assert from "node:assert/strict";
import test from "node:test";

import { createReportBundle } from "../src/domain/orchestration/createReportBundle";
import { createSalesSnapshot } from "./fixtures";

test("createReportBundle produces every MVP output payload", () => {
  const bundle = createReportBundle(
    createSalesSnapshot(),
    "Create a simple Google web dashboard, write an email for the CFO, and generate 5 business slides.",
    {
      mode: "variation",
      variationSeed: 7,
    }
  );

  assert.equal(bundle.profile.kpis.length > 0, true);
  assert.equal(
    bundle.gasProject.files.some((file) => file.filename === "Code.gs"),
    true
  );
  assert.equal(bundle.emailBundle.primary.subject.includes(bundle.plan.title), true);
  assert.equal(bundle.slidesBundle.slides.length, 5);
});
