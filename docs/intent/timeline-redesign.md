# Intent — timeline-redesign

Agreed with Tim, 12 Nov 2026, through a review of the live `/home` page and then HTML mockups. Later steps treat this as settled. Design: `docs/design/pilot/timeline-redesign/` (`NOTES.md`, then `design/timeline.html`, `week.html`, `month.html` and `add-item.html`, each drawn at laptop, iPad and phone width).

Tim asked for this doc and the plan to be written straight from the mockups, so there was no separate question-by-question interview. The decisions he made are in the first table below; the ones the mockups left open, which Claude chose, are in the second, so he can overrule any of them before the build.

## Statement of intent

- **Outcome:** the student's `/home` page becomes a planner as well as a list of dates.
  - **Next up:** a navy card. What is due is the big text; the date is a calendar leaf, gold when it is today; an "After that" line names the next three things.
  - **Timeline (default view):** one rail from this week to the end of the school year, grouped as This week, Next week, then by month, with a gold Today line between past and upcoming. Stage dates are navy squares on the rail and the SEC completion date ends it.
  - **Week:** seven day columns on a laptop, day rows on an iPad or phone. Every day from today on has its own Add button. An "After this week" list shows what follows.
  - **Month:** a real calendar with a coloured chip per item, each a link, and today in gold. On a phone the chips become marks and the picked day's items list underneath.
  - **Add my own item:** a primary button beside the page heading on every view. It opens a drawer: from the right on a laptop, from the bottom on a phone. Kind is four buttons; the date has Today, Tomorrow and Next Monday shortcuts.
  - **Done tick:** a student can tick their own items done. A ticked item stays in place, struck through.
- **User:** a Leaving Cert student, on a laptop, an iPad or a phone, checking what is due and keeping their own tests, essays and deadlines beside their coursework dates.
- **Why now** (Tim, 12 Nov 2026):
  - List and Week were the same view with different date windows.
  - The month view was a bare table of truncated text, and the side calendar beside it repeated it and could not be clicked.
  - Next up made "in 5 days" the biggest text on the page and the thing itself small.
  - Previous and Next were text links.
  - Add my own item sat under the whole list.
  - Nothing showed how one date leads to the next.
  - Tim wants students to use this page as their weekly planner, so adding their own items has to be easy and prominent.
- **Success, checked by hand:**
  - A student can say what is due this week without scrolling, in the Week view, at all three widths.
  - Adding "French test, tomorrow" takes the header button, a title, one tap on Test, one tap on Tomorrow, and Save.
  - Ticking an item done strikes it through at once, and Next up moves on to the next thing not done.
  - The Timeline view shows every stage date up to the SEC completion date on one page.
  - At 390, 820 and 1440 wide nothing is clipped, nothing scrolls sideways, and every control is reachable by keyboard.
- **Constraints:**
  - A student's own items stay private. The done flag lives on `personal_item` and is only read through `PersonalItemRepository` and the timeline's own query, with the owner.
  - No new colour values: the mockups use existing `--app-*` tokens only.
  - The view and the date stay in the URL (`?view=…&from=…`), so Back and shared links keep working.
  - Kind is carried by shape and a word as well as colour.
  - shadcn primitives first: the existing `Drawer`, `ToggleGroup` and `Button`.
- **Out of scope:**
  - Ticking a teacher's item from this page. The tick already exists on the component page (`item_tick`); showing it here is a small follow-up, not part of this build.
  - Times of day, reminders, notifications, repeating items.
  - New kinds of own item (Homework, for example). The four kinds stay.
  - What teachers see. Nothing here is visible to a teacher.
  - A year line per subject across the top (the teacher's `YearLine`). Considered and left out: unreadable on a phone.
  - The student's component page.

## Decisions Tim made

| Question | Answer |
|---|---|
| How many views? | Three: Timeline, Week, Month. Claude first proposed dropping Week; Tim kept it and asked for it to be a planner. |
| Which devices? | Laptops, iPads and phones, all three. |
| Month view? | A real calendar: coloured chips with the subject edge, today highlighted, each chip a link. |
| Previous and Next? | Chevron icon buttons plus a Today button. |
| Where does Add my own item go? | Top right, beside the heading, opening a drawer. |
| Styling? | The newer look from the stage drawer and the teacher's student page: more colour, things that stand out. |
| A done tick on own items? | Yes. |

## Decisions Claude made from the mockups (overrule any of them)

| Question | Choice | Why |
|---|---|---|
| Can teacher items be ticked here? | No, own items only | Matches the mockups Tim approved. Correction to what Claude said in chat: the backend for this already exists (`item_tick`), so adding it later is cheap. |
| What happens to a ticked item? | It stays in place, greyed and struck through, with a "Done" pill. Next up skips it | A planner that hides finished work can't be checked back over. |
| Where does Delete go? | Into the edit drawer. Rows and the Next up card show only Edit | Two buttons on every own item crowded the rows. Delete still confirms. |
| How far does the Timeline view reach? | From the Monday of this week to 31 August. "Show earlier" starts it at 1 September | One page shows the whole run to the completion date. The API's 100-day cap rises to 366 for this. |
| What do azure and gold mean now? | Azure also means "your own item"; gold marks today on this page | They meant "your pick" and "today" in the date drawer only. `UI-STANDARDS.md` §5 is updated to say so. |
| The side mini-calendar and its toggle? | Removed, with the `calendar` URL parameter | The Month view replaces it. |
| Old `?view=list` links? | They open the Timeline view | No bookmark breaks. |
| The side card's "3 of 6 stages signed off"? | Left to the plan: built only if `/me/components` already returns the counts | No new endpoint for a decoration. |

## Left to the plan

- The migration, the endpoint and the response fields for the done flag.
- How the page loads Next up when the Week or Month view is on another date.
- The accessible names and roles: the tick (a checkbox named for its item), the per-day Add buttons, the month grid, the picked day on a phone.
- Which existing specs and the `phase2` e2e journey change.
- How `timeline-view.tsx` (235 lines, three views in one file) is split.
