# UI standards — building the pilot app's front end

**Who this is for:** the coding agent (or a developer) planning or implementing any app page or component under `frontend/app/(app)`, `frontend/app/(auth)` and `frontend/components/app/`. Read it when writing a plan task that touches UI, when building a page plain, and when restyling from a design pack. `UI-BRIEF.md` says what the design must achieve; this file says how it is built; `UI-CHECKLIST.md` is the pass before you say it's done.

These rules are merged from three sources the project used on the BiPi prototype (the `frontend-design` skill, Vercel's Web Interface Guidelines, and `ui-ux-pro-max`), cut to what applies to a light-only Next.js 15 + Tailwind 4 + shadcn web app, and corrected where the BiPi build learned something. Where a rule here disagrees with one of those skills, this file wins.

The live BiPi schedule (`app/[class]/`, `components/bipi/`) has its own notes in `frontend/BIPI-SITE-NOTES.md`. Don't restyle it from here.

---

## 1. Where things live

| What | Where | Rule |
|---|---|---|
| Design tokens | `frontend/app/globals.css` | `--bipi-*` values are the live schedule's and never change. The app's own tokens are `--app-*` (from the D-1/D-2 `tokens.css`; `UI-BRIEF.md` §5), exposed as Tailwind colours (`bg-app-accent`, `text-app-muted`…). shadcn's semantic variables (`--primary`, `--ring`, `--destructive`…) are re-pointed at the app tokens **only inside `.app-theme`**, the wrapper the `(app)` and `(auth)` layouts render. `:root` keeps them on BiPi values because the live schedule uses `bg-card`, `text-muted-foreground` and `Progress`. Never raw hex in a component. |
| Type scale | `@theme` block in `globals.css` | Named `--text-app-*` steps, separate from the BiPi ones. |
| Fonts | `frontend/app/layout.tsx` via `next/font/google` | Resolve through `--bipi-font-display/-body/-label`. Never write a family name as a string. |
| Primitives | `frontend/components/ui/` (shadcn on Base UI) | Add with `npx shadcn@latest add <name>`; restyle through tokens and `cva` variants, not by editing markup in call sites. |
| App components | `frontend/components/app/` | Client components that call `api` then `router.refresh()`. Each has a `*.spec.tsx` that queries by role and accessible name. |
| Pages | `frontend/app/(app)`, `(auth)` | Server components that load through `serverApi` inside `attempt()` and render `ErrorPanel` on failure. |
| Design packs | `docs/design/pilot/<pack>/` | Read `NOTES.md` first. Anything there that changes behaviour is a roadmap §6.2 change and goes first. |

## 2. Tokens and Tailwind: rules learned the hard way

- **Never put a custom `--text-*` size and a `text-*` colour through the same `cn()` call.** tailwind-merge doesn't know the `@theme` sizes and drops one. Build such class strings with a template literal, or pass `text-[length:var(--text-body)]`.
- **Two `--text-*` steps must never land on one element.** Tailwind's CSS order decides, not the class string. Responsive pairs (`text-body lg:text-title`) are fine.
- **No raw colour in a component.** If a colour has no token, add the token.
- **`transition-[height,opacity]`, never `transition-all`.** List the properties.
- **Focus rings come from `--ring`** (`focus-visible:ring-3 focus-visible:ring-ring/50` is shadcn's default and is fine). Never `outline-none` without a `focus-visible:` replacement on the same element.
- **Reduced motion at the call site:** `motion-reduce:transition-none` or `motion-reduce:animate-none` on the animated element. Note the former zeroes `transition-property`, so tests must not check `transitionDuration`.
- **Print** is a BiPi concern. App pages don't need print styles unless a design pack says so.

## 3. Layout and responsive

- Design and build at 390px first, then 1024px+ (`lg:`). Those are the two Playwright projects (`phone` = Pixel 7, `laptop` = Desktop Chrome) and the two frames every pack draws.
- 16–20px side gutters on phones, 40px on laptops. Content max width `max-w-6xl` on laptop pages; reading columns `max-w-prose` (about 65 characters).
- No horizontal scroll, ever. Tables that can't fit wrap into cards on phones or scroll inside their own `overflow-x-auto` container, never the page.
- Flex children that hold text get `min-w-0`; long tokens (usernames, codes, links) get `break-words` or `overflow-wrap: anywhere`. Never `break-all` on prose.
- `min-h-dvh`, not `100vh`.
- Spacing on a 4px rhythm. Section spacing tiers (for instance 16 / 24 / 32 / 48) chosen once in the first pack and reused.
- Sticky headers must not cover a focused control. If the header is sticky, headings get `scroll-margin-top`.
- Reserve space for anything that loads late so nothing jumps (Cumulative Layout Shift under 0.1). In practice: server-render the data, don't fetch on the client after paint.

## 4. Typography

- Body 16px, line-height 1.5. Inputs 16px (smaller zooms iOS). Nothing under 12px, and 12px only for labels and meta.
- One display family (Space Grotesk, 600–700), one body family (Public Sans, 400 and 600), the mono (Space Mono) for codes, dates and small labels only.
- Headings in sentence case, `text-balance` (or `text-pretty`) to avoid widows. One `<h1>` per page; levels never skip.
- Numbers that line up (counts, days remaining, dates in a column) use `tabular-nums`.
- Typographic characters: `…` not `...`, curly quotes in copy, `&nbsp;` between a number and its unit. Straight apostrophes in JSX copy are fine and are what the specs assert.
- Prefer wrapping to truncation. If something must truncate, `truncate` or `line-clamp-*` with the full text reachable (title attribute or an expand).

## 5. Colour

- Light only. `color-scheme: light` stays on `<html>`; no `.dark` values, no theme toggle.
- The app's palette is its own (`UI-BRIEF.md` §5, roadmap R25). Navy accent for action, amber only for pending work and throttling, green for approved or done, red for errors and destructive actions, subject hues only as a row's edge bar.
- Text 4.5:1 against its background (large text 3:1); controls, borders that carry meaning, focus rings and icons 3:1. Measure; don't eyeball. Record ratios in `NOTES.md` when a token is added.
- BiPi blue and green appear only inside reused BiPi components, where they mean "now" and "done". App code never uses `--bipi-*`.
- No state carried by colour alone: pair it with a word, and where useful an icon.
- Disabled: `disabled` attribute plus reduced opacity and no pointer events. Read-only looks different from disabled.

## 6. Interactive elements

- `<button>` for actions, `<Link>` / `<a>` for navigation. Never a `div` with `onClick`. Links keep middle-click and Cmd-click working.
- Every control at least 44×44px on touch (the visual can be smaller if the hit area is padded), 8px between neighbours. On laptop pointer targets at least 24×24px.
- Hover states on everything clickable, but nothing that only works on hover. `cursor-pointer` on custom controls.
- `touch-action: manipulation` on buttons and links.
- Icons come from `lucide-react` only, one stroke width, sized by a token. Decorative icons beside text get `aria-hidden="true"`; an icon-only control gets `aria-label` and, where it applies, `aria-pressed` or `aria-expanded`.
- One primary (filled) button per screen. Secondary as `outline` or `ghost`. Destructive as the `destructive` variant, placed apart, and either confirmed or undoable.
- Collapsibles keep their panel mounted (`keepMounted`) and carry `aria-controls`, as `stage-disclosure.tsx` does.

## 7. Forms

- A visible `<label>` per field, associated by wrapping or `htmlFor`. Placeholders are not labels; when used they show an example and end with `…`.
- Correct `type`, `inputMode` and `autoComplete` (`username`, `current-password`, `new-password`, `given-name`, `family-name`, `one-time-code` for reset codes; join codes are `autoComplete="off"`). `autoCapitalize="none"` and `spellCheck={false}` on usernames and codes.
- Never block paste. Password managers must work.
- Helper text under a field is persistent and comes before the user gets it wrong ("At least 10 characters").
- Validate on blur or submit, not per keystroke. The error sits under its field, linked with `aria-describedby`, and the field gets `aria-invalid`.
- On a failed submit: the shared `ErrorPanel` (`role="alert"`) shows the message and lists field errors; focus moves to it. Inline field errors stay.
- The submit button stays enabled until the request starts, then is disabled with its label changed to the present participle ("Signing in…"). Never a second, silent submit.
- Errors state cause and fix. One message for "wrong username or password" (never reveal which). Throttling shows the retry time.
- Confirm before leaving a form with unsaved changes when the form is long (log entries, component setup); not for a two-field sign-in.
- `autoFocus` only on a desktop-first page with one obvious field, never on phone flows.
- Required fields are the norm; mark optional ones ("Level (optional)") rather than starring the required ones.

## 8. Feedback: loading, empty, error, success

- Work under about 300ms shows nothing. Longer work shows the disabled button with its "…" label. Only a full-page load over a second earns a skeleton, and it reserves the same space as the content.
- Empty states say what the space is for and what to do next, with the action right there: "No classes yet. Create your first class." followed by the button.
- Success is confirmed in place: the row's status changes, the code appears. Toasts only for something that happened off-screen, `aria-live="polite"`, auto-dismiss in 4–5 seconds, never stealing focus.
- Anything that appears asynchronously (a new reset code, a status change) is in a live region so screen readers hear it, phrased as a complete sentence ("Reset code issued for Aoife Byrne").
- API unreachable: the shared `ErrorPanel` with "Try again". No other page invents its own network error.

## 9. Navigation and URL state

- Every screen a user can be on has a URL, and the URL is enough to get back there. Tabs, filters, the chosen year group, an open entry: in the path or query string, not only in `useState`.
- Back always works and restores where the user was. Don't `router.replace` away a step the user might want to return to.
- The header is the same on every app page: role switcher (only when more than one role), then account. The current section is visibly marked in the switcher and any tabs (`aria-current="page"`).
- Primary navigation is never in a modal. Modals and sheets are for a short task with a clear close, `overscroll-behavior: contain`, Escape to close, focus returned to the trigger.
- Sign out and other destructive actions sit apart from ordinary navigation.
- After a client-side navigation, focus goes to the main content or the page heading (Next's route announcer handles the announcement; keep it).

## 10. Motion

- At most one designed moment per page, and it answers a user action or shows the page arriving. Panel open and close, a row confirming, a code revealing. No fade-up on every section, no hover lift on every card.
- Animate `transform` and `opacity` (and Base UI's measured `--collapsible-panel-height` for disclosures). Never `width`, `height`, `top`, `left` directly.
- Durations by size: micro-feedback 100–150ms, disclosure 150–200ms ease-out, page-level 300–400ms ease-out; exits about two thirds of enters. Define them once as tokens.
- Interruptible and never blocking: the user can act mid-animation and the final state is set explicitly, not on `animationend`.
- `prefers-reduced-motion` respected on every animated element; the page must be fully usable with it on.

## 11. Copy

- Sentence case for headings, buttons and labels. Second person, active voice.
- Buttons name the outcome: "Create class", "Approve", "Issue reset code". The same verb continues into the status ("Approved").
- Numerals for counts, `Intl.DateTimeFormat("en-IE", …)` for dates with `timeZone: "Europe/Dublin"`, never a hand-formatted date.
- Errors: cause and next step, no apology, no jargon. Identifiers a user must copy (join codes, reset codes) are in the mono face, `translate="no"`, and easy to select.
- SEC and NCCA content is quoted exactly with a `source_ref`. Never paraphrased, never invented.

## 12. Performance

- Server-render the data; client components are for interaction only. No client-side fetch on first paint.
- No images unless the design asks; if so, `next/image` with dimensions, lazy below the fold.
- Fonts are already self-hosted with `font-display: swap`; don't add a third family.
- Lists over about 50 rows (a class of students is under that; a school overview might not be) paginate or virtualise.
- No third-party scripts, no analytics, no external requests from the browser other than `/api/v1/*`.

## 13. Accessibility floor

WCAG 2.2 AA, checked by the axe scan in `frontend/e2e/phase1.e2e.ts` on every page the journey visits, on both projects. A new page joins the journey and the scan. In addition to the rules above:

- A skip link to `<main>` in the app layout.
- Landmarks: one `<main>`, `<nav aria-label>` for each nav, `<header>`, `<footer>`.
- Tab order follows visual order; every flow completes with keyboard only (the gate includes a hand-run of this).
- Text scales: the layout survives 200% zoom and larger system text without clipping.
- Repeated help mechanisms (the "Ask your teacher for a code" line, the sign-out control) stay in the same place on every page.

## 14. Components: shadcn first, plain element second

Use the shadcn primitive that matches the design element (Button, Input, Label, Card, Badge, Table, Tabs, Collapsible, Dialog, Sheet, Progress). Restyle it through tokens and variants. If matching the design would mean overriding every class the primitive sets, the primitive brings nothing: use a plain styled element and say so in `NOTES.md` (the BiPi grade chip is the precedent). Never fork a primitive's markup into a call site.

## 15. Working method for a restyle task

1. Read the pack's `NOTES.md`, then the export at both frame widths. Anything that changes behaviour → update roadmap §6.2 first, and stop if it conflicts with a plan decision.
2. Tokens first: add `--app-*` values and the type scale to `globals.css`, map shadcn's semantic variables, commit.
3. One page per commit. After each page: `npx vitest run components/app`. A red spec means an accessible name changed; if the design genuinely renames a control, change the spec in its own commit that names the pack, then restyle.
4. Screenshot each page at 390 and 1140 (Playwright or the running app) and look at it against the export. Remove one decoration before moving on.
5. Run `UI-CHECKLIST.md`, then `make verify && make e2e`.
6. Record anything learned that belongs here (a Tailwind pitfall, a primitive that didn't fit) in this file, and delete anything that stopped being true.
