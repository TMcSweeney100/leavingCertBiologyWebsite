# Intent — progress-redesign

Confirmed with Tim, 10 Nov 2026, through HTML mockups and then `/interview-me`. Later steps treat this as settled. It takes the stage drawer's look (`docs/intent/stage-drawer-redesign.md`, design B) to the Progress tab, after the student page (`docs/intent/student-page-redesign.md`). Design: direction **A, one stage at a time**, in `docs/design/pilot/progress-redesign/` (`NOTES.md`, then `design/a-stage-first.html`, `design/a-all.html` and the two phone frames).

## Statement of intent

- **Outcome:** the Progress tab (`/teach/classes/[id]/progress`) is rebuilt to A. Top to bottom:
  1. **Waiting for you**, the main job:
     - Every request, oldest first, each with Review.
     - Review opens the student page at that checkpoint.
     - After she answers there, a **Next request** button takes her straight to the next oldest request without coming back to Progress.
  2. **Stage tabs** (All, 1–6):
     - Each stage tab has a small progress bar and "N to sign off", or its due date if it isn't due.
     - The page opens on **the latest stage that's due**, on laptop as on phone.
  3. **The navy card** for the chosen stage, then **Still to sign off · N**:
     - The chase list: students not yet signed off on that stage, furthest behind first.
     - A **Sign off** button on every row.
     - The work link as a ↗ icon beside the name, not a line of its own.
  4. **After a sign-off the row stays in place.** It shows "Signed off today · Undo" and the header count goes down. It moves into the folded **Signed off · N** section on reload or Re-sort. Re-sort keeps its name.
  5. **All** is the quiet grid:
     - ✓ for signed off, an amber Sign off for due, a dash for not due (sign off early on hover or focus), Review for waiting.
     - The "Up to date" band is folded, except for students who are waiting.
     - On a phone, All is a read-only list with six stage dots per student; the row opens the student page.
- **User:** a teacher (Katelyn first) at a laptop, at school or at home. She answers students' sign-off requests in a batch, then chases whoever hasn't asked. She never signs off on her phone.
- **Why now:**
  - The live page opens on 192 cells (32 students × 6 stages), most of them "Sign off" buttons, and feels intimidating.
  - A shared work link adds a 44px "drive.google.com" line under every name.
  - "Behind by N" repeats the band heading.
  - "No entries yet" is the boldest text in most rows.
  - Tim is polishing every page before adding features. The drawer and the student page are done or in progress; Progress is next.
- **Success, checked by hand:**
  - She opens Progress and sees the requests first, then one list of who's left on the current stage.
  - She can answer 15 requests in a row using Next request, without returning to Progress.
  - Signing off down the chase list never moves a row under her pointer, and the count goes down as she works.
  - With every student linked, rows don't grow a line each.
  - At 390px nothing is clipped and every control is reachable.
- **Constraints:**
  - Laptop first, then 390px (`docs/design/UI-STANDARDS.md` §3, changed 10 Nov 2026).
  - Built after the student page merges. Reuses its restyled sign-off parts (`signoff-parts.tsx`, `use-signoffs.ts`) and its tokens.
  - Every action works as today: sign off, undo, revoke with its confirm step, Re-sort, Hide names, the Review links and their `#checkpoint-<id>` anchors.
  - Requests are the main path, but **direct sign-off stays** ("for now").
  - The browser tab title stops saying "BiPi Schedule Hub" on app pages.
- **Out of scope:**
  - Removing direct sign-off.
  - Any way to message or nudge students who haven't asked.
  - What students see.
  - The class's Students and Component tabs.

## Decisions made

| Question | Answer |
|---|---|
| Which design? | A, one stage at a time, with an All tab. B (opens on the whole quiet grid) is reference only; A's All tab reuses its cells. |
| Where and on what does the teacher sign off? | At a desk, at school or at home, on a laptop. Never on her phone. UI-STANDARDS and UI-BRIEF now say laptop first. |
| What does she work from? | Students' requests. Every student should ask for sign-off; the design must not count on her memory of who she talked to. |
| Keep direct Sign off on students who haven't asked? | Yes, for now. |
| Answering many requests in a row? | A Next request button on the student page, after answering, to the next oldest request. It touches the student page being built now; rework it if it doesn't feel right. |
| Which stage does the chase list open on? | The latest stage that's due (Stage 3 on 10 Nov 2026). The furthest-behind students are at the top of that list anyway. |
| What happens to a row after Sign off? | It stays in place with "Signed off today · Undo", and moves to Signed off on reload or Re-sort. Re-sort keeps its name. |

## Left to the plan

- Where Next request gets the class's queue on the student page, and whether that needs an API change. If it does, it is the one exception to "no backend change" and the plan says so.
- What happens to the `?stage=` URL, the laptop/phone split in `progress-grid.tsx`, and `StagePicker`.
- The accessibility of the stage tabs (links with `aria-current`), the quiet cells (every button keeps its full name), the icon-only work link (its accessible name and 44px target), and the phone dots.
- The tab title for each app page.
- Which existing specs and e2e journeys change.
