# Handoff — start here

Quick status snapshot for whoever (whatever session) picks this up next. `docs/CLAUDE.md`
and `docs/IMPLEMENTATION_PLAN.md` are the real, maintained references — read those for
detail. This file is just "where are we" so you don't have to reconstruct it from git log.

## Status

**All ten phases of `docs/IMPLEMENTATION_PLAN.md` are built.** Phases 0-8 are on `main` and
tagged **`v1`** — that is the whole site the spec asks for. Phase 9 (the extras: print stylesheet,
QR block, OG card) is on the **`phase-1.1`** branch, not merged, waiting on a look from a human.
`npm run lint`, `npx tsc --noEmit`, `npm run build` and `npm test` (39/39) pass on both, and the
suite also passes under `TZ=UTC` (i.e. as Vercel runs it).

**Phase A** (`docs/superpowers/plans/2026-09-01-phase-a-make-it-correct.md`) is built on the
**`phase2.0`** branch, not merged — same pattern as Phase 9/`phase-1.1` above. It fixes the
eleven-week post-term countdown bug (decision #2 below), adds the 4 December draft tick to the
laptop ruler and aside (decision #6), and adds `robots.ts`/`sitemap.ts`. `npm run lint`, `npx tsc
--noEmit`, `npm run build` and `npm test` (60/60, up from 39/39) all pass on `phase2.0`, and the
suite passes under `TZ=UTC` there too.

**The one thing standing between this and a deploy: `NEXT_PUBLIC_SITE_URL`.** Set it in the
Vercel project (no trailing slash) and the QR block appears and link previews resolve. Until
then both are deliberately absent rather than wrong — see `lib/site.ts`.

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
- Phase 7 — the disclosure. `components/ui/collapsible.tsx` (shadcn registry, unmodified) and
  `components/bipi/stage-disclosure.tsx`, the site's **only** client component; `stage-card.tsx`
  stays a server component and hands the panel its contents as `children` (see "Decisions" #7).
  Trigger copy flips "What this involves +" / "Hide detail —", the current stage is open in the
  server-rendered HTML, panels are independent, and the mobile hint "Tap a stage for what it
  involves." is now true.
- Phase 8 — the remaining sections. `report-crosswalk.tsx` (all seven sections; a real `<table>`
  with scoped headers on laptop, a three-column list on mobile), `report-rules.tsx` (the eight
  SEC rules as a `<dl>`), `marks-card.tsx` (the 200-mark split), `completed-strip.tsx` (Stages
  1-2), plus `section-heading.tsx`, which the three section headings now share. The crosswalk's
  live status is derived in `lib/schedule.ts` (`reportSections`) and tested there. `#report-
  sections` and `#report-rules` exist, so all four nav pills now land somewhere.
- Phase 9 *(branch `phase-1.1`)* — the extras. A print stylesheet (`@media print` at the foot of
  `globals.css` plus `print:` utilities at call sites), `qr-block.tsx` (build-time inline SVG, no
  third-party service), `app/opengraph-image.tsx` with two `.ttf` faces vendored in
  `assets/fonts/`, and `lib/site.ts` holding the one environment variable the site has.

All five gates are met, checked in a headless browser rather than assumed:

- **Phase 5** — `?date=` moves the page correctly at 1 Sept / 24 Sept / 25 Sept / 6 Oct / 30 Oct /
  20 Nov / 20 Dec / 1 Mar, plus an unparseable value (falls back to the real clock).
- **Phase 6** — no ruler tick overhangs its band at 1024 / 1140 / 1280 / 1440 / 1600px on any of
  those dates (the December tick, at 99.02%, is the one the plan names); the stepper's seven
  columns fit with no clipped label at 1024 / 1140 / 1280 after the 10px type floor; the ruler
  animation runs once and is fully suppressed under `prefers-reduced-motion`, landing on the
  identical final position either way.
- **Phase 7** — 28 automated browser checks, all green, at 390px and 1280px: only the current
  stage open on load (and it tracks `?date=` at 1 Sept / 25 Sept / 16 Oct / 30 Oct / 20 Nov /
  20 Dec / 1 Mar); opening a second and a third card leaves the earlier ones open; every trigger
  is a real `<button>` whose `aria-controls` resolves whether open or closed; Tab reaches all
  five, Enter opens and Space closes, and the focus ring is a visible 2px outline; hit targets
  measure 34px on mobile and 30px on laptop; the description sits inside the panel on mobile and
  outside it on laptop; the height transition runs at 180ms and `prefers-reduced-motion` turns it
  off, both landing on the identical final height; with JavaScript disabled the current stage is
  still open and the whole timeline still readable; no horizontal scroll at 320-1920px with every
  panel open; trigger text measures 5.66:1.
- **Phase 8** — 17 automated browser checks, all green: the gate itself (the crosswalk's "Due
  now" and "Done" track `?date=` across eight dates, including both boundary days and the
  after-term fallback); all seven sections in the data file's order; the laptop table's scoped
  headers and its exact `56 / 1.5fr / 1fr / 1fr / 100` column ratio; the eight rules and the four
  mark bands summing to the brief's 200; `COMPLETED_STRIP` rendered verbatim; every nav pill
  landing on a real target; no heading-order skips at either breakpoint; every new colour pairing
  at or above 4.5:1; no horizontal scroll 320-1920px; and the whole crosswalk, its live status
  and the rules all readable with JavaScript disabled.
- **Phase 9** — 13 automated checks: in print, all five stage panels forced open, triggers, nav,
  aside and sticky bar gone, footer text black rather than white-on-a-dropped-background, and the
  QR and its URL on the sheet; on screen, the QR rendering as inline SVG in the footer, following
  `currentColor`, laptop-only, with **zero third-party requests on the page**; and the
  `opengraph-image` route returning a PNG that the page advertises with a large twitter card. The
  card itself was rendered and looked at, not just status-checked.

Across both: no horizontal scroll at 320 → 1920px; heading order runs h1 → h2 → h3 with no skips
at either breakpoint; every new colour pairing measured (lowest 4.60:1, the laptop countdown
caption at `opacity:.85` — the design's own value, and it passes).

## Decisions taken in these phases that a human should confirm

Mostly plan §7's open questions, answered the way the plan's author said they would answer them.
All are cheap to reverse — say the word.

1. **"Due today"** replaces the literal `0` on a deadline day (§1.2). Built.
2. **Past a deadline it still reads "0 days left"** — resolved by Phase A. `DerivedSchedule` now
   carries a `phase` discriminator (`in-term` / `buffer` / `closed`); `buffer` counts down to the
   real SEC deadline (26 Feb 2027) instead of clamping at zero, and `closed` shows a plain, honest
   "coursework submitted" state.
3. **"Next up" is omitted on the last stage** rather than pointing back at the stage you are
   already on, which is what the design prototype does. Same for the aside's "Coming up" card.
4. **Motion**: ① (sticky mini-banner), ② (ruler entry) and ④ (tabular numerals) are built, ③
   (scroll-spy on the nav pills) is not — exactly what plan §1.3 proposed.
5. **`--bipi-tick-idle` is one step darker than the plan's own `#8E94A1`.** The plan measured
   that value against white, which is right for the ruler; the same token now also colours the
   timeline rail's upcoming dot, which sits on the page ground, where `#8E94A1` is 2.81:1. The
   value used measures 3.25:1 on white and 3.00:1 on the page ground. Visually a hair darker.
6. **Resolved by Phase A, on laptop only.** The 4 December draft tick (plan §1.2's content gap)
   now appears on both the laptop term ruler (`TermRuler`, inside `you-are-here.tsx`) and the
   laptop aside's "Term at a glance" — `hidden lg:block` and `hidden lg:grid` respectively — both
   derived from one source (`rulerTicks`) so they can't drift apart. On a phone it is still only
   inside Stage 6's collapsed task list, unchanged from before Phase A.
7. **`"use client"` went on a new `stage-disclosure.tsx`, not on `stage-card.tsx`** as plan §4.3
   and this file previously said it would. Same rule in spirit — one client file under
   `components/bipi/`, everything else a server component — but the boundary is smaller: the card
   and all five panels' copy stay server-rendered and reach the client component as `children`,
   so nothing but an id and a boolean is serialised as props. This is also what the design
   README's progressive-enhancement line asks for ("let *only the disclosure toggles* hydrate").
   Reversible, but reversing it makes the boundary bigger, not smaller.
8. **The panel is `keepMounted`**, so closed panels are in the DOM (with `hidden`) rather than
   unmounted. Two reasons: Base UI omits `aria-controls` entirely while a panel is unmounted, and
   plan §5's Phase 9 print stylesheet has to force every disclosure open — CSS cannot reveal
   markup that was never rendered. Costs a little page weight, nothing else.
9. **The print sheet is 5 A4 pages, not the plan's 1-2.** That target predates the content it has
   to carry: five stage cards with their task lists and teacher checkpoints, seven crosswalk rows,
   eight rules and the mark bands. At a readable size on paper they do not fit two sheets. It is
   compressed as far as it goes without cutting anything (90% type, no page gutters, two-column
   tasks, clean breaks so no stage card is split), and the two ways to go further are both content
   decisions rather than tuning: drop the task lists in print (≈3 pages), or let cards split across
   page boundaries (≈4). Say which, if either.
10. **The QR block is laptop-and-print only, and it is absent entirely until
   `NEXT_PUBLIC_SITE_URL` is set.** On a phone you are already on the page; and a QR code that
   resolves to a placeholder is worse than no QR code.
11. **The OG card names the current stage**, as plan §5 proposed. Worth knowing: WhatsApp and
   Teams cache link previews hard, so the stage line someone sees can be days stale — the title
   and the SEC deadline never are. Deleting that one block makes the card fully static if that
   ever bothers anyone. Since Phase A, it also has a sensible fallback once there is no current
   stage: post-term it names the phase instead — "All six stages complete" or "Coursework
   submitted" — rather than a stale or broken stage reference.
12. **`POST_TERM`'s wording is provisional.** The buffer/closed panel copy (`lib/schedule.data.ts`,
   the `POST_TERM` export) has not yet been shown to the class teacher (Katelyn) for sign-off.
   Approving different wording is a one-line edit there.

## What's next

Nothing in the plan is unbuilt. What is left is decisions and a deploy:

1. **Review `phase-1.1` and merge it** (or say what to change first). It touches `globals.css`,
   the footer, and adds three files; nothing in it changes what the site says.
2. **Set `NEXT_PUBLIC_SITE_URL`** and deploy — plan §7's first open question. The QR block and
   the link-preview card both come alive at that point, and nothing else needs editing.
3. **Answer the open decisions above**, in particular the draft tick's remaining mobile gap (#6,
   laptop-only so far) and the print page count (#9). Both are small, and both are content calls
   rather than code problems.
4. **Spot-check the SEC facts against the PDF** (plan §6, "Content") — the one acceptance item
   that has to be done by a human who knows the brief, and it has not been done.
5. **Get Katelyn's sign-off on the `POST_TERM` copy** (decision #12) — the buffer/closed panel
   wording in `lib/schedule.data.ts` is provisional placeholder text, not yet reviewed.

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
