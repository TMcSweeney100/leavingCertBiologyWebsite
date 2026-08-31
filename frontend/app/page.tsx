import { SiteHeader } from "@/components/bipi/site-header";
import { SiteFooter } from "@/components/bipi/site-footer";
import { Timeline } from "@/components/bipi/timeline";
import { deriveSchedule } from "@/lib/schedule";

/**
 * TEMPORARY (Phase 4 only) — a fixed preview date so the stage-card
 * timeline actually shows all three states (done / current / upcoming)
 * before the real school term begins; today's real date would currently
 * derive every card as `current`/`upcoming` with nothing `done`. 6 Oct 2026
 * is one of the implementation plan's own pre-verified test dates (§3.2:
 * "Stage 4, 10 days left") and happens to produce exactly one card of each
 * state among the five real stages — genuine `deriveSchedule` output for a
 * real date, not a mocked/fake state. Noon UTC keeps the instant safely
 * inside the Dublin calendar day regardless of DST (Ireland is UTC+1 on
 * this date), matching the civil-date rule `dublinToday` implements.
 *
 * Superseded by Phase 5, which wires the real `?date=` query param
 * (falling back to a real `new Date()`) through this page — see plan §4.1.
 * Do not let this linger past that phase: docs/CLAUDE.md's rule is not to
 * hardcode a fake "today" in production code without isolating it exactly
 * like this, and documenting it, which is what this constant is doing.
 */
const PHASE_4_PREVIEW_DATE = new Date("2026-10-06T12:00:00Z");

export default function Home() {
  const { stages } = deriveSchedule(PHASE_4_PREVIEW_DATE);

  return (
    <>
      <SiteHeader />
      <main className="flex-1 px-4.5 pt-4 pb-4.5">
        {/* Phase 4 preview mount: just enough to see the three card states
            side by side (build-order gate: "Three states visually
            distinct"). The real "Timeline" section chrome — eyebrow, H2
            ("What's left this term"), mobile hint copy, and the
            `#timeline` id site-header.tsx's nav pill already links to — is
            deliberately not built here, so as not to preempt whichever
            later phase composes the full page with its exact copy/markup
            (see timeline.tsx's own note). Known, accepted consequence:
            until that section header exists, this block sits between the
            header's <h1> and the footer with no <h2> in between, even
            though StageCard itself correctly emits <h3> for its title. */}
        <Timeline stages={stages} />
      </main>
      <SiteFooter />
    </>
  );
}
