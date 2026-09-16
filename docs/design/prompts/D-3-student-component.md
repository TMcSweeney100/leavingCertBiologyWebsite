# Claude Design prompt: pack D-3 (student component page)

Edit freely, then paste everything below the line into Claude Design, **in the same project as D-1 and D-2** so it keeps the Navy direction. Attach:

- `docs/design/UI-BRIEF.md` (the brief; §5 is the Navy system);
- `docs/design/pilot/D-1-app-shell-auth/tokens.css` (the tokens it must build on);
- screenshots of the live BiPi schedule at a phone and a laptop width (the "You are here" panel, a current and a done stage card, the report-section table, report rules, marks);
- a screenshot of the D-2 class page frame, for the header and tab row.

Sources: `docs/PILOT-ROADMAP.md` §6.1–§6.2 (`/components/[id]` row), `docs/PILOT-DESIGN.md` §4.2–§4.6, §6.2–§6.5, §7.2–§7.3 and §8.3, and the live BiPi components in `frontend/components/bipi/`. Needed for build milestone **2E**.

---

I'm designing the next page of the Leaving Cert coursework app. You designed packs D-1 (app shell and sign-in) and D-2 (teacher class pages) in direction **2e "Navy"**, and that direction is now the app's visual system. The attached `UI-BRIEF.md` describes it (§5) and `tokens.css` holds its values. **Build on them; don't start a new palette.** If a token is missing for something this page needs (a "current stage" colour, a "done" colour), add it to `tokens.css` with its measured contrast and say why in `NOTES.md`.

This pack is one page: **the student's component page**, `/components/[id]`. It's the page a student opens to see where they are in one subject's coursework. Think "Biology coursework, for me, right now."

Please give me **two or three directions for the top of the page** (the current stage and what's due) as rough frames first. After I pick one, build every state below at **390px and 1140px**. Students use this mostly on phones, but also a lot on school laptops and tablets, so the laptop frame should be a real layout, not a stretched phone.

## What a "component" is

Each Leaving Cert subject in this pilot has one assessed coursework component. A teacher sets one up for their class from the SEC's brief for that exam year (pack D-5), so a student has one component page per subject they're doing.

A component has:

- **Stages**, in order. Science subjects have 6. Business has 6 plus a final unnumbered one, "Compilation of the final report". Each stage has a name, a short description from the national guidelines, indicative hours (display only, e.g. "2–3 hours"), and **a due date the class's teacher set**. Stage names are national and can't be renamed.
- **Checkpoints**, the moments the guidelines say a student shares work with the teacher (e.g. "Plan discussed with the teacher"). Zero or one per stage. **Only the teacher can sign one off**, and the student sees the state: not due yet, due and not signed off, or signed off (with the date).
- **Teacher items**: the teacher's own to-dos inside a stage, some with their own date (e.g. "Full draft in for feedback", 4 Dec). **The student can tick these**, and the page must say that a tick is self-reported ("You ticked this" or similar), because it isn't the teacher's word.
- **Prompts**: the guidelines' own sample questions for some stages, shown read-only as help ("How might I learn more about this theme?").
- **Report sections**: the numbered sections of the written report (science has 7) and which stage each one is written during.
- **Report rules**: word limit, image limit, formatting, AI-use declaration.
- **Mark bands**: how the report is marked. They don't line up one-to-one with sections (e.g. Band D, 50 marks, covers the whole report).
- **A process note**: the guidelines say the stages aren't strictly linear and students move back and forth. The page must never suggest a student is locked into a sequence.
- **The completion date**: the SEC's date the finished coursework must be with the teacher. **It isn't the same as the stage dates**, which are the class's own plan. The page has to make that difference clear, as the BiPi site does ("Class schedule, not an official SEC date").

## Sample content

Use this for the frames. **It is sample content for layout only.** The live app loads the real wording from the SEC and NCCA documents, so mark any wording you add yourself as placeholder.

- **Subject:** Biology, 2027 brief, "Biology in Practice Investigation". Topic: "Membranes, Osmosis & Food Preservation". Completion date **26 February 2027**. 200 marks, 40% of the grade.
- **Stages** (titles as on the live BiPi site): Stage 1 Initial Response to the Brief · Stage 2 Background Research · Stage 3 Designing & Planning the Experiment · Stage 4 Conducting the Experiment · Stage 5 Data Analysis & Conclusions · Stage 6 Finalising the Report. Indicative hours: 1–2, 2–3, 2–3, about 1–2 per lab session, 1–2, up to 4.
- **Stage dates** (placeholders a teacher would set): Stage 3 25 Sep 2026, Stage 4 16 Oct, Stage 5 20 Nov, Stage 6 22 Jan 2027. Stages 1–2 done in 5th year.
- **Checkpoints** (working wording): Stage 1 "Initial ideas discussed with the teacher" · Stage 2 "Investigative log shared with the teacher" · Stage 3 "Plan discussed with the teacher (feasibility and safety)" · Stage 4 "Experiment carried out under supervision, in line with the research and planning already shared" · Stage 5 "Data analysis shared with the teacher" · Stage 6 "Final report submitted to the teacher".
- **Teacher items** (sample): in Stage 4 "Book a re-run slot if your data needs it"; in Stage 6 "Full draft in for feedback" (4 Dec 2026) and "Catch-up window closes" (dated).
- **Report sections:** §1 Title and Introduction · §2 Background Research · §3 Designing and Planning · §4 Conducting the Experiment · §5 Data and Data Analysis · §6 Conclusions · §7 References.
- **Rules:** Length 1,500 words maximum (references, data tables, formulae and labels don't count) · Images 20 maximum · Font Arial, black text only · Headings 14pt bold, each section on a new page · Body text 12pt at 1.5 line spacing · Margins 20mm, portrait · Page numbers bottom centre · AI use must be declared.
- **Mark bands:** A 50 (Title, Introduction, Background Research, References) · B 50 (Designing and Planning, Conducting the Experiment) · C 50 (Data and Data Analysis, Conclusions) · D 50 (Scientific Literacy, the whole report).

Show one frame where the subject is **Business** too, so the layout copes with 6 stages plus "Compilation of the final report", a stage without a checkpoint (Business Stage 6), and 5 report sections with suggested word counts (200 / 400 / 600 / 300). Business stage names from the NCCA guidelines: Stage 1 Getting Started · Stage 2 Developing a question to research · Stage 3 Developing a project plan · Stage 4 Identifying sources and gathering information and data · Stage 5 Analysis and evaluation · Stage 6 Applying learning and drawing conclusions · Compilation of the final report. Stages 4 and 5 share one estimate, "6–8 hours together".

## The page

**Header:** the D-1 app header. **Inside the component**, a tab row like D-2's: **Overview** (this page) · **Log** (Phase 3) · **Sources** · **AI use** · **Word checker** (Phase 6). Only Overview works yet; show the rest disabled, as D-2 did, and don't design them.

**What the student needs first (the brief's "answer first"):** which stage they're in, what's due, and how many days until that stage's date. Then the rest, progressively disclosed: the current stage open, other stages summarised, done stages quiet.

**Per stage**, when open: description, hours, due date, the checkpoint and its state, the teacher items with tick boxes, and the prompts. Your call how prompts are shown (a disclosure inside the stage, say). They're help, not tasks, and mustn't look like a checklist.

**Actions:** tick and untick a teacher item. That's the only action on this page. It must work with one thumb, show the new state straight away, and say it's self-reported.

**States to draw** (each at both widths):

1. **Mid-term, normal:** Stage 4 current, Stages 1–3 done (Stage 3's checkpoint signed off on 24 Sep), one teacher item ticked.
2. **A due checkpoint not signed off:** Stage 3's date has passed and its checkpoint isn't signed off. It's the student's cue to talk to their teacher. Make it noticeable without alarm, and don't blame.
3. **Before the first stage:** nothing is due yet; show the first date and the countdown to it.
4. **No dates set yet by the teacher:** the component exists but the teacher hasn't entered stage dates. Stages and content still show; the page says dates are coming from the teacher.
5. **After the completion date:** everything past; the page is a record, not a countdown.
6. **Business**, as above, mid-term.
7. **Ticking a teacher item**, the moment of ticking (your one motion moment is likely here or on the current stage).
8. **The shared error panel** from D-1, for a failed load and a failed tick.

## Reusing the BiPi components: a decision I want your view on

The public BiPi schedule already has components that do much of this: the "You are here" panel with a countdown, stage cards with Now / Done / Upcoming pills, the report-section table with a live status column, the rules list and the marks card. The original plan was to reuse them on this page.

But the app has since moved away from BiPi's look. BiPi uses a blue `#4662B9` to mean "now" and green `#1A7F51` to mean "done", on warmer neutrals with 12px radii. Please show me, side by side for state 1 at 390px, two versions:

- **A. Reuse as-is:** BiPi's components and colours inside the Navy app shell.
- **B. Restyle in Navy:** the same structure (you-are-here, stage cards, crosswalk, rules, marks) rebuilt with the app's tokens, adding app tokens for "current" and "done" if needed.

Recommend one in `NOTES.md`. Whichever you choose: the accent navy must never be the "current stage" marker (it's the primary action colour), amber stays reserved for pending work, and "current" and "done" are always also words, never colour alone.

## Rules that constrain you

- Build on `tokens.css` and the D-1/D-2 component language: field groups, message blocks with a 4px edge, white cards with hairlines, the subject edge bar.
- Light only. Body and inputs 16px; nothing under 12px.
- Sentence case. Buttons name the outcome. No icon-only buttons except where D-2 already agreed one. Nothing that only works on hover.
- Dates in the form "16 Oct 2026". Counts as numerals ("12 days").
- These labels will become the automated tests' contract. They're proposals, so improve them if you can, and put the change in `NOTES.md` under "Open questions": tab names above; state words **Done**, **Now**, **Upcoming**; checkpoint states **Signed off**, **Not signed off yet**; the self-report wording on a tick.
- Anything you think should change about the page's behaviour (a new state, an action I haven't listed, something that belongs on another page) goes in `NOTES.md` under "Open questions". Justified suggestions are welcome.

## What I want back

1. Two or three rough directions for the top of the page (current stage, due, countdown) at both widths.
2. The A/B comparison of the BiPi components, with a recommendation.
3. After I choose: every state above, both widths, plus the error panel.
4. `tokens.css` additions only (don't repeat D-1's) and a `NOTES.md` on the brief's §8 template, with exact copy and measured contrast for anything new.
5. It should look sleek, modern and calm. A 17-year-old should want to open it, and a teacher should be happy to show it to a principal.
