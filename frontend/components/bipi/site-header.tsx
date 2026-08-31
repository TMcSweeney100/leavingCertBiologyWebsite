import { cn } from "@/lib/utils";
import { HEADER } from "@/lib/schedule.data";

/**
 * In-page anchor targets for the four nav pills below, kebab-case and in the
 * same order as `HEADER.nav`. The sections these point to don't exist until
 * Phase 5 ("Right now") and Phase 8 ("Timeline" / "Report sections" /
 * "Report rules") — this header only emits the links. Whichever element
 * ends up carrying each id there should also carry a modest
 * `scroll-margin-top` (e.g. Tailwind's `scroll-mt-6`) so a scrolled-to
 * heading doesn't sit flush against the viewport edge. Fixed here (rather
 * than derived from the label text) so later phases can target these ids
 * directly without re-deriving them — see docs/CLAUDE.md.
 *   "Right now"        -> #right-now
 *   "Timeline"          -> #timeline
 *   "Report sections"   -> #report-sections
 *   "Report rules"      -> #report-rules
 */
const NAV_IDS = ["right-now", "timeline", "report-sections", "report-rules"] as const;

function GradeChip() {
  return (
    <span className="shrink-0 rounded-full bg-[var(--bipi-ink)] px-[9px] py-[5px] font-mono text-[9px] font-bold tracking-[.1em] text-white uppercase lg:px-[14px] lg:py-[9px] lg:text-[10px]">
      {HEADER.gradeChip}
    </span>
  );
}

function NavPills({ className }: { className?: string }) {
  return (
    <nav aria-label="Jump to section" className={cn("flex flex-wrap gap-1.5", className)}>
      {HEADER.nav.map((label, i) => (
        <a
          key={NAV_IDS[i]}
          href={`#${NAV_IDS[i]}`}
          className="rounded-full border border-border bg-background px-[11px] py-2 font-sans text-[10.5px] font-semibold text-[var(--bipi-ink-2)] lg:text-[11px]"
        >
          {label}
        </a>
      ))}
    </nav>
  );
}

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-card px-5 py-5 lg:px-10 lg:py-[26px]">
      {/* Mobile (below 1024px): eyebrow + grade chip share a row; title,
          standfirst and nav pills each stack full-width beneath it. */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between gap-2.5">
          <p className="min-w-0 font-mono text-[9.5px] font-bold tracking-[.14em] text-muted-foreground uppercase">
            {HEADER.eyebrow}
          </p>
          <GradeChip />
        </div>
        <h1 className="mt-3.5 font-heading text-[26px] font-bold leading-[1.12] tracking-[-.025em] text-foreground">
          {HEADER.title}
        </h1>
        <p className="mt-2 font-sans text-[13px] leading-[1.5] text-muted-foreground">
          {HEADER.standfirst}
        </p>
        <NavPills className="mt-4" />
      </div>

      {/* Laptop (1024px and up): copy on the left; grade chip + nav pills
          form their own right-hand column, bottom-aligned against the copy. */}
      <div className="hidden lg:flex lg:items-end lg:justify-between lg:gap-6">
        <div>
          <p className="font-mono text-[9.5px] font-bold tracking-[.16em] text-muted-foreground uppercase">
            {HEADER.eyebrow}
          </p>
          <h1 className="mt-3 font-heading text-[38px] font-bold leading-[1.08] tracking-[-.03em] text-foreground">
            {HEADER.title}
          </h1>
          <p className="mt-[9px] font-sans text-[14px] leading-[1.5] text-muted-foreground">
            {HEADER.standfirst}
          </p>
        </div>
        <div className="flex flex-none flex-col items-end">
          <GradeChip />
          <NavPills className="mt-3.5 justify-end" />
        </div>
      </div>
    </header>
  );
}
