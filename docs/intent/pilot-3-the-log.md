# Intent — pilot-3-the-log

Confirmed with Tim, 27 Sep 2026, through `/interview-me`. Later steps treat this as settled.

## Statement of intent

- **Outcome:** one plan, `docs/superpowers/plans/2026-09-27-pilot-3-the-log.md`, in two clearly separated parts, each with its own gate.
  - **Part A — Phase 2 follow-ups:**
    1. Q-P2-E: the SEC completion date is its own item on the student timeline (answered 20 Sep 2026; changes P2-44).
    2. `done_at` on ticks, so the D-3 tick line reads "You ticked this · 2 Oct 2026".
    3. `TeacherItems`: retiring one item no longer silently discards an unsaved edit of another.
    4. Submit buttons show a present-participle busy label ("Signing in…") — `UI-CHECKLIST.md`, open since Phase 1.
    5. A failed submit moves focus to the alert — same checklist, same age.
    6. A test that isolates each of `ComponentService.owned`'s two checks (component owner filter, `ClassService.owned`), so either one breaking alone fails a test.
  - **Part B — Phase 3, the log:**
    - **3A Log model:** design §6.6 tables; `created_at` set by the server; revisions append-only; visibility changes recorded; `kind` allows `NOTE`, `SOURCE` and `AI_USE` from the first migration.
    - **3B Student log:** students create, revise, view history of, and hide/show `NOTE`, `SOURCE` and `AI_USE` entries. `SOURCE` fields come from the NCCA referencing appendices (Biology Appendix 1, Business Appendices Three and Four). `AI_USE` fields come from the SEC Coursework Rules and Procedures 2025–2026, Appendix 2 §4 "Minimum acknowledgment requirements" (p. 34), added to `subjectDocs/` on 27 Sep 2026; they match design §6.7 exactly.
    - **3C Teacher reading view:** one projection. A hidden entry shows its kind, dates and revision count but never its body, fields or history, and looks different from no entry. The teacher sees that an entry was hidden after being visible (Q3, answered yes 20 Sep 2026).
- **Delivery:** Part A on `pilot/2g-phase2-follow-ups`, with its own self-review and `docs/changes/pilot-2g-phase2-follow-ups.md`, merged into `pilotMain` before Part B starts. Part B on `pilot/3-the-log`, with its own self-review and `docs/changes/pilot-3-the-log.md`.
- **Why now:** Phase 2's code is done and merged, and nothing in the roadmap blocks Phase 3. The follow-ups go first so the new log forms inherit the fixed busy-label and focus patterns.
- **Success:** Gate P3 as the roadmap words it (`make verify` and `make e2e` green with the journey extended to log, hide and edit; a back-dated `createdAt` is ignored; another student's log and a teacher of a different class both 404). Part A has its own smaller gate.
- **Constraint:** test-first; 404 never 403; no invented SEC or NCCA content, so `SOURCE` and `AI_USE` fields come only from the NCCA appendices and SEC Rules Appendix 2, each with a `source_ref`; each page is built working-first and ends with a restyle task that waits for the D-6 pack; writing the D-6 Claude Design prompt (`docs/design/prompts/D-6-log.md`) is a task in the plan.
- **Out of scope:** R2 monitoring (its roadmap row moves to "before go-live"); `source_url` (waiting on Tim's four URLs); prompts open by default at 1140; Sign in disabled during a lockout; phone rows wrapping their buttons; Phase 2's human content reviews; the reference and AI-use formatters and their pages (Phase 6).

## Decisions made in the interview

| Question | Answer |
|---|---|
| Phase 3 only, or Phase 2 follow-ups too? | Follow-ups first, as a separate Part A at the top of the same plan, clearly divided from Phase 3. |
| Which follow-ups? | Items 1–6 above. Left out: `source_url` (blocked on URLs), prompts open at 1140, lockout-disabled Sign in, phone row wrapping. |
| Which log kinds does Phase 3 create? | First answer: `NOTE` and `SOURCE`, `AI_USE` optional. Revised the same day once Tim added the Rules PDF: **all three**. |
| Branches and changes docs? | One plan, two branches in order, two changes docs, two self-reviews. |
| R2 monitoring? | Out. Its own plan before go-live. |

## Risk noted

The Rules PDF in hand is the **2025–2026** edition ("the 2026 State examinations"); the pilot cohort sits in 2027 and the briefs cite the Rules without a year. When the 2026–2027 edition is published, diff its Appendix 2 against the `AI_USE` fields.
