# Intent — ai-use-record

Confirmed with Tim, 25 Oct 2026, through `/interview-me` (Tim's name for it was "AI builder"). Later steps treat this as settled. Backlog #2 (`docs/BACKLOG.md`); roadmap milestone 6A; builds on `source-builder` (`docs/intent/source-builder.md`).

## Statement of intent

- **Outcome:** each AI use a student has logged becomes an in-text citation and a reference-list entry, shaped like the NCCA's examples, and a row in the SEC's AI appendix table. The student copies them into the report instead of typing them.
- **User:** the student, when writing up. Student only, no teacher view (as in source-builder).
- **Why now:** AI uses are recorded since Phase 3 (log entries of kind `AI_USE`, fields in `docs/PILOT-DESIGN.md` §6.7), but the app does nothing with them. Source-builder left an `AI_NOT_YET` line on the Sources page for exactly this.
- **Where:** the Sources page (`/components/[id]/sources`).
  - AI entries are merged into the **one** reference list, each with an **"AI" badge** and its own Copy citation.
  - Below it, an **"AI use appendix"** section with its own Copy button.
  - The greyed-out "AI use" tab in the component tabs is removed.
  - Hidden AI uses are included, as hidden sources are: visibility only decides what the teacher sees.
- **Appendix shape:** four columns, matching SEC Rules Appendix 2 §5 (p. 35) minus its first column: **AI tool · Developer · Date of use · Purpose**. Each use's prompt(s) and share link are listed under its row, because the SEC says they "should also be included in the appendix" (p. 34).
- **Success:** a student copies a component's full reference list (sources and AI uses) and the appendix block in two actions. An AI use with **no share link and no prompt** is flagged before copying.
- **Constraint:**
  - Formats come from NCCA Biology Appendix 1 (NCCA-BIO pp. 15–16, printed page numbers; the same examples in Business Appendix Four) and SEC Coursework Rules and Procedures 2025–26 Appendix 2 (SEC-RULES pp. 34–35). They are read from the PDFs, never written from memory, and become the formatter's test fixtures.
  - Save and flag, never block. What is required to save an AI use doesn't change (`LogContent.aiUse`: tool, developer, date, how used).
  - No backend field changes.
- **Out of scope:** a new "kind of use" field or fifth appendix column; a teacher view; a separate AI-use page; changing what is required to save an AI use; detecting AI-generated text in reports.

## Decisions made in the interview

| Question | Answer |
|---|---|
| Is "AI builder" backlog #2, `ai-use-record`? | Yes: the AI appendix plus reference entries from logged AI uses. |
| Which outputs: citation, reference entry, appendix table? | All three. The briefs say to acknowledge AI "as outlined in Appendices 1 and 2", so the student needs the NCCA reference and the SEC appendix. |
| Same Sources page, or a separate AI-use page? | Same page, with AI entries clearly labelled as AI. |
| Everything on Sources (A), or the reference list on Sources plus a real "AI use" tab for the appendix (B)? | A: everything on Sources, an AI badge on each AI entry, the appendix section below, the greyed tab dropped. |
| Add the SEC example's "Example of AI use" column? | No. Four columns from the fields we have; no new field. |
| Prompts and share link in the appendix? | Listed under each row, not as extra columns. |

## Facts found while interviewing

- The SEC's "minimum acknowledgment requirements" are tool name and version, developer, date generated, how used (p. 34). The backend already requires all four, so the only detail that can be missing is the NCCA's: "Where an AI tool does not generate a sharable URL, student should include the name of the tool and the prompt used."
- The NCCA gives an AI in-text citation for each case, with and without a shareable URL (p. 15), and a reference entry for each case (p. 16).

## Left to the plan

- Where an AI entry sorts in the merged list. Best guess: by its first word, like sources (the developer).
- How the reference entry's year is chosen (the NCCA example's "(2023)" matches the date generated).
- Plain-text shape of the appendix block when copied (one block per use, or a tab-separated table that pastes into Word as columns).
