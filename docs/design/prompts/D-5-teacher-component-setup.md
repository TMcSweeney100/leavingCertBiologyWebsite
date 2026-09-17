# Claude Design prompt: pack D-5 (teacher component setup)

Edit freely, then paste everything below the line into Claude Design, **in the same project as D-1 and D-2** so it keeps the Navy direction. Attach:

- `docs/design/UI-BRIEF.md` (the brief; §5 is the Navy system);
- `docs/design/pilot/D-1-app-shell-auth/tokens.css`;
- screenshots of the D-2 frames for `/teach/classes/[id]` (the class page with its tab row) and `/teach/classes/new` (the field group with row errors).

Sources: `docs/PILOT-ROADMAP.md` §6.2 (`/teach/classes/[id]/component` row) and §7 (Phase 2 endpoints), `docs/PILOT-DESIGN.md` §3.1 (what teachers can't change), §4.3 (completion dates), §6.3–§6.4 (briefs, stage dates, teacher items), §7.2 (stages and hours) and §8.2. Needed for build milestone **2D**, the first Phase 2 page to be built.

---

I'm designing the next teacher page for the Leaving Cert coursework app, in the same **2e "Navy"** direction you set in D-1 and D-2. The attached `UI-BRIEF.md` and `tokens.css` are the system. **Build on them; don't start a new palette.**

This pack is one page: **setting up a class's coursework component**, the **Component** tab of the class page you drew in D-2 (`/teach/classes/[id]/component`). In D-2 it was a greyed tab; now it's live. Teachers use this on a laptop, usually once at the start of the year and then to adjust dates. It's desktop-first, but it has to work on a phone for a quick date change.

Please give me **two or three directions** for the stage-dates editor at 1140px first, rough. After I pick one, build every state below at **1140px and 390px**.

## What the teacher is doing

A class (say "6A Biology, year 6, 2026/27") does one coursework component: the SEC's brief for its subject and exam year. The teacher:

1. **Chooses the brief.** The subject is fixed by the class, so this is picking the exam year's brief: "Biology in Practice Investigation, 2027". It shows the SEC code, topic and completion date. In the pilot there's usually one brief per subject; the 2028 briefs arrive later in the year.
2. **Sets a date for each stage.** Stages are national, so they can't be renamed, added or removed. The teacher only picks dates.
3. **Adds their own items to stages**: to-dos like "Book a re-run slot" or "Full draft in for feedback", optionally with a date. They can edit them and **retire** them (retired items disappear for students; nothing is deleted from history).

Students see the result on their component page (D-3) and their timeline (D-4), so dates and items are shared with the class as soon as they're saved.

## The rules the page must show

- **No date may be after the brief's completion date.** The server refuses it with a named error. The teacher needs to see which date, and the completion date it breaks, in words. Working copy for the problem, to improve: "Stage 6 is after the completion date, 26 Feb 2027. Choose a date on or before it."
- **Dates out of order are allowed, with a warning.** The guidelines say students move back and forth between stages, so the app doesn't enforce order, but a teacher who typed Stage 5 before Stage 4 probably made a slip. Warn, don't block.
- **The completion date can change.** If the SEC moves a brief's completion date after dates are set, stage dates now after it are flagged, and the teacher is asked to fix them.
- **Hours are display only**, e.g. "2–3 hours", to help the teacher space dates. Business Stages 4 and 5 share one estimate ("6–8 hours together"). Science Stage 4 is "about 1–2 hours per lab session".
- **Some stages are supervised** (science Stage 4, practical work in class time). Show it if it helps planning.
- The page must say, somewhere a teacher reads it, that **these are the class's own dates, not SEC deadlines**. The SEC's only date is the completion date.

## Sample content

Placeholders for layout, except the stage names and completion dates. Biology stage titles are as on the live BiPi site; Business stage names are from the NCCA guidelines.

- **Class:** 6A Biology, year 6, 2026/27. **Brief:** Biology in Practice Investigation, 2027. Topic "Membranes, Osmosis & Food Preservation". **Completion date 26 February 2027.**
- **Biology stages and indicative hours:** Stage 1 Initial Response to the Brief (1–2) · Stage 2 Background Research (2–3) · Stage 3 Designing & Planning the Experiment (2–3) · Stage 4 Conducting the Experiment (about 1–2 per lab session, supervised) · Stage 5 Data Analysis & Conclusions (1–2) · Stage 6 Finalising the Report (up to 4).
- **Dates** (placeholders): Stage 1 29 May 2026 · Stage 2 5 Jun 2026 · Stage 3 25 Sep · Stage 4 16 Oct · Stage 5 20 Nov · Stage 6 22 Jan 2027.
- **Teacher items** (placeholders): Stage 4 "Book a re-run slot if your data needs it" (no date) · Stage 6 "Full draft in for feedback" (4 Dec 2026) · Stage 6 "Catch-up window closes" (13 Nov 2026).
- **Business**, for one frame: Stage 1 Getting Started · Stage 2 Developing a question to research · Stage 3 Developing a project plan · Stage 4 Identifying sources and gathering information and data · Stage 5 Analysis and evaluation · Stage 6 Applying learning and drawing conclusions · Compilation of the final report (an unnumbered final stage). Completion date **12 March 2027**. Hours 2–3, 1–2, 1–2, 6–8 for Stages 4 and 5 together, 1–2, Compilation 2–3.

## States to draw

1. **No component yet:** the class has no component. The teacher chooses the brief and creates it. One primary action; show the brief's code, topic and completion date before they commit.
2. **Just created, no dates:** every stage listed, no dates. Invite the teacher to start, and make clear students see "dates coming from your teacher" until they're set.
3. **Dates set, normal:** all six dates in, two teacher items, one with a date.
4. **A date after the completion date:** refused on save, with the named error on that stage's row and in the shared error panel from D-1.
5. **Dates out of order:** saved, with a warning on the two rows involved.
6. **The completion date changed:** the brief's date moved earlier and one stage date is now after it. A banner explains what changed, and the row is flagged.
7. **Adding, editing and retiring a teacher item**, including retire's confirmation (in place, as D-2's Remove).
8. **Business**, dates set, showing Compilation and the shared 6–8 hour estimate.
9. **At 390px:** changing one stage's date on a phone.
10. **Unsaved changes:** if dates are edited as a batch with one Save, what the teacher sees when they try to leave with unsaved changes (the UI standards say long forms confirm before leaving). If you choose saving per row instead, show that and say why in `NOTES.md`.
11. **Tab row:** Students · **Component** (current) · Progress (still disabled until Phase 4).
12. **The shared error panel** for a failed load and a failed save.

## Things I want your view on

- **Save model.** The API sets all stage dates in one request, and teacher items one at a time. Batch Save for dates versus saving each row as it changes. Recommend one.
- **Should checkpoints show here?** Each stage has a checkpoint the teacher will sign off in Phase 4 (e.g. "Plan discussed with the teacher (feasibility and safety)"). Showing them read-only on this page may help a teacher plan dates around them. Say whether it helps or clutters.
- **Date entry.** A native date input, a calendar popover, or typed dates. It must be keyboard-accessible, 16px on phones, and show dates as "16 Oct 2026".

## Rules that constrain you

- Build on `tokens.css` and the D-1/D-2 component language: the field group with row errors from `/teach/classes/new`, 4px-edge messages, white cards with hairlines, in-place confirmations as D-2's Remove.
- Light only. Body and inputs 16px; nothing under 12px. Dates "16 Oct 2026".
- Sentence case. Buttons name the outcome ("Create component", "Save dates", "Add item", "Retire item"). One primary button per screen. Nothing only on hover.
- Red is for the refused date and errors; the out-of-order and completion-date-changed warnings need a distinct, non-error treatment. Amber is reserved for pending work, so if you use it for warnings, say why in `NOTES.md`, or propose a warning token.
- These labels will become the automated tests' contract. They're proposals, so improve them in `NOTES.md` "Open questions": **Create component**, **Save dates**, **Add item**, **Edit**, **Retire item**, **Keep**; the tab names.
- Any behaviour change goes in `NOTES.md` under "Open questions". The fixed rules (no renaming stages, no date after the completion date) aren't open.

## What I want back

1. Two or three rough directions for the stage-dates editor at 1140px.
2. After I choose: every state above, both widths where it makes sense (at least 1, 3, 4, 9 and 12 at 390px), plus the error panel.
3. `tokens.css` additions only (a warning colour, if you add one), with measured contrast.
4. `NOTES.md` on the brief's §8 template, with exact copy and your answers to the three questions above.
5. Calm and exact. A teacher should be able to set a year's dates in five minutes without reading instructions, and trust that nothing was lost.
