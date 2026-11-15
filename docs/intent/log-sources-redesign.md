# Intent — log-sources-redesign

Agreed with Tim, 15 Nov 2026, through a review of the live pages, then HTML mockups, then a question-by-question interview. Later steps treat this as settled. Design: `docs/design/pilot/log-sources-redesign/` (`NOTES.md`, then `design/log.html`, `sources.html` and `entry.html`, each drawn at laptop and phone width).

Pages: `/components/[id]/log`, `/components/[id]/sources`, `/components/[id]/log/[entryId]`, and the top of `/components/[id]` (Overview).

## Statement of intent

- **Outcome:** the student's log, sources and log entry pages are rebuilt to the mockups, so they match the rest of the redesigned student side and feel less daunting.
  - **One header on every tab:** the nav row from `/home` (Timeline, then each subject, with the subject you are in as the current one) replaces the "‹ Timeline" back link on Overview, Log and Sources. The title is "Biology" with its subtitle on all three; "Biology log" and "Biology sources" go, and so do the second headings "Your log" and "Your reference list".
  - **Log:** one card per entry with the kind's colour on its left edge, grouped by day under a month heading, so a date is written once. Titles are ink, not bold underlined links. Filter chips with counts: All, Notes, Sources, AI uses. "Teacher can read" stays in words on every entry; Hide becomes a quiet text button. A hidden entry takes the azure "yours" tint the timeline uses.
  - **Log, AI use rows:** the line under the title is what the student wrote in "How you used it", not that label.
  - **Sources:** each reference is a numbered card, with the in-text citation in a grey chip. A flagged source has an "Add it" link straight to its revise page. Copy reference list is the page's one primary button; Copy appendix is secondary. The AI use appendix is a four-column table on a laptop and a stacked list on a phone. "Log an AI use" is a link.
  - **Entry:** a header card in the kind's tint with the chip, title and dates. Facts in two columns; long answers as plain text under their label, with no grey box; the note at the bottom labelled "Notes". History is one line while there is only one revision.
  - **Entry, "In your report":** a card with the in-text citation, the reference-list line and Copy citation, on source and AI use entries. Not on notes.
  - **The teacher's view of an entry** takes the new field layout too, because it is the same code (`RevisionContent` and `LogHistory` in `log-history.tsx`, used by `teacher-log.tsx`).
- **User:** a student keeping their coursework log during the year. A teacher gains only the clearer field layout when they open a student's entry.
- **Why now:** the timeline and the teacher's pages have been redesigned; these are the student pages still in the older "ledger" look. Tim found them usable but inconsistent and a little daunting.
- **Success, checked by hand on a laptop and a phone:**
  - Clicking between Overview, Log and Sources, the top of the page does not change.
  - The log reads as a short list of cards by day, and a chip narrows it to one kind.
  - A flagged source is one click from the form that fixes it.
  - The pages match the mockups.
- **Constraints:**
  - A restyle plus the additions listed here. No backend or API change.
  - The wording of references, citations and every SEC and NCCA quote stays exactly as it is.
  - No new colour token: the mockup's four non-token colours come from the kind tokens with an opacity modifier (see `NOTES.md`).
  - Component specs query by role and accessible name and must keep passing.
- **Out of scope:**
  - Everything below the tabs on Overview. It gets its own redesign later.
  - The new-entry and revise form pages (`/log/new`, `/log/[entryId]/revise`). Another time.
  - The rest of the teacher's pages.
  - The `03/11/2026` date format inside references and the appendix.

## Decisions Tim made

| Question | Answer |
|---|---|
| A redesign, or a pass in code? | HTML mockups first. Claude proposed building straight in code; Tim asked for mockups. |
| Is the mockups' direction right? | Yes. |
| Filter chips on the log? | Yes. |
| Does Overview get the new header? | Yes: its back link becomes the nav row. Nothing else on Overview changes. |
| Do the new-entry and revise form pages change? | No. Leave them as they are; look at them another time. |
| "In your report" on the entry page? | Yes, for sources and AI uses. Not for notes. |
| Does the teacher's view of an entry take the new field layout? | Yes. |

## Left for the plan to settle

- **The teacher's entry opens in a narrower space** inside the log list, so the two-column facts may need to be one column there. Check in the browser.
- **Whether the filter lives in the URL** (`?kind=…`), as the timeline's view does, or in component state.
- **The entry page keeps a back link** ("‹ Biology log") under the nav row, as drawn.
- **Two faults found in the review** are fixed by the mockup's design and need no separate decision: the "Log an AI use" button stretching to full width on a laptop, and its mis-indentation in `ai-appendix.tsx`.
