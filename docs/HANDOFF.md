# Handoff — coursework pilot

Rewritten at the end of every session: where things stand, what's half-done, what's waiting on a human. Anything permanent goes elsewhere (`docs/ARCHITECTURE.md` for how the code and hosts work, `docs/PILOT-ROADMAP.md` §2–§3 for decisions, the plans for per-task deviations). The live BiPi site's final handoff is archived at `docs/archive/bipi-site/HANDOFF.md`; its open items (Katelyn's copy sign-offs, print page count) still stand. Earlier versions of this file, with the per-phase detail, are in its git history (`git log -p docs/HANDOFF.md`).

**Standing rule (16 Sep 2026):** `docs/ARCHITECTURE.md` describes the code as built. When a session changes anything it describes (a filter, a pattern, an env var, a file's job), it fixes that section in the same commit, and at the end of the session checks it for anything else the session made false. A wrong map is worse than none.

## Stage drawer redesign (8 Nov 2026, branch `pilot/stage-drawer-redesign`)

**Built, all six tasks, not merged.** Plan `docs/superpowers/plans/2026-11-08-stage-drawer-redesign.md`, intent `docs/intent/stage-drawer-redesign.md`. The teacher's stage sheet is now design B: the stage's date, then the checkpoint as a navy card (counts as a bar named in words, "N waiting for you" as an amber link), the guidelines, the teacher's note as one cream card (read as students see it, Edit in place) and the items, white cards on a grey tray; an item opens as a view inside the sheet. `www.` addresses in notes are links, for students too. Frontend only.

- **Results at the branch tip (8 Nov 2026):** `make verify` green: 549 backend tests, 235 `node --test` cases, 352 Vitest tests in 57 files, lint, types and the production build clean. `make e2e` green: 34 Playwright tests, 17 on the laptop project and 17 on the phone project, with no change to any journey file in Task 6 (the axe runs found nothing on the navy card or the cream note).
- **Still to do:** Tim's hand test (below), `/self-review` in a fresh session, `code-simplification` if it flags anything, `docs/changes/stage-drawer-redesign.md`, and Tim opening the PR into `pilotMain`.
- **Confirm or change R-8 to R-19** (the plan's "Decisions made"; made while writing the plan): R-8 Close stays a text button; R-9 the item view keeps the stage's header with "‹ Back to Stage N" under it; R-10 a `www.` link gets `https://` in front, the text stays as typed; R-11 the note card opens on the box when there's an unsaved draft; R-12 no live preview while editing the note; R-13 focus into the box on Edit and Add a note, back to Edit (or Add a note) on Save, Cancel and Remove, which changes S-38; R-14 saving an existing item stays in its view with focus on Edit, a new or retired item goes back to the stage with focus on "Add an item"; R-15 the calendar's back link names where it goes ("Back to item B"); R-16 "N waiting for you" is an amber link under the counts when N > 0, "0 waiting" stays in the counts line; R-17 the checkpoint bar is a picture named in words and blurred by Hide names; R-18 the number in the navy square is decorative; R-19 no checkpoint, no navy card.
- **Built differently from the plan, or found in review:**
  - Task 1 got a follow-up commit, `0f9f038`: a bare `www` left after trailing punctuation was trimmed was being linked; now it isn't.
  - Task 3 got `bae34c3`: `empty:hidden` came off the stage date's live region, because a region that isn't displayed drops its announcement.
  - Task 4 also edited `frontend/components/app/stage-dates-form.spec.tsx` (one click on "Add a note" before typing), not in the plan's file list.
  - Known minor review notes, not fixed: the item view's title and due date at rest come from its local state, not the saved item, after a save, so the header can mix old and new values if a date change re-letters the items; if the open item is retired elsewhere, `item` is never reset and focus drops to the page body; the note card's `savedAs` is never cleared (stale if the note is edited from another device) and its heading becomes a `<label>` while editing; `"new"` is a bare string in four places beside the `ADD_ITEM` constant; `stage-item-view.tsx` has a no-op `hover:text-app-error-hover` (the colour is already that); no sheet-level test that focus returns to "Add an item".
- **Found while walking the UI checklist, not this branch's and not fixed: keyboard focus isn't drawn on any `Button`.** `components/ui/button.tsx` (unchanged on this branch) has `outline-none` with `focus-visible:outline-2`; in Tailwind v4 that leaves `outline-style: none`, and the utility beats the app's `@layer base` focus rule in `globals.css`. Measured in the journey's Chromium: Back to Stage 6, Edit this item and Close each match `:focus-visible` with `outline-style: none`. Links (the amber "waiting" link), the item rows (their own `ring`) and fields do show focus. It affects every `Button` in the app, so it wants its own small fix and a look across screens; say if you want it.
- **UI checklist for the sheet, at 1280 (laptop) and 390 (phone), from screenshots taken by a temporary, uncommitted copy of the journey:** looked right at both widths; nothing in the sheet scrolls sideways (checked in code at both widths); "1 waiting for you" is 44px tall and shows a white focus ring on the navy card; Hide names blurs the bar, the counts line and the waiting link; the note card reads as students see it with the `www.` link; the item view shows who has ticked it and Edit opens the form above it. The drawer's motion has `motion-reduce:transition-none` (read, not seen). Not checked: a real phone, a screen reader, 200% zoom, very long names, the screenshots against the design canvas.

## Where things are (1 Nov 2026)

- **`pilot/stage-sheet` is built, all three parts, and merged into `pilotMain` (`21831ab`, 3 Nov 2026, for a demo, before Tim's hand tests).** Self-review's three required fixes followed on `pilot/stage-sheet-fixes`. What it holds:
  - **The sheet (Part 1):** a stage's name opens a right-hand sheet at `?stage=N` with its date (Save this date), the official description and prompts, and its items, added, edited and retired in place. The page's separate item list is gone; each stage row shows its item letters.
  - **Who ticked (Part 2):** the checkpoint's counts across the class (signed off, waiting for you, not yet) and, on each item, who has and hasn't ticked it. They come from `GET …/progress`, which now carries `itemTicks`, and they follow Hide names.
  - **The note (Part 3):** a note for students on each stage (1,000 characters, a live preview, web links clickable), saved with Save note and removed by emptying the box. Students see it above the official text, headed "Note from your teacher", with "Note updated" for a week.
  - **Backend:** `V14__stage_notes.sql`, `PUT` and `DELETE /api/v1/components/{id}/stages/{stageId}/note`, and `note` on both views of a stage.
  - **Docs:** `ARCHITECTURE.md` §4 to §6, the roadmap's §6.2 and §7, the `BACKLOG.md` row, and the plan's decisions S-15 to S-40 in `docs/superpowers/plans/2026-10-31-stage-sheet.md`.
- **`make verify` and `make e2e` were green at the branch's tip** (1 Nov 2026, after the final review's fixes): `make verify` ran 549 backend tests, 232 `node --test` cases and 344 Vitest tests in 56 files, with lint, types and the production build clean; `make e2e` passed 34 Playwright tests (17 on the laptop project, 17 on the phone project). Because the branch starts from `a9be036`, this also covers the three merged features below; it is not a run on `pilotMain` itself.
- **`pilotMain` itself fails `make e2e` today.** Its Phase 1 journey (`frontend/e2e/phase1.e2e.ts`) stops at Sign out: `4a115ad` moved Sign out into the header's account menu and the journey was not updated, so it still looks for a "Sign out" button in the header. The fix is the `phase1.e2e.ts` change in this branch's commit `1e5de1f` (it signs out through "Account options", then the "Sign out" menu item). It lands when the branch merges. To get `pilotMain` green sooner, copy that one file onto it (`git checkout pilot/stage-sheet -- frontend/e2e/phase1.e2e.ts`); the commit as a whole also holds stage-sheet changes, so don't cherry-pick it whole. `docs/changes/stage-sheet.md` has to mention this fix, because it has nothing to do with the stage sheet.
- **Still to do:** Tim's three hand tests, then `write-changes`, which writes `docs/changes/stage-sheet.md` (and says that `phase1.e2e.ts` was fixed on this branch).
- **`BACKLOG.md` and `HANDOFF.md` were committed whole in the branch's first commit (`de378ed`).** That swept in the previous session's uncommitted lines: the three merged features moved to Done in the backlog (with "not written yet" for their changes docs) and the rewritten handoff. Worth a read to check they say what you meant.
- **Merged into `pilotMain` before this branch and pushed** (`a9be036`, "Merge pilot/source-builder into pilotMain"), now under Done in `docs/BACKLOG.md`:
  - `source-builder`: a Sources tab per component with NCCA-style citations and a reference list to copy, and a live preview in the source form (plan `docs/superpowers/plans/2026-10-25-source-builder.md`).
  - `ai-use-record`: AI uses on the same page with an "AI use" chip, plus the SEC Appendix 2 table to copy (plan `2026-10-25-ai-use-record.md`).
  - `date-picker-drawer`: every date on the Component tab opens a right-hand drawer, drawn to pack D-11, with typing in the drawer's footer (plan `2026-10-25-date-picker-drawer.md`, Parts 1–3).
  - The account controls in the header are now a dropdown menu, with a back link and tidier component-page headers (`4a115ad`). This fixed the lint failure and the failing `app-header.spec` that an earlier handoff left for Tim. It did not fix the Phase 1 journey, which `make e2e` had not been run against since; that is the red run on `pilotMain` described above.
- `draft-list.md` in the repo root is an unrelated untracked file; keep it out of commits.
- **Four uncommitted files that aren't any feature's** ride along in the working tree, untouched by the stage-sheet build: `docs/design/UI-STANDARDS.md` (a new "share a recipe at its third copy" rule), `frontend/components/app/styles.ts` (its header comment deleted), `frontend/lib/app/component-setup.ts` (one blank line) and `draft-list.md`. Tim decides whether to keep them. None of those edits is in any commit on the branch.

## Stage sheet: Tim's hand tests (branch `pilot/stage-sheet`)

Built without stopping (31 Oct to 1 Nov 2026); each part's hand test is waiting on Tim. Anything found goes into "From Tim's testing" in `docs/BACKLOG.md`. Run `make db-up`, `make backend-run`, `make frontend-run`; check on a laptop and a phone-width window.

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

### Hand test, Part 3 (the note)

Use a class with at least one approved student, and sign in as that student in a second browser (or a private window) for the last part.

- **The success test (3):** as a teacher, open Stage 2's sheet and write a note with a Drive link in it. The preview under the box ("How students see it") shows the link clickable. Press Save note: the status says "Saved just now", then "Saved" with today's date once the page has refreshed. Close the sheet: Stage 2's row now has a "Your note" chip beside its item letters.
- **Nothing typed is lost.** Type more into the note without saving, then close the sheet (Close, Escape, or a click outside it) and open it again: the text is still there, and the status says "Not saved yet". With unsaved note text, try to close the browser tab: the browser asks you to confirm. Save the note and the warning stops.
- **Removing a note.** Empty the box: the button now says Remove note. Press it: the status says "Note removed" and the chip goes from the row. On a stage with no note, a box holding only spaces leaves Save note disabled.
- **As a student**, open the component and expand Stage 2: "Note from your teacher" is at the top of the card, above the official text, with its date ("Updated …") under it, and a "Note updated" tag beside the stage name. The link works and opens in a new tab. The stage's items below are as before. (The tag goes after 7 days. To see that, move the note's date back in your local database: `UPDATE stage_note SET updated_at = updated_at - interval '8 days';`, then reload.)
- **A note over 1,000 characters can't be typed:** the counter stops at 1,000 / 1,000. (A longer paste is cut at 1,000 without a message; see the known limits below.)
- **At 390px wide:** the sheet fills the screen; the note box, its counter and the button fit; a long link in the preview and on the student's card wraps instead of pushing the page sideways.
- **Keyboard only:** Tab from the date box to the note box, type, Tab to Save note, press Enter. Focus stays in the box, and the status is read out.

After the three hand tests (on a laptop and a phone, end to end): **all three are waiting on Tim.** Then come `/self-review` in a fresh session, `code-simplification` if it flags anything, `write-changes` to write `docs/changes/stage-sheet.md`, and Tim opening the PR into `pilotMain`.

## Stage sheet: known limits and questions

- **Save this date is refused while another stage's saved date is late (S-34).** `PUT …/stage-dates` replaces every date, so the sheet has to send the late one too. A one-stage endpoint would fix it; say if you want that.
- **`stage_note` has no database trigger checking that the stage belongs to the component's template version.** Only `ComponentService.requireStage` checks it. `teacher_item` has a trigger for this; a `V15` trigger like it would be the same guard in the database if you want it.
- **The review-history drawer (`components/app/request-drawer.tsx`) marks names `data-private` but never applies `.app-hide-names` inside its portal**, so Hide names probably doesn't blur it. This was already so before the stage sheet.
- **An item's save in flight, then switching to another item, then the save finishing, closes the new item's form.** Rare, and it was already so before Part 1.
- **A note pasted over 1,000 characters is cut at 1,000 with no message** (the box's `maxLength`); the counter reads 1,000 / 1,000. Found by reading the UI checklist, not fixed.
- **Seen in a browser only by automated review (3 Nov 2026, Chromium at 1280 and 390):** no real phone, no screen reader. The three fixes after it were not re-checked in a browser or by the journey.
- **The class page's other tab links (Students, Progress) do the same for dates.** They are client-side links too, so unsaved dates are lost when you follow one. That was already so before the stage sheet.
- **Not checked by hand:** the browser at 390px, 200% zoom, keyboard only, and Hide names. The specs and the journey's axe runs cover them in code only.

**UI checklist** (`docs/design/UI-CHECKLIST.md`), gone through by reading the code and the specs for the sheet, its calendar view, the stage rows and the student's note. Everything not listed here passed on reading. Run in the browser, none of it has been seen yet.

- **Fails**
  - *Destructive actions apart and confirmed or undoable:* **Remove note** is the Save note button changing its words, in the same place and the same style, with no confirm and no undo, and the text is gone from the box. Retire item, by contrast, confirms in place. Needs a decision: a confirm strip, or an Undo that puts the text back.
  - *Touch targets 44px:* the "N waiting for you" link in the sheet's counts line is a 14px line, about 21px tall. (The links inside a note are inline in running text, so the usual inline exception applies.) Fixing it makes the counts line taller; it looked like a design call.
  - *Control borders 3:1:* the note box and the Save note button use the field border, 1.31:1 on white. This is the known app-wide P4-20 below, not new.
  - *Errors tied to their field with `aria-describedby`:* a failed note save focuses the alert, but the alert sits under the preview and isn't linked to the box. Text and ids are in `stage-note-form.tsx`; `ErrorPanel` has no `id` prop to link by.
- **Couldn't check without a browser**
  - *390px and 1140px, nothing scrolls sideways; 200% zoom; long content:* the sheet is full width on a phone and the note text uses `break-words`, but the "Ticked" and "Not ticked yet" name chips have no wrapping rule, so a very long surname might push the sheet sideways.
  - *Nothing jumps:* the first saved note adds a "Your note" chip to its row behind the sheet, which may add a line.
  - *Whole flow by keyboard, focus visible on every stop:* read as correct (focus goes to the sheet title, back to the opener, back to the date box and the note box), not walked.
  - *Screenshots against the design export:* not compared; the mockups are in `docs/design/pilot/stage-sheet/design/`.
  - *axe:* runs in `phase2.e2e.ts` on the sheet with a saved note and on the student's card with the note open; it found no violations in the green run.
- **The last checklist line**, "anything learned goes in `UI-STANDARDS.md`", wasn't done: that file has someone else's uncommitted edit, so it was left alone. One thing worth adding: a button that disables itself after a save drops keyboard focus, so move focus first (S-32, S-38).

## Still to do on merged work

- **Changes docs not written** (CLAUDE.md wants one per implementation): `docs/changes/source-builder.md`, `ai-use-record.md`, `date-picker-drawer.md`, plus two older ones skipped at the time: `pilot-4-teacher-grid.md` and the 3B D-6 restyle.
- **`/self-review`** for the three merged features is not recorded as done.
- **Run `make verify && make e2e` on `pilotMain`** once, to have a known-good baseline after the merge. `make e2e` fails there at Sign out in the Phase 1 journey until `phase1.e2e.ts` is fixed (see "Where things are"). (The green run on `pilot/stage-sheet` covers the merged work, but it is not a run on `pilotMain` itself.)
- **Not checked by hand** (from the three features' sessions): a real phone (a tap opens our drawer, not the browser's date wheel; the number pad for "Type a date"); 200% zoom; Firefox and Safari by eye; the Sources page at 390px; Copy appendix pasted into Google Docs (ai-use-record plan Task 7 Step 4). On a short window the drawer's month scrolls inside it, since the footer grew about 56px.

## Waiting on Tim

- **Confirm or change the stage-sheet plan's decisions S-15 to S-40** (`docs/superpowers/plans/2026-10-31-stage-sheet.md`; the agent's calls while planning and building, S-30 to S-40 mostly from code review).
- **Confirm or change plan decisions:** S-6 to S-15 (source-builder plan), A-7 to A-18 (ai-use-record plan), R-9 to R-22 (ready-for-signoff plan), P2-1 to P2-52 (Phase 2 plans). Each is in its plan's decisions table. They were the agent's calls while planning, not yours.
- **Content reviews for Gate P2:** read `V2__science_templates.sql` against the PDFs (checklist in plan 2B Task 5 Step 3) and `V3__business_template.sql` / `V4__briefs_2027.sql` (plan 2C Task 4 Step 2), including whether Physics' completion date of 11 Dec 2026 is right. Katelyn's review of the Biology checkpoints is open too.
- **Supply the four examinations.ie brief URLs** (Q-P2-F) for a content migration filling `source_url`.
- **Gate P1 by hand on the Vercel Preview against Render**, and a keyboard-only run of the journey on a laptop.
- **Gate P4 timing: passed on the deployed stack, 3 Nov 2026.** `scripts/seed-grid.mjs` run from a laptop against the pilot Vercel URL, 30 students × 6 checkpoints, backend already awake: Progress page 511 ms on first load, 331 ms on second, grid API 379 ms. The frozen roadmap's gate says × 7 and is still unticked, but every published template has 6 checkpoints, so this is the largest real grid. Accept that or say otherwise.
- **Test the app by hand as a teacher and a student** and fill in "From Tim's testing" in `docs/BACKLOG.md`. It's still empty, and it's the best source for the next feature.

## Go-live items (calendar-bound, not code)

- **Q9 cohort** (6th years now, 5th years in spring 2027, or both), **H2 which school** and its teachers and leader, and **Q5 who drafts the data processing agreement and privacy notice**. The roadmap says to start Q5 now.
- **Upgrade the Render database** (point-in-time recovery, a tested restore) before the first real account.
- **Delete test data before onboarding:** the gate-check data on Render (`Gate Check School` ×2, roll `00009Z`, users `gate.teacher*`, `gate.student.c`), anything `seed-grid.mjs` creates on the deployed stack (so far `test.teacher`'s class "6th Year Biology" with its 30 `seed.mw0ybgxx.*` students), and locally "Seed Timing School 69527" with its 30 `seed.mumeewda.*` students.
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

Nothing in code on `pilotMain`. `pilot/stage-sheet` is built and waits on the hand tests, the review and the PR (see "Where things are").
