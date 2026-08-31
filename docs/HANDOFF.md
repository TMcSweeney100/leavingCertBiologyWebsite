# Handoff — start here

Quick status snapshot for whoever (whatever session) picks this up next. `docs/CLAUDE.md`
and `docs/IMPLEMENTATION_PLAN.md` are the real, maintained references — read those for
detail. This file is just "where are we" so you don't have to reconstruct it from git log.

## Status

**Phases 0-6 of `docs/IMPLEMENTATION_PLAN.md` are done and committed to `main`.** Working tree
is clean. `npm run lint`, `npm run build` and `npm test` (31/31) all pass at HEAD, and the suite
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
- Phase 6 — `stepper.tsx` (laptop 7-column, in the header band), `term-ruler.tsx` (real date
  spacing, edge clamping, the §1.3② entry animation), `aside.tsx` (sticky "Coming up" + "Term at
  a glance"), the two-column timeline grid, the laptop stage-card layout, and `stage-dot.tsx`
  extracted so the rail and the stepper share one dot. The last outstanding §1.1 accessibility
  fix — ③, `--bipi-tick-idle` — landed with it.

Both gates are met, checked in a headless browser rather than assumed:

- **Phase 5** — `?date=` moves the page correctly at 1 Sept / 24 Sept / 25 Sept / 6 Oct / 30 Oct /
  20 Nov / 20 Dec / 1 Mar, plus an unparseable value (falls back to the real clock).
- **Phase 6** — no ruler tick overhangs its band at 1024 / 1140 / 1280 / 1440 / 1600px on any of
  those dates (the December tick, at 99.02%, is the one the plan names); the stepper's seven
  columns fit with no clipped label at 1024 / 1140 / 1280 after the 10px type floor; the ruler
  animation runs once and is fully suppressed under `prefers-reduced-motion`, landing on the
  identical final position either way.

Across both: no horizontal scroll at 320 → 1920px; heading order runs h1 → h2 → h3 with no skips
at either breakpoint; every new colour pairing measured (lowest 4.60:1, the laptop countdown
caption at `opacity:.85` — the design's own value, and it passes).

## Decisions taken in these two phases that a human should confirm

Mostly plan §7's open questions, answered the way the plan's author said they would answer them.
All are cheap to reverse — say the word.

1. **"Due today"** replaces the literal `0` on a deadline day (§1.2). Built.
2. **Past a deadline it still reads "0 days left"** — reachable only after 11 Dec, where the last
   stage stays current forever. "Due today" would be false there, and anything better ("Deadline
   passed", "Term complete") is new copy nobody has approved. Flagging rather than inventing.
3. **"Next up" is omitted on the last stage** rather than pointing back at the stage you are
   already on, which is what the design prototype does. Same for the aside's "Coming up" card.
4. **Motion**: ① (sticky mini-banner), ② (ruler entry) and ④ (tabular numerals) are built, ③
   (scroll-spy on the nav pills) is not — exactly what plan §1.3 proposed.
5. **`--bipi-tick-idle` is one step darker than the plan's own `#8E94A1`.** The plan measured
   that value against white, which is right for the ruler; the same token now also colours the
   timeline rail's upcoming dot, which sits on the page ground, where `#8E94A1` is 2.81:1. The
   value used measures 3.25:1 on white and 3.00:1 on the page ground. Visually a hair darker.
6. **Still open, and untouched:** the **4 December draft tick** on the ruler (plan §1.2's one
   content gap). It is not there. The date does now appear in the laptop aside's "Term at a
   glance", but on a phone in November it is still only inside Stage 6's task list. Roughly
   fifteen minutes of work if you want it.

## What's next: Phase 7 — the disclosure

Deliverable: a `Collapsible` per stage card, the current stage rendered **server-side already
open**, panels independent, and the reduced-motion path. Gate: open two cards and the first must
stay open; the whole thing must work with the keyboard alone.

What to know before starting:

- `stage-card.tsx` is where `"use client"` finally lands, and per plan §4.3 it should stay the
  only file under `components/bipi/` that has it. Pass primitives across the boundary, never
  `Date` objects or the whole `Stage`.
- It is **Base UI, not Radix** (`render=` instead of `asChild`) — read
  `.claude/skills/shadcn/rules/base-vs-radix.md` before writing the trigger.
- Do **not** use `Accordion`; it is single-open by default and the panels must be independent.
- The card already renders every field that belongs inside the panel (description on mobile,
  tasks, both insets) — Phase 7 wraps them, it does not add content. The trigger copy is
  "What this involves +" / "Hide detail —", `min-height: 34px` on mobile.
- The mobile hint copy "Tap a stage for what it involves." is already on the page and currently
  promises an interaction that does not exist yet. Phase 7 makes it true.

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
