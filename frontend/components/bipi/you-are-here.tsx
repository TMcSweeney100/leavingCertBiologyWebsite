import { TermProgress } from "@/components/bipi/term-progress";
import { TermRuler } from "@/components/bipi/term-ruler";
import {
  DUE_TODAY,
  daysLeftWord,
  formatTodayLabel,
  postTermCopy,
  type DerivedSchedule,
} from "@/lib/schedule";

/**
 * The "You are here" panel — "the most important element on the page. First
 * thing the eye should land on" (design_handoff_bipi_schedule/README.md §2),
 * plus the two things that sit under it inside the same white band on
 * mobile: term progress and the "Next up" row.
 *
 * Mobile and laptop are two separate JSX blocks (`lg:hidden` /
 * `hidden lg:block`), following the same convention as site-header.tsx: the
 * two layouts don't merely re-flow, they carry different copy (the mobile
 * panel splits the date onto the right of the eyebrow and the report line
 * below a divider; the laptop panel folds all of it into one paragraph and
 * moves the countdown into a 250px box), so a single responsive DOM tree
 * would have to duplicate the content anyway. Only one block is ever in the
 * layout or accessibility tree at a given viewport — `display: none`
 * removes the other outright, so the two `<h2>`s never both count.
 *
 * Term progress appears in both layouts but as two different components:
 * the 6px bar below the panel on mobile (`TermProgress`) and, on laptop,
 * the term ruler *inside* the panel (`TermRuler`) — README §3 treats them
 * as one element with two forms, and they are never both in the layout.
 * The "Next up" row is mobile-only for the same kind of reason: on laptop
 * that information is the aside's "Coming up" card.
 *
 * Every measured colour pairing introduced here was checked against the
 * real token values before use (the four §1.1 accessibility fixes exist
 * because the source design's were not). Lowest of them: the laptop
 * countdown caption, white at `opacity: .85` on `--bipi-now`, at 4.60:1 —
 * over the 4.5:1 AA floor, so the design's own value stands unchanged. The
 * mobile stage line and report line are the next lowest at 4.97:1.
 */

type YouAreHereProps = {
  schedule: DerivedSchedule;
};

/** The dot in "● You are here" — pure decoration, and noise when spoken. */
function NowDot() {
  return <span aria-hidden="true">●</span>;
}

export function YouAreHere({ schedule }: YouAreHereProps) {
  const {
    currentStage,
    phase,
    nextStage,
    daysLeft,
    isDueToday,
    termPct,
    weekNumber,
    today,
  } = schedule;

  if (!currentStage) {
    const copy = postTermCopy(phase);
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
          {phase === "buffer" && (
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

  const todayLabel = formatTodayLabel(today);

  // Non-breaking space after "Due" so the chip never wraps between the word
  // and its date — verbatim from the design's own `dueChip` derivation.
  const dueChip = `Due\u00a0${currentStage.dueDateLabel}`;

  // The catch-up window has no report section due, and says so through the
  // data rather than through a stage id: `reportSectionLabel` is the
  // sentinel "—", and `reportSectionName` ("No new section due") already
  // reads as a sentence on its own. Same test stage-card.tsx uses, so a
  // future stage with no section due needs no code change here either.
  // Without it the sentence would render as "Report — — No new section due
  // — should be written by then."
  const hasReportSection = currentStage.reportSectionLabel !== "—";
  const reportLine = hasReportSection
    ? `Report ${currentStage.reportSectionLabel} — ${currentStage.reportSectionName} — should be written by then.`
    : `${currentStage.reportSectionName}.`;
  const reportSentence = hasReportSection
    ? `Report section ${currentStage.reportSectionLabel} — ${currentStage.reportSectionName} — should be written by then.`
    : `${currentStage.reportSectionName}.`;

  return (
    // `aria-label` rather than `aria-labelledby` pointing at one of the two
    // <h2>s below: whichever <h2> is not the current breakpoint's is
    // `display: none`, and naming a section after a hidden element is a trap
    // for the next person to touch this file.
    <section
      id="right-now"
      aria-label="You are here"
      className="scroll-mt-6 border-b border-border bg-card px-4.5 py-4.5 lg:border-b-0 lg:bg-background lg:px-10 lg:pt-6 lg:pb-0"
    >
      {/* ---------- Mobile (below 1024px) ---------- */}
      <div className="lg:hidden">
        <div className="rounded-(--bipi-r-panel) border-[1.5px] border-(--bipi-now-ring) bg-(--bipi-now-tint) px-4.25 pt-4 pb-4.25">
          <div className="flex items-center justify-between gap-2.5">
            <p className="font-mono text-eyebrow font-bold tracking-[.14em] text-(--bipi-now) uppercase">
              <NowDot /> You are here
            </p>
            <p className="font-mono text-eyebrow text-muted-foreground tabular-nums">{todayLabel}</p>
          </div>

          <p className="mt-3.5 font-mono text-label tracking-[.1em] text-muted-foreground uppercase">
            {currentStage.label} / {currentStage.weekRange}
          </p>

          <h2
            className="mt-1.25 font-heading text-panel-title leading-[1.15] font-bold tracking-[-.02em] text-foreground"
          >
            {currentStage.title}
          </h2>

          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            <p className="inline-flex items-baseline gap-1.25 rounded-(--bipi-r-inset) bg-(--bipi-now) px-2.75 py-1.75 text-white">
              {isDueToday ? (
                <span className="font-heading text-card-title leading-none font-bold">{DUE_TODAY}</span>
              ) : (
                <>
                  <span className="font-heading text-card-title leading-none font-bold tabular-nums">
                    {daysLeft}
                  </span>
                  <span className="font-mono text-eyebrow leading-none tracking-[.06em] uppercase">
                    {daysLeftWord(daysLeft)}
                  </span>
                </>
              )}
            </p>
            <p className="inline-flex items-center rounded-(--bipi-r-inset) bg-(--bipi-now-tint-3) px-2.75 py-1.75 font-mono text-label leading-none font-bold tracking-[.06em] text-(--bipi-now-ink) uppercase">
              {dueChip}
            </p>
          </div>

          <p className="mt-3.5 font-sans text-standfirst leading-[1.5] text-(--bipi-ink-2) text-pretty">
            <span className="font-bold">What&rsquo;s due:</span> {currentStage.whatsDue}
          </p>

          <p className="mt-3 border-t border-border pt-3 font-sans text-inset leading-[1.45] text-muted-foreground text-pretty">
            {reportLine}
          </p>
        </div>

        <TermProgress className="mt-3.5" weekNumber={weekNumber} termPct={termPct} />

        {/* Omitted rather than clamped to the current stage: past the last
            stage there genuinely is nothing next, and the design's own
            prototype pointing "Next up" back at the stage you are already
            on would be a plain falsehood on the page that matters most. */}
        {nextStage && (
          <div className="mt-3.5 flex items-baseline justify-between gap-2.5 rounded-[10px] bg-background px-3.25 py-3">
            <div className="min-w-0">
              <p className="font-mono text-chip font-bold tracking-[.12em] text-muted-foreground uppercase">
                Next up
              </p>
              <p className="mt-1.25 font-sans text-body leading-[1.35] font-semibold text-(--bipi-ink-2)">
                {nextStage.title}
              </p>
            </div>
            <p className="flex-none font-mono text-pill-lg leading-none font-bold text-(--bipi-now-ink) tabular-nums">
              {nextStage.shortDate}
            </p>
          </div>
        )}
      </div>

      {/* ---------- Laptop (1024px and up) ---------- */}
      <div className="hidden rounded-(--bipi-r-panel-lg) border-[1.5px] border-(--bipi-now-ring) bg-card px-7 py-6.5 shadow-(--bipi-shadow-now-lg) lg:block">
        <div className="grid grid-cols-[1fr_250px] items-center gap-8.5">
          <div>
            <p className="font-mono text-eyebrow font-bold tracking-[.14em] text-(--bipi-now) uppercase">
              <NowDot /> You are here · <span className="tabular-nums">{todayLabel}</span>
            </p>

            <p className="mt-4 font-mono text-pill tracking-[.1em] text-muted-foreground uppercase">
              {currentStage.label} / {currentStage.weekRange}
            </p>

            <h2 className="mt-1.5 font-heading text-panel-title-lg leading-[1.12] font-bold tracking-[-.025em] text-foreground">
              {currentStage.title}
            </h2>

            <p className="mt-3 max-w-[620px] font-sans text-standfirst-lg leading-[1.55] text-(--bipi-ink-2) text-pretty">
              <span className="font-bold">{dueChip}:</span> {currentStage.whatsDue}{" "}
              {reportSentence}
            </p>
          </div>

          <p className="rounded-(--bipi-r-panel) bg-(--bipi-now) px-3.5 py-5.5 text-center text-white">
            {isDueToday ? (
              <>
                <span className="block font-heading text-panel-title-lg leading-[0.9] font-bold tracking-[-.03em]">
                  {DUE_TODAY}
                </span>
                <span className="mt-2.25 block font-mono text-eyebrow leading-[1.4] font-bold tracking-[.12em] uppercase opacity-85">
                  {currentStage.dueDateLabel}
                </span>
              </>
            ) : (
              <>
                <span className="block font-heading text-display-xl leading-[0.9] font-bold tracking-[-.03em] tabular-nums">
                  {daysLeft}
                </span>
                <span className="mt-2.25 block font-mono text-eyebrow leading-[1.4] font-bold tracking-[.12em] uppercase opacity-85">
                  {daysLeftWord(daysLeft)} to
                  <br />
                  {currentStage.dueDateLabel}
                </span>
              </>
            )}
          </p>
        </div>

        <TermRuler
          className="mt-5.5 border-t border-border pt-4.5"
          ticks={schedule.rulerTicks}
          termPct={termPct}
          weekNumber={weekNumber}
        />
      </div>
    </section>
  );
}
