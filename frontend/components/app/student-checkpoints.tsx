"use client";

import type { StudentCheckpoints as Data } from "@/lib/api/schemas";
import { formatCalendarDate } from "@/lib/app/component-setup";
import { bandHeading, failSentence, fullName, revokeName, revokeQuestion, signName, stageLabel, undoName } from "@/lib/app/progress";

import { CheckpointCell, RevokeStrip, SignoffAlert } from "./signoff-parts";
import { card, eyebrow, sectionTitle } from "./styles";
import { targetKey, useSignoffs } from "./use-signoffs";

/** Pack D-7: where this student stands, above the log that is the evidence for it. Same actions as the grid. */
export function StudentCheckpoints({ componentId, data }: { componentId: string; data: Data }) {
  const s = useSignoffs(componentId);
  const name = fullName(data);
  const { numeral, label } = bandHeading(data.behindBy);

  return (
    <section aria-labelledby="checkpoints-heading" className="mt-7">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h2 id="checkpoints-heading" className={sectionTitle}>Checkpoints</h2>
        <p className="flex items-baseline gap-2">
          {numeral && <span className="font-heading text-app-behind-sm font-bold leading-none tabular-nums text-app-due">{numeral}</span>}
          <span className="text-app-base font-semibold text-app-ink">{label}</span>
        </p>
      </div>
      <ul className={`${card} mt-3 divide-y divide-app-line`}>
        {data.stages.map((st) => {
          const t = { student: data, checkpoint: st.checkpoint };
          const key = targetKey(t);
          const failed = s.failed.get(key);
          return (
            <li key={st.stageId} className={`flex flex-col gap-3 p-4 ${st.state === "DUE" ? "bg-app-due-row" : ""}`}>
              <div className="grid gap-3 lg:grid-cols-[200px_1fr_auto] lg:items-start">
                <div className="flex flex-col gap-0.5">
                  <span className={`${eyebrow} text-app-grey`}>{stageLabel(st)}</span>
                  <span className="text-app-small text-app-ink">{st.name}</span>
                  <span className="font-mono text-app-label text-app-grey">{st.dueDate ? formatCalendarDate(st.dueDate) : "No date set"}</span>
                </div>
                <p className="text-app-base text-app-ink">{st.checkpoint.text}</p>
                <CheckpointCell layout="one" cell={{ checkpointId: st.checkpoint.id, state: st.state, signedOffOn: st.signedOffOn }}
                  names={{ sign: signName(st.checkpoint.text, name), undo: undoName(st.checkpoint.text, name), revoke: revokeName(st.checkpoint.text, name) }}
                  busy={s.busy.get(key) ?? null} recent={s.recent.has(key)} confirming={s.confirming === key}
                  onSign={() => s.signOff(t)} onUndo={() => s.undo(t)} onAsk={() => s.askRevoke(t)} />
              </div>
              {st.history.map((h, i) => (
                <p key={i} className="text-app-small text-app-grey">
                  {`Signed off on ${formatCalendarDate(h.signedOffOn)}, revoked on ${formatCalendarDate(h.revokedOn)} by ${h.revokedBy}.`}
                </p>
              ))}
              {s.confirming === key && (
                <RevokeStrip question={revokeQuestion(st.checkpoint.text, name, "student")} text={st.checkpoint.text} name={name}
                  busy={s.busy.has(key)} onRevoke={() => s.revoke(t)} onKeep={s.keep} />
              )}
              {failed && <SignoffAlert message={failSentence(failed.action, st.checkpoint.text, name)} name={name} onRetry={() => s.retry(key)} />}
            </li>
          );
        })}
      </ul>
      <p aria-live="polite" className="sr-only">{s.announcement}</p>
    </section>
  );
}
