# CLAUDE.md

## Purpose of this file

This file is a **starting point**, not a finished or permanent set of instructions.

Claude Code should read this file at the beginning of each session, inspect the repository and current implementation, and then follow the guidance that is still relevant. As the project develops, Claude should **improve and update this file** whenever it discovers better conventions, confirmed decisions, important commands, architectural patterns, recurring pitfalls, or project-specific knowledge.

Do not allow this file to become stale. Keep it concise, accurate, and useful. Remove instructions that are no longer true, and do not add speculative rules as if they were confirmed decisions.

---

## Project overview

This project is a React-based schedule website for 6th Year Biology students completing the Biology in Practice Investigation (BiPi).

The website replaces a static schedule poster with a live, responsive page that helps students, parents, and teachers quickly understand:

- Where the class is in the coursework timeline
- What is currently due
- What comes next
- Which written report section corresponds to each investigation stage
- How much time remains before the current stage deadline

The core experience is the live **“You are here”** state and the timeline beneath it.

Before making substantial changes, read the project source documents if they are present:

- `bipi-schedule-design-brief.md`
- `bipi-schedule-website-spec.md`

Treat the website specification as the main source for functionality and content structure. Treat the design brief as the source for visual goals and audience needs. If the repository contains a later approved design decision, implementation note, or content file, prefer the most recent confirmed source and document that decision here.

---

## Working approach

At the start of a task:

1. Read this file.
2. Inspect the repository structure and relevant files before changing code.
3. Check `package.json`, scripts, framework configuration, linting rules, and existing component patterns.
4. Read the design brief and website specification when the task affects behavior, content, layout, or visual design.
5. Identify whether the requested behavior already exists before creating a new abstraction.
6. Make the smallest coherent change that fully solves the task.
7. Run the relevant validation commands before finishing.
8. Summarize what changed, what was tested, and any remaining risks or decisions.
9. Update this file when the work establishes a durable project convention or reveals that an instruction here is outdated.

Do not rewrite working areas of the application without a clear reason. Preserve established patterns unless improving them is part of the task.

---

## Current technical direction

The intended stack is:

- React
- Prefer Next.js with the App Router if that is what the repository uses
- TypeScript
- Tailwind CSS
- shadcn/ui where it adds value
- Vercel-compatible deployment

A Vite and React implementation is also valid if the repository already uses it. **Inspect the actual project before assuming the framework.** Once the framework choice is confirmed, replace this paragraph with the exact stack and commands.

Prefer:

- Server-rendered or statically rendered core content where supported
- Small, focused client components only where interactivity is required
- Typed schedule data stored separately from presentation components
- Reusable components for repeated visual patterns
- Native platform and framework features over unnecessary dependencies
- Simple solutions appropriate to a small read-only website

Do not add a backend, database, authentication, tracking, forms, accounts, or content management system unless the requirements explicitly change.

---

## Product priorities

Use this order when resolving trade-offs:

1. Correct dates and coursework information
2. Clear current-stage and next-deadline communication
3. Accessibility and readability
4. Mobile and laptop responsiveness
5. Performance and reliability
6. Visual polish
7. Optional enhancements

This is a real coursework schedule. Never silently invent, “correct,” or approximate dates, report sections, official rules, or deadline wording. If sources conflict, report the conflict and preserve the currently approved content until it is resolved.

The SEC coursework submission deadline in the current specification is **26 February 2027**. The site must also make clear that internal class dates are not official SEC deadlines.

---

## Core functionality

The application should provide:

- A clear page header and concise context
- A prominent live “You are here” area
- Current-stage detection based on the schedule data
- Days remaining until the current deadline
- Done, current, and upcoming visual states
- Completed Stage 1 and Stage 2 content
- Timeline cards for the remaining stages and catch-up window
- Report-section badges on relevant stage cards
- Short audience guidance for students, parents, and teachers
- The official coursework deadline and internal-schedule disclaimer
- Graceful behavior before the schedule begins and after it ends
- Readable core schedule content even if client-side JavaScript fails

The timeline and current-stage logic are the highest-priority implementation areas. Build and test them before spending time on secondary decorative details.

---

## Data and date handling

Keep schedule content in one typed configuration or data file. Components should render from that data rather than duplicating stage content or dates in JSX.

A stage will generally need fields equivalent to:

```ts
type ReportSection = {
  number: number;
  name: string;
};

type Stage = {
  id: string;
  order: number;
  label: string;
  title: string;
  weekRange: string;
  dueDate: string;
  rangeStart?: string;
  description: string;
  teacherCheckpoint: string;
  reportSections: ReportSection[];
  isCatchup?: boolean;
  isDone?: boolean;
};
```

Guidelines:

- Store dates in ISO `YYYY-MM-DD` form.
- Centralize date parsing, comparison, formatting, and countdown logic.
- Be explicit about timezone behavior and avoid accidental off-by-one-day errors.
- Treat date-only values as calendar dates, not arbitrary UTC timestamps.
- Do not calculate the current date independently in several components.
- Make date logic testable by accepting an injectable `today` value where practical.
- Cover exact boundary dates in tests, including the start date, due date, gaps, pre-schedule state, and post-schedule state.
- Ensure completed Stage 1 and Stage 2 remain completed according to the approved content model.

Do not hardcode a fake “today” value in production code. If a deterministic date is needed for development or screenshots, isolate it behind an obvious development-only mechanism and document it.

---

## Design direction

The intended visual character is:

- Sleek
- Modern
- Uncluttered
- Warm rather than clinical
- Credible and suitable for classroom projection
- Editorial rather than resembling a school administration form
- Content-led, without heavy imagery

The approved design system should use reusable tokens, preferably CSS variables integrated with Tailwind. Avoid scattering literal colors and spacing values when a project token already exists.

The stage-card component requires clearly distinguishable states:

- Done
- Current
- Upcoming

Do not communicate state by color alone. Use labels, icons, text, borders, or other redundant cues. The current state should receive the strongest emphasis, but upcoming and completed material must remain readable.

Start with the simplest clear mobile layout, then ensure laptop and desktop layouts receive equal care. Desktop is not merely a stretched mobile layout because the site will frequently be viewed on school laptops and projected in class.

If no visual direction has yet been approved, do not present an arbitrary design as final. Implement a coherent, restrained starting system and record the provisional choices. When a direction is approved, update this section with exact tokens, typography, and component decisions.

---

## Accessibility

Accessibility is a core requirement, not a later polish task.

- Target WCAG AA contrast at minimum.
- Use semantic HTML and a logical heading structure.
- Ensure all interactive controls work with a keyboard.
- Provide visible focus styles.
- Use buttons for actions and links for navigation.
- Do not rely on hover interactions for essential information.
- Respect reduced-motion preferences.
- Keep touch targets comfortably sized.
- Make dates and status text understandable when read by assistive technology.
- Ensure collapsed content, if used, has correct accessible names and state.
- Check the page at narrow mobile widths, common laptop widths, and high zoom.

Use ARIA only when native HTML cannot express the required semantics.

---

## Privacy and security

The intended site is public or semi-public, static, and read-only.

- Do not collect personal data.
- Do not add cookies, trackers, analytics, or third-party embeds without an explicit requirement.
- Do not expose school, teacher, or student private information.
- Do not add secrets to the repository.
- Do not place sensitive values in client-visible environment variables.
- Treat any future access-control request as a separate architectural decision.

If analytics are later approved, use a privacy-conscious, cookieless approach and document it here.

---

## Performance

The page should feel near-instant on ordinary school and mobile connections.

- Keep the client-side JavaScript footprint small.
- Avoid heavy image assets and animation libraries.
- Prefer static rendering for schedule content.
- Avoid dependencies for utilities that can be implemented clearly in a few lines.
- Prevent layout shift.
- Use framework font and asset optimization if applicable.
- Do not sacrifice accessibility or maintainability for negligible micro-optimizations.

---

## Code quality conventions

Until the repository establishes more specific conventions:

- Use TypeScript strictly and avoid `any` unless a documented boundary requires it.
- Keep components focused and give them descriptive names.
- Separate schedule data, business logic, and presentation.
- Prefer derived state over duplicated state.
- Avoid premature abstraction and generic component systems that have only one use.
- Reuse existing project utilities and UI primitives.
- Keep comments focused on why something is necessary, not what an obvious line does.
- Delete dead code instead of leaving commented-out alternatives.
- Avoid unrelated formatting or refactoring in a focused change.
- Preserve naming and import conventions already established in the repository.

Do not install a package until you have checked whether the project or platform already provides the capability.

---

## Testing and validation

Determine the actual commands from `package.json` and update this section once known.

Before completing a change, run the applicable checks, such as:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Do not claim a command passed unless it was actually run successfully.

Prioritize tests for:

- Current-stage detection
- Countdown calculations
- Exact deadline boundaries
- Before-schedule and after-schedule fallbacks
- Stage ordering and report-section mapping
- Rendering of done, current, and upcoming states
- Accessibility of interactive disclosure controls, if used

For UI work, also manually inspect at least:

- A narrow phone viewport
- A typical laptop viewport
- Keyboard navigation
- Long content wrapping
- The current-stage state
- A schedule state before and after the active period

If a check cannot be run, explain why and state what was checked instead.

---

## Content rules

- Preserve approved wording unless the task includes copy editing.
- Use clear, plain English appropriate for students and parents.
- Keep teacher checkpoint guidance visually distinct from student deliverables.
- Always show report-section mappings clearly on relevant stages.
- Keep internal target dates distinct from the official SEC deadline.
- Do not add investigation-topic guidance. This site explains **when**, not **what** to submit.
- Do not imply that parents should complete or edit student coursework.

When changing content, update the central data source rather than editing copies in multiple components.

---

## Scope boundaries for version 1

Unless requirements change, the following are out of scope:

- Student accounts
- Individual progress tracking
- Assignment uploads or submissions
- An admin editing interface
- Multi-class or multi-teacher support
- Investigation-topic teaching content
- Heavy analytics
- A general-purpose school portal

Optional ideas such as QR codes, print styles, or a report-rules section should not delay the core timeline experience.

---

## Git and change discipline

- Review the current diff before finishing.
- Keep changes scoped to the task.
- Do not overwrite user work or revert unrelated changes.
- Do not commit secrets, generated caches, build output, or local environment files.
- Use clear commit messages if asked to commit.
- Do not create commits, push branches, or open pull requests unless requested or the established workflow explicitly calls for it.

---

## How Claude should maintain this file

Claude Code is encouraged to update this file when it learns something that will help future work, including:

- Confirmed framework, package manager, and runtime versions
- Exact local development, test, build, and deployment commands
- The location of schedule data and date utilities
- Approved design tokens and typography
- Component and directory conventions
- Testing tools and required checks
- Deployment details that are safe to document
- Known date-handling traps or recurring implementation mistakes
- Decisions that have been explicitly approved

When updating this file:

- Keep the statement that this is a living starting point.
- Record facts, not guesses.
- Prefer concise instructions over a running project diary.
- Remove obsolete guidance when replacing it.
- Avoid duplicating information that is already obvious from configuration files.
- Do not store secrets, private information, or temporary debugging details.
- Mention significant changes to this file in the final task summary.

---

## Repository-specific details to fill in

- **Framework:** Next.js 16.3.3, App Router, React 19.2.8, TypeScript, Tailwind v4 (CSS-first — no `tailwind.config.js`, everything lives in `app/globals.css`). shadcn/ui initialized on the **Base UI** primitive library (`components.json` → `"base": "base"`, preset `base-nova`), not Radix — shadcn's CLI default changed after the implementation plan was first written; see `docs/IMPLEMENTATION_PLAN.md` Decision #5 for why. A `shadcn` skill with current CLI/theming/component docs is installed at `.claude/skills/shadcn` (and a `migrate-radix-to-base` skill alongside it) — prefer it over training-data knowledge of shadcn, which is stale against the current CLI.
- **Package manager:** npm (`package-lock.json`).
- **Node version:** v23.10.0 confirmed working. `node --test "lib/**/*.test.ts"` runs TypeScript tests natively — the glob is required, a bare directory path won't discover `.ts` files. Node's native TS type-stripping is still an experimental feature (prints a warning on every run) and is version-sensitive — don't assume it on an older Node LTS. Relative imports between files under `lib/` that the test runner touches need explicit `.ts` extensions (e.g. `from './schedule.data.ts'`) — Node's ESM resolver doesn't guess extensions the way the bundler does elsewhere in this app. That's why `tsconfig.json` has `allowImportingTsExtensions: true`; it's scoped to those two files only (`tsc` would otherwise reject the extension with `TS5097`) — don't add extensions to imports outside `lib/`'s test-reached files, they'll fail bundler resolution.
- **Development command:** `npm run dev` from `frontend/`.
- **Lint command:** `npm run lint` (ESLint flat config).
- **Type-check command:** covered by `npm run build`; standalone via `npx tsc --noEmit`.
- **Test command:** `npm test` (`node --test "lib/**/*.test.ts"`), from `frontend/`.
- **Build command:** `npm run build` (Turbopack).
- **Schedule data location:** `frontend/lib/schedule.data.ts` — copied verbatim from `docs/design_handoff_bipi_schedule/schedule.data.ts` (byte-identical, SHA-256 checked). Edit only through the source handoff file's process, and keep the copy exact — the whole point of centralizing content there is that editing just this file is enough to reuse the site next year.
- **Date logic location:** `frontend/lib/schedule.ts` (`deriveSchedule`, `dublinToday`), tested in `frontend/lib/schedule.test.ts` against the implementation plan's §3.3 table. Implements the Dublin-timezone-safe algorithm from plan §3.2. **Known trap:** `schedule.data.ts`'s own trailing comment block (its last ~20 lines) shows the *old, buggy* naive algorithm from plan §3.1 (`startOfDay(new Date())`, reads the server's timezone not Dublin's) — it's inert (never executed) but was left in because the file must stay byte-identical to the handoff source. Don't copy logic from that comment; `schedule.ts` is the sole authoritative implementation. Every consumer must call through `deriveSchedule`/`dublinToday` with an injected `now`, never compute the current date independently.
- **UI component location:** `frontend/components/ui/` (shadcn primitives — currently just `button.tsx`) and `frontend/components/bipi/` (app-specific components, Phase 3+). So far: `site-header.tsx`, `site-footer.tsx`. Both are server components (no `"use client"`) — per plan §4.3, `stage-card.tsx` (Phase 7) is meant to be the *only* client component in the whole build; don't add directives to these two without a real reason.
- **Nav pills are plain `<a>`, not the shadcn `Button`:** checked against the installed Base UI source (`node_modules/@base-ui/react/internals/use-button/useButton.js`) — passing `nativeButton={false}` to render `Button` as an anchor makes Base UI unconditionally apply `role="button"` to it, which is wrong for in-page navigation links (contradicts this file's own "use buttons for actions and links for navigation" rule). Don't try to strip the role back off; a plain Tailwind-styled `<a>` is simpler and semantically correct. Same reasoning would apply to any other nav-style link rendered through `Button`.
- **Nav anchor-id convention (fixed, from `HEADER.nav`, kebab-case):** `#right-now` (Phase 5 "you are here" panel), `#timeline` (Phase 5/8 timeline heading), `#report-sections` (Phase 8 crosswalk heading), `#report-rules` (Phase 8 report-rules heading). `site-header.tsx` emits the links now (`NAV_IDS` constant, top of file); the targets don't exist yet. When each element is built, give it that literal `id` plus a modest `scroll-margin-top` (e.g. `scroll-mt-6`) — nothing on the page is `position: sticky` yet, so this is just "don't let the scrolled-to heading sit flush against the viewport edge," not compensating for a fixed header height. If a sticky header or sticky mini-banner is added later (plan §1.3 suggestion ①), revisit whether `scroll-mt-*` needs to grow to match its height.
- **Grade chip is a plain `<span>`, not shadcn `Badge`:** checked Badge's actual installed source (`npx shadcn@latest add badge --view`) — none of its variants (`default/secondary/destructive/outline/ghost/link`) produce white text on a `--bipi-ink` background, and matching the exact spec (Space Mono 700, 9px/10px, `5px 9px`/`9px 14px` padding) would mean overriding Badge's own `h-5`, padding, font-size, font-weight and color classes wholesale. Nothing of the component survives, so a styled `<span>` is cleaner. Re-evaluate only if a future badge-like element in this design actually matches one of Badge's existing variants.
- **Mobile vs. laptop header/footer are two separate JSX blocks** (`lg:hidden` / `hidden lg:flex`), not one responsive flex/grid tree — the grade chip's parent grouping genuinely differs (sits next to the eyebrow on mobile, next to the nav pills on laptop), which plain responsive utility classes on a single DOM structure can't express without duplicating content anyway. Both blocks read from the same `HEADER/SEC_DEADLINE` data, so copy stays single-sourced even though the JSX doesn't; only one block is ever in the layout/accessibility tree at a given viewport (`display: none` fully removes the other, confirmed via Playwright — no duplicate-heading issue). Follow the same pattern rather than fighting a unified grid for any future element that regroups across the breakpoint.
- **Known, minor spec discrepancies (mobile-vs-laptop numbers only, not content) between the design HTML prototype (`docs/design_handoff_bipi_schedule/design/BiPi Schedule Hub.dc.html`, option `2a`) and the written README/plan spec, resolved in favour of the written spec since the prototype's inline-style layer is explicitly "not production code to copy directly":** footer heading is `14px` at both breakpoints here (the prototype's mobile frame renders it at `12.5px`); nav pill padding is `8px 11px` at both breakpoints here (the prototype's laptop frame uses `8px 12px`). Both differences are sub-2px and not visually significant either way — flagging so nobody rediscovers this as unexplained drift.
- **Design tokens:** `frontend/app/globals.css` — the BiPi palette (from `docs/design_handoff_bipi_schedule/tokens.css`) is layered into `:root` and mapped onto shadcn's semantic variables (`--background`, `--primary`, etc.). Light-only design — no `.dark` values are defined, `color-scheme: light` is set on `<html>`, don't wire up `next-themes` or a dark-mode toggle.
  **Verified semantic-alias mapping (check `globals.css`'s `:root` block directly if this drifts — don't trust this list blindly once tokens change):** `--bipi-bg`→`bg-background`, `--bipi-surface`→`bg-card` (also `bg-popover`, same value — `card` used for the header background in Phase 3 as the more general "elevated surface" role), `--bipi-ink`→`text-foreground` **as text only** (there's no semantic *background* role for it — `bg-foreground` would be misleading since "foreground" implies text/icon color; use the raw `bg-[var(--bipi-ink)]` for ink-colored fills like the grade chip and footer), `--bipi-muted`→`text-muted-foreground` (this **does** have a clean alias — despite what an earlier task brief for this repo claimed, `--muted-foreground: var(--bipi-muted)` is real, check before assuming otherwise), `--bipi-border`→`border-border`. **Genuinely unaliased** (use the raw `--bipi-*` var): `--bipi-ink-2`, `--bipi-on-dark-body`, `--bipi-on-dark-meta`. **Aliased but not cleanly** — `--bipi-surface-2` maps to `--secondary`, `--muted`, *and* `--accent` simultaneously (all three happen to share one value in this palette); picking any one of those Tailwind utilities (`bg-secondary`/`bg-muted`/`bg-accent`) works visually but implies a specific role (secondary fill / de-emphasis / hover-accent) that may not match why that spot is actually `--bipi-surface-2` in the design — consider the raw var instead when the semantic role doesn't obviously fit.
- **Fonts:** self-hosted via `next/font/google` in `frontend/app/layout.tsx` — Space Grotesk (display), Public Sans (body), Space Mono (label, static weights 400/700 only — not a variable font). Resolve through `--bipi-font-display`/`-body`/`-label` in `globals.css`; don't reference the font family names as literal strings, `next/font` renames them internally.
- **Deployment target:** Vercel (per spec), not yet deployed — do not push live without explicit sign-off (implementation plan §7).
- **Approved design direction:** Option `2a` ("Progress Rail") from `docs/design_handoff_bipi_schedule/design/BiPi Schedule Hub.dc.html`. Full token/typography/component detail in `docs/IMPLEMENTATION_PLAN.md`, which takes precedence over the handoff README where they disagree.
