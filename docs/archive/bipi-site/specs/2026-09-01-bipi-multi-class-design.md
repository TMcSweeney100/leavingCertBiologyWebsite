# BiPi Schedule Hub — from one class to many

**Date:** 1 September 2026
**Status:** approved design, ready for an implementation plan
**Supersedes nothing.** `docs/IMPLEMENTATION_PLAN.md` describes the site as built (v1,
single-class). This describes the next three phases. Where they disagree, this file wins.

---

## 1. Why

The site is complete, correct and single-tenant. Giving it to a second teacher today means
forking the repo, editing TypeScript, deploying to Vercel and setting an environment variable.
That is the only thing standing between a finished website and a product, and it is the problem
this design solves.

Timing is the other half of the reason. The Biology in Practice Investigation is new: first
cohort, first examination 2027, worth 40%, no precedent and no textbook chapter. Every Leaving
Cert Biology teacher in Ireland is scheduling it for the first time **this month**. That window
closes around November, once everyone has improvised something.

The market is small — on the order of 730 post-primary schools, so a low-six-figure business at
full penetration even including Chemistry, Physics and Business. **Those figures are estimates
and should be checked** against Department of Education and State Examinations Commission
published numbers before anything is bet on them; the argument below needs only the order of
magnitude, not the exact value. That order of magnitude is what rules out
building a database, accounts and billing on speculation: the prize is not large enough to
absorb a wrong guess. Everything below is deliberately the smallest thing that lets a second,
third and fifth teacher use the site, so that the product decisions get made against evidence.

### Non-goals, stated so they are not re-litigated

- **No student accounts, no submissions, no marking.** GDPR-for-minors is the thing that stops
  edtech sales into Irish schools, and Teams/Google Classroom already own that ground. The
  original spec's "no accounts, no tracking, no data collection" is a **sales asset** and is
  preserved exactly.
- **No database, no auth, no signup form, no billing.** Adding a teacher is a committed file.
- **No marketing landing page.** `/` redirects (see §4.3). The landing page is a later decision.
- **No per-teacher overrides of stage prose or task lists.** See §4.2 — cheap to add when
  somebody asks, and an unused config surface until then.

---

## 2. Phases

Three phases, in order, each independently shippable.

| Phase | Delivers | Depends on |
|---|---|---|
| A | The current single-class site, made correct | — |
| B | One config file per class; `/[class]` routing | A |
| C | Calendar feed and noticeboard poster | B |

B depends on A because templated data cannot be built on data that contradicts itself
(§3.2). C depends on B because a poster and a calendar have to know whose class they are for.

---

## 3. Phase A — make the current site correct

### 3.1 The post-term countdown (the one real bug)

`deriveSchedule` clamps the countdown at zero and leaves the last stage current forever. Verified
against the real logic:

```
2026-12-11 | Stage 6 | Due today
2026-12-12 | Stage 6 | 0 days left
2027-01-15 | Stage 6 | 0 days left
2027-02-26 | Stage 6 | 0 days left   <- the actual SEC deadline
2027-03-15 | Stage 6 | 0 days left
```

From 12 December to 26 February is 76 days — eleven weeks in which the largest element on the
page reads "0 days left" for a stage that is finished, while the footer advertises a deadline the
page refuses to count toward. This is not an edge case; it is the site's longest continuous
state, and it covers the entire run-up to the deadline that actually matters.

**Design.** `DerivedSchedule` gains a `phase` discriminator with three values:

| `phase` | When | Panel behaviour |
|---|---|---|
| `in-term` | today <= last stage's due date | Unchanged. Current stage, days left, "Due today". |
| `buffer` | last stage passed, SEC deadline ahead | Headline "All six stages complete". Countdown to `SEC_DEADLINE.date`. |
| `closed` | SEC deadline passed | No countdown. The schedule reads as finished. |

`daysLeft` in `buffer` counts to the SEC deadline, not the stage. `isDueToday` applies to
whichever deadline is live. Every stage is `done` in both `buffer` and `closed`.

`currentStage` becomes `StageWithState | null`, null in `buffer` and `closed`. This is the
mechanism, not a side effect: making it nullable is what forces the compiler to surface every
consumer that currently assumes a stage is in progress, rather than leaving them to silently
render the last stage as though it were live. Consumers branch on `phase`, never on a clamped
`daysLeft` of zero — the distinction the existing `isDueToday` doc comment already warns about.

**Provisional copy**, needing a teacher's sign-off before it ships:

- `buffer` headline: *All six stages complete*
- `buffer` supporting line: *Your report is with your teacher. The remaining weeks are revision
  and buffer before the SEC submission deadline.*
- `closed` headline: *Coursework submitted*

**Tests.** Extend `lib/schedule.test.ts` with a phase-boundary table: 11 Dec (`in-term`,
"Due today"), 12 Dec (`buffer`, 76 days), 25 Feb (`buffer`, 1 day), 26 Feb (`buffer`, due today),
27 Feb (`closed`), 15 Mar (`closed`). The existing rows 7 and 8 assert the current wrong
behaviour and must be rewritten, not appended to.

### 3.2 Single-source the data

`lib/schedule.data.ts` claims that editing it alone is enough to reuse the site. Three things
make that untrue, and all three block Phase B:

1. **`TERM_AT_A_GLANCE` restates every stage date by hand.** Its own comment says "keep in sync
   with STAGES". Derive it in `lib/schedule.ts` from `STAGES` plus the draft milestone (§3.3),
   grouped by month; `aside.tsx` takes it as a prop instead of importing it.
2. **`MOBILE_EYEBROW` and `MOBILE_GRADE_CHIP` are hardcoded** in `site-header.tsx` lines 29-30.
   Move both into the data file beside their long forms.
3. **`REPORT_SECTIONS` restates each stage's date as a display string** (`'25 Sept 2026'`)
   alongside `STAGES[].dueDate`. Derive `dueBy` from the referenced stage via the existing
   `stageId` link; keep the literal only for the two `alwaysDone` rows, which reference no stage.

### 3.3 The 4 December draft milestone

The draft hand-in is a real deadline that currently appears only in the laptop aside and inside
Stage 6's collapsed task list — invisible on a phone in November.

**Design.** Add `draftDate` as a first-class field rather than a sixth pseudo-stage: it has a
date and a done/upcoming state, but no report section, no task list and no card of its own.
`deriveSchedule` returns a unified `rulerTicks: { id, date, shortDate, caption, state }[]`,
built from the non-`alwaysDone` stages plus the draft milestone, so `term-ruler.tsx` stops
deriving captions itself (`stage.label.replace("Stage ", "St ")`) and just renders what it is
given. The same array feeds the derived `TERM_AT_A_GLANCE` and, in Phase C, the calendar feed —
one source, three consumers.

**Known layout hazard — must be checked in a browser, not assumed.** `term-ruler.tsx` anchors
any tick above 88% to the right edge. This year the draft lands at ~92.2% of the term and the
final deadline at ~99.0%: both clamp right, and each label wrapper is 74px on a roughly 1000px
band (~7.4%), so the two will overlap. Options, in preference order: shorten the draft caption
and let the 74px wrappers narrow; drop the draft tick's caption below a viewport width and keep
the bare tick; stack the draft tick under the band. Whichever is chosen, verify at 1024, 1140,
1280, 1440 and 1600px, and add a test pinning the draft position the way the existing
`termPositionPct` tests pin the December tick.

### 3.4 Set `NEXT_PUBLIC_SITE_URL`

Unset, so `qr-block.tsx` and the link-preview card render nothing (`lib/site.ts` — deliberately,
and correctly). Set it in Vercel with no trailing slash. In Phase B it becomes the origin the
per-class QR codes and calendar feeds are built from.

### 3.5 Also in A, because they are one-line files and this is a business now

`app/robots.ts` and `app/sitemap.ts`. Teachers searching for "Biology in Practice Investigation
schedule" in September is a free acquisition channel the site is currently invisible to.

---

## 4. Phase B — one config, many classes

### 4.1 The data split

This is the load-bearing decision and the hardest to reverse. The data divides in two along a
single line: **what the SEC decides, versus what a teacher decides.**

```
lib/briefs/biology-2027.ts      SHARED — identical for every Biology teacher in Ireland
  subject, cohort, title, shortName, topic, gradeWeight
  secDeadline { date, label, note, disclaimer }
  stages[]        names, descriptions, teacherCheckpoints, tasks,
                  whatsDue, whatGoodLooksLike, report-section mapping
                  — everything EXCEPT dates
  reportSections[]  the seven sections
  reportRules[]     the eight rules
  markBands[], marksTotal
  completedStrip

classes/nwetss-hanlon.ts        PER TEACHER — about twenty lines
  slug          'nwetss-hanlon'
  brief         'biology-2027'
  school        { name, crest }
  teacher       { label, name }
  term          { start, end, weeks }
  dueDates      { 'stage-3': '2026-09-25', ..., 'stage-6': '2026-12-11' }
  draftDate     '2026-12-04'
  revision      1                 // see §5.1
```

Everything a teacher varies is dates and identity. Everything else comes from the SEC brief and
is therefore the same in every school in the country. This split is what makes the thing a
product rather than a template: **adding a teacher is twenty lines, not two hundred and fifty**,
adding Chemistry later is one new brief file with every class config untouched, and an SEC
correction propagates to every school at once.

`dueDates` is keyed by stage id rather than positional, matching the existing `stageId`
discipline in `reportSectionStatuses` — reordering or adding a stage cannot silently mis-map a
date. A class config missing a date for a stage its brief declares is a build-time type error.

### 4.2 Deliberately excluded: per-class prose overrides

A teacher cannot override stage descriptions, task lists or checkpoints. Adding
`overrides?: Record<StageId, Partial<Stage>>` later is a small, backward-compatible change; until
a real teacher asks for it, it is a config surface nobody uses and a second way for two classes
to disagree about what the SEC said.

### 4.3 Routing

`/[class]` — Katelyn's page becomes `/nwetss-hanlon`. Short enough to fit a QR code comfortably
and readable enough to say out loud in a classroom, which `/[school]/[class]` is not, and five
teachers do not need the extra level.

`/` **redirects** to the class named in a `NEXT_PUBLIC_DEFAULT_CLASS` environment variable. This
is not cosmetic: any link already shared with students points at the bare origin, and the
redirect is the only thing keeping it alive. It also constrains what `/` can become — the
marketing landing page is a later decision that will have to unpick this, and should.

Unknown slugs return a real 404 (`not-found.tsx`), which the site currently lacks.

`generateStaticParams` over the known class configs. The page stays dynamically rendered — it
reads `searchParams` for `?date=` and must not freeze `new Date()` at build time, which is the
same reasoning `app/page.tsx` already documents.

### 4.4 Threading the config

Thirteen files import from `lib/schedule.data` today. Four of them (`stage-card`, `timeline`,
`stage-dot`, `stepper`) import only the `StageState` *type*, which costs nothing and does not
change. The **nine that read actual values** — `site-header`, `site-footer`, `marks-card`,
`report-rules`, `completed-strip`, `aside`, `term-progress`, `term-ruler` and the
`opengraph-image` route — take their content as props instead. Every other component in
`components/bipi/` is already prop-driven and needs no change, which is why this is a day's work
and not a rewrite.

`deriveSchedule(now)` becomes `deriveSchedule(classConfig, now)`, resolving its brief and merging
the dates in. It stays a pure function of its arguments and still never reads the clock on its
own behalf.

### 4.5 The crest

`SCHOOL.crest` is a path under `public/crests/`. A class with no crest renders the name alone —
the `BrandBar` layout must not assume an image is present, and the `alt=""` reasoning in
`site-header.tsx` (the name sits beside it as real text) still holds.

---

## 5. Phase C — the two things a teacher shows a colleague

### 5.1 `/[class]/schedule.ics`

A subscribable calendar feed. One all-day event per stage deadline, plus the draft date and the
SEC deadline, each carrying its `whatsDue` line as the description. Built from `rulerTicks`
(§3.3) so it cannot disagree with the page.

Mechanics that decide whether this works or is quietly broken:

- **Stable UIDs**, `<stage-id>@<slug>.<origin>`. This is what makes a moved date *update* in
  everyone's calendar instead of appending a duplicate.
- **All-day events**: `DTSTART;VALUE=DATE`, with `DTEND` the following day, because `DTEND` is
  exclusive.
- **`SEQUENCE` from the config's `revision` integer.** The teacher increments it when they move
  a date. Explicit and diffable, and it needs no database — which is the point.
- `X-WR-CALNAME` naming the class, and `X-PUBLISHED-TTL: PT12H` so clients re-poll.
- Served as `text/calendar`, cached briefly. The route is static per class apart from its
  content, so it can be cached far more aggressively than the page.

### 5.2 `/[class]/poster`

The noticeboard poster as an A3-targeted print route: the teacher opens it, prints, saves a PDF,
and pins it up with their own dates and QR code. No PDF library and no server-side rendering —
the browser already does this, and the `@media print` work in `globals.css` plus `qr-block.tsx`
already do most of it.

Note this is a **different sheet** from the existing print stylesheet, which produces five A4
pages of the full page (a reference document). This is one A3 sheet: identity, the five dates,
the report-section crosswalk, and the QR. Deliberately not the whole site.

---

## 6. Testing

`lib/schedule.test.ts` is the model and stays the place derivation logic is proved.

- **Phase A**: the phase-boundary table (§3.1); derived `TERM_AT_A_GLANCE` matching `STAGES`;
  derived `REPORT_SECTIONS[].dueBy` matching each referenced stage; the draft tick's
  `termPositionPct` against the 88% clamp threshold.
- **Phase B**: `deriveSchedule` against two different class configs producing correctly different
  results from the same brief; a config missing a stage date failing to compile; unknown slug
  404s.
- **Phase C**: `.ics` output parsing as valid iCalendar; UIDs stable across a date change while
  `SEQUENCE` increments; all-day `DTEND` exclusivity.

Browser verification, as in every previous phase, for anything visual: the ruler collision in
§3.3 at five widths, the poster at A3, and the `buffer`/`closed` panels at 390px and 1280px.
The suite must pass under `TZ=UTC`, as Vercel runs it.

---

## 7. What this is for

Ship A, B and C, then put it in front of five teachers — Katelyn's department, their ISTA branch,
one subject Facebook group — and build their schedules by hand. Watch what they ask for.

If five teachers is hard, that is the answer, and it cost three phases of work that the site
needed anyway. If five is easy, the self-serve builder gets written in November knowing exactly
which questions it has to ask.
