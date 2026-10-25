"use client";

import { useRef } from "react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import type { Answer, DocumentLink, OpenRequest } from "@/lib/api/schemas";
import { answerCount, answeredBanner } from "@/lib/app/ready";

import { AnswerList } from "./request-history";
import { AnswerForm, RequestBlock, type AnswerError, type Outcome } from "./request-review";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  firstName: string; name: string; text: string; stage: string; checkpointId: string;
  stateWord: string; stateClass: string;
  answers: ReadonlyArray<Answer>;
  request: OpenRequest | null; again: boolean; today: string; link: DocumentLink | null;
  note: string; onNote: (v: string) => void; busy: Outcome | null; error: AnswerError | null;
  onAnswer: (o: Outcome) => void; onRetry: () => void;
  /** Once answered: the strip that says so (with Undo after an Accept). */
  answered: ReactNode;
};

/** Pack D-10: a right-hand drawer (shadcn Drawer, Base UI) with every answered round, plus the same answer controls while the request is open. The button is the trigger. */
export function RequestDrawer(p: Props) {
  const title = useRef<HTMLHeadingElement>(null);
  return (
    <Drawer swipeDirection="right" open={p.open} onOpenChange={p.onOpenChange}>
      <DrawerTrigger render={<Button type="button" variant="outline" className="text-app-accent hover:border-app-accent hover:bg-app-accent-tint" />}>
        {answerCount(p.answers.length)}
      </DrawerTrigger>
      {/* Focus lands on the heading, not the first control (the work link), and goes back to the trigger on close. */}
      <DrawerContent initialFocus={title}>
        <div className="flex items-start justify-between gap-3 border-b border-app-line px-4 pt-3 pb-4 sm:px-6 sm:pt-[18px]">
          <div className="flex min-w-0 flex-col gap-1">
            <DrawerDescription><span data-private>{`${p.name}, ${p.stage}`}</span></DrawerDescription>
            <DrawerTitle ref={title} tabIndex={-1} className="text-[20px] leading-[1.25] text-balance sm:text-app-section">{p.text}</DrawerTitle>
            <p className={`text-app-small font-bold ${p.stateClass}`}>{p.stateWord}</p>
          </div>
          <DrawerClose render={<Button type="button" variant="outline" />}>Close</DrawerClose>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pt-5 pb-7 sm:px-6">
          {p.request ? (
            <>
              <RequestBlock edge firstName={p.firstName} name={p.name} request={p.request} again={p.again} today={p.today} link={p.link} />
              <AnswerForm idPrefix={`drawer-${p.checkpointId}`} firstName={p.firstName} name={p.name} text={p.text} stage={p.stage}
                note={p.note} onNote={p.onNote} busy={p.busy} error={p.error} onAnswer={p.onAnswer} onRetry={p.onRetry} />
            </>
          ) : p.answered}
          <AnswerList firstName={p.firstName} answers={p.answers} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/** Pack D-10: the strip that replaces the controls once answered. Undo only exists for an Accept: the API can't take a Not yet back. */
export function AnsweredStrip({ outcome, undoLabel, busy, onUndo }: { outcome: Outcome; undoLabel: string; busy: boolean; onUndo: () => void }) {
  const accepted = outcome === "ACCEPTED";
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 rounded-app-inner border-l-4 px-4 py-3 ${accepted ? "border-l-app-signed bg-app-signed-recent" : "border-l-app-grey bg-app-inset"}`}>
      <p className="text-app-meta font-bold text-app-ink">{answeredBanner(outcome)}</p>
      {accepted && <Button type="button" variant="outline" aria-label={undoLabel} disabled={busy} onClick={onUndo}>Undo</Button>}
    </div>
  );
}
