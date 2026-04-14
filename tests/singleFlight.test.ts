import assert from "node:assert/strict";
import test from "node:test";

import { createSingleFlightGuard } from "../src/taskpane/singleFlight";

test("single flight guard prevents duplicate concurrent actions", () => {
  const guard = createSingleFlightGuard();

  const firstClaim = guard.tryAcquire("Analyze selection");
  const blockedClaim = guard.tryAcquire("Generate report");

  assert.ok(firstClaim);
  assert.equal(blockedClaim, null);
  assert.equal(guard.isActive(firstClaim!.token), true);
  assert.equal(guard.release(firstClaim!.token), true);
  assert.equal(guard.isActive(firstClaim!.token), false);
});

test("single flight guard ignores invalid releases and allows the next action", () => {
  const guard = createSingleFlightGuard();
  const firstClaim = guard.tryAcquire("Analyze selection");

  assert.ok(firstClaim);
  assert.equal(guard.release(999), false);

  const secondBlockedClaim = guard.tryAcquire("Generate report");
  assert.equal(secondBlockedClaim, null);

  assert.equal(guard.release(firstClaim!.token), true);

  const nextClaim = guard.tryAcquire("Generate report");
  assert.ok(nextClaim);
});
