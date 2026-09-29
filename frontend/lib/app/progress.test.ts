import assert from "node:assert/strict";
import { test } from "node:test";

import type { GridStage, ProgressGrid, ProgressStudent } from "../api/schemas.ts";
import {
  bandHeading, bands, behindWords, CHECKPOINT_SHORT, doneSentence, failSentence, inOrder, isQuiet, lastEntryWords, latestDueKey,
  listStages, missingText, parseStage, pickName, revokeQuestion, shortCheckpoint, stageKey, stageLabel, studentCount, summary,
} from "./progress.ts";

const stage = (ordinal: number, dueDate: string | null, text: string | null, label: string | null = `Stage ${ordinal}`): GridStage => ({
  stageId: `s${ordinal}`, ordinal, label, name: `Name ${ordinal}`, dueDate, checkpoint: text ? { id: `c${ordinal}`, text } : null,
});
const student = (id: string, behindBy: number, states: ProgressStudent["cells"][number]["state"][], days: number | null = 3): ProgressStudent => ({
  studentId: id, firstName: "Aoife", lastName: id, behindBy, lastLogActivityOn: null, daysSinceLastLogActivity: days,
  cells: states.map((state, i) => ({ checkpointId: `c${i + 1}`, state, signedOffOn: state === "SIGNED_OFF" ? "2026-10-02" : null })),
});
const grid = (stages: GridStage[], students: ProgressStudent[], today = "2026-12-14"): ProgressGrid => ({
  componentId: "k", classId: "cl", className: "6A Biology", today, stages, students,
});
const BIO = [
  stage(1, "2026-10-02", "Initial ideas discussed with the teacher"),
  stage(2, "2026-11-06", "Investigative log shared with the teacher"),
  stage(3, "2026-12-11", "Plan discussed with the teacher (feasibility and safety)"),
  stage(4, "2027-02-12", "Experiment carried out under supervision, in line with the research and planning already shared"),
];

test("every short column header is a cut of its checkpoint, never a rewording (plan P4-23)", () => {
  for (const [full, short] of Object.entries(CHECKPOINT_SHORT)) assert.ok(full.startsWith(short), `${short} / ${full}`);
  assert.equal(shortCheckpoint("Plan discussed with the teacher (feasibility and safety)"), "Plan discussed");
  assert.equal(shortCheckpoint("A checkpoint nobody has seen before"), "A checkpoint nobody");
});

test("stages are keyed by ordinal, and the unlabelled compilation stage is R, 'Report' (plan P4-24)", () => {
  assert.equal(stageKey(stage(3, null, "x")), "3");
  assert.equal(stageKey(stage(7, null, "x", null)), "R");
  assert.equal(stageLabel(stage(7, null, "x", null)), "Report");
  assert.equal(listStages([BIO[0], BIO[1], BIO[2]]), "Stages 1, 2 and 3");
  assert.equal(listStages([BIO[1]]), "Stage 2");
  assert.equal(listStages([stage(5, null, "x"), stage(7, null, "x", null)]), "Stage 5 and Report");
});

test("the answer line: behind, up to date, nothing due, no dates (pack D-7)", () => {
  const behind = summary(grid(BIO, [student("a", 2, ["DUE", "DUE", "SIGNED_OFF", "NOT_DUE"]), student("b", 0, ["SIGNED_OFF", "SIGNED_OFF", "SIGNED_OFF", "NOT_DUE"])]));
  assert.deepEqual(behind, { kind: "behind", behind: 1, total: 2, due: "Stages 1, 2 and 3", dueCount: 3, noCheckpoint: [] });
  const upToDate = summary(grid(BIO, [student("b", 0, ["SIGNED_OFF", "SIGNED_OFF", "SIGNED_OFF", "NOT_DUE"])]));
  assert.deepEqual(upToDate, { kind: "upToDate", total: 1, due: "Stages 1, 2 and 3", next: { label: "Stage 4", date: "12 Feb 2027" } });
  assert.deepEqual(summary(grid(BIO, [], "2026-09-01")), { kind: "nothingDue", next: { label: "Stage 1", date: "2 Oct 2026" } });
  assert.deepEqual(summary(grid([stage(1, null, "x")], [])), { kind: "noDates" });
  const business = summary(grid([stage(5, "2026-12-01", "x"), stage(6, "2026-12-02", null)], [student("a", 1, ["DUE"])]));
  assert.equal(business.kind === "behind" && business.noCheckpoint[0], "Stage 6");
});

test("bands group consecutive rows by how far behind, and read in words (pack D-7)", () => {
  const rows = [student("a", 3, []), student("b", 3, []), student("c", 1, []), student("d", 0, [])];
  assert.deepEqual(bands(rows).map((b) => [b.behindBy, b.students.map((s) => s.studentId)]), [[3, ["a", "b"]], [1, ["c"]], [0, ["d"]]]);
  assert.deepEqual(bands(rows, (s) => (s.studentId === "b" ? 3 : s.behindBy)).length, 3);
  assert.deepEqual(bandHeading(3), { numeral: "3", label: "checkpoints behind" });
  assert.deepEqual(bandHeading(1), { numeral: "1", label: "checkpoint behind" });
  assert.deepEqual(bandHeading(0), { numeral: null, label: "Up to date" });
  assert.equal(studentCount(1), "1 student");
  assert.equal(behindWords(2), "Behind by 2");
  assert.equal(behindWords(0), "Up to date");
});

test("log activity reads in words and is quiet at 14 days or with none", () => {
  assert.equal(lastEntryWords(null), "No entries yet");
  assert.equal(lastEntryWords(0), "Last entry today");
  assert.equal(lastEntryWords(1), "Last entry yesterday");
  assert.equal(lastEntryWords(12), "Last entry 12 days ago");
  assert.equal(isQuiet(13), false);
  assert.equal(isQuiet(14), true);
  assert.equal(isQuiet(null), true);
});

test("a student's missing checkpoints, for the phone's All view", () => {
  const g = grid(BIO, []);
  assert.equal(missingText(student("a", 2, ["SIGNED_OFF", "DUE", "DUE", "NOT_DUE"]), g), "Not signed off: Stages 2 and 3");
  assert.equal(missingText(student("a", 0, ["SIGNED_OFF", "SIGNED_OFF", "SIGNED_OFF", "NOT_DUE"]), g), null);
});

test("stable order keeps the first-rendered order and puts newcomers last (plan P4-11)", () => {
  const rows = [student("b", 0, []), student("a", 1, []), student("new", 2, [])];
  assert.deepEqual(inOrder(rows, ["a", "b"]).map((s) => s.studentId), ["a", "b", "new"]);
});

test("the stage in the URL: valid keys only; the phone defaults to the latest due stage", () => {
  const g = grid(BIO, []);
  assert.equal(parseStage("3", g), "3");
  assert.equal(parseStage("all", g), "all");
  assert.equal(parseStage("9", g), null);
  assert.equal(parseStage(undefined, g), null);
  assert.equal(latestDueKey(g), "3");
  assert.equal(latestDueKey(grid(BIO, [], "2026-09-01")), "1");
  assert.equal(pickName(BIO[2], "2026-12-14"), "Stage 3, Plan discussed, 11 Dec 2026, due");
  assert.equal(pickName(BIO[3], "2026-12-14"), "Stage 4, Experiment carried out, 12 Feb 2027, not due");
});

test("the sentences a teacher hears and reads (pack D-7, plan P4-29)", () => {
  const plan = "Plan discussed with the teacher (feasibility and safety)";
  assert.equal(doneSentence("sign", plan, "Aoife Byrne"), `Signed off: ${plan}, for Aoife Byrne.`);
  assert.equal(doneSentence("undo", plan, "Aoife Byrne"), `Sign-off undone: ${plan}, for Aoife Byrne. It stays in the record.`);
  assert.equal(doneSentence("revoke", plan, "Aoife Byrne"), `Sign-off revoked: ${plan}, for Aoife Byrne. It stays in the record.`);
  assert.equal(failSentence("sign", plan, "Emma Nolan"), `Couldn’t sign off “${plan}” for Emma Nolan. Nothing changed. Check your connection and try again.`);
  assert.match(failSentence("revoke", plan, "Emma Nolan"), /^Couldn’t revoke the sign-off of “/);
  assert.equal(revokeQuestion(plan, "Aoife Byrne", "grid"), `Revoke the sign-off of “${plan}” for Aoife Byrne? It stays in the record as revoked by you.`);
  assert.equal(revokeQuestion(plan, "Cian Murphy", "student"), "Revoke this sign-off for Cian Murphy? It stays in the record as revoked by you.");
});
