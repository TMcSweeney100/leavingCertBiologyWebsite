import type { DateMark } from "@/lib/app/date-marks";

type Kind = DateMark["kind"] | "more";

const SHAPE: Record<Kind, string> = {
  stage: "h-4 min-w-[18px] rounded-app-tag px-0.5",
  item: "size-[18px] rounded-full border-[1.5px]",
  completion: "h-4 rounded-app-tag px-0.5",
  more: "h-4 rounded-app-tag border px-0.5",
};
const INK: Record<Kind, string> = {
  stage: "bg-app-accent text-app-on-accent",
  item: "border-app-accent bg-app-surface text-app-accent",
  completion: "bg-app-ink text-app-on-accent",
  more: "border-app-grey bg-app-surface text-app-ink",
};
const UNSAVED = "border-[1.5px] border-dashed border-app-accent bg-app-surface text-app-accent";
const TONE = { attention: "bg-app-attention text-app-on-accent", error: "bg-app-error text-app-on-accent" };
// Inside the picked (azure) day, tags turn white on azure. CalendarDayButton is `group/day-button`.
const ON_PICK =
  "group-data-[selected-single=true]/day-button:border-app-on-accent group-data-[selected-single=true]/day-button:bg-transparent group-data-[selected-single=true]/day-button:text-app-on-accent";

/** A mark's tag: a shape and a word, never colour alone (plan date-picker-drawer C-27). Not saved is the same tag, dashed. */
export function MarkTag({
  kind,
  saved = true,
  tone,
  className = "",
  children,
}: {
  kind: Kind;
  saved?: boolean;
  /** D-5's amber and red stage marks on the page's year view. */
  tone?: "attention" | "error";
  className?: string;
  children: string;
}) {
  const ink = !saved ? UNSAVED : tone ? TONE[tone] : INK[kind];
  return (
    <span
      data-saved={saved}
      className={`inline-flex flex-none items-center justify-center font-mono text-app-label leading-none font-bold ${SHAPE[kind]} ${ink} ${ON_PICK} ${className}`}
    >
      {children}
    </span>
  );
}
