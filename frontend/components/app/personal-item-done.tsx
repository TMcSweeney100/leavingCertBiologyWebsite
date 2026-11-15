"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import { personalItemSchema } from "@/lib/api/schemas";

/** The tick moves at once; a failure puts it back (as `item-tick.tsx` does for a teacher's item). */
function useDone(id: string, initial: boolean) {
  const router = useRouter();
  const [done, setDone] = useState(initial);
  const [failed, setFailed] = useState(false);
  // After router.refresh() the server's props win: a tick made elsewhere on the page, or Next up moving on to
  // another item, resets the local copy (React's "adjust state when a prop changes" pattern).
  const [shown, setShown] = useState({ id, initial });
  if (shown.id !== id || shown.initial !== initial) {
    setShown({ id, initial });
    setDone(initial);
    setFailed(false);
  }

  async function set(next: boolean) {
    setDone(next);
    setFailed(false);
    try {
      await api.send("PUT", `/me/personal-items/${id}/done`, { done: next }, personalItemSchema);
      router.refresh();
    } catch {
      setDone(!next);
      setFailed(true);
    }
  }
  return { done, failed, set };
}

const FAILED = "basis-full text-app-help font-semibold text-app-error";

/**
 * Plan timeline-redesign T-6: the student's own tick on their own item. A real checkbox, hidden but focusable,
 * with the drawn circle beside it; the label is the 44px hit area.
 */
export function DoneTick({ id, title, done: initial }: { id: string; title: string; done: boolean }) {
  const { done, failed, set } = useDone(id, initial);
  return (
    <>
      <label className="relative -m-2.5 flex size-11 flex-none cursor-pointer items-center justify-center touch-manipulation">
        <input type="checkbox" className="peer sr-only" checked={done} onChange={(e) => set(e.target.checked)} aria-label={`Done: ${title}`} />
        <span
          aria-hidden="true"
          className={`flex size-6 items-center justify-center rounded-full border-2 text-app-on-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-app-accent ${done ? "border-app-approved bg-app-approved" : "border-app-pick bg-app-surface"}`}
        >
          {done && <Check className="size-3.5" strokeWidth={3} />}
        </span>
      </label>
      {failed && <p role="alert" className={FAILED}>{"That didn't save. Try again."}</p>}
    </>
  );
}

/** The same tick as a button, for the Next up card: once ticked, the page refreshes and Next up moves on (T-8). */
export function MarkDoneButton({ id, title }: { id: string; title: string }) {
  const { done, failed, set } = useDone(id, false);
  return (
    <>
      <Button type="button" variant="onAccent" aria-label={`Mark ${title} done`} disabled={done} onClick={() => set(true)}>
        <Check aria-hidden="true" className="size-4" />
        {done ? "Done" : "Mark done"}
      </Button>
      {failed && <p role="alert" className="basis-full text-app-help font-semibold text-app-on-accent">{"That didn't save. Try again."}</p>}
    </>
  );
}
