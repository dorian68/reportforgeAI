import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCanvasRulerTicks,
  buildMiniMapViewport,
  resolveMiniMapScrollTarget,
} from "../src/services/canvas/canvasViewport";

test("buildCanvasRulerTicks marks major ruler stops and labels them", () => {
  const ticks = buildCanvasRulerTicks(400, 50, 2);

  assert.equal(ticks[0].major, true);
  assert.equal(ticks[0].label, "0");
  assert.equal(ticks[1].major, false);
  assert.equal(ticks[2].major, true);
  assert.equal(ticks[2].label, "100");
});

test("buildMiniMapViewport projects the current viewport into minimap coordinates", () => {
  const viewport = buildMiniMapViewport(
    1200,
    675,
    {
      scrollLeft: 240,
      scrollTop: 120,
      clientWidth: 600,
      clientHeight: 320,
    },
    1,
    180,
    100
  );

  assert.equal(viewport.left, 36);
  assert.equal(Math.round(viewport.top * 1000) / 1000, Math.round((120 / 675) * 100 * 1000) / 1000);
  assert.equal(viewport.width, 90);
  assert.equal(Math.round(viewport.height), 47);
});

test("resolveMiniMapScrollTarget centers the viewport around the clicked minimap point", () => {
  const target = resolveMiniMapScrollTarget(
    1200,
    675,
    {
      scrollLeft: 0,
      scrollTop: 0,
      clientWidth: 600,
      clientHeight: 300,
    },
    1,
    180,
    100,
    90,
    50
  );

  assert.equal(target.scrollLeft, 300);
  assert.equal(Math.round(target.scrollTop), 188);
});
