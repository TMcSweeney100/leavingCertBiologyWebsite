import type { StudentCheckpoints } from "@/lib/api/schemas";
import { bandHeading, stageKey } from "@/lib/app/progress";
import { checkpointAnchor } from "@/lib/app/ready";
import { segmentName, signedOffWords, stageCounts } from "@/lib/app/student-page";

import { eyebrow } from "./styles";

type State = StudentCheckpoints["stages"][number]["state"];

/** R-9: waiting and due are both amber (both need the teacher); the counts and the link names tell them apart. */
const SEGMENT: Record<State, string> = {
  SIGNED_OFF: "bg-app-approved-on-accent",
  READY: "bg-app-attention-on-accent",
  DUE: "bg-app-attention-on-accent",
  NOT_DUE: "bg-app-accent-track",
};

/**
 * Direction D: the navy card, the stage drawer's checkpoint card brought to the student page. Where this student
 * stands in one line, then one segment per stage that jumps to its card (R-20), then the counts in words.
 */
export function CheckpointSummary({ data, headingId }: { data: StudentCheckpoints; headingId: string }) {
  const counts = stageCounts(data.stages);
  const { numeral, label } = bandHeading(data.behindBy);
  return (
    <div className="rounded-app-card bg-app-accent p-[18px] text-app-on-accent">
      <h2 id={headingId} className={`${eyebrow} text-app-on-accent-muted`}>Checkpoints</h2>
      <p className="mt-1.5 font-heading text-[22px] leading-[1.25] font-bold tracking-[-.01em] text-balance">
        {numeral && <span className="tabular-nums">{`${numeral} `}</span>}<span>{label}</span>{` · ${signedOffWords(counts)}`}
      </p>
      <nav aria-label="Jump to a stage" className="mt-4">
        <ol className="grid gap-2" style={{ gridTemplateColumns: `repeat(${data.stages.length}, minmax(0, 1fr))` }}>
          {data.stages.map((st) => (
            <li key={st.stageId}>
              <a href={`#${checkpointAnchor(st.checkpoint.id)}`} aria-label={segmentName(st)}
                className="flex min-h-11 flex-col gap-1.5 rounded-app-inner pt-1 font-mono text-app-label font-bold text-app-on-accent-muted touch-manipulation hover:text-app-on-accent focus-visible:outline-app-on-accent">
                <span aria-hidden className={`h-2 rounded-full ${SEGMENT[st.state]}`} />
                <span aria-hidden>{stageKey(st)}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <p className="mt-1 flex flex-wrap gap-x-3.5 gap-y-1 text-app-help text-app-on-accent-muted">
        <span><b className="font-bold text-app-approved-on-accent">{counts.signedOff}</b> signed off</span>
        {counts.waiting > 0 && <span><b className="font-bold text-app-on-accent">{counts.waiting}</b> waiting for you</span>}
        {counts.due > 0 && <span><b className="font-bold text-app-on-accent">{counts.due}</b> due, not signed off</span>}
        {counts.notDue > 0 && <span><b className="font-bold text-app-on-accent">{counts.notDue}</b> not due yet</span>}
      </p>
    </div>
  );
}
