"use client";

import type { CSSProperties } from "react";

import { formatCalendarDate, gapLabels, monthTicks, positionPct, yearSpan } from "@/lib/app/component-setup";
import { calendarMonths, type DateMark } from "@/lib/app/date-marks";

import { MarkTag } from "./mark-tag";

type Tone = "accent" | "attention" | "error";
const STEM: Record<Tone, string> = { accent: "bg-app-stem", attention: "bg-app-stem-attention", error: "bg-app-stem-error" };
const DOT: Record<Tone, string> = { accent: "bg-app-accent", attention: "bg-app-attention", error: "bg-app-error" };
const MONTH = new Intl.DateTimeFormat("en-IE", { month: "long", year: "numeric", timeZone: "UTC" });

const nextMonth = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
};
/** A mark at the very ends of the line hangs inwards instead of being cut in half (pack D-5). */
const at = (pct: number): CSSProperties => ({ left: `${pct}%`, transform: pct <= 1 ? "none" : pct >= 99 ? "translateX(-100%)" : "translateX(-50%)" });

/**
 * The component's dates on one line (plan date-picker-drawer C-26), drawn by the page's year view and by the date
 * drawer. Stages are numbered square tags on stems (dashed when not saved), items lettered rings under the axis,
 * today a gold disc, the completion date the end bar. The page adds the weeks between stages; the drawer adds its
 * pick (an azure pin, its run back to the stage before) and the months as pointer shortcuts.
 */
export function YearLine({
  marks,
  today,
  completionDate,
  month,
  pick = null,
  gaps = false,
  toneOf,
  onMonth,
  className = "",
}: {
  marks: ReadonlyArray<DateMark>;
  today: string;
  completionDate: string;
  /** The month shaded on the line, "YYYY-MM-01": the drawer's month in view, or this month on the page. */
  month: string;
  /** The drawer's pin. `ordinal` is the stage it moves, whose own mark gives way to the pin. */
  pick?: { iso: string; label: string; runFrom: string | null; ordinal: number | null } | null;
  /** The page's "16 weeks" labels between stages and the completion date. */
  gaps?: boolean;
  toneOf?: (ordinal: number) => Tone;
  /** Pointer shortcuts to a month (the drawer). Keyboard users have the arrows, so these take no tab stop. */
  onMonth?: (month: string) => void;
  className?: string;
}) {
  const stages = marks.filter((m) => m.kind === "stage" && m.ordinal !== pick?.ordinal);
  const items = marks.filter((m) => m.kind === "item");
  const dated = marks.filter((m) => m.kind !== "completion").map((m) => m.iso);
  const span = yearSpan([...dated, ...(pick ? [pick.iso] : [])], completionDate, today);
  const pct = (iso: string) => positionPct(iso, span);
  const band = { from: pct(month), to: pct(nextMonth(month)) };
  const range = calendarMonths(dated, today, completionDate);
  const months: string[] = [];
  for (let m = range.start; months.length < range.count; m = nextMonth(m)) months.push(m);
  const ghost = pick && pick.ordinal !== null ? marks.find((m) => m.kind === "stage" && m.ordinal === pick.ordinal && m.iso !== pick.iso) : undefined;
  const pickX = pick ? pct(pick.iso) : null;
  const todayX = pct(today);
  const labelRight = pickX !== null && pickX < 75 && (pickX >= todayX || pickX < 25);

  return (
    <div
      role={onMonth ? "group" : "img"}
      aria-label={`Your dates across the year, ${formatCalendarDate(span.from)} to ${formatCalendarDate(span.to)}`}
      className={`relative h-[124px] ${className}`}
    >
      <span aria-hidden="true" className="absolute inset-y-0 rounded-app-inner bg-app-accent-tint" style={{ left: `${band.from}%`, width: `${Math.max(0, band.to - band.from)}%` }} />
      {onMonth &&
        months.map((m) => (
          <button
            key={m}
            type="button"
            tabIndex={-1}
            aria-label={`Show ${MONTH.format(Date.parse(m))}`}
            onClick={() => onMonth(m)}
            className="absolute inset-y-0 cursor-pointer rounded-app-inner hover:bg-app-inset"
            style={{ left: `${pct(m)}%`, width: `${Math.max(0, pct(nextMonth(m)) - pct(m))}%` }}
          />
        ))}
      <span aria-hidden="true" className={`pointer-events-none absolute inset-x-0 bottom-[48px] h-px ${stages.length ? "bg-app-line" : "border-t border-dashed border-app-line"}`} />
      {stages.length === 0 && !pick && (
        <>
          <p className="absolute bottom-[60px] left-0 text-app-small text-app-muted">Your dates appear here as you set them.</p>
          <span className="absolute top-0 right-0 text-app-small whitespace-nowrap text-app-muted">{`Completion ${formatCalendarDate(completionDate)}`}</span>
        </>
      )}

      {gaps &&
        gapLabels([...marks.filter((m) => m.kind === "stage").map((m) => m.iso), completionDate], span).map((g) => (
          <span key={`${g.label}-${g.pct}`} aria-hidden="true" className="pointer-events-none absolute bottom-[42px] -translate-x-1/2 bg-app-surface px-1.5 text-app-label whitespace-nowrap text-app-muted" style={{ left: `${g.pct}%` }}>
            {g.label}
          </span>
        ))}

      {/* Today: a gold disc on the axis and a dashed line, the word on the side away from the pin. */}
      <span aria-hidden="true" className="pointer-events-none absolute top-[18px] bottom-[48px] border-l-[1.5px] border-dashed border-app-today-ring" style={{ left: `${todayX}%` }} />
      <span aria-hidden="true" className="pointer-events-none absolute bottom-[43px] size-[11px] -translate-x-1/2 rounded-full bg-app-today shadow-[inset_0_0_0_1.5px_var(--app-today-ring)]" style={{ left: `${todayX}%` }} />
      <span aria-hidden="true" className={`pointer-events-none absolute top-0 text-app-label font-bold text-app-ink ${pickX !== null && pickX < todayX ? "pl-1.5" : "-translate-x-full pr-1.5"}`} style={{ left: `${todayX}%` }}>
        Today
      </span>

      {stages.map((s) => {
        const tone = toneOf?.(s.ordinal ?? 0) ?? "accent";
        return (
          <span key={s.short} aria-hidden="true" className="pointer-events-none absolute bottom-[44px] flex flex-col items-center" style={at(pct(s.iso))}>
            <MarkTag kind="stage" saved={s.saved} tone={tone === "accent" ? undefined : tone}>{s.short}</MarkTag>
            <span className={`w-px ${STEM[tone]}`} style={{ height: (s.ordinal ?? 0) % 2 === 1 ? 10 : 30 }} />
            <span className={`size-[9px] rounded-app-tag ${s.saved ? DOT[tone] : "border-[1.5px] border-dashed border-app-accent bg-app-surface"}`} />
          </span>
        );
      })}
      {items.map((m) => (
        <span key={m.short} aria-hidden="true" className="pointer-events-none absolute bottom-[22px] -translate-x-1/2" style={{ left: `${pct(m.iso)}%` }}>
          <MarkTag kind="item">{m.short}</MarkTag>
        </span>
      ))}
      <span aria-hidden="true" className="pointer-events-none absolute bottom-[48px] h-[30px] w-[3px] bg-app-accent" style={at(pct(completionDate))} />

      {ghost && (
        <span aria-hidden="true" className="pointer-events-none absolute bottom-[44px] size-[9px] -translate-x-1/2 rounded-app-tag border-[1.5px] border-dashed border-app-muted bg-app-surface" style={{ left: `${pct(ghost.iso)}%` }} />
      )}
      {pick && pickX !== null && (
        <>
          {pick.runFrom && (
            <span data-run aria-hidden="true" className="pointer-events-none absolute bottom-[46px] h-1 rounded-full bg-app-pick" style={{ left: `${pct(pick.runFrom)}%`, width: `${pickX - pct(pick.runFrom)}%` }} />
          )}
          <span aria-hidden="true" className="pointer-events-none absolute top-4 bottom-[48px] w-0.5 -translate-x-1/2 bg-app-pick" style={{ left: `${pickX}%` }} />
          <span aria-hidden="true" className="pointer-events-none absolute bottom-[42px] size-[13px] -translate-x-1/2 rounded-full bg-app-pick ring-2 ring-app-surface" style={{ left: `${pickX}%` }} />
          <span className={`pointer-events-none absolute top-0 rounded-app-tag bg-app-pick px-1 text-app-label leading-4 font-bold whitespace-nowrap text-app-on-accent tabular-nums ${labelRight ? "" : "-translate-x-full"}`} style={{ left: `${pickX}%` }}>
            {pick.label}
          </span>
        </>
      )}

      {monthTicks(span, stages.length === 0).map((tick) => (
        <span key={tick.iso} aria-hidden="true" className={`pointer-events-none absolute bottom-0 -translate-x-1/2 font-mono text-app-label ${tick.iso.slice(0, 7) === month.slice(0, 7) ? "font-bold text-app-accent" : "text-app-muted"}`} style={{ left: `${tick.pct}%` }}>
          {tick.label}
        </span>
      ))}
    </div>
  );
}
