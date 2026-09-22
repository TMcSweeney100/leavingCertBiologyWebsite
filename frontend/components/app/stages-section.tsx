"use client";

import { useState } from "react";

import type { StudentComponent } from "@/lib/api/schemas";
import type { StageState } from "@/lib/app/component-progress";

import { StageCard } from "./stage-card";
import { StageStrip } from "./stage-strip";

type Stage = StudentComponent["stages"][number];

/**
 * Pack D-3: the strip is a navigator and only one stage is open at a time — opening one
 * closes another, so the state lives here rather than in each card. Tapping a strip cell
 * always opens that stage and scrolls to it; tapping an open row's own header closes it.
 */
export function StagesSection({
  componentId,
  stages,
  states,
  initialOpenId,
}: {
  componentId: string;
  stages: ReadonlyArray<Stage>;
  states: Record<string, StageState>;
  initialOpenId: string | null;
}) {
  const [openId, setOpenId] = useState<string | null>(initialOpenId);
  const ordered = [...stages].sort((a, b) => a.ordinal - b.ordinal);

  function selectFromStrip(id: string) {
    setOpenId(id);
    document.getElementById(`stage-${id}`)?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }

  function toggleRow(id: string) {
    setOpenId((current) => (current === id ? null : id));
  }

  return (
    <div className="flex flex-col gap-3">
      <StageStrip stages={ordered} states={states} activeId={openId ?? undefined} onSelect={selectFromStrip} />
      <div data-testid="stage-list" className="flex flex-col gap-3">
        {ordered.map((s) => (
          <StageCard
            key={s.id}
            componentId={componentId}
            stage={s}
            allStages={ordered}
            state={states[s.id]}
            open={s.id === openId}
            onToggle={toggleRow}
          />
        ))}
      </div>
    </div>
  );
}
