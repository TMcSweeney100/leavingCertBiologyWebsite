"use client";

import { Check } from "lucide-react";
import { useState } from "react";

import type { StudentCheckpoints as Data } from "@/lib/api/schemas";
import { formatCalendarDate } from "@/lib/app/component-setup";
import { CHECKPOINT_STATE, checkpointAnchor, reviewName } from "@/lib/app/ready";
import { failSentence, fullName, revokeName, revokeQuestion, signName, stageKey, stageLabel, undoName } from "@/lib/app/progress";

import { CheckpointSummary } from "./checkpoint-summary";
import { LastAnswerLine } from "./request-history";
import { RequestReview } from "./request-review";
import { AnsweredStrip, RequestDrawer } from "./request-drawer";
import { CheckpointCell, RevokeStrip, SignoffAlert } from "./signoff-parts";
import { card } from "./styles";
import { useAnswer, withRecent } from "./use-answer";
import { targetKey, useSignoffs } from "./use-signoffs";

type Stage = Data["stages"][number];

/** R-21: the stage's circle on the rail. Decorative; the card says the same in words. */
const RAIL: Record<Stage["state"], string> = {
  SIGNED_OFF: "bg-app-signed text-app-on-accent",
  READY: "bg-app-attention text-app-on-accent ring-6 ring-app-attention-tint",
  DUE: "border-2 border-app-due bg-app-surface text-app-due",
  NOT_DUE: "border-[1.5px] border-app-field-border bg-app-surface text-app-grey",
};

/** Direction D: where this student stands, then one card per stage on a timeline, above the log that is the evidence. Same actions as the grid. */
export function StudentCheckpoints({ componentId, data }: { componentId: string; data: Data }) {
  const s = useSignoffs(componentId);
  return (
    <section aria-labelledby="checkpoints-heading" className="mt-3 flex flex-col gap-4">
      <CheckpointSummary data={data} headingId="checkpoints-heading" />
      <ol aria-label="Stages" className="flex flex-col">
        {data.stages.map((st, i) => (
          <StageRow key={st.stageId} componentId={componentId} data={data} st={st} s={s} last={i === data.stages.length - 1} />
        ))}
      </ol>
      <p aria-live="polite" className="sr-only">{s.announcement}</p>
    </section>
  );
}

/** One stage's card. It owns the draft note and the drawer, because they belong to this checkpoint's request alone. */
function StageRow({ componentId, data, st, s, last }:
  { componentId: string; data: Data; st: Stage; s: ReturnType<typeof useSignoffs>; last: boolean }) {
  const name = fullName(data);
  const stage = stageLabel(st);
  const t = { student: data, checkpoint: st.checkpoint };
  const key = targetKey(t);
  const failed = s.failed.get(key);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const a = useAnswer(componentId, data.studentId, st.checkpoint.id, st.request, (outcome) => s.noteAnswered(t, outcome));

  const answers = withRecent(st.answers, a.recent, data.today);
  const open = st.request !== null && a.recent === null;
  const undo = async () => { if (await s.undo(t)) a.clearRecent(); };
  const undoLabel = undoName(st.checkpoint.text, name);
  const again = st.answers.length > 0;
  const { word: stateWord, className: stateClass } = CHECKPOINT_STATE[st.state];
  const common = { firstName: data.firstName, name, text: st.checkpoint.text, stage };
  const answerProps = {
    note: a.note, onNote: a.setNote, busy: a.busy, error: a.error,
    onAnswer: (o: "ACCEPTED" | "NOT_YET") => st.request && void a.answer(o, st.request),
    onRetry: () => a.error && st.request && void a.answer(a.error.outcome, st.request),
  };
  const due = st.dueDate ? `due ${formatCalendarDate(st.dueDate)}` : "no date set";

  return (
    <li id={checkpointAnchor(st.checkpoint.id)} className="grid scroll-mt-20 grid-cols-[32px_minmax(0,1fr)] gap-x-2.5 pb-3 last:pb-0 lg:grid-cols-[40px_minmax(0,1fr)] lg:gap-x-3.5">
      <div aria-hidden className="relative flex justify-center">
        <span className={`relative z-[1] mt-3.5 flex size-8 items-center justify-center rounded-full font-mono text-app-help font-bold lg:size-9 ${RAIL[st.state]}`}>
          {st.state === "SIGNED_OFF" ? <Check className="size-4" strokeWidth={3} /> : stageKey(st)}
        </span>
        {!last && <span className={`absolute top-[50px] -bottom-3 left-1/2 w-0.5 -translate-x-1/2 ${st.state === "SIGNED_OFF" ? "bg-app-signed-line" : "bg-app-field-border"}`} />}
      </div>
      <div className={`min-w-0 overflow-hidden ${open ? "rounded-app-card border border-app-attention-line bg-app-surface" : card}`}>
        {open && <p className="bg-app-attention-tint px-4 py-2.5 text-app-small font-bold text-app-attention lg:px-[18px]">Waiting for you</p>}
        <div className="flex flex-col gap-3 p-4 lg:px-[18px]">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="min-w-0 flex-[1_1_320px]">
              <p className="text-app-help text-app-muted">{`${stage} · ${st.name} · ${due}`}</p>
              <h3 className={open
                ? "mt-0.5 font-heading text-[20px] leading-[1.3] font-bold tracking-[-.01em] text-balance text-app-ink"
                : "mt-0.5 text-app-base leading-[1.35] font-semibold text-app-ink"}>{st.checkpoint.text}</h3>
            </div>
            {!open && (
              <CheckpointCell layout="card" cell={{ checkpointId: st.checkpoint.id, state: st.state, signedOffOn: st.signedOffOn }}
                names={{ sign: signName(st.checkpoint.text, name), undo: undoLabel, revoke: revokeName(st.checkpoint.text, name), review: reviewName(st.checkpoint.text, name) }}
                busy={s.busy.get(key) ?? null} recent={s.recent.has(key)} confirming={s.confirming === key}
                onSign={() => s.signOff(t)} onUndo={() => void undo()} onAsk={() => s.askRevoke(t)} />
            )}
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
        </div>
      </div>
    </li>
  );
}
