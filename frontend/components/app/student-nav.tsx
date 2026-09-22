import Link from "next/link";

import type { EnrolmentView, MyComponent } from "@/lib/api/schemas";

import { eyebrow } from "./styles";
import { subjectAccent } from "./subject";

/**
 * Pack D-4: student navigation moved out of the timeline's aside and into a row under the
 * header, so nothing a student must reach can disappear with the calendar. Class approval
 * status lives here too, on the subject itself, per the pack's answer to that question.
 * Only mounted on `/home` (the only page the pack draws), so "Timeline" is always current.
 */
export function StudentNav({ classes, components }: { classes: EnrolmentView[]; components: MyComponent[] }) {
  const approved = classes.filter((c) => c.status === "APPROVED");
  const pending = classes.filter((c) => c.status === "PENDING");
  const componentFor = (classId: string) => components.find((k) => k.classId === classId);

  return (
    <nav aria-label="Main" className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <Link href="/home" aria-current="page" className="font-semibold text-app-accent">
        Timeline
      </Link>
      {approved.map((c) => {
        const built = componentFor(c.classId);
        return built ? (
          <Link key={c.classId} href={`/components/${built.componentId}`} className="flex items-center gap-[9px] font-semibold text-app-copy hover:text-app-accent">
            <span aria-hidden="true" className={`h-[17px] w-1 flex-none ${subjectAccent(c.subjectName)}`} />
            {c.subjectName}
          </Link>
        ) : (
          <span key={c.classId} className="flex items-center gap-[9px] text-app-copy">
            <span aria-hidden="true" className={`h-[17px] w-1 flex-none ${subjectAccent(c.subjectName)}`} />
            {c.subjectName}
          </span>
        );
      })}
      {pending.map((c) => (
        <span key={c.classId} className="flex items-center gap-[9px] text-app-grey">
          <span aria-hidden="true" className={`h-[17px] w-1 flex-none ${subjectAccent(c.subjectName)}`} />
          {c.subjectName}
          <span className={`${eyebrow} text-app-attention`}>Pending approval</span>
        </span>
      ))}
      <span className="flex-1" />
      <Link href="/join" className="text-app-accent underline underline-offset-3 hover:text-app-accent-hover">
        Join a class
      </Link>
    </nav>
  );
}
