# Claude Design prompt: pack D-11 (the date picker drawer)

Edit freely, then paste everything below the line into Claude Design, **in the same project as D-1 to D-10** so it keeps the Navy direction. Attach:

- `docs/design/UI-BRIEF.md` (the brief; §5 is the Navy system);
- `docs/design/UI-STANDARDS.md` (§3 layout, §5 colour, §6 interactive elements, §13 accessibility floor);
- `docs/design/UI-CHECKLIST.md`;
- `docs/design/pilot/D-1-app-shell-auth/tokens.css`;
- the D-5 Component tab export (`docs/design/pilot/design_handoff_teacher_component_setup/`), screenshots of the Component tab as built at 1140px and 390px, and a screenshot of the D-10 review drawer open (the right-hand drawer this pack reuses).

Sources: `docs/intent/date-picker-drawer.md`; `docs/superpowers/plans/2026-10-25-date-picker-drawer.md` (its decisions); `docs/PILOT-ROADMAP.md` §6.2 (the `/teach/classes/[id]/component` row); `frontend/components/app/stage-dates-form.tsx` and `teacher-items.tsx` (today's copy). Needed by **date-picker-drawer**. The drawer is built first in the existing Navy style with shadcn's Calendar; this pack is the restyle, and it may not change behaviour.

---

I'm designing the **date picker drawer** for the Leaving Cert coursework app, in the same **2e "Navy"** direction you set in D-1 to D-10. The attached `UI-BRIEF.md` and `tokens.css` are the system; `UI-STANDARDS.md` and `UI-CHECKLIST.md` are how it will be built and checked. **Build on them; don't start a new palette.**

This pack changes one page, the teacher's **Component tab** (D-5), and adds no route. It reuses the right-hand drawer from D-10.

Desktop first, but it must work one-handed on a phone.

Please give me **two or three rough directions** for the calendar inside the drawer at 1140px first. After I pick one, draw every frame below at **1140px and 390px**.

## What the feature does

On the Component tab a teacher sets a date for each of six stages, and an optional date on each of their own items. Today every date is the browser's own date box, and its drop-down calendar is blank: the teacher picks a date with no idea where it sits among the others.

At the moment when you click the date box a drawer comes out. You can pick the day from a calnder then. We want something that is sleek up to dayte , intuitive and a samll bit colorful, you can go beyond navy here as I feel this app is very dark at the moment

## Fixed rules (not open)

- The drawer comes from the **right**, like D-10's. On a phone it takes the full width.
- The calendar shows the months **from the earliest date on the component (or this month, if that's earlier) to the month of the completion date**, in one column you scroll. A Biology component set up in May runs about ten months. It opens scrolled to the month of the date being picked, or this month if there isn't one yet. No month-by-month arrows.
- Weeks start on **Monday**.
- On the calendar:
  - **Stage dates.** Every stage date, saved or not. A date the teacher has typed or picked but **not saved yet** looks slightly different from a saved one, and says "not saved".
  - **Item dates.** Every dated teacher item, with its letter (A, B, C… in date order, as on the page today).
  - **Today.**
  - **The completion date.** The SEC's one fixed date. **Every day after it is greyed out and can't be picked.**
  - **The date being picked**, as the selected day.
- **No school holidays or mid-term.** The app has no school calendar.
- More than one thing can fall on one day (two stages, a stage and an item, an item on the completion date). The day must still read clearly.
- **Picking a day never saves.** It fills the date box and closes the drawer; focus goes back to the button that opened it.
- **Clicking (or tapping) the date box opens the drawer.** There is no separate button. The box still takes a typed date from the keyboard, and Alt+Down opens the drawer from it.


## What exists today (paste, don't redraw)

The stage row (D-5, `stage-dates-form.tsx`): a mono ordinal, the stage name, a line of hours and "Supervised in class", `Checkpoint: …`; on the right a date box 176px wide with `Wed 25 Sept 2026` or `No date yet` under it. Amber tint and edge for an out-of-order pair, red for a date the server refused.

The page's lead: `These are your class's own dates, not SEC deadlines. The SEC's only date is the completion date, 26 Feb 2027.`

The item form (`teacher-items.tsx`): `Item`, `Stage` (a select, new items only), `Date (optional)` with the help line `An item with no date keeps a letter, but stays off the line and the calendar.`, then `Save item` and `Cancel`. Items show a lettered circle: solid navy ring when dated, dashed grey ring when not.

The year view (D-5): a horizontal line from the first date to the completion end-stop, with stage numerals and item letters as marks.

The D-10 drawer: a header with a small description line, an `h2` title and a text `Close` button on the right; a scrolling body; 520px wide (`--app-sheet-width`) on desktop.

## Frames to draw, at 390px and 1140px

1. **The date box.** The stage row's date box, with no date yet and with a date, showing that a click opens a calendar (hover, focus, and how it looks clickable rather than only typeable). The same for the item form's date. At 390 the row already stacks.
2. **First-time setup.** No stage saved yet; the teacher has typed Stage 1 but not saved, and opens Stage 2's calendar. Stage 1 shows as "not saved", today and the completion date show, nothing is selected.
3. **A full component.** Six saved stage dates and four dated items across six months; picking Stage 4, which has a date. The drawer opens on Stage 4's month.
4. **A crowded day.** A stage and an item on the same day, and a stage on the completion date itself.
5. **After the completion date.** The completion month, with the days after it greyed out, and what a teacher sees if they try to pick one (nothing happens; how do they know why?).
6. **An item's date.** The drawer opened from the item form, showing the stage dates (some unsaved) and the other items.
7. **Keyboard focus** on a day, on a day that has marks, and on a greyed day.

## Rules that constrain you

- Build on `tokens.css` and the D-1 to D-10 language. Any new colour is a `--app-*` addition to `tokens.css` with measured contrast ratios in `NOTES.md`.
- **No colour-only meaning.** Each mark has a shape or a word as well, the way the timeline's markers do (filled square = stage, hollow circle = teacher item). Saved versus not saved can't be colour alone either.
- **Touch targets:** a day is at least 44px at 390px, at least 24px with 8px spacing (or a named exception) at 1140px. A week of seven 44px days must fit 390px less the drawer's padding; say how.
- Light only. Body 16px, nothing under 12px, `tabular-nums` on dates. Dates "3 Mar 2027". Sentence case.
- **Accessible names are the tests' contract.** Keep these exactly; visible copy may change, these may not:
  - `<stage label> date` (the stage's date box, which opens the drawer, for example `Stage 3 date`)
  - `Date (optional)` (the item's date box, which opens the drawer)
  - Each day's name: its full date, then what's on it, for example `Friday 16 October 2026: Stage 4 (not saved), item B`. A greyed day ends `, after the completion date`.
  - The drawer's title, as above (it names the dialog)
  - `What the marks mean` (the key's list)
  - `Close` (the drawer's close button)
- Focus moves to the selected day (or today) when the drawer opens and returns to the date box when it closes. Escape closes it.
- No spinners: the drawer has all its data already.
- Stage names, item text and dates in the frames are sample content; mark them as such. Use the Biology stage names from D-5.
- Any behaviour change goes in `NOTES.md` under "Open questions". The fixed rules above aren't open.

## Things I want your view on

- **Saved versus not saved.** How light is "slightly different"? It has to be noticed, not alarming.
- **Several marks on one day** in a 44px cell on a phone.
- **A key.** Does the drawer need one, or do the marks explain themselves?
- **The greyed days after the completion date.** How a teacher learns why they can't pick them without reading a paragraph.

## What I want back

1. Two or three rough directions for the calendar at 1140px.
2. After I choose: every frame above at 1140px and 390px.
3. `tokens.css` additions only, with measured contrast ratios.
4. `NOTES.md` on the brief's §8 template, with exact copy and your answers to the four questions above.
5. Frame HTML per state, saved as `docs/design/pilot/D-11-date-picker-drawer/`.
6. Calm and exact. A teacher should see in one glance whether the date they're about to pick is too close to the one before it.
