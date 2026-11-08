"use client";

import { Plus } from "lucide-react";
import { useId, useMemo } from "react";

import { Button } from "@/components/ui/button";
import type { ProgressGrid } from "@/lib/api/schemas";
import type { Attempt } from "@/lib/app/attempt";
import { formatCalendarDate, type StageLike } from "@/lib/app/component-setup";
import { studentCount } from "@/lib/app/progress";
import { stageItems, tickLists } from "@/lib/app/stage-sheet";

/**
 * One stage's items in the stage sheet (plan stage-sheet S-5, S-16; plan stage-drawer-redesign R-5). Each row, and "Add
 * an item", opens the sheet's item view through `onOpen`; nothing opens in place. Rows carry `data-item` and the add
 * button `data-add-item`, so the sheet can put focus back on them when the item view closes.
 */
export function StageItems({ stage, stages, progress, onOpen }: {
  stage: StageLike;
  stages: ReadonlyArray<StageLike>;
  progress: Attempt<ProgressGrid>;
  onOpen: (itemId: string) => void;
}) {
  const headingId = useId();
  const items = useMemo(() => stageItems(stages, stage.id), [stages, stage.id]);
  const label = stage.label ?? stage.name;

  return (
    <section aria-labelledby={headingId} className="flex flex-col">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id={headingId} className="font-heading text-app-base font-bold text-app-ink">Your items in this stage</h3>
        {progress.ok && <span data-private className="text-app-help text-app-muted">{studentCount(progress.data.students.length)}</span>}
      </div>
      {items.length === 0 ? (
        <p className="mt-2 text-app-small text-app-muted">No items in this stage yet. Students see your items under the stage and on their timeline.</p>
      ) : (
        <ul className="mt-2 flex flex-col">
          {items.map((item) => {
            const ticked = progress.ok ? tickLists(progress.data, item.id).ticked.length : null;
            return (
              <li key={item.id} className="border-t border-app-line">
                <button
                  type="button"
                  data-item={item.id}
                  onClick={() => onOpen(item.id)}
                  className="grid w-full grid-cols-[28px_1fr_auto] items-baseline gap-x-2.5 gap-y-0.5 rounded-app-inner py-2.5 text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span
                    className={`flex size-7 items-center justify-center self-center rounded-full font-mono text-app-help font-bold ${
                      item.dueDate ? "bg-app-accent text-app-on-accent" : "border-2 border-dashed border-app-disabled text-app-muted"
                    }`}
                  >
                    {item.letter}
                  </span>{" "}
                  <span className="min-w-0 text-app-meta font-semibold break-words text-app-ink">{item.text}</span>{" "}
                  {ticked === null ? (
                    <span />
                  ) : (
                    <span
                      data-private
                      className={`rounded-full px-2 py-px text-app-label font-semibold whitespace-nowrap ${ticked > 0 ? "bg-app-approved-tint text-app-approved" : "bg-app-inset text-app-grey"}`}
                    >
                      {`${ticked} ticked`}
                    </span>
                  )}{" "}
                  <span className="col-start-2 text-app-help text-app-muted">
                    {item.dueDate ? formatCalendarDate(item.dueDate) : "No date, so not on the line or the calendar"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <Button type="button" variant="outline" data-add-item onClick={() => onOpen("new")} className="mt-1.5 w-full border-app-accent text-app-accent">
        <Plus aria-hidden="true" />
        {`Add an item to ${label}`}
      </Button>
    </section>
  );
}
