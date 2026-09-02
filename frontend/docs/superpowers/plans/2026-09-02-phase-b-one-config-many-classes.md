# Phase B — one config, many classes

**Date:** 2 September 2026
**Source spec:** `docs/superpowers/specs/2026-09-01-bipi-multi-class-design.md` §4 (and §6 for tests)
**Depends on:** Phase A, built and on `phase2.0`
**Branch:** stay on `phase2.0`
**Written for:** a fresh Claude Code session running Sonnet

---

## How to work this plan

Read this section before Step 1. It is not preamble; it is the working agreement.

1. **Six steps. Stop after each one.** At the end of a step, run its verification, print a short
   summary of what changed, and **stop**. Leave every change uncommitted in the working tree.
   The human reviews the diff and commits. **Do not run `git commit`, `git add`, `git push`, or
   `git checkout -b` at any point.** If you think a step should be split or merged, say so and
   stop — do not decide it yourself.

2. **Be cheap with tokens.** This is a mechanical refactor of a codebase that is already
   understood. Specifically:
   - **No subagents.** Do not use the Agent tool. Do not dispatch implementers, reviewers, or
     explorers.
   - **No `/code-review`, `/security-review`, `/simplify` or any review skill.** The human
     reviews the diff.
   - **Read only the files a step names.** They are listed per step precisely so you do not have
     to go looking. Do not re-read a file you already read this session.
   - **No full-repo greps** unless a step asks for one. The import inventory is in §"Who reads
     what" below and is current as of this plan.
   - Do not re-derive the decisions in §"Decisions already taken". They are settled.

3. **Verification per step** (chosen deliberately — this is a props refactor, not a redesign):
   - Every step: `npm run lint` && `npx tsc --noEmit` && `npm test`
   - Step 6 only: add `npm run build`, `TZ=UTC npm test`, and one headless-browser pass.
   - All commands run from `frontend/`.
   - `npm test` is 60 tests today. It should only ever go up.

4. **Tests are the safety net for the data split.** Step 1 exists specifically so the new brief +
   class config can be proved *equal to the old data file* before anything starts depending on it.
   Do not skip it or fold it into Step 2.

5. If something in this plan turns out to be wrong about the code, say so and stop. Do not
   improvise a different architecture mid-step.

---

## What we are building

```
frontend/lib/
  schedule.types.ts        NEW  Stage, StageState, Brief, ClassConfig, ResolvedClass
  briefs/
    biology-2027.ts        NEW  SHARED — what the SEC decides. Same for every Biology teacher.
  classes/
    nwetss-hanlon.ts       NEW  PER TEACHER — ~20 lines: identity, term, dates
    demo-2027.ts           NEW  a second, deliberately fictional class
    index.ts               NEW  registry: CLASSES, CLASS_SLUGS, getClass(slug)
  class-resolve.ts         NEW  resolveClass(config) -> ResolvedClass (brief + dates merged)
  schedule.ts              CHANGED  deriveSchedule(resolved, now)
  schedule.data.ts         DELETED at the end of Step 3
  site.ts                  CHANGED  + DEFAULT_CLASS

frontend/app/
  page.tsx                 CHANGED  redirect('/' + DEFAULT_CLASS)
  not-found.tsx            NEW      real 404
  [class]/page.tsx         NEW      (the old app/page.tsx body)
  [class]/opengraph-image.tsx  MOVED from app/opengraph-image.tsx
  sitemap.ts               CHANGED  one entry per listed class

frontend/public/crests/nwetss.png   MOVED from public/nwetss-crest.png
```

The load-bearing idea, from spec §4.1: **the data divides along what the SEC decides versus what
a teacher decides.** A teacher varies dates and identity. Everything else — stage names, task
lists, report sections, rules, mark bands — comes from the brief and is identical in every school
in the country.

---

## Decisions already taken

Do not re-open these. They were decided with the human before this plan was written.

**D1 — Header copy is derived from primitives, not stored as strings.**
The brief holds `subject`, `shortName`, `cohort`, `title`, `topic`, `topicSummary`,
`gradeWeight`; the header strings are assembled in `resolveClass`:

```
eyebrow        `${shortName} ${cohort} · class schedule`   -> "BiPi 2026-27 · class schedule"
eyebrowMobile  `${shortName} ${cohort}`                    -> "BiPi 2026-27"
title          brief.title (a proper noun, stays literal)  -> "Biology in Practice Investigation"
standfirst     `${topic}. ${topicSummary}`                 -> "Membranes, Osmosis & Food Preservation. Six stages, seven report sections, one deadline."
gradeChip      `${gradeWeight}% of the ${subject} grade`   -> "40% of the Biology grade"
gradeChipMobile `${gradeWeight}% of grade`                 -> "40% of grade"
```

Every one of those must come out byte-identical to today's `HEADER` values. Step 1's equality
test is what proves it.

**D2 — The second class is a committed, obviously-fictional demo.**
`lib/classes/demo-2027.ts`, slug `demo-2027`, school "Demo Community College", teacher
"Ms. Sample", **no crest** (which is what exercises the crest-optional branch), and a term shifted
about a week later than Katelyn's so the two pages visibly differ. It is marked `listed: false`:
excluded from `sitemap.ts` and served with `robots: { index: false, follow: false }`. A fictional
school should be reachable for a demo and invisible to Google.

**D3 — Date labels are derived from the ISO dates with explicit lookup tables, not `Intl`.**
`dueDateLabel` uses "Sept" for September; `shortDate` uses "Sep". No single `Intl` short-month
format produces both, and the exact strings ICU emits vary by Node/ICU version — which would make
the test suite depend on the machine. So: a fixed `WEEKDAYS` array and two fixed month-abbrevation
maps in `class-resolve.ts`, indexed off the UTC date. Deterministic, TZ-independent, and in
keeping with the timezone discipline `schedule.ts` already documents.

**D4 — Stage 6's `dueDateLabel` is a shape flag on the brief, not a per-class string.**
Today it reads `"Draft 4 Dec → final 11-12 Dec"` — it names the draft date and a two-day final
window. The brief marks that stage `labelShape: 'draft-and-final-window'`; `resolveClass` builds
the string from `class.draftDate` and `class.dueDates['stage-6']`. No per-class prose override
(spec §4.2), and it stays correct when a teacher moves the dates.

**D5 — `SEC_DEADLINE.note` becomes partly derived, and its copy changes slightly.**
The note says "Finishing on 11-12 December leaves roughly ten weeks of buffer." Both halves are
per-class facts sitting in shared content. Split it: the brief holds the fixed first sentence
("Coursework must be completed and submitted to your class teacher by this date.") plus a
`bufferSentence` template; `resolveClass` fills in the final-window label and the buffer length
computed from the class's last stage date to the SEC deadline.

For Katelyn's class that is 77 days, which reads as **"roughly eleven weeks"**, not the current
"ten". The current string is simply wrong by a week. Take the accurate one and add a line to
`docs/HANDOFF.md` flagging it for the teacher's sign-off alongside the existing `POST_TERM` copy
note (decision #12 there).

**D6 — `weekRange` is derived, and this changes Stage 6's card from "Weeks 12-14" to "Weeks 12-15".**
`weekRange` ("Weeks 1-4", "Weeks 5-7", …) cannot stay literal: it is a function of the class's
term start and stage dates. Derive it with the *same* formula the site already uses for the ruler:

```
weekOf(date) = clamp(1, term.weeks, floor((date - term.start) / 7 days) + 1)
range        = `Weeks ${previousDatedStage's week + 1}-${weekOf(this stage)}`   (first dated stage starts at 1)
```

Against today's dates this reproduces Weeks 1-4, 5-7, 8-9 and 10-11 exactly, and gives Stage 6
**Weeks 12-15** where the literal says 12-14. The literal is the odd one out: the term ruler
already prints "Week 15 of 15" on 11 December, so today the card and the ruler contradict each
other. Deriving fixes that. Note it in `HANDOFF.md` with D5.

Stages 1-2 (`isAlwaysDone`) keep the literal `"5th Year"` from the brief — they have no date this
term.

**D7 — `resolveClass` is split out from `deriveSchedule`.**
Spec §4.4 says `deriveSchedule(classConfig, now)`. Slight deviation: `resolveClass(config)` is its
own pure function returning a `ResolvedClass` (brief content + resolved dates + header strings),
and `deriveSchedule(resolved, now)` takes that. Two reasons: the page needs the resolved *content*
(header, school, rules, mark bands) as well as the derived *state*, and a resolver that is
separately testable is what makes Step 1 possible.

**D8 — A class config missing a stage date must fail to compile.**
`Brief` declares `datedStageIds` as a readonly tuple; `ClassConfig<B>` types `dueDates` as
`Record<B['datedStageIds'][number], string>`. Prove it with a `lib/schedule.types.test-d.ts`
holding a `@ts-expect-error` block — `tsc --noEmit` checks it, and `node --test "lib/**/*.test.ts"`
does not match `.test-d.ts`, so it costs no runtime test. If the generic turns into a fight,
fall back to a non-generic `Record<BiologyStageId, string>`, leave a comment saying why, and move
on — there is one brief today.

---

## Who reads what (current, verified)

**Type-only imports of `StageState` from `schedule.data`** — 4 files, one-line change each to
point at `schedule.types`: `stage-dot.tsx`, `stage-card.tsx`, `timeline.tsx`, `stepper.tsx`.

**Value imports that must become props** — 8:

| File | Reads today | Becomes |
|---|---|---|
| `site-header.tsx` | `HEADER`, `SCHOOL`, `/nwetss-crest.png` | `header`, `school` props; crest optional |
| `site-footer.tsx` | `SEC_DEADLINE` | `secDeadline` prop; `QrBlock` gets `path` |
| `marks-card.tsx` | `MARK_BANDS`, `MARKS_TOTAL` | `bands`, `total` props |
| `report-rules.tsx` | `REPORT_RULES` | `rules` prop |
| `completed-strip.tsx` | `COMPLETED_STRIP` | `text` prop |
| `term-progress.tsx` | `TERM.weeks` | `weeks` prop |
| `term-ruler.tsx` | `TERM.weeks`, `TERM_SPAN_LABEL`, `termPositionPct()` | `weeks`, `spanLabel` props; ticks carry their own `positionPct` |
| `app/opengraph-image.tsx` | `HEADER`, `SEC_DEADLINE` | resolves its class from `params` |

**Already prop-driven, no change:** `aside.tsx`, `you-are-here.tsx`, `report-crosswalk.tsx`,
`sticky-now-bar.tsx`, `stage-disclosure.tsx`, `section-heading.tsx`.

**Module-level state in `schedule.ts` that has to become per-class:** `GLANCE_TEXT` (built from
`STAGES` at import time), `TERM_SPAN_LABEL` (a const built from `TERM`), `termPositionPct(iso)`
(closes over `TERM`), and the hardcoded `15` in `weekNumber`'s clamp — that one is `term.weeks`.

---

## Step 1 — the brief, the class config, and a resolver that provably matches today

**Goal.** Build the new data shape beside the old one and prove they are identical. Nothing on
the site changes yet; `schedule.data.ts` is still what renders the page.

**Read first:** `lib/schedule.data.ts`, and `lib/schedule.test.ts` lines 1-60 (for the test file's
conventions — `node:test`, `describe`/`test`, `assert/strict`).

**Write:**

1. `lib/schedule.types.ts` — move `StageState` and `Stage` here verbatim (keep the doc comments),
   and add:
   - `Brief` — `subject`, `shortName`, `cohort`, `title`, `topic`, `topicSummary`, `gradeWeight`,
     `nav`, `completedStrip`, `secDeadline { date, label, disclaimer, noteLead, bufferSentence }`,
     `postTerm`, `reportSections`, `reportRules`, `markBands`, `marksTotal`, `datedStageIds`,
     and `stages: BriefStage[]`.
   - `BriefStage` — every field of today's `Stage` **except** `dueDate`, `dueDateLabel`,
     `shortDate` and `weekRange`, plus optional `labelShape` (D4) and `alwaysDoneWeekRange`.
   - `ClassConfig` — `slug`, `brief`, `school { name, crest? }`, `teacher { label, name }`,
     `term { start, end, weeks }`, `dueDates`, `draftDate`, `revision`, `listed`.
     (`revision` is unused until Phase C's `.ics` `SEQUENCE` — declare it now, spec §5.1.)
   - `ResolvedClass` — the merged result: `slug`, `school`, `teacher`, `term`, `draft`,
     `secDeadline`, `header`, `stages: Stage[]`, `reportSections`, `reportRules`, `markBands`,
     `marksTotal`, `completedStrip`, `postTerm`, `glanceText`.

2. `lib/briefs/biology-2027.ts` — everything from `schedule.data.ts` that is SEC content, with the
   four date fields stripped off each stage. Copy the prose **exactly**, including task lists and
   doc comments; this is a move, not a rewrite.

3. `lib/classes/nwetss-hanlon.ts` — about twenty lines. Slug `nwetss-hanlon`, crest
   `/crests/nwetss.png`, term `{ start: '2026-09-01', end: '2026-12-12', weeks: 15 }`, the five
   dated stages' dates, `draftDate: '2026-12-04'`, `revision: 1`, `listed: true`.

4. `lib/classes/index.ts` — `CLASSES` (a `Record<string, ClassConfig>`), `CLASS_SLUGS`,
   `getClass(slug): ClassConfig | undefined`. Katelyn's class only for now; the demo lands in
   Step 5.

5. `lib/class-resolve.ts` — `resolveClass(config): ResolvedClass`. This is where D1, D3, D4, D5
   and D6 are implemented. Keep the date helpers local and UTC-only (`Date.parse(iso + 'T00:00:00Z')`,
   as `schedule.ts` already does); do not import from `schedule.ts` and do not create a cycle.

6. `lib/class-resolve.test.ts` — **the equality test.** Import the old `schedule.data.ts` exports
   and `resolveClass(NWETSS_HANLON)`, and assert field by field that they match:
   - each of the 7 stages deep-equal (this catches every derived label at once),
   - `header` against `HEADER` (all six strings, D1),
   - `secDeadline.note` — assert the exact expected new string (D5 changes it; write the new
     string out in full so the change is visible in the diff, and comment why),
   - `reportSections`, `reportRules`, `markBands`, `marksTotal`, `completedStrip`, `postTerm`
     deep-equal,
   - `school`/`teacher` against `SCHOOL`.

   Two expected inequalities, both from decisions above: `stage-6.weekRange` (D6) and
   `secDeadline.note` (D5). Assert their new values explicitly rather than loosening the test.

**Verify:** `npm run lint` && `npx tsc --noEmit` && `npm test`.

**Stop.** Report: the two intentional copy changes, and the resolved-vs-old equality result.

---

## Step 2 — `deriveSchedule` takes a resolved class

**Goal.** All the live logic stops reading module-level data. The page still renders at `/` and
still looks identical.

**Read first:** `lib/schedule.ts` (whole file), `lib/schedule.test.ts` (whole file), `app/page.tsx`.

**Do:**

1. `lib/schedule.ts`:
   - Drop the `./schedule.data.ts` import entirely; import types from `./schedule.types.ts`.
   - `deriveSchedule(cls: ResolvedClass, now: Date = new Date()): DerivedSchedule`.
   - `reportSectionStatuses(cls, stages)`, `buildRulerTicks(cls, stages, today)`,
     `buildTermAtAGlance(ticks, cls.glanceText)` — all take what they used to close over.
   - `termPositionPct(iso: string, term: ResolvedClass['term']): number`.
   - `weekNumber`'s clamp uses `cls.term.weeks`, not `15`.
   - `RulerTick` gains `positionPct: number`, filled in by `buildRulerTicks`. This is what lets
     `term-ruler.tsx` stop importing anything from `lib/` in Step 3.
   - `TERM_SPAN_LABEL` becomes `termSpanLabel(term)` and its result goes on `DerivedSchedule` as
     `termSpanLabel`.
   - `postTermCopy(phase)` becomes `postTermCopy(cls, phase)`.
2. `app/page.tsx` and `app/opengraph-image.tsx`: `const cls = resolveClass(getClass('nwetss-hanlon')!)`
   for now, then `deriveSchedule(cls, …)`. A hardcoded slug here is fine and temporary — Step 4
   replaces it with the route param. Leave a `// Step 4` comment.
3. `lib/schedule.test.ts`: thread the resolved class through every `deriveSchedule` call. Add one
   module-level `const CLS = resolveClass(NWETSS_HANLON)` and use it. `termPositionPct` calls take
   `CLS.term`. **No assertion values change** — that is the point of this step. The
   `TERM_SPAN_LABEL` test becomes a `termSpanLabel(CLS.term)` test.

**Verify:** `npm run lint` && `npx tsc --noEmit` && `npm test` — still 60+ tests, still all green,
with no expected-value edits beyond the mechanical signature threading.

**Stop.**

---

## Step 3 — prop-drive the eight components, delete `schedule.data.ts`

**Goal.** No component imports content. `lib/schedule.data.ts` is deleted.

**Read first:** the eight files in the table above, plus `components/bipi/qr-block.tsx`.

**Do:**

1. The 4 type-only imports: repoint `StageState` at `@/lib/schedule.types`.
2. The 8 value readers: give each an explicit props type and pass the data from `app/page.tsx`.
   Keep every className, every comment and every piece of markup exactly as it is — this step
   changes where data comes from, nothing else.
   - `site-header.tsx`: `header`, `school`, `teacher`, `nav` props. The crest becomes
     `school.crest?` — when absent, render the school name alone and no `<Image>` (spec §4.5).
     The `alt=""` reasoning in that file still holds and its comment stays.
   - `site-footer.tsx`: `secDeadline` prop, and pass `path={'/' + slug}` down to `QrBlock`.
   - `qr-block.tsx`: takes `path`, encodes `${SITE_URL}${path}`, and prints
     `${SITE_URL_LABEL}${path}`. The `hasSiteUrl` gate is unchanged.
   - `term-ruler.tsx`: `weeks` and `spanLabel` props; read `tick.positionPct` instead of calling
     `termPositionPct`. It should end up importing nothing from `lib/` except the `RulerTick` type.
   - `term-progress.tsx`: `weeks` prop.
3. Delete `lib/schedule.data.ts`. Delete the now-redundant halves of
   `lib/class-resolve.test.ts` that compared against it — keep the assertions, but inline the
   expected values as literals (the test stops being "old equals new" and becomes "resolved
   output is exactly this", which is what it needs to be from here on).

**Verify:** `npm run lint` && `npx tsc --noEmit` && `npm test`. Also `grep -rn "schedule.data" app components lib`
— must return nothing.

**Stop.** This is the biggest diff in the phase; expect the human to want a real look at it.

---

## Step 4 — `/[class]` routing

**Goal.** Katelyn's page lives at `/nwetss-hanlon`. `/` redirects there. Unknown slugs 404.

**Read first:** `app/page.tsx`, `app/layout.tsx`, `app/sitemap.ts`, `lib/site.ts`.

**Do:**

1. `git mv public/nwetss-crest.png public/crests/nwetss.png` (the `git mv` is fine — it is not a
   commit) and update the class config's `crest` path.
2. `app/[class]/page.tsx` — the current `app/page.tsx` body, plus:
   - `params: Promise<{ class: string }>` awaited alongside `searchParams`;
   - `const config = getClass(slug); if (!config) notFound();`
   - `export async function generateStaticParams()` over `CLASS_SLUGS`;
   - `export async function generateMetadata({ params })` — per-class `title`
     (`"BiPi Schedule Hub — <school>"`), `description` from the resolved standfirst, `openGraph`,
     and `robots: { index: false, follow: false }` when `config.listed === false` (D2).
   - Keep the existing comment explaining why the page stays dynamically rendered
     (`searchParams` / `new Date()`), unchanged — `generateStaticParams` does not conflict with it
     and the comment should say so in one added clause.
3. `app/[class]/opengraph-image.tsx` — move the file, resolve its class from `params` the same way.
4. `app/page.tsx` — becomes a `redirect()` to `/` + `DEFAULT_CLASS`, from `next/navigation`. Add a comment
   citing spec §4.3: links already shared with students point at the bare origin, and this
   redirect is the only thing keeping them alive.
5. `app/not-found.tsx` — a real 404 in the site's own type and colours. One line of explanation,
   a link back to `/`. Keep it small; no data imports.
6. `lib/site.ts` — `export const DEFAULT_CLASS = process.env.NEXT_PUBLIC_DEFAULT_CLASS?.trim() || CLASS_SLUGS[0]`.
   Document it in that file's header comment beside `NEXT_PUBLIC_SITE_URL`, in the same voice.
7. `app/sitemap.ts` — one entry per `listed` class; still gated on `hasSiteUrl`. Replace the
   "Phase B turns this into one entry per class" comment with what it now does.
8. `app/layout.tsx` — the root metadata becomes site-level and generic; per-class title and
   description now come from `generateMetadata`. Keep `metadataBase` and the `twitter` card
   exactly as they are, comments included.

**Verify:** `npm run lint` && `npx tsc --noEmit` && `npm test`.

**Stop.**

---

## Step 5 — the demo class and the Phase B tests

**Goal.** Two classes, one brief, provably different. Spec §6's Phase B test list, satisfied.

**Do:**

1. `lib/classes/demo-2027.ts` per D2: slug `demo-2027`, "Demo Community College", "Ms. Sample",
   no `crest`, `listed: false`, `revision: 1`, and a term about a week later than Katelyn's —
   e.g. `{ start: '2026-09-07', end: '2026-12-18', weeks: 15 }` with the five stage dates shifted
   to the matching Fridays and a `draftDate` a week before the last one. Add a header comment
   saying in one line that this class is fictional and exists to prove the split.
2. Register it in `lib/classes/index.ts`.
3. Tests in `lib/class-resolve.test.ts`:
   - the two configs resolve to **the same** stage titles, tasks, rules, mark bands and report
     sections (shared brief) and **different** dates, labels, week ranges and school identity;
   - `deriveSchedule` on the same `now` gives the two classes different `currentStage`,
     `daysLeft` and `weekNumber`;
   - `demo-2027` resolves with `crest === undefined` (the branch `site-header.tsx` has to handle).
4. `lib/schedule.types.test-d.ts` per D8 — a `@ts-expect-error` on a config missing a stage date,
   and one on a config with a stage id the brief does not declare.
5. One routing test if it is cheap in this suite; if not, leave the 404 to the browser pass in
   Step 6 and say so.

**Verify:** `npm run lint` && `npx tsc --noEmit` && `npm test`.

**Stop.**

---

## Step 6 — full gates, browser pass, docs

**Goal.** Prove it, then write down what changed.

**Do:**

1. `npm run lint` && `npx tsc --noEmit` && `npm run build` && `npm test` && `TZ=UTC npm test`.
2. One headless-browser pass — `npx playwright` is available without being a project dependency,
   as earlier phases used. Start the dev server, then check, at **390px and 1280px**:
   - `/` redirects to `/nwetss-hanlon`;
   - `/nwetss-hanlon` renders identically to the pre-Phase-B page apart from the two intentional
     copy changes (D5, D6) — header, crest, stepper, ruler, cards, crosswalk, rules, marks card,
     footer all present;
   - `/demo-2027` renders with the demo identity, **no crest image**, and visibly different dates;
   - `/not-a-class` returns a real 404;
   - `?date=2026-10-16` and `?date=2027-01-15` still move both pages (in-term and buffer);
   - no horizontal scroll at 320px on either class;
   - the laptop term ruler at 1024 / 1280 / 1600px on **both** classes: no tick overhangs its
     band and the draft and final ticks do not collide — the demo class's different term is a new
     spacing case for the 88% clamp, which is exactly why it is worth rendering.
   Report the results as a short list. Do not write a new test-harness file for this unless it
   saves you time; a throwaway script in the scratchpad is fine.
3. Docs, kept short:
   - `docs/HANDOFF.md` — update the status block: Phase B built on `phase2.0`, what the routes are
     now, the two `NEXT_PUBLIC_*` variables, and **the two copy changes needing the teacher's
     sign-off (D5, D6)** added to the existing decisions list.
   - `docs/CLAUDE.md` — replace any "edit `lib/schedule.data.ts`" guidance with the new shape, and
     add the one paragraph that matters to the next session: *adding a teacher is a new file in
     `lib/classes/` and one line in `lib/classes/index.ts`.*

**Stop.** Final summary: what shipped, the test count, the browser results, and the two copy
changes awaiting sign-off.

---

## Out of scope for Phase B

Named here so they do not creep in: the `.ics` feed and the A3 poster route (Phase C), any
per-class prose override (spec §4.2), a marketing landing page at `/` (spec §4.3), a self-serve
builder, and any database, account or auth. Also out of scope: setting `NEXT_PUBLIC_SITE_URL` in
Vercel — that is a human action, still outstanding from Phase A, and the QR block and link
previews stay correctly absent until it happens.
