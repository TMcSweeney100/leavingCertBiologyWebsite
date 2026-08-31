import { REPORT_RULES } from "@/lib/schedule.data";

/**
 * The eight report rules from the official SEC brief — word count, image
 * count, font, spacing, margins, page numbers, the AI declaration
 * (design_handoff_bipi_schedule/README.md §7).
 *
 * This is reference content, not schedule content: nothing here is
 * date-derived and nothing changes mid-year. It earns its place because
 * these are the rules students lose marks on for reasons that have nothing
 * to do with the biology. The design notes the whole block can be cut or
 * moved to a second page without touching anything else — keep it that
 * self-contained.
 *
 * A `<dl>`, because each rule genuinely is a term and its definition
 * ("Length" → "1,500 words maximum…"). Screen readers announce the pairing;
 * sighted readers get the same pairing from the mono uppercase key above
 * each value. On laptop the list runs in two columns via CSS `columns`,
 * which keeps `<dt>`/`<dd>` adjacent in the DOM (a grid with 16 children
 * would reorder them visually and break the pairing).
 *
 * Mobile puts the whole list inside a white card, laptop does not — the
 * design uses the card as a container on a page ground that has nothing
 * else on it at that width, and drops it on laptop where the block sits
 * beside the marks card and would otherwise read as two competing panels.
 */
export function ReportRules() {
  return (
    <dl className="rounded-(--bipi-r-card) border border-border bg-card px-3.75 pt-1 pb-3.5 lg:columns-2 lg:gap-x-6.5 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0">
      {REPORT_RULES.map((rule) => (
        // `break-inside-avoid` keeps a key and its value in the same column;
        // without it the CSS column break can land between them.
        <div
          key={rule.key}
          className="border-b border-border py-2.75 last:border-b-0 lg:break-inside-avoid lg:border-t lg:border-b-0 lg:py-3 lg:last:border-b-0"
        >
          <dt className="font-mono text-eyebrow leading-none font-bold tracking-[.12em] text-(--bipi-now-ink) uppercase">
            {rule.key}
          </dt>
          <dd className="mt-1.5 font-sans text-task leading-[1.5] text-(--bipi-ink-2) lg:text-body">
            {rule.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
