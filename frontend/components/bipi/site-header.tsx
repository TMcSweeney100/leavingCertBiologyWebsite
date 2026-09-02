import Image from "next/image";

import { Stepper } from "@/components/bipi/stepper";
import { cn } from "@/lib/utils";
import type { StageWithState } from "@/lib/schedule";
import type { ResolvedClass } from "@/lib/schedule.types";

/**
 * In-page anchor targets for the four nav pills below, kebab-case and in the
 * same order as `header.nav`. The sections these point to don't exist until
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
export const NAV_IDS = ["right-now", "timeline", "report-sections", "report-rules"] as const;

function GradeChip({ text }: { text: string }) {
  return (
    <span className="shrink-0 rounded-full bg-[var(--bipi-ink)] px-[9px] py-[5px] font-mono text-chip font-bold tracking-[.1em] text-white uppercase lg:px-[14px] lg:py-[9px] lg:text-label">
      {text}
    </span>
  );
}

/**
 * Whose page this is: the school crest and name, and the class teacher.
 * A slim band above the masthead, divided from it by a hairline, so that the
 * identity is settled before the eye reaches "Biology in Practice
 * Investigation" — without competing with it for weight.
 *
 * Wraps rather than shrinks: below roughly 560px the teacher line drops onto
 * its own row under the crest instead of squeezing the school name, which at
 * 390px would otherwise wrap to three lines.
 *
 * The crest carries `alt=""` deliberately. It is not decorative — but the
 * school name sits immediately beside it as real text, so describing it
 * again would make a screen reader announce the school twice.
 *
 * Both `<Image>` dimensions are pinned per breakpoint rather than using
 * `w-auto`, which is what keeps Next's "width or height modified, but not
 * the other" warning quiet. 75/24 and 94/30 both hold the artwork's 3.14
 * aspect ratio to within a subpixel.
 */
function BrandBar({
  school,
  teacher,
}: {
  school: ResolvedClass["school"];
  teacher: ResolvedClass["teacher"];
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2.5 border-b border-border pb-3.5 lg:pb-4">
      <div className="flex min-w-0 items-center gap-2.5 lg:gap-3.5">
        {school.crest && (
          <Image
            src={school.crest}
            alt=""
            width={565}
            height={180}
            priority
            className="h-6 w-[75px] flex-none lg:h-[30px] lg:w-[94px]"
          />
        )}
        <p className="min-w-0 font-heading text-standfirst font-bold leading-[1.25] tracking-[-.01em] text-foreground lg:text-standfirst-lg">
          {school.name}
        </p>
      </div>
      <p className="font-mono text-eyebrow font-bold tracking-[.1em] text-muted-foreground uppercase lg:text-label">
        {`${teacher.label} · `}
        <span className="text-[var(--bipi-ink-2)]">{teacher.name}</span>
      </p>
    </div>
  );
}

function NavPills({ nav, className }: { nav: ResolvedClass["header"]["nav"]; className?: string }) {
  return (
    <nav aria-label="Jump to section" className={cn("flex flex-wrap gap-1.5 print:hidden", className)}>
      {nav.map((label, i) => (
        <a
          key={NAV_IDS[i]}
          href={`#${NAV_IDS[i]}`}
          className="rounded-full border border-border bg-background px-[11px] py-2 font-sans text-pill font-semibold text-[var(--bipi-ink-2)] lg:text-pill-lg"
        >
          {label}
        </a>
      ))}
    </nav>
  );
}

type SiteHeaderProps = {
  /** All seven stages, for the laptop-only stepper at the foot of the band. */
  stages: StageWithState[];
  header: ResolvedClass["header"];
  school: ResolvedClass["school"];
  teacher: ResolvedClass["teacher"];
};

export function SiteHeader({ stages, header, school, teacher }: SiteHeaderProps) {
  return (
    <header className="border-b border-border bg-card px-5 py-5 lg:px-10 lg:py-[26px]">
      <BrandBar school={school} teacher={teacher} />

      {/* Mobile (below 1024px): eyebrow + grade chip share a row; title,
          standfirst and nav pills each stack full-width beneath it. */}
      <div className="mt-4 lg:hidden">
        <div className="flex items-center justify-between gap-2.5">
          <p className="min-w-0 font-mono text-eyebrow font-bold tracking-[.14em] text-muted-foreground uppercase">
            {header.eyebrowMobile}
          </p>
          <GradeChip text={header.gradeChipMobile} />
        </div>
        <h1 className="mt-3.5 font-heading text-h1-mobile font-bold leading-[1.12] tracking-[-.025em] text-foreground">
          {header.title}
        </h1>
        <p className="mt-2 font-sans text-standfirst leading-[1.5] text-muted-foreground">
          {header.standfirst}
        </p>
        <NavPills nav={header.nav} className="mt-4" />
      </div>

      {/* Laptop (1024px and up): copy on the left; grade chip + nav pills
          form their own right-hand column, bottom-aligned against the copy. */}
      <div className="hidden lg:mt-[18px] lg:flex lg:items-end lg:justify-between lg:gap-6">
        <div>
          <p className="font-mono text-eyebrow font-bold tracking-[.16em] text-muted-foreground uppercase">
            {header.eyebrow}
          </p>
          <h1 className="mt-3 font-heading text-display-lg font-bold leading-[1.08] tracking-[-.03em] text-foreground">
            {header.title}
          </h1>
          <p className="mt-[9px] font-sans text-standfirst-lg leading-[1.5] text-muted-foreground">
            {header.standfirst}
          </p>
        </div>
        <div className="flex flex-none flex-col items-end">
          <GradeChip text={header.gradeChip} />
          <NavPills nav={header.nav} className="mt-3.5 justify-end" />
        </div>
      </div>

      {/* Inside the header band, not a section of its own — the design puts
          it directly under the masthead copy with no divider between them. */}
      <Stepper stages={stages} />
    </header>
  );
}
