import type { ReactNode } from "react";

import { eyebrow as eyebrowClass } from "./styles";

const TONES = {
  error: { box: "border-app-error/30 border-l-app-error bg-app-error-tint", mark: "bg-app-error", label: "text-app-error-hover" },
  attention: { box: "border-app-attention/30 border-l-app-attention bg-app-attention-tint", mark: "bg-app-attention", label: "text-app-attention" },
  approved: { box: "border-app-approved/30 border-l-app-approved bg-app-approved-tint", mark: "bg-app-approved", label: "text-app-approved" },
} as const;

export type NoticeTone = keyof typeof TONES;

/**
 * The packs' message block: a 4px coloured edge on a tinted ground. With `eyebrow` it's a status
 * ("Pending approval" above a sentence); without, a circled "!" leads the sentence, so the state is
 * never carried by colour alone.
 */
export function Notice({
  tone,
  eyebrow,
  role,
  children,
}: {
  tone: NoticeTone;
  eyebrow?: string;
  role?: "alert" | "status";
  children: ReactNode;
}) {
  const t = TONES[tone];
  return (
    <div
      role={role}
      className={`app-appear rounded-app-card border border-l-4 text-app-base leading-[1.45] text-app-copy ${t.box} ${eyebrow ? "flex flex-col gap-[5px] px-[18px] py-4" : "flex items-start gap-[9px] px-3.5 py-3"}`}
    >
      {eyebrow ? (
        <p className={`${eyebrowClass} ${t.label}`}>{eyebrow}</p>
      ) : (
        <span
          aria-hidden="true"
          className={`mt-px flex size-5 flex-none items-center justify-center rounded-full text-app-help font-bold text-app-on-accent ${t.mark}`}
        >
          !
        </span>
      )}
      <div className="min-w-0 text-pretty">{children}</div>
    </div>
  );
}
