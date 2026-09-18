"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { api, ApiError } from "@/lib/api/client";
import { studentItemSchema } from "@/lib/api/schemas";
import { formatCalendarDate } from "@/lib/app/component-setup";

import { ErrorPanel } from "./error-panel";

/** One teacher item a student can tick (plan 2E P2-37, P2-38). The box moves at once; a failure puts it back. */
export function ItemTick({ componentId, item }: { componentId: string; item: { id: string; text: string; dueDate: string | null; done: boolean } }) {
  const router = useRouter();
  const [done, setDone] = useState(item.done);
  const [error, setError] = useState<ApiError | null>(null);
  const id = `tick-${item.id}`;

  async function toggle(next: boolean) {
    setDone(next);
    setError(null);
    try {
      await api.send("PUT", `/components/${componentId}/teacher-items/${item.id}/tick`, { done: next }, studentItemSchema);
      router.refresh();
    } catch (e) {
      setDone(!next);
      setError(e instanceof ApiError ? e : ApiError.unreachable(e));
    }
  }

  const dueId = item.dueDate ? `${id}-due` : undefined;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex min-h-11 items-start gap-3">
        <input
          id={id}
          type="checkbox"
          checked={done}
          onChange={(e) => toggle(e.target.checked)}
          aria-label={item.text}
          aria-describedby={dueId}
          className="mt-1 size-5 flex-none"
        />
        <label htmlFor={id} className="flex flex-col text-app-base text-app-ink">
          <span>{item.text}</span>
          {item.dueDate && (
            <span id={dueId} className="text-app-small text-app-grey">
              {formatCalendarDate(item.dueDate)}
            </span>
          )}
        </label>
        {done && <span className="ml-auto text-app-small text-app-grey">Ticked by you</span>}
      </div>
      {error && <ErrorPanel error={error} />}
    </div>
  );
}
