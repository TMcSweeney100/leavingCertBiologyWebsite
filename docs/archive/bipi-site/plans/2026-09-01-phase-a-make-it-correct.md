# BiPi Phase A — Make the Current Site Correct

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the eleven-week post-term countdown bug, make `schedule.data.ts` genuinely the only file you edit to change content, and surface the 4 December draft deadline — so that Phase B can template the data instead of templating a contradiction.

**Architecture:** All derivation stays in `lib/schedule.ts` as pure functions of an injectable `now`, proved by `lib/schedule.test.ts`. `DerivedSchedule` gains a `phase` discriminator (`in-term` / `buffer` / `closed`) and `currentStage` becomes nullable — deliberately, because that is what makes the compiler find every consumer that assumes a stage is in progress. Two new derived arrays (`rulerTicks`, `termAtAGlance`) replace hand-maintained data, and components take them as props rather than importing them.

**Tech Stack:** Next.js 15.3.9 App Router, React 19, TypeScript, Tailwind v4, `node:test` (no test framework beyond the Node built-in), Playwright via `npx playwright` for browser verification.

**Working directory:** all paths are relative to `frontend/` unless stated. Run commands from `frontend/`.

**Spec:** `docs/superpowers/specs/2026-09-01-bipi-multi-class-design.md` §3.

---

## Before you start

Read `lib/schedule.ts` and `lib/schedule.test.ts` in full. The test file's `dublinDateTime()`
helper converts a Dublin wall-clock string into the right UTC instant using real timezone data —
**every new test must build its `now` with it.** Never write `new Date('2026-12-12')` in a test;
the suite has to pass under `TZ=UTC` because that is how Vercel runs it.

Baseline, which must be true before you touch anything:

```bash
npm test          # 39 passing
npx tsc --noEmit  # clean
npm run lint      # clean
```

---

## File structure

| File | Responsibility | Task |
|---|---|---|
| `lib/schedule.ts` | All derivation. Gains `phase`, nullable `currentStage`, `rulerTicks`, `termAtAGlance`, derived `dueBy` | 1, 4, 6, 7 |
| `lib/schedule.test.ts` | Proves the above | 1, 4, 6, 7 |
| `lib/schedule.data.ts` | Content only. Gains `POST_TERM`, `DRAFT`, mobile header strings; loses `TERM_AT_A_GLANCE` | 3, 4, 6, 8 |
| `app/page.tsx` | Branches on `phase` for the sticky bar | 2 |
| `app/opengraph-image.tsx` | Branches on `phase` for the card's stage line | 2 |
| `components/bipi/you-are-here.tsx` | Renders the `buffer` and `closed` panels | 3 |
| `components/bipi/term-ruler.tsx` | Renders `rulerTicks`; stops deriving captions | 5 |
| `components/bipi/aside.tsx` | Takes `termAtAGlance` as a prop | 6 |
| `components/bipi/site-header.tsx` | Reads mobile strings from data | 8 |
| `app/robots.ts`, `app/sitemap.ts` | New. Search visibility | 9 |

---

## Task 1: The `phase` discriminator and nullable `currentStage`

**Files:**
- Modify: `lib/schedule.ts`
- Test: `lib/schedule.test.ts`

- [ ] **Step 1: Write the failing tests**

Add this block to `lib/schedule.test.ts`, after the `describe('deriveSchedule — §3.3 verification table')` block:

```ts
describe('deriveSchedule — phase boundaries', () => {
  test('11 Dec 2026 — the last stage is still in progress on its own due date', () => {
    const result = deriveSchedule(dublinDateTime('2026-12-11T09:00:00'));
    assert.equal(result.phase, 'in-term');
    assert.equal(result.currentStage?.id, 'stage-6');
    assert.equal(result.daysLeft, 0);
    assert.equal(result.isDueToday, true);
  });

  test('12 Dec 2026 — the morning after: buffer, counting to the SEC deadline', () => {
    const result = deriveSchedule(dublinDateTime('2026-12-12T09:00:00'));
    assert.equal(result.phase, 'buffer');
    assert.equal(result.currentStage, null);
    assert.equal(result.daysLeft, 76);
    assert.equal(result.isDueToday, false);
    assert.ok(result.stages.every((s) => s.state === 'done'));
  });

  test('25 Feb 2027 — one day before the SEC deadline', () => {
    const result = deriveSchedule(dublinDateTime('2027-02-25T09:00:00'));
    assert.equal(result.phase, 'buffer');
    assert.equal(result.daysLeft, 1);
    assert.equal(result.isDueToday, false);
  });

  test('26 Feb 2027 — the SEC deadline itself is still buffer, and is due today', () => {
    const result = deriveSchedule(dublinDateTime('2027-02-26T09:00:00'));
    assert.equal(result.phase, 'buffer');
    assert.equal(result.daysLeft, 0);
    assert.equal(result.isDueToday, true);
  });

  test('27 Feb 2027 — past the SEC deadline: closed, and nothing is due today', () => {
    const result = deriveSchedule(dublinDateTime('2027-02-27T09:00:00'));
    assert.equal(result.phase, 'closed');
    assert.equal(result.currentStage, null);
    assert.equal(result.daysLeft, 0);
    assert.equal(result.isDueToday, false);
  });

  test('15 Mar 2027 — long past the deadline, still closed and still not crashing', () => {
    const result = deriveSchedule(dublinDateTime('2027-03-15T09:00:00'));
    assert.equal(result.phase, 'closed');
    assert.equal(result.currentStage, null);
    assert.ok(result.stages.every((s) => s.state === 'done'));
  });

  test('comingUp and nextStage are empty once there is no current stage', () => {
    const result = deriveSchedule(dublinDateTime('2027-01-15T09:00:00'));
    assert.equal(result.nextStage, null);
    assert.deepEqual(result.comingUp, []);
  });

  test('every report section reads Done once the term is over', () => {
    const result = deriveSchedule(dublinDateTime('2027-01-15T09:00:00'));
    assert.ok(result.reportSections.every((s) => s.status === 'done'));
  });
});
```

Now **rewrite** the two existing rows that assert the old wrong behaviour. Replace the whole of
`test('row 7: ...')` and `test('row 8: ...')` with:

```ts
  test('row 7: 20 Dec 2026 (past term end) — buffer, no stage current, no negative countdown', () => {
    const result = deriveSchedule(dublinDateTime('2026-12-20T09:00:00'));
    assert.equal(result.phase, 'buffer');
    assert.equal(result.currentStage, null);
    assert.equal(result.daysLeft, 68);
    assert.equal(result.termPct, 100);
    assert.equal(result.weekNumber, 15);
  });

  test('row 8: 1 Mar 2027 (past the SEC deadline) — closed, no crash', () => {
    const result = deriveSchedule(dublinDateTime('2027-03-01T09:00:00'));
    assert.equal(result.phase, 'closed');
    assert.equal(result.currentStage, null);
    assert.equal(result.daysLeft, 0);
    assert.equal(result.termPct, 100);
    assert.equal(result.weekNumber, 15);
  });
```

Also update the three `describe('deriveSchedule — isDueToday')` and
`describe('deriveSchedule — nextStage')` tests that dereference `result.currentStage.` — add `?.`
so they compile. Do not change what they assert.

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test 2>&1 | tail -20
```

Expected: failures on `result.phase` being `undefined` and `currentStage` not being `null`.

- [ ] **Step 3: Implement**

In `lib/schedule.ts`, add `SEC_DEADLINE` to the import from `./schedule.data.ts`, then add above
`DerivedSchedule`:

```ts
/**
 * Which of the schedule's three lives the page is in.
 *
 * The site spends longer in `buffer` than most of the term — 12 December to
 * 26 February is 76 days — so this is not an edge case to degrade
 * gracefully into. It is a first-class state with its own copy, and it
 * exists because clamping the countdown at zero left the largest element on
 * the page reading "0 days left" for eleven weeks while the footer
 * advertised a deadline the page refused to count toward.
 */
export type SchedulePhase = 'in-term' | 'buffer' | 'closed';
```

Change these three fields in the `DerivedSchedule` type:

```ts
  /** Which of the schedule's three lives the page is in. */
  phase: SchedulePhase;
  /**
   * The stage in progress, or `null` once the last one's due date passes.
   *
   * Nullable on purpose. Every consumer that renders "the current stage"
   * must decide what to show in `buffer` and `closed`, and a non-null type
   * pointing at a finished Stage 6 would let them all silently render it as
   * live — which is exactly the bug this phase exists to fix.
   */
  currentStage: StageWithState | null;
  /**
   * Days to whichever deadline is live: the current stage's in `in-term`,
   * the SEC deadline in `buffer`, and zero in `closed`. Never negative.
   */
  daysLeft: number;
```

Replace the body of `deriveSchedule` from `const today = ...` to the closing brace with:

```ts
  const today = dublinToday(now);
  const lastStage = STAGES[STAGES.length - 1];
  const secDay = day(SEC_DEADLINE.date);

  const phase: SchedulePhase =
    today <= day(lastStage.dueDate) ? 'in-term' : today <= secDay ? 'buffer' : 'closed';

  // Guaranteed to find a stage while `in-term` — the phase test above is
  // precisely the condition that the last stage has not passed — so the -1
  // fallback the old code needed is gone. Outside `in-term` there is no
  // current stage at all, which is what `-1` means here.
  const currentIndex =
    phase === 'in-term' ? STAGES.findIndex((s) => !s.isAlwaysDone && day(s.dueDate) >= today) : -1;

  const stages: StageWithState[] = STAGES.map((stage, index) => ({
    ...stage,
    state:
      stage.isAlwaysDone || currentIndex === -1 || index < currentIndex
        ? 'done'
        : index === currentIndex
          ? 'current'
          : 'upcoming',
  }));

  const currentStage = currentIndex === -1 ? null : stages[currentIndex];
  const comingUp = currentIndex === -1 ? [] : stages.slice(currentIndex + 1);
  const termStart = day(TERM.start);
  const termEnd = day(TERM.end);

  // The day the live countdown points at. In `closed` there is no live
  // deadline, so it resolves to today — which yields zero days left, and is
  // why `isDueToday` has to exclude `closed` explicitly rather than just
  // comparing the two.
  const deadlineDay =
    phase === 'in-term' ? day(currentStage!.dueDate) : phase === 'buffer' ? secDay : today;

  return {
    today,
    phase,
    stages,
    currentStage,
    daysLeft: Math.max(0, Math.round((deadlineDay - today) / MS_PER_DAY)),
    isDueToday: phase !== 'closed' && deadlineDay === today,
    nextStage: comingUp[0] ?? null,
    comingUp,
    reportSections: reportSectionStatuses(stages),
    termPct: clamp(2, 100, Math.round(((today - termStart) / (termEnd - termStart)) * 100)),
    weekNumber: clamp(1, 15, Math.floor((today - termStart) / (7 * MS_PER_DAY)) + 1),
  };
```

Update the `isDueToday` doc comment on the type — it currently explains the old clamp trap. Keep
its warning (the distinction is still real) and add that it now tracks whichever deadline is live.

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm test 2>&1 | tail -10
TZ=UTC npm test 2>&1 | tail -5
```

Expected: all passing under both. `npx tsc --noEmit` will still fail — that is Task 2.

- [ ] **Step 5: Commit**

```bash
git add lib/schedule.ts lib/schedule.test.ts
git commit -m "Add schedule phase; currentStage is null once the term ends

The countdown clamped at zero and left Stage 6 current forever, so from
12 Dec to 26 Feb — 76 days — the page read '0 days left' for a finished
stage while the footer advertised a deadline it never counted toward.

phase is in-term/buffer/closed; buffer counts to the SEC deadline.
currentStage is nullable so the compiler finds every consumer that
assumed a stage was in progress."
```

---

## Task 2: Follow the compiler cascade

**Files:**
- Modify: `app/page.tsx:36-41`
- Modify: `app/opengraph-image.tsx:95-113`

- [ ] **Step 1: Add the post-term copy to `lib/schedule.data.ts`**

Task 3 renders this; Task 2 needs it to compile, so it goes in first. After the `SEC_DEADLINE`
block:

```ts
/**
 * What the "You are here" panel says once the timeline is finished.
 *
 * `buffer` runs from the day after the last stage to the SEC deadline —
 * 76 days this year, longer than any single stage — and `closed` runs
 * after it. Both were previously rendered as "Stage 6 · 0 days left",
 * which was false in `buffer` and meaningless in `closed`.
 */
export const POST_TERM = {
  buffer: {
    eyebrow: 'Term complete',
    headline: 'All six stages complete',
    body: 'Your report is with your teacher. The remaining weeks are revision and buffer before the SEC submission deadline.',
    countdownCaption: 'to the SEC deadline'
  },
  closed: {
    eyebrow: 'Submitted',
    headline: 'Coursework submitted',
    body: 'The SEC submission deadline has passed. This schedule covered the 2026-27 cohort.',
    countdownCaption: ''
  }
};
```

**Copy note:** provisional, and wants Katelyn's sign-off. It is deliberately a string in the data
file so changing it later is a one-line edit.

- [ ] **Step 2: See exactly what broke**

```bash
npx tsc --noEmit
```

Expected: errors in `app/page.tsx` and `app/opengraph-image.tsx` — `'schedule.currentStage' is possibly 'null'`. These two files are the whole cascade; every other component already takes props.

- [ ] **Step 3: Fix `app/page.tsx`**

The sticky bar shows "Stage 4 · 10 days left". In `buffer` and `closed` there is no stage, and
the panel above it already says so — so the bar is omitted rather than given invented copy.
Replace the `<StickyNowBar ... />` element (and keep the comment above it) with:

```tsx
        {schedule.currentStage && (
          <StickyNowBar
            stageLabel={schedule.currentStage.label}
            countdown={countdownText(schedule.daysLeft, schedule.isDueToday)}
          />
        )}
```

- [ ] **Step 4: Fix `app/opengraph-image.tsx`**

The card names the current stage. Past the term it names the phase instead. Replace the two
`<div>`s that read `schedule.currentStage.label` and `countdownText(...)` with:

```tsx
          <div style={{ marginTop: 12, fontSize: 44, color: NOW }}>
            {schedule.currentStage
              ? `${schedule.currentStage.label} · ${schedule.currentStage.title}`
              : POST_TERM[schedule.phase === 'buffer' ? 'buffer' : 'closed'].headline}
          </div>
          <div style={{ marginTop: 10, fontFamily: "Space Mono", fontSize: 28, color: INK_2 }}>
            {schedule.currentStage
              ? `${countdownText(schedule.daysLeft, schedule.isDueToday)} · due ${schedule.currentStage.shortDate}`
              : `SEC deadline · ${SEC_DEADLINE.label}`}
          </div>
```

Add `POST_TERM` to the existing `schedule.data` import; `SEC_DEADLINE` is already imported.

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit && npm run lint
```

Expected: both clean.

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx app/opengraph-image.tsx lib/schedule.data.ts
git commit -m "Handle a null current stage in the sticky bar and OG card"
```

---

## Task 3: The `buffer` and `closed` panels

**Files:**
- Modify: `lib/schedule.data.ts`
- Modify: `components/bipi/you-are-here.tsx`

**Copy note:** this wording is provisional and wants Katelyn's sign-off. It is deliberately a
string in the data file so changing it later is a one-line edit.

`POST_TERM` was added to `lib/schedule.data.ts` in Task 2. This task renders it.

- [ ] **Step 1: Render the panels in `components/bipi/you-are-here.tsx`**

The component currently destructures `currentStage` and dereferences it throughout. Guard at the
top and render a distinct panel, keeping the same visual shell so the page does not restructure:

```tsx
  const { currentStage, phase } = schedule;

  if (!currentStage) {
    const copy = POST_TERM[phase === 'buffer' ? 'buffer' : 'closed'];
    return (
      <section
        id="right-now"
        aria-label="You are here"
        className="scroll-mt-6 border-b border-border bg-card px-4.5 py-4.5 lg:border-b-0 lg:bg-background lg:px-10 lg:pt-6 lg:pb-0"
      >
        <div className="rounded-(--bipi-r-panel) border-[1.5px] border-(--bipi-done) bg-card px-4.25 pt-4 pb-4.25 lg:rounded-(--bipi-r-panel-lg) lg:px-7 lg:py-6.5 lg:shadow-(--bipi-shadow-now-lg)">
          <div className="flex items-center justify-between gap-2.5">
            <p className="font-mono text-eyebrow font-bold tracking-[.14em] text-(--bipi-done-ink) uppercase">
              {copy.eyebrow}
            </p>
            <p className="font-mono text-eyebrow text-muted-foreground tabular-nums">
              {formatTodayLabel(schedule.today)}
            </p>
          </div>
          <h2 className="mt-3.5 font-heading text-panel-title leading-[1.15] font-bold tracking-[-.02em] text-foreground lg:mt-4 lg:text-panel-title-lg">
            {copy.headline}
          </h2>
          <p className="mt-3 max-w-[620px] font-sans text-standfirst leading-[1.5] text-(--bipi-ink-2) text-pretty lg:text-standfirst-lg">
            {copy.body}
          </p>
          {phase === 'buffer' && (
            <p className="mt-3.5 inline-flex items-baseline gap-1.75 rounded-(--bipi-r-inset) bg-(--bipi-now) px-2.75 py-1.75 text-white">
              <span className="font-heading text-card-title leading-none font-bold tabular-nums">
                {schedule.isDueToday ? DUE_TODAY : schedule.daysLeft}
              </span>
              {!schedule.isDueToday && (
                <span className="font-mono text-eyebrow leading-none tracking-[.06em] uppercase">
                  {daysLeftWord(schedule.daysLeft)} {copy.countdownCaption}
                </span>
              )}
            </p>
          )}
        </div>
      </section>
    );
  }
```

Import `POST_TERM` from `@/lib/schedule.data`. Leave the existing `in-term` JSX below this guard
entirely unchanged — after the guard, TypeScript narrows `currentStage` to non-null, so the rest
of the file compiles as-is.

- [ ] **Step 2: Verify in a browser at both breakpoints**

```bash
npm run dev
```

Then check `?date=` at four points — `2026-11-20` (in-term, unchanged), `2026-12-12` (buffer, 76
days), `2027-02-26` (buffer, due today), `2027-03-15` (closed, no countdown) — at 390px and
1280px. Confirm: no horizontal scroll, heading order still h1 → h2 → h3, and the `--bipi-now`
indigo appears **only** on the buffer countdown, never on a done stage.

- [ ] **Step 3: Full gate**

```bash
npm test && npx tsc --noEmit && npm run lint && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add components/bipi/you-are-here.tsx
git commit -m "Render the buffer and closed panels

Copy is provisional and wants a teacher's sign-off; it lives in
schedule.data.ts so that is a one-line change."
```

---

## Task 4: The 4 December draft milestone and `rulerTicks`

**Files:**
- Modify: `lib/schedule.data.ts`, `lib/schedule.ts`
- Test: `lib/schedule.test.ts`

- [ ] **Step 1: Add the data**

In `lib/schedule.data.ts`, after `TERM`:

```ts
/**
 * The draft hand-in. A milestone *inside* Stage 6, not a stage of its own:
 * it has a date and a done/upcoming state, but no report section, no task
 * list and no card. Before this it existed only in the laptop aside and
 * inside Stage 6's collapsed task list — invisible on a phone in November,
 * which is exactly when it matters.
 */
export const DRAFT = { date: '2026-12-04', shortDate: '4 Dec', caption: 'Draft' };
```

- [ ] **Step 2: Write the failing tests**

Add to `lib/schedule.test.ts`:

```ts
describe('deriveSchedule — rulerTicks', () => {
  test('is the five stage deadlines plus the draft, in date order', () => {
    const { rulerTicks } = deriveSchedule(dublinDateTime('2026-09-01T09:00:00'));
    assert.deepEqual(
      rulerTicks.map((t) => t.id),
      ['stage-3', 'stage-4', 'catchup', 'stage-5', 'draft', 'stage-6'],
    );
  });

  test('omits the two 5th-Year stages, which have no tick', () => {
    const { rulerTicks } = deriveSchedule(dublinDateTime('2026-09-01T09:00:00'));
    assert.ok(!rulerTicks.some((t) => t.id === 'stage-1' || t.id === 'stage-2'));
  });

  test('the draft is upcoming through its own date and done the morning after', () => {
    const before = deriveSchedule(dublinDateTime('2026-12-03T09:00:00'));
    const on = deriveSchedule(dublinDateTime('2026-12-04T09:00:00'));
    const after = deriveSchedule(dublinDateTime('2026-12-05T09:00:00'));
    const draft = (r: ReturnType<typeof deriveSchedule>) =>
      r.rulerTicks.find((t) => t.id === 'draft')!;
    assert.equal(draft(before).state, 'upcoming');
    assert.equal(draft(on).state, 'upcoming');
    assert.equal(draft(after).state, 'done');
  });

  test('the draft is never "current" — indigo is reserved for the current stage', () => {
    for (const d of ['2026-12-01', '2026-12-04', '2026-12-05'] as const) {
      const { rulerTicks } = deriveSchedule(dublinDateTime(`${d}T09:00:00`));
      assert.notEqual(rulerTicks.find((t) => t.id === 'draft')!.state, 'current');
    }
  });

  test('stage ticks carry short captions, and the catch-up window says so', () => {
    const { rulerTicks } = deriveSchedule(dublinDateTime('2026-09-01T09:00:00'));
    const caption = (id: string) => rulerTicks.find((t) => t.id === id)!.caption;
    assert.equal(caption('stage-3'), 'St 3');
    assert.equal(caption('catchup'), 'Catch-up');
    assert.equal(caption('draft'), 'Draft');
  });

  test('tick state tracks stage state, so the ruler cannot disagree with the cards', () => {
    const result = deriveSchedule(dublinDateTime('2026-10-06T09:00:00'));
    for (const tick of result.rulerTicks) {
      if (tick.id === 'draft') continue;
      assert.equal(tick.state, result.stages.find((s) => s.id === tick.id)!.state);
    }
  });
});

describe('termPositionPct — the draft tick and the right-edge clamp', () => {
  test('the draft and the final deadline are both past the 88% legacy threshold', () => {
    assert.ok(termPositionPct('2026-12-04') > 88);
    assert.ok(termPositionPct('2026-12-11') > 88);
  });

  test('the draft sits below the raised 95% threshold, so only the last tick clamps', () => {
    assert.ok(termPositionPct('2026-12-04') < 95);
    assert.ok(termPositionPct('2026-12-11') > 95);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

```bash
npm test 2>&1 | tail -20
```

Expected: `rulerTicks` is `undefined`.

- [ ] **Step 4: Implement in `lib/schedule.ts`**

Import `DRAFT` from `./schedule.data.ts`. Add above `DerivedSchedule`:

```ts
/**
 * One mark on the laptop term ruler. Built here rather than derived inside
 * `term-ruler.tsx` so that the ruler, the aside's "Term at a glance" and
 * (in Phase C) the calendar feed all read one array and cannot drift.
 */
export type RulerTick = {
  id: string;
  /** ISO date, for `termPositionPct` and the calendar feed. */
  date: string;
  shortDate: string;
  /** The second label line: "St 3", "Catch-up", "Draft". */
  caption: string;
  state: StageState;
};
```

Add `rulerTicks: RulerTick[];` to `DerivedSchedule`, and this function above `deriveSchedule`:

```ts
/**
 * The ruler's marks: every stage that has a real deadline this term, plus
 * the draft milestone, in date order.
 *
 * The draft is never `current`. `--bipi-now` is reserved for the stage in
 * progress and for today's marker — a second indigo mark inside Stage 6
 * would break the one discipline that keeps a page this dense legible. It
 * stays `upcoming` through its own date and flips to `done` the morning
 * after, which is the same rule stages follow.
 */
function buildRulerTicks(stages: StageWithState[], today: number): RulerTick[] {
  const ticks: RulerTick[] = stages
    .filter((stage) => !stage.isAlwaysDone)
    .map((stage) => ({
      id: stage.id,
      date: stage.dueDate,
      shortDate: stage.shortDate,
      caption: stage.isCatchup ? 'Catch-up' : stage.label.replace('Stage ', 'St '),
      state: stage.state,
    }));

  ticks.push({
    id: 'draft',
    date: DRAFT.date,
    shortDate: DRAFT.shortDate,
    caption: DRAFT.caption,
    state: today > day(DRAFT.date) ? 'done' : 'upcoming',
  });

  return ticks.sort((a, b) => day(a.date) - day(b.date));
}
```

Add `rulerTicks: buildRulerTicks(stages, today),` to the returned object.

- [ ] **Step 5: Run the tests to verify they pass**

```bash
npm test 2>&1 | tail -10 && TZ=UTC npm test 2>&1 | tail -5
```

- [ ] **Step 6: Commit**

```bash
git add lib/schedule.data.ts lib/schedule.ts lib/schedule.test.ts
git commit -m "Derive rulerTicks, including the 4 December draft milestone"
```

---

## Task 5: The ruler renders `rulerTicks` — and the collision gate

**Files:**
- Modify: `components/bipi/term-ruler.tsx`

**This task has a real gate.** The draft lands at ~92.2% of the term and the final deadline at
~99.0%. The existing 88% right-clamp sends **both** to `right-0`, where they would sit on top of
each other. The fix below is a considered guess and **must be verified in a browser before the
task is considered done.** If it fails, the fallback is named in Step 3.

- [ ] **Step 1: Take the ticks as a prop**

Change `TermRulerProps` — replace `stages: StageWithState[]` with:

```tsx
  /** Every mark on the ruler, in date order — see `buildRulerTicks`. */
  ticks: RulerTick[];
```

Import `type RulerTick` from `@/lib/schedule` and drop the now-unused `StageWithState` and
`StageState` imports if nothing else in the file uses them. Delete the
`const ticks = stages.filter(...)` line — the array arrives ready.

In the render, replace `stage.shortDate` with `tick.shortDate`, replace the inline caption
expression `{stage.isCatchup ? "Catch-up" : stage.label.replace("Stage ", "St ")}` with
`{tick.caption}`, and change `termPositionPct(stage.dueDate)` to `termPositionPct(tick.date)`.
Rename the map parameter `stage` → `tick` and the key to `tick.id`.

Update the caller in `components/bipi/you-are-here.tsx` — `<TermRuler ... stages={stages}` becomes
`ticks={schedule.rulerTicks}`.

- [ ] **Step 2: Narrow the wrappers and raise the clamp threshold**

Two changes, both in `term-ruler.tsx`. In `tickAnchor`, `88` becomes `95`:

```tsx
/**
 * Where a tick's label wrapper anchors, given its position on the track.
 *
 * The threshold is 95%, not the 88% this started at: the 4 December draft
 * tick sits at ~92.2% and the 11 December deadline at ~99.0%, and at 88%
 * *both* clamped right and rendered on top of each other. 95% is above the
 * draft and below the deadline, so exactly one tick clamps — which is the
 * only arrangement that works. Verified in a browser at five widths; see
 * the tests pinning both positions against this number.
 */
function tickAnchor(pct: number) {
  if (pct > 95) return { wrap: "right-0 text-right", tick: "ml-auto", style: undefined };
  if (pct < 6) return { wrap: "left-0 text-left", tick: "mr-auto", style: undefined };
  return { wrap: "-translate-x-1/2 text-center", tick: "mx-auto", style: { left: `${pct}%` } };
}
```

And narrow the wrapper from `w-[74px]` to `w-[54px]` in the tick `<div>`'s className. At 54px on a
~1000px band each label occupies ~5.4%, against a 6.8% gap between the two December ticks.

- [ ] **Step 3: Verify in a browser — this is the gate**

```bash
npm run dev
```

At **1024, 1140, 1280, 1440 and 1600px**, with `?date=2026-11-20` and `?date=2026-12-08`, confirm
for every tick: the label does not overlap its neighbour, and no label overhangs the panel's right
edge. The 4 Dec / 11 Dec pair is the one to look at hardest — the margin is about 3px at 1024px.

Also confirm the captions still fit at 54px: `Catch-up` is the longest.

**If they overlap**, the fallback is to drop the draft tick's caption line and keep only its date
— render the second `<div>` only when `tick.id !== 'draft'`. Do that rather than widening the
wrapper back, which reintroduces the collision.

Finally re-check the entry animation runs once and is suppressed under `prefers-reduced-motion`,
landing on the same final position either way.

- [ ] **Step 4: Full gate**

```bash
npm test && npx tsc --noEmit && npm run lint && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add components/bipi/term-ruler.tsx components/bipi/you-are-here.tsx
git commit -m "Ruler renders rulerTicks; raise the right clamp to 95% for the draft tick

At 88% the 4 Dec draft (92.2%) and the 11 Dec deadline (99.0%) both
clamped right and overlapped. 95% sits between them so exactly one
clamps. Wrappers narrowed 74px to 54px. Verified at five widths."
```

---

## Task 6: Derive "Term at a glance"

**Files:**
- Modify: `lib/schedule.ts`, `lib/schedule.data.ts`, `components/bipi/aside.tsx`
- Test: `lib/schedule.test.ts`

`TERM_AT_A_GLANCE` restates every stage date by hand. Its own comment says "keep in sync with
STAGES", which is a drift hazard now and an impossibility in Phase B.

- [ ] **Step 1: Write the failing tests**

```ts
describe('deriveSchedule — termAtAGlance', () => {
  test('groups every ruler tick by month, in date order', () => {
    const { termAtAGlance } = deriveSchedule(dublinDateTime('2026-09-01T09:00:00'));
    assert.deepEqual(
      termAtAGlance.map((m) => m.month),
      ['September', 'October', 'November', 'December'],
    );
    assert.deepEqual(
      termAtAGlance.flatMap((m) => m.items.map((i) => i.day)),
      ['25', '16', '30', '13', '4', '11'],
    );
  });

  test('every item names the stage or milestone it came from', () => {
    const { termAtAGlance } = deriveSchedule(dublinDateTime('2026-09-01T09:00:00'));
    const items = termAtAGlance.flatMap((m) => m.items);
    assert.match(items[0].text, /Stage 3/);
    assert.match(items.find((i) => i.day === '4')!.text, /draft/i);
  });

  test('cannot drift from STAGES — every stage deadline appears exactly once', () => {
    const { termAtAGlance, rulerTicks } = deriveSchedule(dublinDateTime('2026-09-01T09:00:00'));
    assert.equal(termAtAGlance.flatMap((m) => m.items).length, rulerTicks.length);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test 2>&1 | tail -20
```

- [ ] **Step 3: Implement**

In `lib/schedule.data.ts`, **delete** `TERM_AT_A_GLANCE` entirely and add the per-tick summary to
the `Stage` type as a new field `glanceText: string`, populated on each stage:

- `stage-3`: `'Stage 3 due — §3 Designing and Planning'`
- `stage-4`: `'Stage 4 due — §4 Conducting the Experiment'`
- `catchup`: `'Catch-up window closes'`
- `stage-5`: `'Stage 5 due — §5 Data and Analysis, §6 Conclusions'`
- `stage-6`: `'Final report due — §7 References'`

Add `glanceText: 'Full draft in for feedback'` to the `DRAFT` object. Stages 1 and 2 take
`glanceText: ''` — they never produce a tick, so it is never read.

In `lib/schedule.ts`, add the types and builder:

```ts
export type GlanceItem = { day: string; text: string };
export type GlanceMonth = { month: string; items: GlanceItem[] };

const GLANCE_MONTH = new Intl.DateTimeFormat('en-IE', { month: 'long', timeZone: 'UTC' });
const GLANCE_DAY = new Intl.DateTimeFormat('en-IE', { day: 'numeric', timeZone: 'UTC' });

/**
 * The aside's "Term at a glance", grouped by month.
 *
 * Derived from `rulerTicks` rather than hand-written, which is what stops it
 * from disagreeing with the timeline — it previously restated every date as
 * a literal, under a comment asking a human to keep them in sync.
 */
function buildTermAtAGlance(ticks: RulerTick[], glanceText: Map<string, string>): GlanceMonth[] {
  const months: GlanceMonth[] = [];
  for (const tick of ticks) {
    const epoch = day(tick.date);
    const month = GLANCE_MONTH.format(epoch);
    const item = { day: GLANCE_DAY.format(epoch), text: glanceText.get(tick.id) ?? '' };
    const last = months[months.length - 1];
    if (last?.month === month) last.items.push(item);
    else months.push({ month, items: [item] });
  }
  return months;
}
```

Add `glanceText: string;` to the `Stage` type in `lib/schedule.data.ts`, beside
`whatGoodLooksLike`:

```ts
  whatGoodLooksLike: string;
  /** One line for the aside's "Term at a glance". Empty for the two 5th-Year stages, which produce no tick. */
  glanceText: string;
  tasks: string[];
```

Then in `lib/schedule.ts`, build the lookup at module scope — it is the same for every `now`, so
it does not belong inside `deriveSchedule`:

```ts
/**
 * Tick id -> its one-line summary for "Term at a glance". Built once: the
 * mapping is content, not a function of the current date.
 */
const GLANCE_TEXT = new Map<string, string>([
  ...STAGES.map((stage) => [stage.id, stage.glanceText] as const),
  ['draft', DRAFT.glanceText],
]);
```

Add `termAtAGlance: GlanceMonth[];` to `DerivedSchedule`, and in the returned object — after
`rulerTicks`, which it reads:

```ts
    rulerTicks: ticks,
    termAtAGlance: buildTermAtAGlance(ticks, GLANCE_TEXT),
```

That means hoisting the ticks out of the return in Task 4, so both can use them. Immediately
before the `return`:

```ts
  const ticks = buildRulerTicks(stages, today);
```

**Note the one content change this makes:** the old array wrote Stage 6 as `11-12` (a range).
Derived, it reads `11`. That is the correct single date to count from — `dueDateLabel` still
carries "Draft 4 Dec -> final 11-12 Dec" on the card itself.

- [ ] **Step 4: Update `components/bipi/aside.tsx`**

Drop the `TERM_AT_A_GLANCE` import; add `termAtAGlance: GlanceMonth[]` to `AsideProps` and map
over the prop instead. Update the caller in `app/page.tsx`:
`<Aside comingUp={schedule.comingUp} termAtAGlance={schedule.termAtAGlance} />`.

Rewrite the doc comment's third paragraph — it currently explains that the array is hand-synced.

- [ ] **Step 5: Verify and commit**

```bash
npm test && npx tsc --noEmit && npm run lint && npm run build
git add lib/ components/bipi/aside.tsx app/page.tsx
git commit -m "Derive Term at a glance from the ruler ticks

It restated every stage date as a literal under a comment asking a human
to keep them in sync. Phase B cannot template that."
```

---

## Task 7: Derive the crosswalk's `dueBy`

**Files:**
- Modify: `lib/schedule.ts`, `lib/schedule.data.ts`
- Test: `lib/schedule.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
describe('deriveSchedule — reportSections dueBy', () => {
  test('every dated section takes its due date from the stage it maps to', () => {
    const { reportSections, stages } = deriveSchedule(dublinDateTime('2026-09-01T09:00:00'));
    for (const section of reportSections) {
      if (!section.stageId) continue;
      assert.equal(section.dueBy, stages.find((s) => s.id === section.stageId)!.dueDateLabel);
    }
  });

  test('the two 5th-Year sections keep their literal, having no stage to read', () => {
    const { reportSections } = deriveSchedule(dublinDateTime('2026-09-01T09:00:00'));
    assert.equal(reportSections[0].dueBy, '5th Year');
    assert.equal(reportSections[1].dueBy, '5th Year');
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test 2>&1 | tail -20
```

Expected: mismatch — `'25 Sept 2026'` against `'Fri 25 Sept 2026'`.

- [ ] **Step 3: Implement**

In `lib/schedule.data.ts`, remove the `dueBy` key from the five rows of `REPORT_SECTIONS` that
carry a `stageId`. Keep it on the two `alwaysDone` rows. In `lib/schedule.ts`, make `dueBy`
optional on `ReportSectionRow` and resolve it in `reportSectionStatuses`:

```ts
    return {
      ...row,
      dueBy: row.dueBy ?? stage?.dueDateLabel ?? '—',
      status,
      statusLabel: STATUS_LABEL[status],
    };
```

Make `dueBy: string` required on `ReportSectionWithStatus` so consumers still see a string.

- [ ] **Step 4: Check the rendered column**

The crosswalk's "Due by" column now reads `Fri 25 Sept 2026` rather than `25 Sept 2026`. Look at
it at 1280px. If the day name makes the column too wide, drop `Fri ` from the stages'
`dueDateLabel` rather than reintroducing a second literal — one source, one format.

- [ ] **Step 5: Verify and commit**

```bash
npm test && npx tsc --noEmit && npm run lint && npm run build
git add lib/
git commit -m "Derive the crosswalk's due dates from the stages they map to"
```

---

## Task 8: Move the mobile header strings into the data file

**Files:**
- Modify: `lib/schedule.data.ts`, `components/bipi/site-header.tsx:29-30`

- [ ] **Step 1: Add them to `HEADER`**

```ts
export const HEADER = {
  eyebrow: 'BiPi 2026-27 · class schedule',
  /** Mobile short form of `eyebrow` — the header band is too narrow for the long one below 1024px. */
  eyebrowMobile: 'BiPi 2026-27',
  title: 'Biology in Practice Investigation',
  standfirst: 'Membranes, Osmosis & Food Preservation. Six stages, seven report sections, one deadline.',
  gradeChip: '40% of the Biology grade',
  /** Mobile short form of `gradeChip`. */
  gradeChipMobile: '40% of grade',
  nav: ['Right now', 'Timeline', 'Report sections', 'Report rules']
};
```

- [ ] **Step 2: Use them**

In `site-header.tsx`, delete the `MOBILE_EYEBROW` / `MOBILE_GRADE_CHIP` constants and their
comment, and replace the two usages with `HEADER.eyebrowMobile` and `HEADER.gradeChipMobile`.

- [ ] **Step 3: Verify and commit**

```bash
npx tsc --noEmit && npm run lint && npm run build
```

Check the header at 390px — the strings must be identical to before.

```bash
git add lib/schedule.data.ts components/bipi/site-header.tsx
git commit -m "Move the mobile header strings into the data file"
```

---

## Task 9: Search visibility and the site URL

**Files:**
- Create: `app/robots.ts`, `app/sitemap.ts`

- [ ] **Step 1: Create `app/robots.ts`**

```ts
import type { MetadataRoute } from 'next';

import { SITE_URL, hasSiteUrl } from '@/lib/site';

/**
 * Teachers searching for "Biology in Practice Investigation schedule" is a
 * real acquisition channel, and the site is currently invisible to it.
 *
 * The sitemap line is omitted until `NEXT_PUBLIC_SITE_URL` is set, for the
 * same reason `qr-block.tsx` renders nothing without it: pointing crawlers
 * at a placeholder origin is worse than pointing them nowhere.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    ...(hasSiteUrl ? { sitemap: `${SITE_URL}/sitemap.xml` } : {}),
  };
}
```

- [ ] **Step 2: Create `app/sitemap.ts`**

```ts
import type { MetadataRoute } from 'next';

import { SITE_URL, hasSiteUrl } from '@/lib/site';

/** One page today. Phase B turns this into one entry per class. */
export default function sitemap(): MetadataRoute.Sitemap {
  if (!hasSiteUrl) return [];
  return [{ url: SITE_URL, changeFrequency: 'daily', priority: 1 }];
}
```

- [ ] **Step 3: Set `NEXT_PUBLIC_SITE_URL`**

Not a code change. In the Vercel project's environment variables, add
`NEXT_PUBLIC_SITE_URL=https://<the real domain>` with **no trailing slash**, then redeploy. This
is what brings the QR block and the link-preview card alive — both currently render nothing by
design (`lib/site.ts`).

To check locally: `echo 'NEXT_PUBLIC_SITE_URL=https://example.ie' > .env.local`, restart the dev
server, and confirm the QR appears in the footer at 1280px and that scanning it resolves.

- [ ] **Step 4: Verify and commit**

```bash
npm run build
curl -s localhost:3000/robots.txt
```

```bash
git add app/robots.ts app/sitemap.ts
git commit -m "Add robots.txt and sitemap"
```

---

## Final verification

- [ ] All gates green, including under Vercel's timezone:

```bash
npm test && TZ=UTC npm test && npx tsc --noEmit && npm run lint && npm run build
```

- [ ] Browser pass at 390px and 1280px across `?date=2026-09-01`, `2026-10-16`, `2026-11-20`,
  `2026-12-04`, `2026-12-08`, `2026-12-12`, `2027-02-26`, `2027-03-15`: no horizontal scroll at
  320-1920px, heading order h1 → h2 → h3 with no skips, and `--bipi-now` indigo appearing only on
  the current stage, today's marker, and the buffer countdown.

- [ ] `docs/HANDOFF.md` updated: decisions #2 (the "0 days left" flag) and #6 (the missing 4
  December tick) are both resolved by this phase and should say so rather than still reading as
  open questions.

- [ ] The provisional post-term copy (Task 3) has been shown to Katelyn, or is flagged as
  outstanding in the handoff.
