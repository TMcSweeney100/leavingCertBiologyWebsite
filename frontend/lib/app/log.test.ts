import assert from "node:assert/strict";
import { test } from "node:test";

import { counterText, dayMonth, dublinDate, entryDetail, entryHeading, entryTitle, isOnline, linkHost, linkMessage, visibilityLine } from "./log.ts";

test("an instant late on an Irish summer evening is the next Irish day", () => {
  assert.equal(dublinDate("2026-10-01T23:30:00Z"), "2026-10-02");
  assert.equal(dublinDate("2027-01-15T23:30:00Z"), "2027-01-15"); // GMT in winter
});

test("the visibility line says who can read the entry, in words (FR-24e)", () => {
  assert.equal(visibilityLine(true, "2027-03-03", "NOTE"), "Your teacher can read this.");
  assert.equal(
    visibilityLine(false, "2027-03-03", "NOTE"),
    "Only you can read this. Your teacher sees that you made a note on 3 March, how many times you edit it and when, and the date you hid it, but never what it says.",
  );
  assert.match(visibilityLine(false, "2027-03-03", "SOURCE"), /made a source on 3 March/);
  assert.match(visibilityLine(false, "2027-03-03", "AI_USE"), /made an AI use entry on 3 March/);
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

test("a note's heading is its whole first line; only the accessible name is cut", () => {
  const long = "x".repeat(83);
  const note = { id: "n", componentId: "c", kind: "NOTE", body: `${long}\nmore`, fields: null, visibleToTeacher: true, createdAt: "2026-10-12T08:00:00Z", editedAt: null, revisionCount: 1 } as const;
  assert.equal(entryHeading(note), long);
  assert.equal(entryTitle(note).length, 80);
});

test("the list's detail line is the type and locator for a source, and the host for an online one", () => {
  const src = (type: string, url: string | null, locator: string | null) => ({ type, title: "T", author: null, publication: null, datePublished: null, url, dateAccessed: null, locator, keyInformation: null, relevance: null, reflections: null }) as never;
  assert.equal(entryDetail({ kind: "SOURCE", fields: src("BOOK", null, "Chapter 4"), body: null } as never), "Book · Chapter 4");
  assert.equal(entryDetail({ kind: "SOURCE", fields: src("ONLINE_VIDEO", "https://www.youtube.com/watch?v=1", null), body: null } as never), "Video online · youtube.com");
  assert.equal(entryDetail({ kind: "AI_USE", fields: {}, body: null } as never), "How you used it");
  assert.equal(entryDetail({ kind: "NOTE", fields: null, body: "a" } as never), null);
});

test("a link's host drops www and survives a bad URL", () => {
  assert.equal(linkHost("https://www.example.ie/a/b"), "example.ie");
  assert.equal(linkHost("nonsense"), "nonsense");
});

test("a refused link is told what's wrong with it, and is never rewritten", () => {
  assert.match(linkMessage("http://x.ie"), /starts with http:\/\/, which isn't secure/);
  assert.equal(linkMessage("www.example.ie"), "Add https:// to the start, like https://www.example.ie");
  assert.match(linkMessage("nonsense"), /That isn't a link/);
});

test("a counter appears at 90% of the limit", () => {
  assert.equal(counterText("x".repeat(3599), 4000), null);
  assert.equal(counterText("x".repeat(3850), 4000), "3,850 of 4,000");
  assert.equal(counterText("x".repeat(450), 500), "450 of 500");
});
