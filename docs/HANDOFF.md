# Handoff — start here

Quick status snapshot for whoever (whatever session) picks this up next. `docs/CLAUDE.md`
and `docs/IMPLEMENTATION_PLAN.md` are the real, maintained references — read those for
detail. This file is just "where are we" so you don't have to reconstruct it from git log.

## Status

**Phases 0-5 of `docs/IMPLEMENTATION_PLAN.md` are done and committed to `main`.** Working tree
is clean. `npm run lint`, `npm run build` and `npm test` (23/23) all pass at HEAD, and the suite
also passes under `TZ=UTC` (i.e. as Vercel runs it).

- Phase 0 — clean scaffold, shadcn init (Base UI, not Radix — see Decision #5), BiPi tokens, fonts.
- Phase 1+2 — `lib/schedule.data.ts` (verbatim content) + `lib/schedule.ts` (Dublin-timezone-safe
  derivation logic) + `lib/schedule.test.ts` (the plan's §3.3 table).
- Phase 3 — `components/bipi/site-header.tsx`, `site-footer.tsx`.
- Phase 4 — `stage-card.tsx` (all 3 states, mobile only, no disclosure yet), `timeline.tsx`
  (rail/dots), the 3 §1.1 accessibility fixes applied and contrast-verified.
- Phase 5 — `you-are-here.tsx` (panel, mobile + laptop), `term-progress.tsx` (mobile bar, on
  shadcn `Progress`), `sticky-now-bar.tsx` (§1.3 suggestion ①), real `?date=` handling in
  `app/page.tsx`, and the `#timeline` section chrome. `PHASE_4_PREVIEW_DATE` is gone.

Phase 5's gate is met: `?date=` moves the page correctly through all of the plan's test dates,
checked against rendered HTML at 1 Sept / 24 Sept / 25 Sept / 6 Oct / 30 Oct / 20 Nov / 20 Dec /
1 Mar, plus an unparseable value (falls back to the real clock). No horizontal scroll at 320,
390, 768, 1024, 1140, 1280 or 1440px; heading order runs h1 → h2 → h3 with no skips at both
breakpoints; every new colour pairing was measured (lowest is 4.60:1, the laptop countdown
caption at `opacity:.85` — the design's own value, and it passes).

## Three decisions taken in Phase 5 that a human should confirm

These were plan §7's open questions, answered the way the plan's author said they would answer
them. All three are cheap to reverse — say the word.

1. **"Due today"** replaces the literal `0` on a deadline day (§1.2). Built.
2. **Past a deadline it still reads "0 days left"** — reachable only after 11 Dec, where the last
   stage stays current forever. "Due today" would be false there, and anything better ("Deadline
   passed", "Term complete") is new copy nobody has approved. Flagging rather than inventing.
3. **"Next up" is omitted on the last stage** rather than pointing back at the stage you are
   already on, which is what the design prototype does.

## What's next: Phase 6 — laptop layout

Deliverable: the 7-column stage stepper, the term ruler with real date spacing and edge clamping,
the two-column timeline grid, the sticky aside, and the ruler animation (§1.3 suggestion ②).
Gate: the December tick must not overhang at **1140 / 1280 / 1440px**, and the stepper needs a
re-check after the 10px type floor.

Two things Phase 5 deliberately left for it:

- **The laptop panel currently has no term progress inside it.** The mobile 6px bar is
  `lg:hidden`, exactly as README §3 specifies, because the laptop treatment of that same number
  is the ruler — Phase 6's job. `components/ui/progress.tsx` already takes `trackClassName` /
  `indicatorClassName` so the 2px ruler track comes off the same primitive.
- **The laptop "Coming up" aside.** The mobile "Next up" row is also `lg:hidden` for the same
  reason: on laptop that information belongs to the sticky aside column.

## Working pattern used in earlier sessions (worth continuing)

Each phase: dispatch an implementer subagent with the full task spec inlined (not "go read the
plan") → an independent spec-compliance reviewer → an independent code-quality reviewer → fix
findings → verify (lint/build/test, and for UI phases an actual headless-browser render —
Playwright is available via `npx playwright` even though it's not a project dependency) → commit.

Two things worth knowing:
- Earlier sessions hit the Claude usage rate limit repeatedly. When a subagent gets cut off
  mid-task, check `git status`/`git diff` before redispatching — it may have already written real
  files worth keeping. `SendMessage` to the same agent resumes it with full context.
- shadcn's CLI defaults changed since the plan was first written (now defaults to Base UI, not
  Radix) — already resolved and documented in the plan and in `docs/CLAUDE.md`, but if you're
  ever surprised by an API on a `Collapsible`/`Progress`/etc. component in Phase 7+, check
  `.claude/skills/shadcn/rules/base-vs-radix.md` before assuming Radix conventions.
