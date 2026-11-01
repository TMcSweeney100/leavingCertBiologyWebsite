# Handoff — coursework pilot

Rewritten at the end of every session: where things stand, what's half-done, what's waiting on a human. Anything permanent goes elsewhere (`docs/ARCHITECTURE.md` for how the code and hosts work, `docs/PILOT-ROADMAP.md` §2–§3 for decisions, the plans for per-task deviations). The live BiPi site's final handoff is archived at `docs/archive/bipi-site/HANDOFF.md`; its open items (Katelyn's copy sign-offs, print page count) still stand. Earlier versions of this file, with the per-phase detail, are in its git history (`git log -p docs/HANDOFF.md`).

**Standing rule (16 Sep 2026):** `docs/ARCHITECTURE.md` describes the code as built. When a session changes anything it describes (a filter, a pattern, an env var, a file's job), it fixes that section in the same commit, and at the end of the session checks it for anything else the session made false. A wrong map is worse than none.

## Where things are (31 Oct 2026)

- **Everything built is merged into `pilotMain` and pushed** (`a9be036`, "Merge pilot/source-builder into pilotMain"). No branch is open and nothing is half-built in code.
- **That merge brought in three backlog features**, now under Done in `docs/BACKLOG.md`:
  - `source-builder`: a Sources tab per component with NCCA-style citations and a reference list to copy, and a live preview in the source form (plan `docs/superpowers/plans/2026-10-25-source-builder.md`).
  - `ai-use-record`: AI uses on the same page with an "AI use" chip, plus the SEC Appendix 2 table to copy (plan `2026-10-25-ai-use-record.md`).
  - `date-picker-drawer`: every date on the Component tab opens a right-hand drawer, drawn to pack D-11, with typing in the drawer's footer (plan `2026-10-25-date-picker-drawer.md`, Parts 1–3).
- **Also merged:** the account controls in the header are now a dropdown menu, with a back link and tidier component-page headers (`4a115ad`). This fixed the lint failure and the failing `app-header.spec` that the last handoff left for Tim. On 31 Oct `npm run lint` was clean and `app-header.spec.tsx` passed 5/5; the full `make verify` and `make e2e` have not been re-run on `pilotMain` since the merge.
- **Nothing is in progress.** The backlog's only Up next row is a proposed stage sheet (right-hand, where "who ticked each item" comes back), with no plan yet.
- `draft-list.md` in the repo root is an unrelated untracked file; keep it out of commits.
- **Three uncommitted edits that aren't any feature's** ride along in the working tree: `docs/design/UI-STANDARDS.md` (a new "share a recipe at its third copy" rule), `frontend/components/app/styles.ts` (its header comment deleted) and `frontend/lib/app/component-setup.ts` (one blank line). The stage-sheet build left them alone; Tim decides whether to keep them.

## Stage sheet: Tim's hand tests (branch `pilot/stage-sheet`)

Built without stopping (31 Oct 2026); each part's hand test is waiting on Tim. Anything found goes into "From Tim's testing" in `docs/BACKLOG.md`. Run `make db-up`, `make backend-run`, `make frontend-run`; check on a laptop and a phone-width window.

### Hand test, Part 1 (the sheet, dates, items)

- Stage 2's name, or anywhere else on its row except the date box, opens its sheet. The address shows `?stage=2`. Back closes the sheet and Forward opens it again. Loading `…/component?stage=2` opens it, and Close keeps you on the Component tab.
- The sheet shows the official text ("From the guidelines") and the prompts ("Questions students get from the guidelines").
- An item can be added with a date picked in the sheet's calendar, then edited, then retired. A half-typed item survives a trip to the calendar and back.
- A date picked in the sheet shows dashed on the row, and a date picked on the row shows dashed in the sheet. Save this date saves only that stage; another row's unsaved date stays dashed.
- Keyboard only: the stage name opens the sheet with focus on its title; the date box opens the calendar with focus on the day; "Back to Stage 2" puts focus back on the box; then the items; Close puts focus back on the stage name. After Save this date or Undo, focus is on the date box.
- The stage date box on the row still opens its own drawer.
- At 390px wide the sheet fills the screen.
- The one known limit (decision S-34): with one stage's saved date after the completion date, Save this date on another stage is refused, and the message names the late stage. To set it up, save Stage 6 on a date on or before 26 February 2027, then move Biology's completion date earlier **in your local database** (`docker exec -it coursework-postgres psql -U coursework coursework`, then `UPDATE annual_brief SET completion_date = '2027-01-29' WHERE sec_code = '2027L025C2EL';`) and reload.
- **Put it back when you're done:** `UPDATE annual_brief SET completion_date = '2027-02-26' WHERE sec_code = '2027L025C2EL';`. That date is shared by every Biology class on your local database.

### Hand test, Part 2 (who ticked, and the checkpoint counts)

Part 3 (the teacher's note) follows without waiting for this test (31 Oct 2026, Tim away), so anything you find here may already have Part 3 built on top of it. Use a class with a few approved students, some of whom have ticked items, asked for sign-off, or been signed off.

- **The success test (2):** open the current stage and answer "who hasn't ticked B, and who's waiting for sign-off?" in a few seconds, without going to the Progress tab.
- The counts line under the checkpoint reads "N signed off", "N waiting for you" and "N not yet". It matches the Progress grid for that stage. "Waiting for you" is a link to the Progress tab, and is plain "0 waiting" when nobody is.
- A stage with no checkpoint (Business Stage 6) shows no counts line.
- Each item shows "N ticked" on its row. Opening the item lists "Not ticked yet" and "Ticked", with "students tick these themselves" in the second heading. Names are full names, sorted by surname.
- A student you removed from the class doesn't appear in the counts or the lists, and isn't in the tick number.
- Turn on Hide names on the Progress tab, then go to the Component tab and open the sheet. The names, the counts and the tick numbers are blurred. Turn it off, reload, and they are readable.
- If you can, make the progress endpoint fail (stop the backend part-way, or block `GET /components/{id}/progress` in the browser's network panel, then reload). The sheet should say "Couldn't load the class's progress" in the checkpoint section and on an opened item, while the dates and items still work.
- Keyboard only: each item row is one button (its name reads the letter, the text, "N ticked" and the date), and Tab reaches the "waiting for you" link.

## Still to do on merged work

- **Changes docs not written** (CLAUDE.md wants one per implementation): `docs/changes/source-builder.md`, `ai-use-record.md`, `date-picker-drawer.md`, plus two older ones skipped at the time: `pilot-4-teacher-grid.md` and the 3B D-6 restyle.
- **`/self-review`** for the three merged features is not recorded as done.
- **Run `make verify && make e2e` on `pilotMain`** once, to have a known-good baseline after the merge.
- **Not checked by hand** (from the three features' sessions): a real phone (a tap opens our drawer, not the browser's date wheel; the number pad for "Type a date"); 200% zoom; Firefox and Safari by eye; the Sources page at 390px; Copy appendix pasted into Google Docs (ai-use-record plan Task 7 Step 4). On a short window the drawer's month scrolls inside it, since the footer grew about 56px.

## Waiting on Tim

- **Confirm or change plan decisions:** S-6 to S-15 (source-builder plan), A-7 to A-18 (ai-use-record plan), R-9 to R-22 (ready-for-signoff plan), P2-1 to P2-52 (Phase 2 plans). Each is in its plan's decisions table. They were the agent's calls while planning, not yours.
- **Content reviews for Gate P2:** read `V2__science_templates.sql` against the PDFs (checklist in plan 2B Task 5 Step 3) and `V3__business_template.sql` / `V4__briefs_2027.sql` (plan 2C Task 4 Step 2), including whether Physics' completion date of 11 Dec 2026 is right. Katelyn's review of the Biology checkpoints is open too.
- **Supply the four examinations.ie brief URLs** (Q-P2-F) for a content migration filling `source_url`.
- **Gate P1 by hand on the Vercel Preview against Render**, and a keyboard-only run of the journey on a laptop.
- **Gate P4 timing:** run `node scripts/seed-grid.mjs --username=<teacher> --password=<password> --base=<pilot Vercel URL>` on the deployed stack; the Progress page should load in under a second. It has only been run locally.
- **Test the app by hand as a teacher and a student** and fill in "From Tim's testing" in `docs/BACKLOG.md`. It's still empty, and it's the best source for the next feature.

## Go-live items (calendar-bound, not code)

- **Q9 cohort** (6th years now, 5th years in spring 2027, or both), **H2 which school** and its teachers and leader, and **Q5 who drafts the data processing agreement and privacy notice**. The roadmap says to start Q5 now.
- **Upgrade the Render database** (point-in-time recovery, a tested restore) before the first real account.
- **Delete test data before onboarding:** the gate-check data on Render (`Gate Check School` ×2, roll `00009Z`, users `gate.teacher*`, `gate.student.c`), anything `seed-grid.mjs` creates on the deployed stack, and locally "Seed Timing School 69527" with its 30 `seed.mumeewda.*` students.
- After any Render deploy, set the school short name: `operator set-school-short-name --roll=… --short-name=…`.
- **Rules-edition risk:** the AI-use fields and the appendix table follow the 2025–26 Coursework Rules and Procedures (Appendix 2, p. 34). Diff it when the 2026–27 edition is out. The Rules document itself is still not in `subjectDocs/`.
- Carried over: redeploy Render while holding a live session cookie and confirm `/auth/me` still answers; confirm Katelyn's `main` project 404s `/login` and `/api/v1/health`.

## Known small things (none fixed)

- **Control-border contrast (P4-20):** outline buttons have a 1.31:1 border against WCAG 1.4.11's 3:1, app-wide since D-1. One token change.
- **Ready for sign-off races:** `SignoffRequestService.ask` can 500 if the teacher answers between the insert and the re-read; an ask racing a sign-off can leave an open request on a signed-off checkpoint (inflating the queue and badge); the ask endpoint returns 201 even when nothing was created.
- `HttpsLink` accepts userinfo (`https://user:pass@host`).
- `BACKUP_ADVICE` is duplicated in `AppCopySourcesTest` and `lib/app/ready.ts`; keep them in step.
- Sign in stays enabled during a lockout (the API gives the wait only as text).
- On phones, student rows on the class page wrap their buttons under the name.
- Prompts on the student component page are collapsed at 1140 too, where D-3 draws them open.
- Phase 4 differences from D-7 left as built (date format "Sept", grid cell styling, the student page's layout); the list is in this file's history at 29 Sep 2026.
- Ready for sign-off's colours are still provisional: its pack (D-10) never arrived.

## Half-done

Nothing in code.
