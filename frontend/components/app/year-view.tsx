"use client";

import { useMemo, useState } from "react";

import {
  formatCalendarDate,
  gapLabels,
  letteredItems,
  monthTicks,
  positionPct,
  type StageLike,
  yearSpan,
} from "@/lib/app/component-setup";
import { monthWeeks, monthYearLabel, rangeFor } from "@/lib/app/timeline";

import { eyebrow } from "./styles";

const WEEKDAY_HEADS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_OF_MONTH = new Intl.DateTimeFormat("en-IE", { day: "numeric", timeZone: "UTC" });
const DAY_MONTH = new Intl.DateTimeFormat("en-IE", { day: "numeric", month: "short", timeZone: "UTC" });

const textButton =
  "rounded-app-control px-1.5 py-1 text-app-meta font-semibold text-app-accent underline underline-offset-3 hover:text-app-accent-hover touch-manipulation";

/**
 * A mark's own horizontal placement. Centred on its date, except at the very ends, where centring
 * would hang half the numeral outside the box (pack D-5: "the first mark at left: 0 is not
 * translated, so it doesn't clip").
 */
function markStyle(pct: number) {
  const transform = pct <= 1 ? "none" : pct >= 99 ? "translateX(-100%)" : "translateX(-50%)";
  return { left: `${pct}%`, transform };
}

type Tone = "accent" | "attention" | "error";

const MARK_INK: Record<Tone, string> = {
  accent: "text-app-accent",
  attention: "text-app-attention",
  error: "text-app-error",
};
const MARK_FILL: Record<Tone, string> = {
  accent: "bg-app-accent",
  attention: "bg-app-attention",
  error: "bg-app-error",
};
const STEM: Record<Tone, string> = {
  accent: "bg-app-stem",
  attention: "bg-app-stem-attention",
  error: "bg-app-stem-error",
};

/**
 * Pack D-5's year view: the teacher's nine months on one line, a key that says what each mark means,
 * and a read-only month calendar. Purely presentational — it never sets a date, and the only state it
 * owns is which month the calendar is showing and whether the calendar is open at all.
 *
 * Nothing on the line is a fact you can only get from the line: every date is also real text in the
 * rows below and in the letter list, so the line is `role="img"` and its marks are not announced
 * one by one (the same reasoning as the BiPi term ruler).
 */
export function YearView({
  stages,
  completionDate,
  today,
  attentionStageIds,
  errorStageIds,
  footnote,
  onClose,
}: {
  stages: ReadonlyArray<StageLike>;
  completionDate: string;
  today: string;
  attentionStageIds: ReadonlyArray<string>;
  errorStageIds: ReadonlyArray<string>;
  footnote: string | null;
  onClose: () => void;
}) {
  const items = useMemo(() => letteredItems(stages), [stages]);
  const dated = stages.filter((s) => s.dueDate !== null);
  const datedItems = items.filter((i) => i.dueDate !== null);
  const span = useMemo(
    () => yearSpan([...dated.map((s) => s.dueDate!), ...datedItems.map((i) => i.dueDate!)], completionDate, today),
    [dated, datedItems, completionDate, today],
  );

  // The calendar opens on the month of the next thing due, or on this month when nothing is ahead.
  const upcoming = [...dated.map((s) => s.dueDate!), ...datedItems.map((i) => i.dueDate!)].filter((d) => d >= today).sort();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [monthAnchor, setMonthAnchor] = useState(() => upcoming[0] ?? today);

  const toneOf = (stageId: string): Tone =>
    errorStageIds.includes(stageId) ? "error" : attentionStageIds.includes(stageId) ? "attention" : "accent";

  const completionPct = positionPct(completionDate, span);
  const gaps = gapLabels([...dated.map((s) => s.dueDate!), completionDate], span);
  const ticks = monthTicks(span, dated.length === 0);
  const monthBand = { from: positionPct(`${today.slice(0, 7)}-01`, span), to: positionPct(nextMonthStart(today), span) };
  const todayPct = positionPct(today, span);

  return (
    <section className="rounded-app-card border border-app-field-border bg-app-surface px-5 pt-[18px] pb-4">
      <div className="flex items-center justify-between gap-4">
        <h3 className={`${eyebrow} text-app-muted`}>Your dates across the year</h3>
        <button type="button" onClick={onClose} className={textButton}>
          Hide the year view
        </button>
      </div>

      <div className="-mx-5 overflow-x-auto px-5 md:mx-0 md:overflow-visible md:px-0">
        <div
          role="img"
          aria-label={`Your dates across the year, ${formatCalendarDate(span.from)} to ${formatCalendarDate(span.to)}`}
          className="relative mt-3 h-[148px] min-w-[560px] md:min-w-0"
        >
          {/* The month you are in, behind everything else. */}
          <div
            aria-hidden="true"
            className="absolute inset-y-0 rounded-app-inner bg-app-accent-tint"
            style={{ left: `${monthBand.from}%`, width: `${Math.max(0, monthBand.to - monthBand.from)}%` }}
          />
          <div aria-hidden="true" className={`absolute right-0 left-0 bottom-[58px] h-px ${dated.length === 0 ? "border-t border-dashed border-app-line" : "bg-app-line"}`} />

          {/* Today. A dashed line rather than a mark: it is not one of the teacher's dates. */}
          <div aria-hidden="true" className="absolute top-0 bottom-[58px] border-l border-dashed border-app-disabled" style={{ left: `${todayPct}%` }} />
          <span aria-hidden="true" className="absolute top-0 -translate-x-full pr-1.5 text-app-label text-app-muted" style={{ left: `${todayPct}%` }}>
            Today
          </span>

          {dated.length === 0 && (
            <p className="absolute bottom-[68px] left-0 text-app-small text-app-muted">Your dates appear here as you set them.</p>
          )}

          {dated.map((s) => {
            const tone = toneOf(s.id);
            const pct = positionPct(s.dueDate!, span);
            return (
              <span key={s.id} aria-hidden="true" className="absolute bottom-[58px] flex flex-col items-center" style={markStyle(pct)}>
                <span className={`font-mono text-[13px] leading-none font-bold ${MARK_INK[tone]}`}>{s.ordinal}</span>
                <span className={`w-px ${STEM[tone]}`} style={{ height: s.ordinal % 2 === 1 ? 26 : 50 }} />
                <span className={`-mb-[6px] size-[11px] rounded-full ${MARK_FILL[tone]}`} />
              </span>
            );
          })}

          {gaps.map((gap) => (
            <span
              key={`${gap.label}-${gap.pct}`}
              aria-hidden="true"
              className="absolute bottom-[52px] -translate-x-1/2 px-1.5 text-app-label whitespace-nowrap text-app-muted"
              style={{ left: `${gap.pct}%` }}
            >
              {gap.label}
            </span>
          ))}

          {datedItems.map((item) => {
            const pct = positionPct(item.dueDate!, span);
            return (
              <span key={item.id} aria-hidden="true">
                <span
                  className="absolute bottom-[40px] size-[10px] -translate-x-1/2 rounded-full border-2 border-app-accent bg-app-surface"
                  style={{ left: `${pct}%` }}
                />
                <span className="absolute bottom-[22px] -translate-x-1/2 font-mono text-app-label font-bold text-app-accent" style={{ left: `${pct}%` }}>
                  {item.letter}
                </span>
              </span>
            );
          })}

          <span
            aria-hidden="true"
            className="absolute bottom-[58px] h-[34px] w-[3px] bg-app-accent"
            style={{ left: `${completionPct}%`, transform: completionPct >= 99 ? "translateX(-100%)" : "translateX(-50%)" }}
          />
          {dated.length === 0 && (
            <span aria-hidden="true" className="absolute bottom-[96px] -translate-x-full pr-2 text-app-small whitespace-nowrap text-app-muted" style={{ left: `${completionPct}%` }}>
              {`Completion ${formatCalendarDate(completionDate)}`}
            </span>
          )}

          {ticks.map((tick) => (
            <span
              key={tick.iso}
              aria-hidden="true"
              className={`absolute bottom-0 -translate-x-1/2 font-mono text-app-label ${tick.iso.slice(0, 7) === today.slice(0, 7) ? "font-bold text-app-accent" : "text-app-muted"}`}
              style={{ left: `${tick.pct}%` }}
            >
              {tick.label}
            </span>
          ))}
        </div>
      </div>

      {footnote && <p className="mt-2 text-app-small text-app-muted">{footnote}</p>}

      <ul aria-label="What the marks mean" className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 border-t border-app-line pt-3 text-app-small text-app-muted">
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="size-[11px] flex-none rounded-full bg-app-accent" />
          Stage date, numbered by the SEC
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="size-[10px] flex-none rounded-full border-2 border-app-accent bg-app-surface" />
          Your item, lettered by date
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="h-[14px] w-[3px] flex-none bg-app-accent" />
          {`Completion date, ${formatCalendarDate(completionDate)}`}
        </li>
      </ul>

      {items.length > 0 && (
        <ul aria-label="Your items on the line" className="mt-3 flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className={`flex size-[22px] flex-none items-center justify-center rounded-full font-mono text-app-label font-bold ${
                  item.dueDate ? "border-2 border-app-accent text-app-accent" : "border-2 border-dashed border-app-disabled text-app-muted"
                }`}
              >
                {item.letter}
              </span>
              <span className="min-w-0 text-app-meta text-app-ink">{item.text}</span>
              <span className="text-app-small text-app-muted">
                {item.dueDate
                  ? `${formatCalendarDate(item.dueDate)} · ${lower(item.stageLabel)}`
                  : `No date · ${lower(item.stageLabel)} · not shown on the line`}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 border-t border-app-line pt-3">
        {calendarOpen ? (
          <Calendar
            anchor={monthAnchor}
            today={today}
            completionDate={completionDate}
            stages={dated}
            items={datedItems}
            onMonth={setMonthAnchor}
            onHide={() => setCalendarOpen(false)}
          />
        ) : (
          <button type="button" onClick={() => setCalendarOpen(true)} className={textButton}>
            Show calendar
          </button>
        )}
      </div>
    </section>
  );
}

const lower = (label: string) => label.charAt(0).toLowerCase() + label.slice(1);

function nextMonthStart(iso: string) {
  const d = new Date(Date.parse(`${iso.slice(0, 7)}-01T00:00:00Z`));
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
}

/** Month arithmetic for the two arrows: the first of the month `step` months away from `anchor`. */
function shiftMonth(anchor: string, step: 1 | -1) {
  const d = new Date(Date.parse(`${anchor.slice(0, 7)}-01T00:00:00Z`));
  d.setUTCMonth(d.getUTCMonth() + step);
  return d.toISOString().slice(0, 10);
}

/** Read-only. Nothing in here is a control except the two arrows; no cell sets a date. */
function Calendar({
  anchor,
  today,
  completionDate,
  stages,
  items,
  onMonth,
  onHide,
}: {
  anchor: string;
  today: string;
  completionDate: string;
  stages: ReadonlyArray<StageLike>;
  items: ReadonlyArray<{ id: string; letter: string; text: string; dueDate: string | null }>;
  onMonth: (iso: string) => void;
  onHide: () => void;
}) {
  const range = rangeFor({ view: "month", from: anchor }, anchor);
  const weeks = monthWeeks(range);
  const month = monthYearLabel(anchor);
  const previous = shiftMonth(anchor, -1);
  const next = shiftMonth(anchor, 1);

  const onDay = new Map<string, { key: string; label: string; text: string; kind: "stage" | "item" }[]>();
  const add = (date: string, entry: { key: string; label: string; text: string; kind: "stage" | "item" }) =>
    onDay.set(date, [...(onDay.get(date) ?? []), entry]);
  for (const s of stages) add(s.dueDate!, { key: s.id, label: s.label ?? s.name, text: s.name, kind: "stage" });
  for (const i of items) add(i.dueDate!, { key: i.id, label: i.letter, text: i.text, kind: "item" });

  const inMonth = (date: string) => date.slice(0, 7) === anchor.slice(0, 7);
  const isWeekend = (date: string) => [0, 6].includes(new Date(Date.parse(`${date}T00:00:00Z`)).getUTCDay());
  const listed = weeks.flat().filter((d) => inMonth(d) && onDay.has(d));

  const arrow = "flex size-11 flex-none items-center justify-center rounded-app-control text-app-meta text-app-accent hover:bg-app-inset touch-manipulation";

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button type="button" aria-label={monthYearLabel(previous)} onClick={() => onMonth(previous)} className={arrow}>
            <span aria-hidden="true">‹</span>
          </button>
          <h4 className="min-w-[180px] text-center font-heading text-[19px] font-bold text-app-ink">{month}</h4>
          <button type="button" aria-label={monthYearLabel(next)} onClick={() => onMonth(next)} className={arrow}>
            <span aria-hidden="true">›</span>
          </button>
        </div>
        <button type="button" onClick={onHide} className={textButton}>
          Hide calendar
        </button>
      </div>

      <table className="mt-2 w-full table-fixed border-separate border-spacing-px overflow-hidden rounded-app-control border border-app-line bg-app-line">
        <caption className="sr-only">{month}</caption>
        <thead>
          <tr>
            {WEEKDAY_HEADS.map((day) => (
              <th key={day} scope="col" className="bg-app-surface py-1.5 pl-2 text-left font-mono text-app-label font-bold tracking-[.06em] text-app-muted">
                <span className="md:hidden">{day.charAt(0)}</span>
                <span className="hidden md:inline">{day}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week[0]}>
              {week.map((date) => {
                const entries = onDay.get(date) ?? [];
                if (!inMonth(date)) return <td key={date} className="h-11 bg-app-ground md:h-[62px]" />;
                return (
                  <td key={date} className={`h-11 align-top md:h-[62px] md:px-2 md:py-[7px] ${isWeekend(date) ? "bg-app-weekend" : "bg-app-surface"}`}>
                    <div className="flex h-full flex-col items-center gap-0.5 pt-1 md:items-stretch md:pt-0">
                      <span className={`text-app-base leading-none ${isWeekend(date) ? "text-app-muted" : "text-app-ink"} ${date === today ? "font-bold" : ""}`}>
                        {DAY_OF_MONTH.format(Date.parse(`${date}T00:00:00Z`))}
                      </span>
                      {/* Phone: a dot says "something is here" and the list below says what. */}
                      {entries.length > 0 && <span aria-hidden="true" className="size-[var(--app-calendar-dot)] rounded-full bg-app-accent md:hidden" />}
                      <div className="hidden min-w-0 flex-col gap-0.5 md:flex">
                        {entries.map((entry) => (
                          <span
                            key={entry.key}
                            title={entry.kind === "stage" ? `${entry.label}, ${entry.text}` : entry.text}
                            className={`truncate rounded-app-inner px-1.5 py-0.5 text-app-label font-semibold ${
                              entry.kind === "stage" ? "bg-app-accent text-app-on-accent" : "border border-app-accent bg-app-surface text-app-accent"
                            }`}
                          >
                            {entry.kind === "stage" ? entry.label : <><span className="font-mono font-bold">{entry.label}</span> {entry.text}</>}
                          </span>
                        ))}
                      </div>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {listed.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1 md:hidden">
          {listed.flatMap((date) =>
            (onDay.get(date) ?? []).map((entry) => (
              <li key={`${date}-${entry.key}`} className="text-app-small text-app-copy">
                <span className="font-mono text-app-muted">{DAY_MONTH.format(Date.parse(`${date}T00:00:00Z`))}</span>
                {` · ${entry.kind === "stage" ? `${entry.label}, ${entry.text}` : entry.text}`}
              </li>
            )),
          )}
        </ul>
      )}

      <p className="mt-2 text-app-small text-app-muted">
        {`Read-only. Dates are set in the rows below; nothing may be set after ${formatCalendarDate(completionDate)}.`}
      </p>
    </>
  );
}
