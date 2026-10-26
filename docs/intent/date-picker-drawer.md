# Intent — date-picker-drawer

Confirmed with Tim, 25 Oct 2026, through `/interview-me`. Later steps treat this as settled. It started as `teacher-item-ticks` (the teacher sees who ticked each item); Tim moved to the Component tab's dates first, and the ticks question is parked for the stage sheet.

## Statement of intent

- **Outcome:** every date box on the teacher's Component tab (`/teach/classes/[id]/component`) opens one right-hand drawer holding a calendar that shows where the date being picked sits among all the component's other dates. That covers the six stage dates and an item's date when adding or editing it.
- **User:** the teacher, both the first time they set up a component and every edit after.
- **Why now:** the polishing phase. The browser's own date picker (`<input type="date">` in `stage-dates-form.tsx` and `teacher-items.tsx`) can't show any other date, and the year view reads the saved stages only, so it stays empty until the first Save.
- **On the calendar:**
  - every stage date, saved or not; unsaved ones drawn slightly lighter and labelled "not saved"
  - every dated teacher item
  - today
  - the brief's completion date, with every day after it greyed out and not pickable
  - the months from today to the completion date, opening on the month that matters (the stage's or item's current date, else today)
  - every mark carries a short word, never colour alone
- **Behaviour:**
  - Picking a day fills the date box and closes the drawer. The existing Save buttons, the out-of-order warning and the completion-date error stay as they are.
  - The calendar reads the form's `draft`, so a date picked but not yet saved shows when the next box is opened. `draft` keeps its existing reset rule (copied from the saved stages when they change), never reset on opening the drawer, which would wipe unsaved dates.
  - Focus moves into the drawer, is trapped there, and returns to the button that opened it. Escape closes it.
  - A small typed-date box in the drawer, for anyone who'd rather type than arrow across months.
  - Full width on a phone.
- **Built as:** its own calendar component (shadcn Calendar, restyled to `--app-*`), placed inside the existing right-hand `components/ui/drawer.tsx`. The later stage sheet will hold the same component directly, with no second drawer on top.
- **Small extra:** the year view reads `draft` too, so unsaved dates show there as well.
- **Success:** setting up a component for the first time, the teacher sees the whole spread of dates while choosing each one, without pressing Save first.
- **Out of scope:**
  - the stage sheet (clicking a stage heading opens a right-hand sheet with its items), the next step after this
  - showing the teacher who ticked each item (parked; returns with the stage sheet)
  - school holidays and mid-term (no school calendar; FR-47 is out of the pilot)
  - saving as soon as a day is picked
  - any backend change

## Decisions made in the interview

| Question | Answer |
|---|---|
| A calendar-first page, a richer picker, a stage timeline with a sheet, or a setup wizard? | Start with the picker: a right-hand drawer with the calendar. The stage sheet comes later, built on it. |
| Which side do the panels open from? | Both from the right. A left-hand panel reads as navigation. |
| One drawer, or a calendar component? | Its own component, so the stage sheet reuses it without stacking a second drawer. |
| Stage dates only, or items too? | Both. |
| Does picking a day save? | No. It fills the box; the page's Save stays. Stage dates are a batch, and a new item doesn't exist yet when its date is picked. |
| Do unsaved dates show on the calendar? | Yes, slightly different from saved ones. |
| What else is on the calendar? | Stage dates, dated items, today, the completion date with later days greyed. No holidays. |
| The year view's empty-until-saved problem? | Fixed in the same change: it reads `draft`. |

## Left to the plan

- How many months show at once, and how they scroll on a phone.
- Exactly how a saved mark differs from an unsaved one, and a stage mark from an item mark (a design question for a Claude Design pack, D-11).
- Whether the typed-date box replaces the drawer's trigger on the page, or sits only inside the drawer.
- Which existing specs query the date inputs by role and name, and how they keep passing.
