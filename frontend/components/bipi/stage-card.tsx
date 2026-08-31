import type { StageState } from "@/lib/schedule.data";
import type { StageWithState } from "@/lib/schedule";

/**
 * The stage card, static (Phase 4 — docs/IMPLEMENTATION_PLAN.md build-order
 * table). Renders one of `stage-3` / `stage-4` / `catchup` / `stage-5` /
 * `stage-6` in its `done` / `current` / `upcoming` state, mobile only (no
 * `lg:` layout — that's Phase 6).
 *
 * No disclosure yet (Phase 7 adds Base UI `Collapsible` and turns this into
 * the app's only client component — see plan §4.3). Every field that would
 * eventually live inside the collapsed panel (description, tasks, the two
 * insets) renders unconditionally for now, per this phase's own scope.
 *
 * Classes are assembled with plain template literals, not `cn()`/
 * tailwind-merge — verified that twMerge doesn't know this project's custom
 * `--text-*` theme keys (text-eyebrow, text-label, text-card-title, …) are a
 * distinct "font-size" group, so it was bucketing them together with
 * `text-*` colour utilities and silently dropping the font-size class
 * whenever both appeared in one `cn()` call. Template literals sidestep
 * that: every branch below is already a complete, non-overlapping set of
 * utilities, so there is nothing that genuinely needs de-duplicating.
 *
 * Spacing uses Tailwind's bare `{utility}-{n}` scale (a continuous
 * multiplier of the theme's 4px `--spacing` unit, e.g. `py-2.75` = 11px)
 * wherever a value lands on a clean 0.25 step, rather than `p-[11px]`-style
 * arbitrary values — both compile to the same number at the default root
 * font-size, but the bare form scales with a user's browser text-size
 * setting and arbitrary px values don't. Colours/radii that reference an
 * existing `--bipi-*` custom property use the `(--foo)` shorthand for the
 * same reason `bg-[var(--foo)]` would otherwise be written; values with no
 * existing token (the 1.5px current-state border, the halo shadow, the
 * report badge's one-off border colour) stay as literal arbitrary values.
 *
 * Colours mostly follow docs/design_handoff_bipi_schedule/README.md §5
 * exactly, with two deliberate overrides from plan §1.1 (measured WCAG
 * fixes, not style choices) — flagged at their call sites below:
 *   ① the done-state card never gets an `opacity` declaration.
 *   ② the upcoming-state pill's text is `--bipi-ink-2`, not `--bipi-muted`.
 * §1.1④'s type-floor raise (8.5px -> 10px) applies to the state pill below,
 * the only element in this card's spec that was at 8.5px.
 */

type StageCardProps = {
  stage: StageWithState;
};

const STATE_WORD: Record<StageState, string> = {
  current: "Now",
  done: "Done",
  upcoming: "Upcoming",
};

// Card shell: background/border/shadow only.
//
// §1.1① — the source design applies `opacity: .72` to the whole done-state
// card. Measured (independently, against the actual token values in this
// project's globals.css): with the opacity, done-card title/description
// drop to ~3.07:1 against the page background behind the card — fails the
// 4.5:1 AA text-contrast floor. Done cards are already visually receded by
// the explicit muted colours below (title/description -> --bipi-muted), so
// the opacity was double-marking the same distinction, and that's what
// pushed it under the line. Simply never adding it restores ~5.4:1 with no
// other change. Do not reintroduce an `opacity` utility on the done branch.
const CARD_SHELL: Record<StageState, string> = {
  current: "border-[1.5px] border-(--bipi-now) shadow-(--bipi-shadow-now)",
  done: "border border-border",
  upcoming: "border border-border",
};

const TITLE_COLOR: Record<StageState, string> = {
  current: "text-foreground", // --bipi-ink
  done: "text-muted-foreground", // --bipi-muted
  upcoming: "text-(--bipi-ink-2)",
};

const DESCRIPTION_COLOR: Record<StageState, string> = {
  current: "text-(--bipi-ink-2)",
  done: "text-muted-foreground",
  upcoming: "text-muted-foreground",
};

const PILL_BG: Record<StageState, string> = {
  current: "bg-(--bipi-now)",
  done: "bg-(--bipi-done-tint-2)",
  upcoming: "bg-border", // --bipi-border
};

// §1.1② — the source design specs `--bipi-muted` text on this pill's
// `--bipi-border` background for the upcoming state: measured 4.06:1,
// fails 4.5:1 AA. `--bipi-ink-2` on the same background measures ~8.86:1
// (independently verified). Only the `upcoming` row differs from the
// README; `current` and `done` are unchanged from spec.
const PILL_TEXT: Record<StageState, string> = {
  current: "text-white",
  done: "text-(--bipi-done-ink)",
  upcoming: "text-(--bipi-ink-2)",
};

const BADGE_BG: Record<StageState, string> = {
  current: "bg-(--bipi-now-tint-4)",
  done: "bg-(--bipi-surface-2)",
  upcoming: "bg-(--bipi-surface-2)",
};

const BADGE_TEXT: Record<StageState, string> = {
  current: "text-(--bipi-now-ink)",
  done: "text-(--bipi-ink-2)",
  upcoming: "text-(--bipi-ink-2)",
};

const BADGE_BORDER: Record<StageState, string> = {
  current: "border-[oklch(0.52_0.14_268_/_0.3)]",
  done: "border-border",
  upcoming: "border-border",
};

export function StageCard({ stage }: StageCardProps) {
  const { state } = stage;

  // The report badge shows a composed "Report §N due" phrase per the design
  // (design_handoff_bipi_schedule/README.md §5: Copy "Report §4 due", or
  // "No section due" for the catch-up card). The one stage with no new
  // section due signals that generically through the data itself —
  // `reportSectionLabel` is the sentinel "—" — rather than by checking a
  // stage id or the `isCatchup` flag, so any future stage with no section
  // due would render correctly the same way with no code change. Its
  // `reportSectionName` field already reads correctly on its own ("No new
  // section due"), so that's reused instead of inventing new copy that
  // doesn't live in schedule.data.ts.
  const reportBadgeText =
    stage.reportSectionLabel === "—"
      ? stage.reportSectionName
      : `Report ${stage.reportSectionLabel} due`;

  // The section-name text beside the badge is redundant exactly when the
  // badge already reads it verbatim (currently only the catch-up card,
  // where the badge falls back to `reportSectionName` above) — checked by
  // comparing the two rendered strings, not by branching on a stage id, so
  // this stays correct for any future stage that hits the same fallback.
  const showSectionName = reportBadgeText !== stage.reportSectionName;

  return (
    <article className={`rounded-lg bg-card pt-3.5 px-3.75 pb-3.75 ${CARD_SHELL[state]}`}>
      <div className="flex items-center justify-between gap-2.5">
        <span className="font-mono text-eyebrow font-bold tracking-[.1em] whitespace-nowrap text-muted-foreground uppercase">
          {stage.label} / {stage.weekRange}
        </span>
        <span
          className={`shrink-0 rounded-full px-1.75 py-1 font-mono text-label leading-none font-bold tracking-[.12em] uppercase ${PILL_BG[state]} ${PILL_TEXT[state]}`}
        >
          {STATE_WORD[state]}
        </span>
      </div>

      <h3
        className={`mt-2.25 font-heading text-card-title leading-[1.2] font-semibold tracking-[-.015em] ${TITLE_COLOR[state]}`}
      >
        {stage.title}
      </h3>

      <div className="mt-1.75 font-mono text-pill leading-none font-bold text-(--bipi-ink-2)">
        {stage.dueDateLabel}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className={`inline-block rounded-(--bipi-r-badge) border px-2.25 py-1.25 font-mono text-label leading-none font-bold tracking-[.06em] ${BADGE_BG[state]} ${BADGE_TEXT[state]} ${BADGE_BORDER[state]}`}
        >
          {reportBadgeText}
        </span>
        {showSectionName && (
          <span className="font-sans text-pill-lg leading-[1.35] text-muted-foreground">
            {stage.reportSectionName}
          </span>
        )}
      </div>

      <p className={`mt-2.5 font-sans text-body leading-normal text-pretty ${DESCRIPTION_COLOR[state]}`}>
        {stage.description}
      </p>

      {stage.tasks.length > 0 && (
        <ul className="mt-3.25 grid gap-1.75">
          {stage.tasks.map((task) => (
            <li key={task} className="grid grid-cols-[14px_1fr] items-start gap-2.25">
              <span className="mt-1.5 size-1.25 rounded-full bg-(--bipi-now)" />
              <span className="font-sans text-task leading-[1.45] text-(--bipi-ink-2)">{task}</span>
            </li>
          ))}
        </ul>
      )}

      {stage.whatGoodLooksLike && (
        <p className="mt-3.25 rounded-(--bipi-r-inset) bg-background px-3 py-2.75 font-sans text-inset leading-[1.45] text-(--bipi-ink-2)">
          <span className="font-bold">What good looks like ·</span> {stage.whatGoodLooksLike}
        </p>
      )}

      <p className="mt-2.25 rounded-(--bipi-r-inset) bg-(--bipi-now-tint-2) px-3 py-2.75 font-sans text-inset leading-[1.45] text-(--bipi-ink-2)">
        <span className="font-bold">Teacher checkpoint ·</span> {stage.teacherCheckpoint}
      </p>
    </article>
  );
}
