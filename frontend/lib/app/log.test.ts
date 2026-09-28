import assert from "node:assert/strict";
import { test } from "node:test";

import { dayMonth, dublinDate, entryTitle, isOnline, visibilityLine } from "./log.ts";

test("an instant late on an Irish summer evening is the next Irish day", () => {
  assert.equal(dublinDate("2026-10-01T23:30:00Z"), "2026-10-02");
  assert.equal(dublinDate("2027-01-15T23:30:00Z"), "2027-01-15"); // GMT in winter
});

test("the visibility line says who can read the entry, in words (FR-24e)", () => {
  assert.equal(visibilityLine(true, "2027-03-03"), "Your teacher can read this.");
  assert.equal(visibilityLine(false, "2027-03-03"), "Only you can read this. Your teacher sees that you made an entry on 3 March.");
  assert.equal(dayMonth("2026-10-12"), "12 October");
});

test("online source types are the three the NCCA lists as accessed online", () => {
  assert.deepEqual(["BOOK", "NEWSPAPER_OR_MAGAZINE", "ONLINE_TEXT_OR_IMAGE", "ONLINE_AUDIO", "ONLINE_VIDEO", "OTHER"].map((t) => isOnline(t as never)),
    [false, false, true, true, true, false]);
});

test("an entry's title comes from what the student wrote", () => {
  const base = { id: "e1", componentId: "k1", createdAt: "2026-10-12T08:00:00Z", editedAt: null, revisionCount: 1, visibleToTeacher: true };
  assert.equal(entryTitle({ ...base, kind: "NOTE", body: "Ran the pilot titration.\nSecond line", fields: null }), "Ran the pilot titration.");
  assert.equal(entryTitle({ ...base, kind: "NOTE", body: "x".repeat(100), fields: null }), `${"x".repeat(79)}…`);
  assert.equal(entryTitle({ ...base, kind: "SOURCE", body: null, fields: { type: "BOOK", title: "Inclusion", author: null, publication: null, datePublished: null, url: null, dateAccessed: null, locator: null, keyInformation: null, relevance: null, reflections: null } }), "Inclusion");
  assert.equal(entryTitle({ ...base, kind: "AI_USE", body: null, fields: { toolNameAndVersion: "ChatGPT-4", developer: "OpenAI", dateGenerated: "2025-02-14", howUsed: "x", prompts: null, shareUrl: null } }), "ChatGPT-4");
});
