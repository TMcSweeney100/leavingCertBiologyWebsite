import type { StudentComponent } from "@/lib/api/schemas";
import { STAGE_STATE_STYLE, STAGE_STATE_WORD, type StageState } from "@/lib/app/component-progress";
import { formatCalendarDate, hoursLabel } from "@/lib/app/component-setup";

import { ItemTick } from "./item-tick";
import { card, eyebrow, lead } from "./styles";

const CHECKPOINT_WORD = { NOT_DUE: "Not due yet", DUE: "Not signed off yet" } as const;

type Stage = StudentComponent["stages"][number];

/**
 * One stage in the strip's list (pack D-3). A `<button>` wraps the whole row so the tap
 * target is the card, not a chevron (NOTES "Components restyled"); only one stage is open
 * at a time, which the caller (`StagesSection`) enforces by controlling `open`. Expansion
 * is state, not a Collapsible — opening one stage closes another, which Base UI's
 * accordion-free Collapsible doesn't do on its own.
 */
export function StageCard({
  componentId,
  stage: s,
  allStages,
  state,
  open,
  onToggle,
}: {
  componentId: string;
  stage: Stage;
  allStages: ReadonlyArray<Stage>;
  state: StageState;
  open: boolean;
  onToggle: (id: string) => void;
}) {
  const checkpointDue = s.checkpoint?.state === "DUE";
  const isCurrent = state === "current";

  return (
    <div
      id={`stage-${s.id}`}
      className={`${card} scroll-mt-20 overflow-hidden ${isCurrent ? "border-[1.5px] border-app-now shadow-app-now-lift" : ""} ${checkpointDue ? "border-l-[3px] border-l-app-attention" : ""}`}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`stage-${s.id}-panel`}
        onClick={() => onToggle(s.id)}
        className="flex w-full min-h-11 flex-wrap items-baseline gap-x-3 gap-y-1 p-4 text-left"
      >
        <span className="font-semibold text-app-ink">{s.label ? `${s.label} · ${s.name}` : s.name}</span>
        <span className={`${eyebrow} rounded-full px-2.5 py-1 ${STAGE_STATE_STYLE[state]}`}>{STAGE_STATE_WORD[state]}</span>
        {s.dueDate && <span className="font-mono text-app-label text-app-grey">{formatCalendarDate(s.dueDate)}</span>}
      </button>
      <div
        id={`stage-${s.id}-panel`}
        aria-hidden={!open}
        inert={!open}
        className={`grid transition-[grid-template-rows] duration-(--app-duration) ease-app motion-reduce:transition-none ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="flex flex-col gap-3 px-4 pb-4">
            <p className={lead}>{s.description}</p>
            <p className="text-app-small text-app-grey">
              {[hoursLabel(s, allStages), s.supervised ? "Done in supervised class time" : ""].filter(Boolean).join(" · ")}
            </p>
            {s.checkpoint && (
              <div className={`flex flex-col gap-0.5 rounded-app-inner p-3 ${checkpointDue ? "bg-app-attention-tint" : "bg-app-inset"}`}>
                <span className={eyebrow}>Checkpoint · {CHECKPOINT_WORD[s.checkpoint.state]}</span>
                <span className="text-app-base text-app-ink">{s.checkpoint.text}</span>
                {checkpointDue && (
                  <span className="text-app-small text-app-grey">{"Your teacher signs this off. Bring it up in your next class."}</span>
                )}
                <span className="text-app-small text-app-grey">Only your teacher can sign this off.</span>
              </div>
            )}
            {s.items.length > 0 && (
              <div className="flex flex-col gap-1">
                <span className={eyebrow}>From your teacher</span>
                {s.items.map((item) => <ItemTick key={item.id} componentId={componentId} item={item} />)}
              </div>
            )}
            {s.prompts.length > 0 && (
              <details>
                <summary className="cursor-pointer text-app-base font-semibold text-app-accent">{`Questions to help you (${s.prompts.length})`}</summary>
                <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
                  {s.prompts.map((prompt, i) => (
                    <li key={i} className="text-app-base text-app-copy">
                      {prompt.heading && i > 0 && s.prompts[i - 1].heading === prompt.heading ? null : prompt.heading ? <span className="block text-app-small text-app-grey">{prompt.heading}</span> : null}
                      {prompt.text}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
