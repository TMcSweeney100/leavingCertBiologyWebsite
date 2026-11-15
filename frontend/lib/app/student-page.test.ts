import assert from "node:assert/strict";
import { test } from "node:test";

import { initials, segmentName, signedOffWords, stageCounts } from "./student-page.ts";

test("counts each state, and says the signed-off share in words", () => {
  const c = stageCounts([{ state: "SIGNED_OFF" }, { state: "SIGNED_OFF" }, { state: "READY" }, { state: "DUE" }, { state: "NOT_DUE" }, { state: "NOT_DUE" }]);
  assert.deepEqual(c, { signedOff: 2, waiting: 1, due: 1, notDue: 2, total: 6 });
  assert.equal(signedOffWords(c), "2 of 6 signed off");
});

test("a jump link is named by its stage, its checkpoint and its state (R-20)", () => {
  assert.equal(segmentName({ label: "Stage 5", state: "READY", checkpoint: { text: "Data analysis shared with the teacher" } }),
    "Stage 5, Data analysis shared with the teacher: waiting for you");
  assert.equal(segmentName({ label: null, state: "DUE", checkpoint: { text: "Final report submitted for review and authentication" } }),
    "Report, Final report submitted for review and authentication: due, not signed off");
});

test("initials are the first letters of the first and last names", () => {
  assert.equal(initials({ firstName: "Tim", lastName: "Mc Sweeney" }), "TM");
  assert.equal(initials({ firstName: "aoife", lastName: "byrne" }), "AB");
});
