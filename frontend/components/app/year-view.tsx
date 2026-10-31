"use client";

import { useMemo } from "react";

import { formatCalendarDate, letteredItems, type StageLike } from "@/lib/app/component-setup";
import type { DateMark } from "@/lib/app/date-marks";

import { MarkTag } from "./mark-tag";
import { eyebrow } from "./styles";
import { YearLine } from "./year-line";

const textButton =
  "rounded-app-control px-1.5 py-1 text-app-meta font-semibold text-app-accent underline underline-offset-3 hover:text-app-accent-hover touch-manipulation";

/**
 * Pack D-5's year view, drawn since D-11 by the same line as the date drawer (plan date-picker-drawer C-26): every
 * date on one line, a key, and the teacher's items by letter. Read-only; the date drawer is the calendar now.
 *
 * Nothing on the line is a fact you can only get from the line: every date is also real text in the
 * rows below and in the letter list, so the line is `role="img"` and its marks are not announced
 * one by one (the same reasoning as the BiPi term ruler).
 */
export function YearView({
  stages,
  marks,
  completionDate,
  today,
  attentionStageIds,
  errorStageIds,
  footnote,
  onClose,
}: {
  stages: ReadonlyArray<StageLike>;
  /** The stage form's marks, from its draft, so a date not saved yet shows dashed. */
  marks: ReadonlyArray<DateMark>;
  completionDate: string;
  today: string;
  attentionStageIds: ReadonlyArray<string>;
  errorStageIds: ReadonlyArray<string>;
  footnote: string | null;
  onClose: () => void;
}) {
  const items = useMemo(() => letteredItems(stages), [stages]);
  const toneOf = (ordinal: number): "accent" | "attention" | "error" => {
    const id = stages.find((s) => s.ordinal === ordinal)?.id ?? "";
    return errorStageIds.includes(id) ? "error" : attentionStageIds.includes(id) ? "attention" : "accent";
  };

  return (
    <section className="rounded-app-card border border-app-field-border bg-app-surface px-5 pt-[18px] pb-4">
      <div className="flex items-center justify-between gap-4">
        <h3 className={`${eyebrow} text-app-muted`}>Your dates across the year</h3>
        <button type="button" onClick={onClose} className={textButton}>
          Hide the year view
        </button>
      </div>

      <div className="-mx-5 mt-3 overflow-x-auto px-5 md:mx-0 md:overflow-visible md:px-0">
        <YearLine
          marks={marks}
          today={today}
          completionDate={completionDate}
          month={`${today.slice(0, 7)}-01`}
          gaps
          toneOf={toneOf}
          className="min-w-[560px] md:min-w-0"
        />
      </div>

      {footnote && <p className="mt-2 text-app-small text-app-muted">{footnote}</p>}

      <ul aria-label="What the marks mean" className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 border-t border-app-line pt-3 text-app-small text-app-muted">
        <li className="flex items-center gap-2"><MarkTag kind="stage">S2</MarkTag>Stage date, numbered by the SEC</li>
        <li className="flex items-center gap-2"><MarkTag kind="stage" saved={false}>S2</MarkTag>Not saved yet</li>
        <li className="flex items-center gap-2"><MarkTag kind="item">A</MarkTag>Your item, lettered by date</li>
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="h-4 w-[3px] flex-none rounded-sm bg-app-accent" />
          {`Completion date, ${formatCalendarDate(completionDate)}`}
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="size-[11px] flex-none rounded-full bg-app-today shadow-[inset_0_0_0_1.5px_var(--app-today-ring)]" />
          Today
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
    </section>
  );
}

const lower = (label: string) => label.charAt(0).toLowerCase() + label.slice(1);
