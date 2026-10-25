import assert from "node:assert/strict";
import { test } from "node:test";

import {
  BACKUP_ADVICE, acceptName, askedWhen, checkpointAnchor, linkHost, notYetName, openWorkName, readyName, reviewName,
  waitingBadge, waitingHeading, withdrawName,
} from "./ready.ts";

test("the queue heading counts students waiting", () => {
  assert.equal(waitingHeading(0), "No one is waiting for you");
  assert.equal(waitingHeading(1), "1 student waiting for you");
  assert.equal(waitingHeading(3), "3 students waiting for you");
  assert.equal(waitingBadge(2), "2 waiting for sign-off");
});

test("asked when is said from the server's today", () => {
  assert.equal(askedWhen("2027-03-03", "2027-03-03"), "asked today");
  assert.equal(askedWhen("2027-03-02", "2027-03-03"), "asked yesterday");
  assert.equal(askedWhen("2027-02-24", "2027-03-03"), "asked 7 days ago");
});

test("a link is shown by its host", () => {
  assert.equal(linkHost("https://docs.google.com/document/d/abc/edit"), "docs.google.com");
  assert.equal(linkHost("https://www.example.ie/x"), "example.ie");
  assert.equal(linkHost("not a url"), "not a url");
});

test("every control names its checkpoint, and the teacher's the student", () => {
  const text = "Initial ideas discussed with the teacher";
  assert.equal(readyName(text), `Ready for sign-off: ${text}`);
  assert.equal(withdrawName(text), `Withdraw request: ${text}`);
  assert.equal(acceptName(text, "Aoife Byrne"), `Accept ${text} for Aoife Byrne`);
  assert.equal(notYetName(text, "Aoife Byrne"), `Not yet: ${text} for Aoife Byrne`);
  assert.equal(reviewName(text, "Aoife Byrne"), `Review ${text} for Aoife Byrne`);
  assert.equal(openWorkName("Aoife Byrne"), "Open Aoife Byrne's work (opens in a new tab)");
  assert.equal(openWorkName(), "Open your work (opens in a new tab)");
  assert.equal(checkpointAnchor("abc"), "checkpoint-abc");
});

test("the backup advice is the briefs' words", () => {
  assert.match(BACKUP_ADVICE, /^It is strongly recommended that you make and regularly update a backup copy/);
});
