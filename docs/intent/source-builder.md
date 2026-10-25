# Intent — source-builder

Confirmed with Tim, 25 Oct 2026, through `/interview-me`. Later steps treat this as settled. Backlog #1 (`docs/BACKLOG.md`); roadmap milestone 6B; FR-29 to FR-31.

## Statement of intent

- **Outcome:** each source a student has logged becomes an in-text citation and a reference-list entry, in one consistent format modelled on the NCCA's examples. The student copies one citation, or the whole list, into their report.
- **User:** the student, when writing up. While researching, the same output appears as a live preview in the source form, so a missing detail is visible early.
- **Why now:** sources are recorded since Phase 3 (log entries of kind `SOURCE`, fields in `docs/PILOT-DESIGN.md` §6.7), but the app does nothing with them: students still type every reference by hand.
- **Success:** a student copies a component's complete reference list in one action. A source missing a detail the NCCA asks for (page or chapter, timestamp, author) is flagged on the source and on the list before copying.
- **Constraint:**
  - **Save and flag, never block.** The only hard rule stays the existing one: an online source needs a link and a date accessed (`LogContent.java`).
  - **Formats come from Biology Appendix 1 (NCCA-BIO pp. 14–16, printed page numbers) and Business Appendix Four (NCCA-BUS pp. 20–23)**, which carry the same examples word for word. They are read from the PDFs, never written from memory.
  - **Our own consistent pattern per source type**, not a byte-for-byte copy of the examples (which are inconsistent with each other). The test gate becomes: every detail in each NCCA example appears in our output, in the NCCA's order. The plan lists every difference from the examples.
- **Where:** a Sources page per component (roadmap §6, `/components/[id]/sources`), linked from the component page. The log stays the place to add and edit a source. The list includes hidden sources: visibility only decides what the teacher sees.
- **Out of scope:** AI uses in the list (a backlog row of its own, `ai-use-record`); any teacher view of the list; linking notes to sources (FR-32); new source fields such as edition; enforcing a formal style (FR-31); refusing to save an incomplete source.

## Decisions made in the interview

| Question | Answer |
|---|---|
| Copy-out at write-up, or nudging during research? | Both: the formatted output is shown live in the source form, so the copy-out is also the nudge. No separate checking system. |
| Block saving an incomplete source, or save and flag? | Save and flag. The NCCA's wording is soft ("if necessary, the page number"), and blocking would stop students logging sources mid-research. |
| AI uses in the reference list? | Not now. Sources only; `ai-use-record` goes on the backlog. Its fields need checking against the SEC's Coursework Rules and Procedures, and it adds an appendix block. |
| Reproduce the NCCA examples exactly, or one consistent pattern? | One consistent pattern per type, clearly modelled on the examples and within the guidelines. |
| Does the teacher see the formatted list? | No, student only. The teacher already sees visible sources in the log, and the real list in the report through the document link. |

## Left to the plan

- List order. Best guess: alphabetical by the entry's first word (author, or title when there is no author).
- Where the formatter lives (Java domain or TypeScript in `lib/`), and whether the API returns formatted strings.
- Which details count as "missing" for each type, taken from the appendix's "How students should reference different sources".
