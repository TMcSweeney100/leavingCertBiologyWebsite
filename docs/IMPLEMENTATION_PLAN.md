# BiPi Schedule Hub — Implementation Plan

**Status:** approved, ready to build
**Audience:** the Claude Code session doing the work (this session or a later one)
**Authoritative inputs:** `design_handoff_bipi_schedule/README.md` (the build contract),
`design/BiPi Schedule Hub.dc.html` option `2a` (the visual reference),
`schedule.data.ts` (all content), `tokens.css` (the palette).

Read this file first, then the handoff README. Where they disagree, **this file wins** — it
records decisions taken after the handoff was written, including four AA fixes the handoff's own
audit note anticipated.

---

## 0. Decisions locked

| # | Decision | Chosen | Notes |
|---|---|---|---|
| 1 | Stack | Next.js 16.3.3 App Router, React 19.2.8, Tailwind v4.3.3, shadcn/ui | Already scaffolded in `frontend/`. Deps installed. |
| 2 | Design direction | Option `2a` only | Turn 1 (`1a`/`1b`/`1c`) is superseded history. Ignore it. |
| 3 | Accessibility | Fix the 3 measured AA failures **and** raise the type floor 8.5px → 10px | See §2. Overrides "colours are final". |
| 4 | Audience strip (spec §5.5) | **Not built** | Design `2a` deliberately removed it. Design wins. |
| 5 | Components | **Full shadcn as the handoff specifies** — `Collapsible` and `Progress`, on shadcn's **Base UI** primitive library (`@base-ui/react`), not Radix | Revised during Phase 0: shadcn's CLI defaults changed after this plan was written — `init --defaults` now installs the `base-nova` preset (Base UI-backed), not Radix. Confirmed with the human and kept Base UI rather than forcing Radix back. See §4.3 for the client-boundary discipline this requires, and the shadcn skill's `rules/base-vs-radix.md` for the API differences (`render=` instead of `asChild`, etc.). |
| 6 | Extras in v1 | `?date=` preview override, print stylesheet, QR block, OG link-preview card | All four requested. |
| 7 | Rendering | Dynamic (SSR per request) | See §4.1. |
| 8 | Access control | Public link, no auth | Per spec §1. |
| 9 | Analytics | **None.** No cookies, no third-party scripts | Audience is minors. Non-negotiable per spec §8. |

**Deliberately not used**, so a later session doesn't re-litigate:

- **React Compiler** (`reactCompiler: true`) — stable in Next 16, but it adds Babel to the build
  and this page has almost no re-renders to memoize. Cost without benefit.
- **PPR / `cacheComponents: true`** — changes caching semantics across the whole app to solve a
  problem this page doesn't have. Revisit only if the page ever gets real data fetching.
- **Any animation library** — GSAP/Framer are not needed for two CSS transitions.

---

## 1. What I think of the design

Short version: it's good, and it should be built close to as drawn. It is doing the hard thing
well — the "you are here" moment genuinely is the first thing your eye lands on, and the
`--bipi-now` discipline (indigo reserved *only* for the current stage and today's position,
nothing decorative) is the single best decision in the whole system. It's what makes a page this
dense stay legible. Keep that rule religiously.

Three more things it gets right and that are worth not breaking:

- **The term ruler with real date spacing.** Ticks positioned by actual elapsed time rather than
  evenly, so the October crunch *looks* like a crunch. That's information design, not decoration.
- **Two accents, total.** Indigo "now", green "done", on a cool near-white ground. Most schedule
  UIs end up with five status colours and read like a dashboard.
- **The state pill always carries the word** ("Now" / "Done" / "Upcoming"), never colour alone.

### 1.1 What I'm changing, and why

Four changes. Three are measured accessibility failures; one is a judgement call you approved.
All numbers below are computed WCAG 2.1 contrast ratios, not estimates.

**① `opacity: .72` on done stage cards — fails AA.**

The handoff flagged this as a risk ("verify the resulting contrast still passes, or swap it for
explicit muted colours if the audit complains"). The audit complains:

| Element on a done card | With `opacity: .72` | Required | Result |
|---|---|---|---|
| Title (`--bipi-muted`) | **3.05:1** | 4.5:1 | fail |
| Description (`--bipi-muted`) | **3.05:1** | 4.5:1 | fail |
| "Done" pill (`--bipi-done-ink`) | **4.09:1** | 4.5:1 | fail |

**Fix: delete the `opacity` declaration.** No colour changes needed. Done cards are *already*
muted by explicit colour assignment in the spec (title → `--bipi-muted`, description →
`--bipi-muted`), so the opacity was doubling up on a distinction the palette already made — and
that duplication is exactly what pushed it under the line. Removing it restores **5.37:1** and
the cards still visibly recede.

**② "Upcoming" state pill — fails AA.**

Spec'd as `--bipi-muted` text on a `--bipi-border` background: **4.06:1**, needs 4.5:1.

**Fix: text → `--bipi-ink-2`.** Gives **8.89:1** on the same background. Keeps the pill's quiet
grey fill, just makes the word readable.

**③ `--bipi-tick-idle` (#C4C7CE) — fails non-text contrast.**

**1.69:1** against white, needs 3:1. This one has a nuance worth stating honestly: WCAG 1.4.11
applies to graphics that *carry meaning*, not to decorative hairlines. So:

- `--bipi-border` at 1.32:1 is **fine** — those are dividers and card outlines, structural not
  informational. Leave them alone; darkening them would wreck the design's lightness.
- `--bipi-tick-idle` is **not fine** — it colours the upcoming ruler ticks and the upcoming
  stepper dot's ring, which encode stage state. That's meaning.

**Fix: `--bipi-tick-idle` → `#8E94A1`** (**3.04:1**, the lightest value that passes). Visually
almost identical, one step darker.

**④ Type floor 8.5px → 10px** (your call, and I agree).

8.5px uppercase mono at `.12em` tracking is legible on a 27" monitor and genuinely hard on a
phone on a bus. Affects the state pill and the ruler labels. Expect labels ~15% wider — the
laptop stepper and ruler need a re-check at 1140px after this change (see §6, Phase 6).

### 1.2 Things I'd flag but haven't changed

Not defects — judgement calls I'd rather you make than have me make silently.

**The 4 December draft deadline is nearly invisible.** It's a real hand-in date, and right now it
appears in exactly two places: the laptop-only "Term at a glance" aside, and inside Stage 6's
task list, which is *collapsed by default* until Stage 6 is current. So on a phone in November, a
student cannot see it without tapping. It has no tick on the ruler and no dot on the stepper.

I'd add a sixth tick at 4 Dec labelled "Draft in". It's the one content gap I found. Say the word
and it goes in — it's about fifteen minutes of work (§6, Phase 6).

**"0 days left" on the deadline day reads badly.** The algorithm is right (the stage stays current
through its due date, rolling over the next morning), but the copy is wrong: a student opening
this on 16 October sees a big indigo **0**. Suggested copy, for one day only:

```
days === 0  →  "Due today"      (laptop: replaces the 54px number with the words)
days === 1  →  "1 day left"     (already in the acceptance checklist)
days >= 2   →  "N days left"
```

I'll build this unless you'd rather keep the literal zero.

**Nav pills may wrap at 390px.** Four pills — "Right now / Timeline / Report sections / Report
rules" — measure roughly 340px against ~350px of available width. That's inside the margin of
error for font rendering, so it may land on one row or two. Both are acceptable; it just needs
checking on a real phone rather than assuming (§6, Phase 3).

### 1.3 Interaction and motion — what I'd add

The design says: *"Hover — not designed. Transitions — only the disclosure. Nothing else
animates."* That restraint is correct for this audience and I'm not going to sneak motion past
it. But you asked what would make it more intuitive, so — four candidates, ranked, all opt-in:

**① Sticky mini-banner on mobile.** *(my strongest recommendation)*
Once you scroll past the "You are here" panel, a slim bar sticks to the top: `Stage 4 · 10 days
left`. On a phone the timeline is long, and this is the one piece of information you want
permanently in reach. Pure utility, no decoration. Position-sticky, no JS.

**② One animation, on the term ruler.** *(the one place I'd spend motion)*
On load, the today-marker slides from 0% to its real position over ~400ms, ease-out, once. It
literally draws the term elapsing. It's the only animation on the page that would *encode* the
content rather than dress it up — which is the bar the design sets for `--bipi-now` and should
set for motion too. Fully disabled under `prefers-reduced-motion`.

**③ Scroll-spy on the nav pills.** The pill for the section you're currently in fills in as you
scroll. Standard, quiet, helps orientation on a long page. Modern CSS scroll-driven animation, no
JS, no observer.

**④ Tabular numerals everywhere numbers appear.** `font-variant-numeric: tabular-nums` on the
countdown, dates and mark totals. Stops digits jittering as the countdown ticks down day to day.
Free, invisible, correct — **I'm doing this one regardless**, it's a defect otherwise.

I'd take ①, ②, ④ and leave ③. That's one genuinely useful sticky element, one animation that
means something, and a typographic fix. Tell me if you want more or less.

---

## 2. Verified facts (checked, not assumed)

Things I confirmed against the actual environment so a later session doesn't re-derive them:

- ✅ `node_modules` installed; Next 16.3.3, React 19.2.8, Tailwind 4.3.3, Node v23.10.0.
- ✅ **All three fonts ship with `next/font/google`** — Space Grotesk (variable), Public Sans
  (variable), Space Mono (400/700 static). Self-hosting them means **zero third-party requests**,
  improving on the handoff's "no third-party except the font CDN".
- ✅ **`node --test "lib/**/*.test.ts"` runs TypeScript natively** on Node 23.10 with no test
  dependencies. Note the bare-directory form (`node --test lib/`) does *not* discover `.ts` files —
  the glob is required.
- ✅ `searchParams` is a **Promise** in Next 16 and must be awaited (breaking change from 15).
- ⚠️ **The poster file is missing.** Spec §5.5 and the design brief both reference
  `BiPi_Schedule_Poster.html` as the source for wording. It is not in `docs/`. This does not
  block anything — decision 4 dropped the only section that needed it, and `schedule.data.ts`
  carries all remaining copy — but if you wanted that copy later, the file needs finding.
- ⚠️ **I could not read the SEC PDF** (no `poppler` on this machine, and installing it isn't my
  call). Every SEC fact on the site — the 26 Feb 2027 deadline, 1,500 words, 20 images, the
  200-mark split — comes from `schedule.data.ts` unverified by me. The spec author already
  flagged and resolved the 26th-vs-27th discrepancy in favour of **26 February 2027**. Worth one
  human read-through against the PDF before this goes to 30 students. `brew install poppler` if
  you want me to check it myself.

---

## 3. The one piece of real logic

Everything on this page is static except today's date. That makes the date code the only place a
real bug can hide, so it gets tests.

### 3.1 The handoff's algorithm has a timezone bug

The comment at the foot of `schedule.data.ts` says:

```ts
const today = startOfDay(new Date());   // Europe/Dublin
```

Implemented literally as `d.setHours(0,0,0,0)`, that reads the **server's** timezone, not
Dublin's. **Vercel runs in UTC.** Ireland is UTC+1 from late March to late October — which covers
Stage 3, Stage 4, and half the catch-up window.

Demonstrated, not theorised. A student in Dublin opening the page at 00:30 on 16 October 2026 —
the morning Stage 4 is due:

| Server TZ | `setHours(0,0,0,0)` | `Intl` Europe/Dublin |
|---|---|---|
| **UTC (Vercel)** | "1 days left" ❌ | "0 days left" ✅ |
| America/New_York | "1 days left" ❌ | "0 days left" ✅ |
| Europe/Dublin | "0 days left" ✅ | "0 days left" ✅ |

It reads correct in local dev on an Irish Mac and wrong in production. Worst kind of bug.

### 3.2 The implementation to use

Resolve the Dublin *civil date* first, then do all arithmetic in UTC. No DST hazard, because no
arithmetic ever crosses an offset change:

```ts
const DUBLIN = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Dublin', year: 'numeric', month: '2-digit', day: '2-digit',
});

/** Today in Dublin, as a UTC-midnight epoch. */
export function dublinToday(now: Date = new Date()): number {
  return Date.parse(`${DUBLIN.format(now)}T00:00:00Z`);
}

const day = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
```

Then, per the handoff:

```ts
let i = STAGES.findIndex(s => !s.isAlwaysDone && day(s.dueDate) >= today);
if (i === -1) i = STAGES.length - 1;              // past the end → Stage 6

state = stage.isAlwaysDone ? 'done'
      : i  <  current      ? 'done'
      : i === current      ? 'current'
      :                      'upcoming';

daysLeft   = Math.max(0, Math.round((day(dueDate) - today) / 86_400_000));
termPct    = clamp(2, 100, Math.round((today - day(TERM.start)) / (day(TERM.end) - day(TERM.start)) * 100));
weekNumber = clamp(1, 15, Math.floor((today - day(TERM.start)) / (7 * 86_400_000)) + 1);
```

I have already run this across the whole term. Verified output:

| Date (Dublin) | Stage | Countdown | Term % | Week |
|---|---|---|---|---|
| 1 Sept 2026 | Stage 3 | 24 days left | 2% | 1 |
| 24 Sept, 21:00 | Stage 3 | **1 day left** (singular) | 23% | 4 |
| 25 Sept, 21:00 | Stage 3 (still current on its due date) | 0 days left | 24% | 4 |
| 6 Oct 2026 | Stage 4 | 10 days left | 34% | 6 |
| 24–25 Oct (DST fallback night) | Catch-up | 6 days left | 52% | 8 | 
| 20 Nov 2026 | Stage 6 | 21 days left | 78% | 12 |
| 20 Dec 2026 (past term end) | Stage 6 | 0 days left | 100% | 15 |
| 1 Mar 2027 (past SEC deadline) | Stage 6 | 0 days left | 100% | 15 |

No crashes, no negative countdowns, graceful past both ends. These become the test suite.

### 3.3 Hydration rule

The date is computed **once, on the server**, and passed down as plain props. Client components
must never call `new Date()` — that is how you get a hydration mismatch that flips the current
stage between server HTML and first paint. This is the single most important rule in the build.

---

## 4. Architecture

### 4.1 Rendering strategy — dynamic

The page awaits `searchParams` (for `?date=`), which opts it into dynamic rendering. That is the
right outcome here anyway, on the merits:

- The page does **zero** I/O — no database, no fetch, no filesystem. Rendering is pure function
  calls over a static array. SSR cost is negligible.
- The date is then **always** correct. Static generation would freeze `new Date()` at build time
  and the countdown would be wrong forever; ISR would leave a staleness window over midnight.
- `?date=` testing works in production, which is how you'll verify the term logic before term
  starts.

If function invocations ever somehow matter, the lever is `export const revalidate = 600` and
moving `?date=` to a separate route. Don't reach for it pre-emptively.

### 4.2 File layout

```
frontend/
├── app/
│   ├── layout.tsx              fonts, <html lang="en-IE">, metadata, color-scheme: light
│   ├── page.tsx                server component — awaits searchParams, derives, composes
│   ├── globals.css             Tailwind v4 @theme, BiPi tokens, shadcn bridge, @media print
│   └── opengraph-image.tsx     next/og link-preview card
├── components/
│   ├── ui/                     shadcn primitives (card, badge, progress, collapsible, table, button)
│   └── bipi/
│       ├── site-header.tsx         header, grade chip, nav pills
│       ├── stepper.tsx             laptop-only 7-column stage stepper
│       ├── you-are-here.tsx        the panel — mobile and laptop variants
│       ├── term-progress.tsx       mobile 6px bar (shadcn Progress)
│       ├── term-ruler.tsx          laptop ruler, real date spacing + edge clamping
│       ├── sticky-now-bar.tsx      mobile sticky mini-banner  [suggestion ①]
│       ├── completed-strip.tsx     Stages 1–2, static
│       ├── timeline.tsx            rail + dots, maps the five cards
│       ├── stage-card.tsx          ⚠️ the only client component — Collapsible disclosure
│       ├── report-crosswalk.tsx    all seven sections, live status (shadcn Table)
│       ├── report-rules.tsx        the 8 rules
│       ├── marks-card.tsx          the 200-mark split
│       ├── aside.tsx               laptop sticky column — Coming up + Term at a glance
│       ├── qr-block.tsx            build-time inline SVG QR
│       └── site-footer.tsx         SEC deadline, buffer note, disclaimer
└── lib/
    ├── schedule.data.ts        content — copied from the handoff, unmodified
    ├── schedule.ts             pure derivation functions (§3.2)
    ├── schedule.test.ts        the table in §3.3, as assertions
    └── site.ts                 SITE_URL and other constants
```

**`schedule.data.ts` is copied across byte-for-byte.** Editing that one file — and nothing else —
must remain enough to reuse the site for next year's cohort. That is a hard requirement from spec
§7, and it is the thing most likely to get quietly broken by a later session inlining a date
somewhere. Don't.

### 4.3 Client boundary

Decision 5 puts Radix `Collapsible` in the tree, which means `stage-card.tsx` carries
`"use client"`. Keep that boundary as small as it can be:

- **Only** `stage-card.tsx` is a client component. Everything else stays a server component.
- Pass **primitives** into it — `state`, `isOpen`, pre-formatted date strings — never `Date`
  objects and never the whole `Stage`. (Vercel `server-serialization`: minimise what crosses the
  boundary.)
- Render the current stage **server-side already open**, so its teacher checkpoint is in the
  initial HTML. The handoff requires that checkpoint be reachable, and this is what makes it
  reachable with JS disabled too.
- Panels are **independent** — opening one must not close another. Do not use `Accordion`, which
  is single-open by default. `Collapsible`, one instance per card, local state.

**Known, accepted trade-off:** with Radix rather than native `<details>`, stage detail for the
*non-current* stages is unreachable with JS disabled. The timeline, all dates, and the full
crosswalk remain readable, which is what spec §8 actually requires, and the handoff explicitly
treats `<details>` as optional. Flagging it so nobody discovers it later and thinks it's a bug.

### 4.4 Tokens

Tailwind v4 is CSS-first — there is no `tailwind.config.js`. All tokens live in `globals.css`.

Two traps to avoid:

1. **`shadcn init` will overwrite `globals.css`** with its own `--background`/`--foreground`/
   `--primary` set. Run `shadcn init` **first**, then layer the BiPi tokens on top and map
   shadcn's semantic variables onto them (`--background: var(--bipi-bg)`, etc.). Doing it the
   other way round loses the palette.
2. **The scaffold's dark-mode block must go.** `app/globals.css` currently has a
   `@media (prefers-color-scheme: dark)` block from `create-next-app`. This design is light-only;
   leave that in and the page inverts on every phone set to dark mode. Delete it and set
   `color-scheme: light` on `<html>` so browser chrome (scrollbars, form controls) stays light
   too.

The design uses half-pixel type sizes (12.5px, 11.5px, 9.5px). Rather than a wall of
`text-[12.5px]`, define a named scale in `@theme` so the markup stays readable:

```css
@theme {
  --text-display-xl: 54px;  /* laptop countdown */
  --text-display-lg: 38px;  /* laptop h1 */
  --text-body:       12.5px;
  --text-label:      10px;  /* ← the raised floor, was 8.5px */
  /* …etc */
}
```

---

## 5. Build order

Ten phases. Each ends with something checkable — don't move on until it is checked.
Phases 1–2 are the foundation; if the date logic is wrong everything above it is decoration.

| # | Phase | Deliverable | Gate |
|---|---|---|---|
| **0** | Clean scaffold | Delete boilerplate `page.tsx`, strip the dark-mode block, delete unused `public/*.svg`, `shadcn init`, layer tokens, wire the three fonts via `next/font` | `npm run dev` serves a blank page with the right background and fonts |
| **1** | Data + logic | `schedule.data.ts` copied verbatim; `schedule.ts` per §3.2 | — |
| **2** | **Tests** | `schedule.test.ts` asserting all 8 rows of the §3.3 table | `npm test` green. **Hard gate — do not proceed past a red suite.** |
| **3** | Header + shell | Header, grade chip, nav pills, `scroll-margin-top` on anchors, footer | Renders at 390px; check whether nav pills wrap (§1.2) |
| **4** | Stage card, static | All three states, mobile, no disclosure yet | Three states visually distinct; run the §1.1 fixes ①②④ here |
| **5** | You are here + progress | Panel, countdown, mobile progress bar, `Next up` row, sticky mini-banner ① | `?date=` moves it correctly through all five test dates |
| **6** | Laptop layout | Stepper, term ruler with edge clamping, two-column grid, sticky aside, ruler animation ② | December tick does not overhang at **1140 / 1280 / 1440px**. Re-check stepper spacing after the 10px type floor |
| **7** | Disclosure | `Collapsible` per card, current open on load, independent panels, reduced-motion | Open two cards — the first must stay open. Toggle with keyboard only |
| **8** | Remaining sections | Crosswalk with live status, report rules, marks card, completed strip | Crosswalk "Due now" tracks `?date=` |
| **9** | Extras + polish | Print stylesheet, QR block, OG image, tabular numerals ④ | See §6 |

### Notes on the extras (Phase 9)

- **Print** — `@media print`: force every disclosure open, drop nav/aside/sticky bar, black text,
  hairline rules, print the URL in the footer. Target 1–2 A4 pages portrait.
- **QR** — generate at build time as inline SVG in a server component (the `qrcode` package,
  `toString({ type: 'svg' })`). No runtime dependency, no CDN call, nothing ships to the client.
  **Blocked on the final URL** — build it against `SITE_URL` in `lib/site.ts` and set that value
  before the QR is meaningful. This is the last thing to do.
- **OG card** — `app/opengraph-image.tsx` via `next/og`, showing title, subtitle and the current
  stage. Needs a raw `.ttf` for Space Grotesk vendored into the repo (`next/og` can't read
  `next/font`). **Caveat worth knowing:** WhatsApp and Teams cache link previews aggressively, so
  the stage shown in a preview may lag reality by days. The title and deadline will always be
  right. If that bothers you, drop the stage line and make the card fully static.

---

## 6. Acceptance checklist

The handoff's list, plus what this plan adds. Every box gets *checked*, not assumed — with the
`?date=` override there is no excuse for guessing.

**Correctness**
- [ ] Current stage correct at 1 Sept, 6 Oct, 30 Oct, 20 Nov, 20 Dec — via `?date=`
- [ ] Correct when `TZ=UTC` (i.e. as Vercel runs it), not just on an Irish Mac
- [ ] Countdown reads "**1 day left**", singular, on 24 Sept
- [ ] Reads "Due today" on a deadline day *(if you approve the §1.2 copy change)*
- [ ] Past 12 Dec and past 26 Feb 2027: falls back to Stage 6, no crash, no negative countdown
- [ ] Crosswalk shows all seven sections with a live "Due now" on the current one
- [ ] `npm test` green; `npm run build` clean; no TypeScript or ESLint errors

**Design fidelity**
- [ ] `--bipi-now` appears **nowhere** except the current stage and today's marker
- [ ] Current stage card open on load, teacher checkpoint visible without interaction on mobile
- [ ] Opening a second stage does not close the first
- [ ] December ruler tick does not overhang at 1140px, 1280px **and** 1440px
- [ ] No horizontal scroll at 320px, 390px or 768px

**Accessibility**
- [ ] The four §1.1 fixes applied — verify with a contrast checker, don't trust the plan
- [ ] Disclosure triggers are real `<button>`s with `aria-expanded` + `aria-controls`
- [ ] Whole page operable by keyboard; focus rings visible everywhere; nothing hidden behind the sticky bar
- [ ] Heading order runs h1 → h2 → h3 with no skips
- [ ] `prefers-reduced-motion` disables the disclosure transition and the ruler animation
- [ ] State never conveyed by colour alone — the pill always carries its word

**Privacy & performance**
- [ ] **Zero** third-party requests — fonts self-hosted, no analytics, no cookies
- [ ] Timeline, dates and crosswalk readable with JavaScript disabled
- [ ] Lighthouse ≥ 95 on Performance and 100 on Accessibility

**Content**
- [ ] Footer states the SEC date, the ~10-week buffer, and that this is a class schedule
- [ ] SEC facts spot-checked against the PDF by a human (§2)
- [ ] Editing only `schedule.data.ts` still changes every date on the page

---

## 7. Open, non-blocking

Not needed to start. Answer whenever.

1. **Deploy** — Vercel, presumably, but I won't push anything live without you saying so. The QR
   block and OG card both need the final URL, so they're the natural last step.
2. **The 4 Dec draft tick** (§1.2) — add it or leave it?
3. **"Due today"** (§1.2) — take the copy change or keep the literal `0`?
4. **Motion suggestions** (§1.3) — I'm planning to build ①, ②, ④ and skip ③. Say if you'd rather
   have none of it, or all of it.
5. **Reuse by other teachers** — out of scope for v1 per the spec, and the data file is already
   structured so it'd be a small job later. Nothing to do now.
