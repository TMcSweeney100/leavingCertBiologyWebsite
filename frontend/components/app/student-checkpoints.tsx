"use client";

import { useState } from "react";

import type { StudentCheckpoints as Data } from "@/lib/api/schemas";
import { formatCalendarDate } from "@/lib/app/component-setup";
import { CHECKPOINT_STATE, checkpointAnchor, reviewName } from "@/lib/app/ready";
import { bandHeading, failSentence, fullName, revokeName, revokeQuestion, signName, stageLabel, undoName } from "@/lib/app/progress";

import { LastAnswerLine } from "./request-history";
import { RequestReview } from "./request-review";
import { AnsweredStrip, RequestDrawer } from "./request-drawer";
import { CheckpointCell, RevokeStrip, SignoffAlert } from "./signoff-parts";
import { card, eyebrow, sectionTitle } from "./styles";
import { useAnswer, withRecent } from "./use-answer";
import { targetKey, useSignoffs } from "./use-signoffs";

type Stage = Data["stages"][number];

/** Pack D-7: where this student stands, above the log that is the evidence for it. Same actions as the grid. */
export function StudentCheckpoints({ componentId, data }: { componentId: string; data: Data }) {
  const s = useSignoffs(componentId);
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
        {data.stages.map((st) => <StageRow key={st.stageId} componentId={componentId} data={data} st={st} s={s} />)}
      </ul>
      <p aria-live="polite" className="sr-only">{s.announcement}</p>
    </section>
  );
}

/** One checkpoint. It owns the draft note and the drawer, because they belong to this checkpoint's request alone. */
function StageRow({ componentId, data, st, s }: { componentId: string; data: Data; st: Stage; s: ReturnType<typeof useSignoffs> }) {
  const name = fullName(data);
  const stage = stageLabel(st);
  const t = { student: data, checkpoint: st.checkpoint };
  const key = targetKey(t);
  const failed = s.failed.get(key);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const a = useAnswer(componentId, data.studentId, st.checkpoint.id, st.request, (outcome) => s.noteAnswered(t, outcome));

  const answers = withRecent(st.answers, a.recent, data.today);
  const open = st.request !== null && a.recent === null;
  const signed = st.state === "SIGNED_OFF" && s.recent.has(key);
  const undo = async () => { if (await s.undo(t)) a.clearRecent(); };
  const undoLabel = undoName(st.checkpoint.text, name);
  const again = st.answers.length > 0;
  const { word: stateWord, className: stateClass } = CHECKPOINT_STATE[st.state];
  const ground = open ? "bg-app-surface shadow-[inset_3px_0_0_var(--app-accent)]"
    : signed ? "bg-app-signed-recent shadow-[inset_3px_0_0_var(--app-signed)]"
    : st.state === "DUE" ? "bg-app-due-row" : "";
  const common = { firstName: data.firstName, name, text: st.checkpoint.text, stage };
  const answerProps = {
    note: a.note, onNote: a.setNote, busy: a.busy, error: a.error,
    onAnswer: (o: "ACCEPTED" | "NOT_YET") => st.request && void a.answer(o, st.request),
    onRetry: () => a.error && st.request && void a.answer(a.error.outcome, st.request),
  };

  return (
    <li id={checkpointAnchor(st.checkpoint.id)} className={`flex scroll-mt-20 flex-col gap-3 p-4 ${ground}`}>
      <div className="grid gap-3 lg:grid-cols-[200px_1fr_auto] lg:items-start">
        <div className="flex flex-col gap-0.5">
          <span className={`${eyebrow} text-app-grey`}>{stage}</span>
          <span className="text-app-small text-app-ink">{st.name}</span>
          <span className="font-mono text-app-label text-app-grey">{st.dueDate ? formatCalendarDate(st.dueDate) : "No date set"}</span>
        </div>
        <p className="text-app-base text-app-ink">{st.checkpoint.text}</p>
        <CheckpointCell layout="one" cell={{ checkpointId: st.checkpoint.id, state: st.state, signedOffOn: st.signedOffOn }}
          names={{ sign: signName(st.checkpoint.text, name), undo: undoLabel, revoke: revokeName(st.checkpoint.text, name), review: reviewName(st.checkpoint.text, name) }}
          busy={s.busy.get(key) ?? null} recent={s.recent.has(key)} confirming={s.confirming === key}
          onSign={() => s.signOff(t)} onUndo={() => void undo()} onAsk={() => s.askRevoke(t)} />
      </div>
      {st.history.map((h, i) => (
        <p key={i} className="text-app-small text-app-grey">
          {`Signed off on ${formatCalendarDate(h.signedOffOn)}, revoked on ${formatCalendarDate(h.revokedOn)} by ${h.revokedBy}.`}
        </p>
      ))}
      {open && st.request && !drawerOpen && (
        <RequestReview {...common} {...answerProps} checkpointId={st.checkpoint.id} request={st.request} again={again} today={data.today} link={data.documentLink} />
      )}
      {a.recent?.outcome === "NOT_YET" && (
        <p className="text-app-meta text-app-copy">You answered <strong>Not yet</strong> today. <span data-private>{data.firstName}</span> sees your note and can ask again.</p>
      )}
      {(answers.length > 0 || st.request) && (
        <LastAnswerLine firstName={data.firstName} answers={answers} action={
          answers.length > 0 && (
            <RequestDrawer open={drawerOpen} onOpenChange={setDrawerOpen} {...common} {...answerProps} checkpointId={st.checkpoint.id}
              stateWord={stateWord} stateClass={stateClass} answers={answers}
              request={open ? st.request : null} again={again} today={data.today} link={data.documentLink}
              answered={a.recent && <AnsweredStrip outcome={a.recent.outcome} undoLabel={undoLabel} busy={s.busy.has(key)} onUndo={() => void undo()} />} />
          )
        } />
      )}
      {s.confirming === key && (
        <RevokeStrip question={revokeQuestion(st.checkpoint.text, name, "student")} text={st.checkpoint.text} name={name}
          busy={s.busy.has(key)} onRevoke={() => s.revoke(t)} onKeep={s.keep} />
      )}
      {failed && <SignoffAlert message={failSentence(failed.action, st.checkpoint.text, name)} name={name} onRetry={() => s.retry(key)} />}
    </li>
  );
}
