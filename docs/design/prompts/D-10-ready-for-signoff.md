# Claude Design prompt: pack D-10 (ready for sign-off and the document link)

Edit freely, then paste everything below the line into Claude Design, **in the same project as D-1 to D-7** so it keeps the Navy direction. Attach:

- `docs/design/UI-BRIEF.md` (the brief; §5 is the Navy system);
- `docs/design/UI-STANDARDS.md` (§3 layout, §5 colour, §6 interactive elements, §13 accessibility floor);
- `docs/design/UI-CHECKLIST.md` (what the build is checked against before it's called done);
- `docs/design/pilot/D-1-app-shell-auth/tokens.css`;
- screenshots of the D-3 stage card with its checkpoint box open, the D-7 grid (1140px and 390px) and the D-7 student-page Checkpoints section, the D-6 teacher reading view, the D-5 Component tab, and the D-2 `/teach` class card with its amber pending badge.

Sources: `docs/PILOT-ROADMAP.md` §6.2 (the `/components/[id]`, `/teach`, `/teach/classes/[id]/component`, `/teach/classes/[id]/progress` and `/teach/classes/[id]/students/[studentId]` rows, as updated for this feature) and §7 ("Backlog: ready-for-signoff"); `docs/intent/ready-for-signoff.md`; `docs/superpowers/plans/2026-10-17-ready-for-signoff.md` (Decisions R-1 to R-22); `docs/newDevelopement/FUNCTIONAL-SPEC.md` FR-38 to FR-40; `docs/PILOT-DESIGN.md` §4 (teachers do not correct reports for redrafting) and §9 (links are stored, never fetched). Needed by **ready-for-signoff**. The page is built first in the existing Navy style; a restyle task follows when this pack arrives.

---

I'm designing the **Ready for sign-off** flow for the Leaving Cert coursework app, in the same **2e "Navy"** direction you set in D-1 to D-7. The attached `UI-BRIEF.md` and `tokens.css` are the system; `UI-STANDARDS.md` and `UI-CHECKLIST.md` are how it will be built and checked. **Build on them; don't start a new palette.**

This pack changes five existing pages and adds no new route: the student's component page (D-3), the teacher's Progress tab (D-7), the teacher's student page (D-6/D-7), the Component tab (D-5) and the `/teach` class card (D-2).

**Student screens are mobile-first (390px first, then 1140px). Teacher screens are desktop-first (1140px first, then 390px)**, as in D-7.

Please give me **two or three rough directions** for the teacher's review panel at 1140px first. After I pick one, build every state below at **1140px and 390px**.

## What the feature does

A student sets **one link to their report** (a Google Doc, a OneDrive file; the app stores the link and never opens or fetches it). When they've done a checkpoint, they mark it **Ready for sign-off**, with an optional short note ("plan's on page 2"). The teacher sees a **queue** of those requests on the Progress tab, opens the student's page at that checkpoint, looks at the work, and answers **Accept** or **Not yet**, with an optional note. Both sides keep the history.

## Fixed rules (not open)

- The link is per component. Every request shows the component's **current** link. Changing the link keeps the old ones (history), but the page only shows the current one.
- The teacher chooses, per class, whether a link is **required before a student can ask**. Off by default.
- Links are `https` only, open in a **new tab** and say so, and are never fetched.
- A student can **withdraw** a request until it's answered.
- **Accept** signs the checkpoint off. **Not yet** sends the student back to Due or Not due yet; there is no "declined" state on the grid.
- A **Ready** checkpoint is not counted as behind. The student has asked; the teacher owes an answer. A Not yet puts them straight back.
- A teacher's note is **general and nondirective**: teachers "should not engage in corrections of the report for redrafting" (PILOT-DESIGN §4). The note field carries a help line saying so.
- Nothing is written into the student's log. The answered history lives only on the checkpoint, and both the student and the teacher see it.
- The history shows **answered** requests, newest first: asked on, the student's note, Accepted or Not yet, answered on, the teacher's note. Withdrawn requests aren't shown.
- Limits: student note 280 characters, teacher note 500. Both optional.
- The grid's Ready cell is a **link to the student's page at that checkpoint** (not a Sign off button). Due and Not due yet cells keep their one-click Sign off.

## What exists today (paste, don't redraw)

Student stage card, checkpoint box (D-3, `stage-card.tsx`):

- Eyebrow: `Checkpoint · Not due yet`, `Checkpoint · Not signed off yet`, `Checkpoint · Signed off`.
- Body: the checkpoint's full text.
- Hint when due: `Your teacher signs this off. Bring it up in your next class.`
- Otherwise: `Only your teacher can sign this off.`
- When signed off: `Your teacher signed this off on 3 Mar 2027.` on a signed-off tint with a 3px signed edge.
- Due: a 3px amber (`--app-attention`) left edge on the card and an amber tint in the box.

Teacher grid cell (D-7, `signoff-parts.tsx`): a word plus a tint. `Not due yet`, `Due`, `Signed off`, with the action `Sign off` or `Revoke` beside it. Accessible state text: `Due, not signed off`.

Teacher student page (D-7): a Checkpoints section with each checkpoint's stage, date, state, full text, and the same Sign off and Revoke actions.

`/teach` class card (D-2): subject edge bar, name, then subject, year and level, and an amber badge `N pending requests` only when above zero.

## Frames to draw, at 390px and 1140px

**Student, the "Your work" card** (top of `/components/[id]`):

1. No link, link **required** by the class: say why the Ready button is blocked and what to do.
2. No link, link **not required**: a quiet invitation to add one.
3. Link set: the host (for example `docs.google.com`), the date it was set, an open-in-new-tab link, **Change**, and the SEC backup line below.
4. Editing: one URL field, Save, Cancel, a validation error for a non-https link, and the saving and failed states.

**Student, the checkpoint box in five states:**

5. Not asked (due or not due yet): a **Ready for sign-off** button.
6. The Ready form open: an optional note with a live character count, the link it will send (or the missing-link nudge, if the class requires one), Send, Cancel.
7. Waiting: "Waiting for your teacher", the date asked, the note sent, and **Withdraw**.
8. Not yet: the teacher's note, the answered date, and **Ask again**.
9. Signed off: today's text plus the teacher's accept note, if any.
10. The answered history under any of these, collapsed by default when there's more than one answer.

**Teacher, Progress tab:**

11. The queue above the grid: **zero** ("No one is waiting for you"), **one**, and **several** waiting (oldest request first). Each row shows the student, the checkpoint's short form, how long ago (`asked today`, `asked yesterday`, `asked 7 days ago`) and the student's note, and opens the student page at that checkpoint.
12. The grid's **Ready · Review** cell (word plus tint, a link, not a button) and each row's **work link** (or "No link yet"). Say how you'd tell the Ready tint apart from Due's amber and Signed off's green without relying on colour alone.

**Teacher, the student page** (`#checkpoint-…` opens at the right row, so draw the scroll target):

13. The review panel: the student's note, the link (or "No link yet"), the note field with its nondirective help line, **Accept** and **Not yet**, a busy state, a failed state, and the answered history.
14. A checkpoint where the teacher signs off from the grid while a request is open: the request closes as Accepted. Show the history row.

**Teacher, the Component tab:**

15. The require-link switch: on and off, with its label and one line saying what it does.

**Teacher, `/teach`:**

16. The class card with `N waiting for sign-off` beside the amber pending badge: both present, only one present, neither.

**All:** the shared error panel for a failed load or failed action.

## Rules that constrain you

- Build on `tokens.css` and the D-1 to D-7 language: white cards with hairlines, 4px-edge messages, in-place confirmations, subject edge bars only on class rows. Any new colour is a `--app-ready*` addition to `tokens.css` with measured contrast ratios, recorded in `NOTES.md`.
- Light only. Body 16px, nothing under 12px, `tabular-nums` on numbers that line up. Dates "3 Mar 2027". Sentence case. One primary button per screen.
- **Accessible names are the tests' contract.** Keep every name below exactly; visible copy may change, these may not:
  - `Ready for sign-off: <checkpoint text>` (student's button)
  - `Withdraw request: <checkpoint text>`
  - `Ask again: <checkpoint text>`
  - `Accept <checkpoint text> for <student name>`
  - `Not yet: <checkpoint text> for <student name>`
  - `Review <checkpoint text> for <student name>` (the grid's Ready cell link)
  - `Open your work (opens in a new tab)` (student) and `Open <student name>'s work (opens in a new tab)` (teacher)
- Live regions (`aria-live="polite"`) announce "Sent to your teacher", "Withdrawn", "Accepted" and "Not yet" results.
- **44px touch targets** at 390px, 24px minimum pointer targets at 1140px, 8px between neighbours (name any exception, as D-7 did); focus visible on every control; one `h1` per page; **no colour-only meaning**.
- The queue and the grid are server-rendered: no spinners on first paint.
- Quote the backup line **verbatim**, with its attribution ("Your SEC brief"), never reworded: "It is strongly recommended that you make and regularly update a backup copy of your digital report, which can be used in the event of loss or corruption."
- Draft copy, **the pack may change visible copy, never accessible names:**
  - Queue heading: `No one is waiting for you` / `1 student waiting for you` / `3 students waiting for you`
  - Class badge: `2 waiting for sign-off`
  - Timing: `asked today`, `asked yesterday`, `asked 7 days ago`
  - Waiting state: `Waiting for your teacher`
  - Teacher note help line: `Keep it general: what's missing, not how to fix it. Teachers don't correct the report for redrafting.`
  - Student note limit 280, teacher note limit 500.
- Student names, links, notes and dates in the frames are sample content; mark them as such. Never invent or reword checkpoint text (use the checkpoints from D-7) or any SEC or NCCA wording.
- Any behaviour change goes in `NOTES.md` under "Open questions". The fixed rules above aren't open.

## Things I want your view on

- **Ready versus Due versus Signed off on the grid.** One word plus a tint each. Show how the fourth state sits in D-7's grid without a redesign, and measure the contrast.
- **Asking with no link when one is required.** Block the button, or let them open the form and explain? Say why.
- **Accept and Not yet side by side.** They're a pair of equals, but Accept signs a student off. How do you keep a stray tap from signing off the wrong checkpoint without adding a confirm step?
- **The history.** How much of five answered requests to show before it becomes noise.

## What I want back

1. Two or three rough directions for the teacher's review panel at 1140px.
2. After I choose: every frame above, at 1140px and 390px (at least 3, 6, 7, 8, 11, 13 and 16 at both), plus the error panel.
3. `tokens.css` additions only, with measured contrast ratios.
4. `NOTES.md` on the brief's §8 template, with exact copy and your answers to the four questions above, answering every open question.
5. Frame HTML per state, saved as `docs/design/pilot/D-10-ready-for-signoff/`.
6. Calm and exact. A teacher should see who is waiting in under two seconds, and a student should always know whether the ball is in their court or their teacher's.
