# BiPi Schedule Hub — Website Specification

**What this doc is:** a build spec for a small, live schedule site replacing the static poster, for 6th Year Biology students doing the Biology in Practice Investigation (BiPi). Hand this to Claude Code (alongside the design output — see the companion design brief) to implement.

**Sources used:** the existing poster draft (`BiPi_Schedule_Poster.html`) and the official SEC "Biology in Practice Investigation" brief (2027 Leaving Cert Biology, coursework brief).

---

## 1. Assumptions & flags (read this first)

- **Deadline correction:** the official brief states the coursework must be submitted to the class teacher by **26th February 2027**, not the 27th. The poster's footer already has this right (26 Feb 2027) — just flagging the discrepancy against the voice note.
- **Stack:** recommending **Next.js (App Router) + React + shadcn/ui, deployed on Vercel.** Reasoning: it's a purely static content site with one dynamic bit (today's date), Next.js/Vercel is the path of least resistance for that, and it overlaps with what you're already building. A plain Vite + React SPA would also work fine and is lighter if you'd rather skip Next.js entirely for something this simple — either is a reasonable call, just pick one before handing to Claude Code.
- **No login, no accounts.** This is a public/semi-public reference page (link shared by the teacher), not a portal. Flag if the school wants it access-gated instead.
- **No analytics/tracking by default.** The audience is minors. If you want visit stats later, use something cookieless (e.g. Vercel Analytics), and say so — don't add it silently.
- **Content is config-driven, not hardcoded**, so the same site can be reused next year with new dates without touching layout code.

---

## 2. Purpose

A single-page, mobile-first schedule that tells a student, parent, or teacher **at a glance**: what stage we're at right now, what's due next, and — critically — which part of the final written report should be finished by that point. It replaces a static poster with something that stays current automatically as the term progresses.

## 3. Audiences

| Audience | What they need | Primary device |
|---|---|---|
| Student | "Where am I supposed to be right now, and what exactly do I hand in?" | Roughly even split: school laptop / phone |
| Parent | "Is my kid on track, and what am I actually meant to help with (nothing — see below)?" | Phone/laptop |
| Teacher | A moderation reference she can point students/parents to instead of re-explaining dates | Laptop, projected in class |

## 4. The stage ↔ report crosswalk (core content)

This is the piece that isn't in the current poster and is the main reason a static poster isn't enough: the girlfriend wants each **investigation stage** tied explicitly to the **report section(s)** due at that point. Pulled from Section 4 (six stages) and Section 6 (seven-part report structure) of the official brief:

| Investigation stage | Due by | Report section(s) due | Report section name(s) |
|---|---|---|---|
| Stage 1: Initial Response to the Brief | *Done, 5th Year* | — | — |
| Stage 2: Background Research | *Done, 5th Year* | — | — |
| Stage 3: Designing & Planning the Experiment | 25 Sept 2026 | §3 | Designing and Planning |
| Stage 4: Conducting the Experiment | 16 Oct 2026 | §4 | Conducting the Experiment |
| *(Catch-up window)* | 30 Oct 2026 | — | — |
| Stage 5: Data Analysis and Conclusions | 13 Nov 2026 | §5, §6 | Data and Data Analysis; Conclusions |
| Stage 6: Finalising the Report | 4 Dec 2026 (draft/feedback/revise) → 11–12 Dec 2026 (final) | §7 + full clean-up | References + proofreading, formatting check, referencing (incl. any AI tool use, which must be declared per SEC rules) |

Note §1 (Title and Introduction) and §2 (Background Research) map to Stages 1–2, already completed — include them in the crosswalk table for completeness even though they're marked done, so the full picture (all 7 report sections, all 6 stages) is visible in one place.

Every stage card on the site should carry a small "Report §X due" badge so this mapping is visually obvious, not just implied by proximity.

## 5. Page structure (single page, sections)

1. **Header** — title, "40% of the Biology grade" badge, one-line framing.
2. **"You are here" banner** — computed live from today's date against the stage date ranges. Shows current stage name, days remaining to its deadline, and a short "what's due" line. This is the single biggest upgrade over a static poster.
3. **Completed strip** — Stages 1–2, marked done (static, doesn't need to be dynamic — they're always done by the time this site matters).
4. **Timeline** — one card per stage (3 → 6, including the catch-up window), each showing: week range, absolute date, stage name, plain-English description, teacher checkpoint callout, and the report-section badge(s) from the crosswalk table above.
5. **Audience strip** — three short cards: for students / for parents / for teachers, matching the poster's existing copy (it's already good — reuse it near-verbatim).
6. **Footer** — SEC deadline (26 Feb 2027), a note that ~10 weeks of buffer remain after the 11–12 Dec finish target, and a line making clear this is the class's internal schedule, not an official SEC date.

## 6. Functional requirements

- **Live "current stage" logic**: compare `today` against each stage's date range; mark stages as `done` / `current` / `upcoming`. This drives both the banner (§5.2) and the visual state of each timeline card (e.g. current stage highlighted, done stages checked off, upcoming stages muted).
- **Countdown**: days remaining to the current stage's deadline, shown in the banner.
- **Fully static otherwise** — no forms, no submissions, no write access. This is a read-only reference page.
- **Responsive**: build mobile-first since it's the simpler baseline to get right, but treat laptop/desktop as equally important — usage is expected to split roughly evenly between school laptops and phones, not phone-dominant.
- **Shareable single URL.** Optionally generate a QR code pointing at it, for printing on an actual classroom noticeboard (nice-to-have, not core).

## 7. Data model

Keep all schedule content in one typed data file so dates can be edited without touching layout code — this is what makes the site reusable for next year's cohort.

```ts
type ReportSection = { number: number; name: string };

type Stage = {
  id: string;                 // "stage-3"
  order: number;
  label: string;               // "Stage 3"
  title: string;                // "Design & plan the experiment"
  weekRange: string;            // "Weeks 1–4"
  dueDate: string;               // ISO date, "2026-09-25"
  rangeStart?: string;            // ISO date, if the card spans a range (used for "current" detection)
  description: string;
  teacherCheckpoint: string;
  reportSections: ReportSection[]; // [] for stages with no report deliverable yet
  isCatchup?: boolean;
  isDone?: boolean;              // true for Stage 1 & 2, hardcoded rather than date-derived
};
```

Current-stage detection: iterate stages in order, find the first whose `dueDate` is today-or-later and whose `rangeStart` (or previous stage's `dueDate`) is today-or-earlier. Anything after the SEC deadline or before the school year start should just fall back to "upcoming" / "done" gracefully rather than erroring.

## 8. Non-functional requirements

- **Privacy**: no accounts, no tracking, no data collection. Static content only.
- **Accessibility**: WCAG AA contrast minimum, works without JS for the core content (progressive enhancement — the "you are here" logic can hydrate in, but the full timeline with dates should still be readable if JS fails).
- **Performance**: this is a handful of cards and some CSS — should be near-instant on any connection.
- **Print**: not a hard requirement for the site (that's what the original poster was for), but worth keeping in mind if a physical noticeboard copy is ever wanted again — a print stylesheet is cheap to add.

## 9. Out of scope (v1)

- Student accounts / progress tracking / submissions
- Editing dates through a UI (edit the data file directly and redeploy)
- Content for the investigation topic itself (Membranes, Osmosis, Food Preservation) — this site is about *when*, not *what*
- Multi-class or multi-teacher support (single cohort, single schedule)

## 10. Optional phase-2 content (from the official brief, not required for v1)

The official brief has a few more blocks of genuinely useful reference content that could be added later as a collapsible "report rules" section, if wanted:

- **Word/image limits**: report ≤1500 words (excludes references, data tables, formulae, labels); ≤20 images.
- **Formatting rules**: Arial, black text only, 14pt bold section headings (each starting a new page), 12pt body at 1.5 line spacing, 20mm margins all round, portrait only, page numbers bottom-centre. No colour, no highlighting, no other fonts.
- **Mark allocation** (200 total): A — Title/Intro/Background/References (50); B — Designing & Planning + Conducting (50); C — Data & Analysis + Conclusions (50); D — Scientific Literacy, assessed throughout rather than as its own section (50).

None of this is needed for the schedule itself — flagging it because it's sitting in the source PDF and might be worth a second small page later.

## 11. Open questions for you two

- Does this need to sit behind any access control, or is a plain public link fine?
- Is this schedule specific to her one class, or should it be built so other Biology teachers in the school (or elsewhere) could reuse it with their own dates?
- Final call on Next.js vs. plain Vite+React — any preference, or happy to go with the Next.js/Vercel recommendation above?
