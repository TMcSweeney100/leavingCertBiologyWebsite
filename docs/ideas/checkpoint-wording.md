# Teachers rewording a checkpoint (`checkpoint-wording`)

**Status: idea only. Not decided, not planned, nothing built.** Backlog row: [docs/BACKLOG.md](../BACKLOG.md).

Written 3 Nov 2026 from reading the code at commit `d5212fa` on `pilot/stage-sheet-fixes`. File and line references are from that commit and will drift. No code was changed or run to produce this, and the size estimate is a judgement, not a measurement.

## The question

Tim asked two things about the Checkpoint section of the stage sheet (the drawer that opens from a stage on the Component tab):

1. Is the checkpoint hard coded for each stage?
2. How hard would it be for a teacher to reword one?

## Short answer

1. **Yes, it's fixed, but in database content rather than in the drawer's code.** Each stage has at most one checkpoint per subject, and no screen or endpoint can change it.
2. **Rewording is a small-to-medium build,** roughly 400 to 600 lines including tests, because all the wording comes through one query.
3. **The hard part is a decision, not the code:** what happens to sign-offs already given when the wording changes.
4. **Recommendation: wait for Katelyn's review of the Biology checkpoints.** If it just produces better wording for all Biology classes, this feature isn't needed.

## How checkpoints work today

### Where the wording lives

Rows in `template_checkpoint`, inserted by content migrations: `backend/src/main/resources/db/content/V2__science_templates.sql:125` for Biology, Chemistry and Physics, and `V3__business_template.sql:88` for Business. Nothing else in `backend/src/main` writes to that table.

```sql
INSERT INTO template_checkpoint (version_id, stage_id, ordinal, text, basis, source_quote, source_ref)
...
    (3, 'Plan discussed with the teacher (feasibility and safety)', 'DESCRIBED'),
```

| Column | What it holds |
|---|---|
| `text` | The wording on screen. A comment in `V6__templates_and_briefs.sql:112` calls it "Working wording, reviewed by the subject's teacher". |
| `basis` | `EXPLICIT` (the guidelines name it as an authentication step) or `DESCRIBED` (they describe a discussion with the teacher). |
| `source_quote` | The guideline sentence it rests on, word for word. |
| `source_ref` | The document and page. |

What follows from that:

- **Science shares its wording.** Biology, Chemistry and Physics use the same six wordings, each with its own subject's quote. There is still one row per subject.
- **Business Stage 6 has no checkpoint,** so the drawer leaves that section out (`frontend/components/app/stage-sheet.tsx:247`).
- **Only the quote is checked.** `SourceTextTest` compares `source_quote` with the PDF page. Nothing automated checks that `text` follows from the quote.
- **The quote never reaches the screen.** No code in `backend/src/main/java` reads `source_quote` or `basis`.
- **The rows are protected.** A trigger (`V7__template_guards.sql:54`) lets a published version's `text`, `source_quote` and `source_ref` be corrected, and refuses any other change, insert or delete.
- **The wording hasn't been signed off.** `docs/PILOT-ROADMAP.md` (Gate P2) and `docs/HANDOFF.md:107` still show Tim's check against the PDFs and Katelyn's review of the Biology checkpoints as open.

### How the wording reaches the screen

Everything starts at this query in `backend/src/main/java/ie/coursework/components/adapter/persistence/TemplateRepository.java:86`:

```java
public List<TemplateCheckpoint> checkpoints(UUID versionId) {
    return jdbc.sql("""
            SELECT c.id, c.stage_id, c.text FROM template_checkpoint c JOIN template_stage s ON s.id = c.stage_id
            WHERE c.version_id = :version ORDER BY s.ordinal, c.ordinal
            """).param("version", versionId).query(TemplateRepository::checkpoint).list();
}
```

Three paths use it:

| Backend path | Screens it feeds |
|---|---|
| `ComponentService.studentView` (`ComponentService.java:185`) | The student's stage card (`stage-card.tsx:89`) |
| `ComponentService.teacherView` (`ComponentService.java:376`, through `checkpointTextByStage`) | The stage sheet (`stage-sheet.tsx:250`) and the stage list (`stage-dates-form.tsx:454`) |
| `ProgressService.stages` (`ProgressService.java:242`) | The Progress grid, stage picker, waiting queue and one-student page |

`TemplateRepository.checkpointInVersion` (`:94`) also reads the table, but only to scope a request and find the stage. Its wording is never displayed.

The frontend prints the text it is given. Two things are built from that text:

- **Accessible names**, in `frontend/lib/app/ready.ts:37` and `frontend/lib/app/progress.ts:153`, such as `Sign off ${text} for ${name}`.
- **Short column headers**, in `CHECKPOINT_SHORT` (`frontend/lib/app/progress.ts:20`). It matches the exact text and otherwise takes the first three words:

```ts
export function shortCheckpoint(text: string): string {
  return CHECKPOINT_SHORT[text] ?? text.split(" ").slice(0, 3).join(" ");
}
```

### What a checkpoint does

It is the teacher's confirmation that a student has done that stage. The status is worked out per student in `backend/src/main/java/ie/coursework/components/domain/CheckpointState.java:16`:

```java
if (signedOff) { return SIGNED_OFF; }
if (requested) { return READY; }
return stageDate != null && stageDate.isBefore(today) ? DUE : NOT_DUE;
```

1. **The stage's date passes.** An unsigned checkpoint becomes due, and the student shows as behind.
2. **The student presses "Ready for sign-off".** They join the teacher's waiting list and stop counting as behind.
3. **The teacher answers.** They accept or say "Not yet", or sign off directly on the Progress page.

The drawer's counts come from `checkpointCounts` (`frontend/lib/app/stage-sheet.ts:54`). "Not yet" there means anyone not signed off or waiting, including students who aren't due.

**Sign-offs store the checkpoint's id, never its wording.** That goes for `checkpoint_signoff` (`V12__checkpoint_signoffs.sql`), `signoff_request` (`V13__ready_for_signoff.sql`) and the audit entry (`ProgressService.java:184`). This is the root of the main decision below.

## The options

The existing row can't hold a teacher's wording, because every class using that subject reads the same row. Changing it would change the wording for everyone.

| Option | What it does | Size | Good for |
|---|---|---|---|
| **A. Use the stage note** | Already built. The teacher writes a note that students see above the official text. | Nothing to build | "Here's what I mean by this checkpoint." It doesn't change the label on the grid or the sign-off buttons. |
| **B. Change the wording for everyone** | A new content file with an `UPDATE` on the subject's row. | Small | Katelyn's review finds better wording for all Biology classes. |
| **C. Per-class rewording** | A new table holds a class's own wording, falling back to the shared wording. | Small to medium | Teachers genuinely disagree about the wording. |
| **D. Add or remove checkpoints** | Each class gets its own set. | Large, not sized | Teachers want different steps, not different words. |

**Option B in practice.** The next file in `db/content` would be `V5`, with an `UPDATE` limited to that subject's template version. The trigger allows this. It also means updating `CHECKPOINT_SHORT`, the pinned wording in `ScienceTemplateContentTest.java:97`, and any specs or journeys using that wording. The source quote must still support the new words.

**Why D is so much bigger.** Rewording keeps the checkpoint's id, so sign-offs, counts and "behind" all carry on working. A new checkpoint has no row for `checkpoint_signoff.checkpoint_id` to reference, and adding or removing one changes what "behind" means, the grid's columns and the ordering of students.

## What building option C would involve

★ **The pattern: an overlay table.** Shared content stays untouched, and a separate table holds per-class exceptions, with `COALESCE` falling back to the original. The cost is one more join. The alternative, copying checkpoint rows for each class, would touch every sign-off, request and scope check, because they all reference the template row.

### Backend

**Table,** the same shape as `V14__stage_notes.sql`. The limit of 200 is a guess; the longest current wording is 95 characters.

```sql
CREATE TABLE checkpoint_wording (
    instance_id   uuid        NOT NULL REFERENCES component_instance (id),
    checkpoint_id uuid        NOT NULL REFERENCES template_checkpoint (id),
    text          text        NOT NULL CONSTRAINT checkpoint_wording_text_present CHECK (btrim(text) <> '' AND char_length(text) <= 200),
    updated_at    timestamptz NOT NULL,
    PRIMARY KEY (instance_id, checkpoint_id)
);
```

**Reads.** Add a method beside the existing one and switch the three paths to it:

```sql
SELECT c.id, c.stage_id, COALESCE(w.text, c.text) AS text
FROM template_checkpoint c JOIN template_stage s ON s.id = c.stage_id
LEFT JOIN checkpoint_wording w ON w.checkpoint_id = c.id AND w.instance_id = :instance
WHERE c.version_id = :version ORDER BY s.ordinal, c.ordinal
```

- All three paths already have the component to hand.
- Keep `checkpoints(versionId)`: the drawer needs the original wording, and three tests call it.
- A join adds no query, so the Progress grid's fixed query count (`docs/ARCHITECTURE.md:108`) holds.
- With no row, a class sees exactly what it sees today, so existing tests and journeys shouldn't change for this reason.

**Writes.**

- `CheckpointWordingRepository`, modelled on `StageNoteRepository` (upsert with `ON CONFLICT`, plus delete).
- `PUT` and `DELETE /components/{componentId}/checkpoints/{checkpointId}/wording`, modelled on the note's endpoints (`ComponentController.java:86`).
- The service starts with `ComponentService.requireOwned`, then `TemplateRepository.checkpointInVersion`. Any failure is a 404, as with every other scoped endpoint.
- A new `ErrorCode` for the lock in decision 1, returned as a 409.
- A new `AuditEventType`. Stage notes don't write one (`ComponentService.java:308`), but this changes what a class is signed off against. Audit details elsewhere are kept to ids (`ComponentService.java:135`), so check the audit section of `docs/ARCHITECTURE.md` before storing wording there.

`PostgresIntegrationTest` clears tables it finds in `pg_tables`, so the new table is reset between tests with no extra work.

### Frontend

**The teacher's stage data needs more.** `SetupStage.checkpoint` is only a string (`ComponentViews.java:28`, `frontend/lib/api/schemas.ts:113`). The drawer needs the id, the original wording and whether it's locked.

- A nested object is cleaner, but changes fixtures in specs such as `stage-sheet.spec.tsx` and `stage-dates-form.spec.tsx`.
- Flat extra fields change fewer tests but leave the record messier.
- Worth considering: send `source_quote` too, so the teacher can see the guideline sentence while rewording. Nothing reads that column today.

**The edit control** goes in the Checkpoint section (`stage-sheet.tsx:247`): the wording with a Reword button, then a `Textarea`, Save, Cancel and "Use the original wording". When reworded, the original shows underneath. When locked, there's no button and one sentence says why.

**State.** Stage notes keep their draft in the parent, `StageDatesForm` (`noteDrafts`, `stage-dates-form.tsx:81`), so closing the sheet keeps what was typed and the leave-page warning knows about it. Rewording can copy that, or hold the draft locally and lose it on close. Copying is more code, but the two boxes in one sheet would behave the same, so copying is the better default.

**Accessibility.** Follow `StageNoteForm` (`stage-note-form.tsx`):

- The box is read-only rather than disabled while saving, so focus stays in it.
- Saving is announced through a live region.
- Focus goes to the box on opening and back to Reword on closing.
- The wording ends up inside button names read out by screen readers, so the length limit matters. Two checkpoints with identical wording in one class would produce identical names ("Sign off Done for ..."), so a save should probably refuse a duplicate.

### Tests

A few that prove the behaviour:

- Saved wording appears on the teacher view, student view and Progress grid.
- **Another class on the same subject still sees the original.** This is the one that matters most.
- A teacher who doesn't own the class gets a 404, and so does a checkpoint from another subject.
- A locked checkpoint refuses the save with a 409 and stays unchanged.
- "Use the original wording" brings it back.
- A `stage-sheet.spec.tsx` case for editing, resetting and the locked state, plus one journey step in `make e2e`.

### Docs to update in the same work

`docs/ARCHITECTURE.md` (content tables and the stage sheet), `docs/PILOT-DESIGN.md` §7.3 (see decision 2), and `docs/changes/checkpoint-wording.md`.

## Decisions to make first

### 1. What happens to sign-offs already given?

This is the main risk. Because sign-offs store only the id, a reword after signing off makes the student's record show they were signed off on words nobody agreed at the time. `docs/PILOT-DESIGN.md:355` says "Sign-offs are the teacher's word", so the record needs to stay true.

| Option | Cost | Downside |
|---|---|---|
| **Lock the wording once the class has a sign-off or a request on it** | One check and a test | A teacher can't fix a typo afterwards without someone changing the row by hand |
| Save the wording with each sign-off and request | New columns, a change to the append-only guard triggers, and showing old wording in history | The most work |
| Let it change and only record it in the audit trail | Cheapest | The student's page shows wording that wasn't agreed |

**Best guess: lock it.** Rewording is mostly something a teacher does while setting up a class, before any sign-offs exist, so the lock should rarely get in the way.

The lock should count revoked sign-offs and answered requests, because both are still shown in history. Withdrawn requests can be ignored, because nobody sees them.

### 2. Does this break "only from the guidelines"?

`docs/PILOT-DESIGN.md:434` says "Checkpoints are drawn only from what the guidelines say." A teacher's words wouldn't be checked against anything, yet the row would still carry a `source_ref`.

The risk is lower than it sounds. `text` is already our own working wording, not NCCA's, and the official sentence is stored separately and never shown. The rule in `CLAUDE.md` is about not inventing SEC or NCCA content, and a teacher's own wording for their own class isn't presented as either.

**Best guess: keep the rule for the shared wording, and add a sentence to §7.3 saying a teacher may reword for their own class and that wording isn't checked.** This changes a stated design rule, so it's Tim's call.

### 3. Do students see that the wording is their teacher's?

Stage notes are labelled "Note from your teacher". A checkpoint has no equivalent.

**Best guess: no label for students.** They only ever see one wording, and it is what their teacher will sign. The drawer shows the teacher the original. The trade-off is that students comparing across classes couldn't tell why the wording differs.

### 4. Per class, or per teacher?

**Best guess: per class, matching stage notes.** The trade-off is that a teacher with three Biology classes rewords three times. Sharing across classes would need its own idea of "this teacher's wording", which is more than this feature is worth at the start.

### 5. What do short column headers show?

A reworded checkpoint falls back to its first three words, for example "Teacher has reviewed".

| Option | Cost | Downside |
|---|---|---|
| Accept the first three words | Nothing | Can read as cut off |
| Ask the teacher for a short label too | One more field and column | More for the teacher to fill in |
| Keep the original's short label | Small | The header stops matching the wording |

**Best guess: accept the first three words at first,** and look at it in the browser before deciding it needs more.

## Size estimate

The closest thing already built is the stage note. It took nine commits (`3cae573` to `fb46b57`) adding 834 lines and removing 75, tests and docs included, committed between 12:19 and 13:27 on 1 Nov 2026. That figure runs slightly high, because some of those commits carried other stage sheet fixes, and it leaves out the plan and the self-review.

| Compared with stage notes | |
|---|---|
| **Not needed** | Link parsing (`note-text.ts`, `note-text.tsx`), the live preview, and "Note updated" on the student's page |
| **Extra** | The lock and its error code, the audit event, the change to the teacher's stage data, and the header decision |

That gives **roughly 400 to 600 lines including tests**. Allow about a day overall, with the plan, the build, the self-review and Tim's reading of it. This assumes option C with the lock. Saving the wording with each sign-off would add noticeably more.

## Recommendation

1. **Wait for Katelyn's review of the Biology checkpoints,** which is still open.
2. **If the review gives better wording for all Biology classes, use option B** and skip this feature.
3. **If a teacher wants to explain a checkpoint, use option A,** which exists today.
4. **Build option C only if teachers still disagree about the wording after that.** So far there's no real request from a teacher.

One sign that it could come up: Katelyn's live schedule already words Stage 3 differently, at `frontend/lib/briefs/biology-2027.ts:136`: "Your plan and safety assessment are signed off before any practical work begins." That is a separate field on the live BiPi site, and none of this would touch it.

## If this gets picked up

Follow the steps in [docs/BACKLOG.md](../BACKLOG.md): `/interview-me` to settle the decisions above into `docs/intent/checkpoint-wording.md`, then a plan, then a `pilot/checkpoint-wording` branch from `pilotMain`, test first. Check the line references here first, because they will have drifted.
