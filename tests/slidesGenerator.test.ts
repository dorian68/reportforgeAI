import assert from "node:assert/strict";
import test from "node:test";

import { profileRangeData } from "../src/domain/dataProfiling/profileRangeData";
import { buildReportPlan } from "../src/domain/planning/buildReportPlan";
import { interpretPrompt } from "../src/domain/prompt/interpretPrompt";
import { generateSlideOutline } from "../src/generators/slides/generateSlideOutline";
import { createSalesSnapshot } from "./fixtures";

test("generateSlideOutline emits both markdown and JSON slide structures", () => {
  const snapshot = createSalesSnapshot();
  const profile = profileRangeData(snapshot);
  const prompt = interpretPrompt("Generate 6 business slides.", {
    mode: "automatic",
    variationSeed: 3,
  });
  const plan = buildReportPlan(snapshot, profile, prompt, {
    mode: "automatic",
    variationSeed: 3,
  });

  const slides = generateSlideOutline(profile, prompt, plan);
  const parsed = JSON.parse(slides.json) as { slides: Array<{ title: string; storyBeat: string }> };

  assert.equal(slides.slides.length, 6);
  assert.equal(slides.markdown.includes("#"), true);
  assert.equal(parsed.slides[0].title, plan.title);
  assert.equal(slides.html.includes("<!DOCTYPE html>"), true);
  assert.equal(slides.html.includes("Open this view in a browser for review"), true);
  assert.equal(
    slides.slides.some((slide) => Boolean(slide.visual)),
    true
  );
  assert.equal(slides.slides[0].takeaway.length > 0, true);
  assert.equal(slides.slides[0].storyBeat.length > 0, true);
  assert.equal(parsed.slides[0].storyBeat.length > 0, true);
  assert.equal(slides.html.includes("This slide exists to"), false);
  assert.equal(slides.html.includes("Use the chart to"), false);
  assert.equal(slides.html.includes("Backup evidence"), false);
});
