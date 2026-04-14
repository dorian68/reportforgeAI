import assert from "node:assert/strict";
import test from "node:test";

import { truncate } from "../src/utils/formatting";

test("truncate keeps the final string within the requested max length", () => {
  assert.equal(truncate("abcdef", 5), "ab...");
  assert.equal(truncate("abc", 5), "abc");
  assert.equal(truncate("abcdef", 3), "...");
  assert.equal(truncate("abcdef", 2), "..");
  assert.equal(truncate("abcdef", 0), "");
});
