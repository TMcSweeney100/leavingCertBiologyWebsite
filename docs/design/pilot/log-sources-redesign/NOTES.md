# Log and sources redesign — design notes

Pages: `/components/[id]/log`, `/components/[id]/sources` and `/components/[id]/log/[entryId]` (the student's side). Drawn 15 Nov 2026 after a review of the live pages with Tim. A first draft for Tim to react to: nothing here is agreed, and there is no intent or plan yet.

`design/` holds plain HTML frames. Open them in a browser; each is responsive, and has a PNG beside it at 1440 (laptop) and 390 (phone). The data is Tim Mc Sweeney's real log from 15 Nov 2026. The two October entries on the log are invented, to show a second month, an edited entry and a hidden one.

| File | What it is |
|---|---|
| `log.html` | The log: filter chips, entries grouped by day under a month heading, one card per entry |
| `sources.html` | The reference list as numbered cards, and the AI use appendix as the table that gets pasted |
| `entry.html` | One log entry (a source): a header in the kind's tint, facts in two columns, notes as plain text |

## What changes

- **One header on every tab.** The nav row from `/home` (Timeline, Biology) with the subject as the current one; "Biology" and its subtitle as the title on Overview, Log and Sources alike. "Biology log", "Your log" and "Your reference list" go.
- **Log:** entries are cards with the kind's colour on the left edge, grouped by day so a date is written once. Titles are ink, not underlined links. Filter chips with counts. "Teacher can read" stays in words on every entry; Hide becomes a quiet text button. A hidden entry takes the azure "yours" tint from the timeline.
- **Log, AI use:** the line under the title is what the student wrote in "How you used it", not the label.
- **Sources:** each reference is a numbered card; the in-text citation sits in a grey chip so it reads as the thing you copy. A missing detail gets an "Add it" link straight to the revise page. One primary button on the page (Copy reference list); Copy appendix is secondary. The appendix is a four-column table on a laptop. "Log an AI use" is a link, not a full-width bar.
- **Entry:** the header is a card in the kind's tint. Long answers are plain text under their label, with no grey box. The note at the bottom is labelled "Notes". History is one line while there is only one revision.

## Additions to decide on

- **"In your report" on the entry page**, with Copy citation. It is the form's live preview (`source-preview.tsx`) shown on the saved entry. New behaviour, not a restyle.
- **Filter chips on the log.** The teacher's view of a student's log already has them.

## Colours that are not tokens

`mock.css` uses four: the left edges of an entry card (`#B9C0C8` note, `#A9AD6B` source, `#C79ABD` AI use) and the border of the entry page's header (`#E2E4C8`). The build should get these from the kind tokens with an opacity modifier, and add no colour token.
