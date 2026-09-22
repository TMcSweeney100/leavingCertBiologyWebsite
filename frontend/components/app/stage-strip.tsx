"use client";

import { stageLegend, type StageState } from "@/lib/app/component-progress";
import { formatCalendarDate } from "@/lib/app/component-setup";

const CELL_WORD: Record<StageState, string> = { done: "Done", current: "Now", upcoming: "Upcoming", undated: "No date yet" };

const CELL_STYLE: Record<StageState, string> = {
  done: "bg-app-done-ground text-app-done",
  current: "bg-app-now text-white",
  upcoming: "border border-app-field-border bg-app-surface text-app-grey",
  undated: "border border-app-field-border bg-app-surface text-app-grey",
};

// The stage name and date read quieter than the numeral and state word (NOTES: "the stage
// name inside a done strip cell, quieter than the numeral but still over the AA floor").
const CELL_NAME_STYLE: Record<StageState, string> = {
  done: "text-app-done-ink",
  current: "text-white/90",
  upcoming: "text-app-grey",
  undated: "text-app-grey",
};

type StripStage = { id: string; ordinal: number; label: string | null; name: string; dueDate: string | null };

/**
 * Pack D-3, direction 1c: the strip is a navigator. Tapping a cell opens that stage (the
 * caller decides what "open" means) and scrolls to it. At 390 the cells drop to numerals
 * only; the legend paragraph underneath carries every state as a word (design §5, "colour
 * is never the only carrier").
 */
export function StageStrip({
  stages,
  states,
  activeId,
  onSelect,
}: {
  stages: ReadonlyArray<StripStage>;
  states: Record<string, StageState>;
  activeId?: string;
  onSelect: (id: string) => void;
}) {
  const ordered = [...stages].sort((a, b) => a.ordinal - b.ordinal);

  return (
    <div className="flex flex-col gap-2.5">
      <div role="group" aria-label="Stages" className="flex gap-1.5 overflow-x-auto lg:gap-2">
        {ordered.map((s) => {
          const state = states[s.id];
          const name = s.label ? `${s.label} · ${s.name}` : s.name;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s.id)}
              aria-current={s.id === activeId ? "true" : undefined}
              aria-label={`Stage ${s.ordinal}, ${CELL_WORD[state]}, ${name}`}
              className={`flex h-13 min-w-13 flex-1 flex-col justify-center gap-0.5 rounded-app-inner px-2.5 py-1.5 text-left lg:h-auto lg:min-h-11 lg:items-stretch lg:py-2.5 ${CELL_STYLE[state]}`}
            >
              <span aria-hidden="true" className="font-heading text-app-lead font-bold">{s.ordinal}</span>
              <span aria-hidden="true" className="hidden font-mono text-app-label font-bold tracking-[.08em] uppercase lg:inline">{CELL_WORD[state]}</span>
              <span aria-hidden="true" className={`hidden truncate text-app-small font-semibold lg:block ${CELL_NAME_STYLE[state]}`}>{name}</span>
              {s.dueDate && (
                <span aria-hidden="true" className={`hidden font-mono text-app-label lg:block ${CELL_NAME_STYLE[state]}`}>{formatCalendarDate(s.dueDate)}</span>
              )}
            </button>
          );
        })}
      </div>
      <p className="text-app-small text-app-grey lg:hidden">{stageLegend(ordered, states)}</p>
    </div>
  );
}
