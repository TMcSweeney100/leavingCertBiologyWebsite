import type { ReportSectionStatus, ReportSectionWithStatus } from "@/lib/schedule";

/**
 * The report-section crosswalk — all seven sections and when each one is
 * written (design_handoff_bipi_schedule/README.md §6). This is the answer
 * to the question the whole site exists for on the report side: *which bit
 * of the write-up am I supposed to be doing right now?*
 *
 * The status column is **live**: "Due now" on the section whose stage is
 * the current stage, "Done" once that stage has passed, "To come"
 * otherwise. It is derived in `lib/schedule.ts` (`reportSections` on
 * `DerivedSchedule`, tested against `?date=` in `schedule.test.ts`) and
 * arrives here already resolved — this component never reads a date, and
 * there is no second copy of the mapping to drift out of sync.
 *
 * Two layouts, one data source, the same convention the header and the
 * stage card use (`lg:hidden` / `hidden lg:…`), because the grouping
 * genuinely differs rather than just reflowing:
 *
 * - **Laptop** is a real `<table>`: five labelled columns of tabular data,
 *   with `<th scope="col">` headers and the § as each row's `<th
 *   scope="row">`, so a screen reader announces "§4, Conducting the
 *   Experiment, Stage 4, 16 Oct 2026, Due now" with the column names
 *   attached. `<colgroup>` carries the design's `56px 1.5fr 1fr 1fr 100px`
 *   proportions exactly (the two `fr`-style widths are the design ratio of
 *   whatever is left after the two fixed columns), which `table-fixed`
 *   then honours.
 * - **Mobile** drops to three columns — § / (name + a "stage · due"
 *   sub-line) / status — which is what the design specifies. There are no
 *   column headers at that width, so it is not marked up as a table:
 *   a header-less table adds announcement overhead without adding meaning,
 *   and the reading order of the plain rows already carries the sentence.
 *
 * Status is never colour alone — the word is always printed (README
 * §"State never conveyed by colour alone"), the colour only reinforces it.
 */

type ReportCrosswalkProps = {
  sections: ReportSectionWithStatus[];
};

// "Due now" is the one place on this page outside the current stage card
// and the today-marker that `--bipi-now` is allowed to appear, and it is
// exactly the same claim those make: this is where the class is now.
const STATUS_COLOR: Record<ReportSectionStatus, string> = {
  "due-now": "text-(--bipi-now)",
  done: "text-(--bipi-done-ink)",
  "to-come": "text-muted-foreground",
};

const SECTION_COLOR: Record<ReportSectionStatus, string> = {
  "due-now": "text-(--bipi-now)",
  done: "text-muted-foreground",
  "to-come": "text-foreground",
};

const NAME_COLOR: Record<ReportSectionStatus, string> = {
  "due-now": "text-foreground",
  done: "text-muted-foreground",
  "to-come": "text-foreground",
};

const CELL_COLOR: Record<ReportSectionStatus, string> = {
  "due-now": "text-(--bipi-ink-2)",
  done: "text-muted-foreground",
  "to-come": "text-(--bipi-ink-2)",
};

const HEADER_CELL =
  "border-0 pb-2.5 text-left font-mono text-chip leading-none font-bold tracking-[.13em] text-muted-foreground uppercase";

// Deliberately carries no font-size: two `--text-*` steps on one element
// would collide (they are the same utility type, so which one wins is
// Tailwind's CSS ordering, not the order they appear in the class string —
// the same hazard as the `cn()`/twMerge trap documented in docs/CLAUDE.md).
// Each cell states its own size below.
const BODY_CELL = "border-t border-border py-2.75 align-baseline";

const TEXT_CELL = "font-sans text-body leading-[1.4]";

const STATUS_CELL =
  "text-right font-mono text-chip leading-[1.6] font-bold tracking-[.1em] uppercase";

export function ReportCrosswalk({ sections }: ReportCrosswalkProps) {
  return (
    <>
      {/* Mobile (below 1024px) */}
      <div className="lg:hidden">
        {sections.map((row) => (
          <div
            key={row.section}
            className="grid grid-cols-[34px_1fr_auto] items-baseline gap-2.5 border-t border-border py-2.5"
          >
            <span
              className={`font-mono text-inset leading-[1.4] font-bold ${SECTION_COLOR[row.status]}`}
            >
              {row.section}
            </span>
            <span className="min-w-0">
              <span
                className={`block font-sans text-body leading-[1.35] font-semibold ${NAME_COLOR[row.status]}`}
              >
                {row.name}
              </span>
              <span className="mt-0.75 block font-sans text-pill-lg leading-[1.35] text-muted-foreground">
                {row.writtenDuring} · {row.dueBy}
              </span>
            </span>
            <span className={`${STATUS_CELL} ${STATUS_COLOR[row.status]}`}>{row.statusLabel}</span>
          </div>
        ))}
      </div>

      {/* Laptop (1024px and up) */}
      <table className="hidden w-full table-fixed lg:table">
        {/* The design's `56px 1.5fr 1fr 1fr 100px`. The three flexible
            columns are percentages because, in a fixed table layout,
            Chromium resolves a column percentage against the space left
            over after the fixed columns — so 42.86 / 28.57 / 28.57 *is*
            1.5fr / 1fr / 1fr, exactly (measured: 447 / 298 / 298 out of the
            1044px remaining at a 1280px viewport). A `calc()` carrying a
            percentage is silently ignored on a `<col>` in Chromium — it
            falls back to an equal share — so don't "simplify" these back
            into one. `table-fixed` is what makes any of it binding. */}
        <colgroup>
          <col className="w-14" />
          <col className="w-[42.86%]" />
          <col className="w-[28.57%]" />
          <col className="w-[28.57%]" />
          <col className="w-25" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col" className={HEADER_CELL}>
              §
            </th>
            <th scope="col" className={HEADER_CELL}>
              Report section
            </th>
            <th scope="col" className={HEADER_CELL}>
              Written during
            </th>
            <th scope="col" className={HEADER_CELL}>
              Due by
            </th>
            <th scope="col" className={`${HEADER_CELL} text-right`}>
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {sections.map((row) => (
            <tr key={row.section}>
              <th
                scope="row"
                className={`${BODY_CELL} text-left font-mono text-inset leading-[1.4] font-bold ${SECTION_COLOR[row.status]}`}
              >
                {row.section}
              </th>
              <td className={`${BODY_CELL} ${TEXT_CELL} pr-4 font-semibold ${NAME_COLOR[row.status]}`}>
                {row.name}
              </td>
              <td className={`${BODY_CELL} ${TEXT_CELL} ${CELL_COLOR[row.status]}`}>{row.writtenDuring}</td>
              <td className={`${BODY_CELL} ${TEXT_CELL} ${CELL_COLOR[row.status]}`}>{row.dueBy}</td>
              <td className={`${BODY_CELL} ${STATUS_CELL} ${STATUS_COLOR[row.status]}`}>
                {row.statusLabel}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
