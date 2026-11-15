# Timeline redesign — design notes

Page: `/home` (the student's timeline). Drawn 12 Nov 2026 after a review of the live page with Tim. Intent: `docs/intent/timeline-redesign.md`. Plan: `docs/superpowers/plans/2026-11-12-timeline-redesign.md`.

`design/` holds plain HTML frames. Open them in a browser; each is responsive, and has a PNG beside it at 1440 (laptop), 820 (iPad) and 390 (phone). `blocks.js` fills every frame with Tim Mc Sweeney's real `/home` data from 12 Nov 2026. Two items are invented, to show a week used as a planner: "English essay, first draft" and "French vocab test".

| File | What it is |
|---|---|
| `timeline.html` | The Timeline view: one rail from this week to the SEC completion date |
| `week.html` | The Week view: a planner, seven columns on a laptop and day rows below that |
| `month.html` | The Month view: a calendar of chips; marks and the picked day's list on a phone |
| `add-item.html` | Add my own item, in a drawer (laptop and phone PNGs only) |

## What it is

- **Next up:** the navy card. The thing due is the heading; the date is a calendar leaf, gold when it is today; "After that" names the next three.
- **Three views** behind one switch: Timeline, Week, Month. Week and Month have chevron buttons and Today.
- **Add my own item:** the primary button beside the heading, opening a drawer. Kind is four buttons; the date has Today, Tomorrow and Next Monday.
- **Done tick:** an open azure circle on each of the student's own items; green and struck through when ticked.
- **Colour, with a shape for each kind:** navy square for a stage date, a ring in the subject's colour for a teacher's item, an azure diamond for the student's own, gold for today, amber for the next seven days, green for done.

## Colours that are not tokens

`mock.css` says every colour is an existing `--app-*` token. Five are not: `#EEF6F7` (a teacher chip's ground), `#C9DFEF` (an own item's border), `#FFFBEF` (today's cell), `#06456E` (an own chip's text) and `#6B4A00` (the Today label). The build uses none of them. It uses existing tokens, with a Tailwind opacity modifier where a lighter one is needed (`border-app-pick/25`, `bg-app-today/10`), and adds no colour token.

## Where the build differs from the mockup

See the table of the same name at the end of the plan. This section is filled in from it when the build is done (plan Task 12).
