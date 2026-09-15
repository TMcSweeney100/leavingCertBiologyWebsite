import type { StageState } from "@/lib/schedule.types";

/**
 * The state dot, shared by the timeline rail and the laptop stepper —
 * design_handoff_bipi_schedule/README.md §1 specifies one dot and then §5
 * says the rail uses "the same spec as the stepper dot", so it lives in one
 * place rather than being written twice and drifting.
 *
 * The current dot is deliberately larger (16px vs 12px) and carries the
 * indigo halo: size and glow are a second, non-colour cue for "now", which
 * matters because the palette's whole discipline is that `--bipi-now` is
 * never decorative.
 *
 * §1.1③ — the upcoming dot's ring is `--bipi-tick-idle`, not the
 * `--bipi-border` the source design specifies. That token was 1.69:1
 * against white; a ring that distinguishes an upcoming stage from a done
 * one is a graphic conveying meaning, so WCAG 1.4.11's 3:1 applies to it,
 * not the "structural hairline" exemption that lets `--bipi-border` stay
 * where it is. See the token's own note in globals.css for the measured
 * values. The plan names the ruler ticks and the stepper dot; the rail dot
 * is the identical element and is fixed with them.
 */

const DOT_SIZE: Record<StageState, string> = {
  current: "size-4", // 16px
  done: "size-3", // 12px
  upcoming: "size-3",
};

const DOT_FILL: Record<StageState, string> = {
  current: "border-none bg-(--bipi-now) shadow-[0_0_0_5px_var(--bipi-now-halo)]",
  done: "border-none bg-(--bipi-done)",
  upcoming: "border-2 border-(--bipi-tick-idle) bg-card",
};

type StageDotProps = {
  state: StageState;
  /** Positioning only (e.g. the rail's alignment margin) — never colour or size. */
  className?: string;
};

export function StageDot({ state, className = "" }: StageDotProps) {
  return <div className={`flex-none rounded-full ${DOT_SIZE[state]} ${DOT_FILL[state]} ${className}`} />;
}
