import type { StudentComponent } from "@/lib/api/schemas";
import { progress } from "@/lib/app/component-progress";
import { formatCalendarDate } from "@/lib/app/component-setup";

import { StagesSection } from "./stages-section";
import { card, eyebrow, lead, sectionTitle } from "./styles";

/**
 * Roadmap §6.2 `/components/[id]` (pack D-3, direction 1c "the stage strip"). Answer first:
 * where you are and what's due; then the strip and every stage, current one open; then
 * sections, rules and marks. Plan 2E P2-33: built from app components, not the BiPi ones.
 */
export function ComponentOverview({ component }: { component: StudentComponent }) {
  const { brief } = component;
  const p = progress(component.stages, component.today, brief.completionDate);
  const completion = formatCalendarDate(brief.completionDate);
  const live = p.phase !== "closed" && p.phase !== "no-dates";

  return (
    <div className="mt-6 flex flex-col gap-8">
      <section
        aria-labelledby="where-heading"
        className={`${card} flex flex-col gap-3 p-5 lg:grid lg:grid-cols-[1fr_250px] lg:items-center lg:gap-9 ${live && p.current ? "border-[1.5px] border-app-now shadow-app-now-lift" : ""}`}
      >
        <div className="flex flex-col gap-2">
          <h2 id="where-heading" className={eyebrow}>Where you are</h2>
          {p.phase === "closed" ? (
            <p className={lead}>Your coursework period is over. This page is your record of it.</p>
          ) : p.phase === "no-dates" ? (
            <p className={lead}>{"Your teacher hasn't set stage dates yet. All the stages and what they involve are below."}</p>
          ) : p.current ? (
            <>
              <p className="text-app-title font-bold text-app-ink">{p.current.label ? `${p.current.label} · ${p.current.name}` : p.current.name}</p>
              <p className={lead}>
                {p.phase === "before-start" && <span className="font-bold text-app-ink">{"Nothing is due yet. "}</span>}
                {`${p.countdown}. Due ${formatCalendarDate(p.current.dueDate!)}.`}
              </p>
            </>
          ) : (
            <p className={lead}>{`All the dated stages have passed. ${p.countdown} to the completion date.`}</p>
          )}
        </div>
        {live && p.countdown && (
          <p className="font-mono text-app-h1 font-bold text-app-ink tabular-nums lg:text-right lg:text-app-h1-lg">{p.countdown}</p>
        )}
      </section>

      <p className={lead}>
        {`Stage dates are your class's plan, set by your teacher. The SEC's completion date is ${completion}: your finished coursework must be with your teacher by then.`}
      </p>
      <p className={lead}>{component.processNote}</p>

      <section aria-labelledby="stages-heading" className="flex flex-col gap-3">
        <h2 id="stages-heading" className={sectionTitle}>Stages</h2>
        <p className="text-app-small text-app-grey">{"You can move back and forth between stages — the order is a guide, not a lock."}</p>
        <p className="text-app-small text-app-grey">{"Ticking is your own record. It isn't your teacher's sign-off."}</p>
        {/* Keyed on the server's current stage: if it moves on (a date rolls past, a
            teacher edits dates) between loads, `router.refresh()` should snap the open
            stage to the new "now" rather than preserve whatever a stale re-render kept. */}
        <StagesSection key={p.current?.id ?? "none"} componentId={component.id} stages={component.stages} states={p.states} initialOpenId={p.current?.id ?? null} />
      </section>

      <div className="flex flex-col gap-10 lg:grid lg:grid-cols-2 lg:gap-x-10 lg:gap-y-10">
        <section aria-labelledby="sections-heading" className="flex flex-col gap-2 lg:col-start-1 lg:row-start-1">
          <h2 id="sections-heading" className={sectionTitle}>Report sections</h2>
          <ol className={`${card} flex flex-col divide-y divide-app-line`}>
            {component.sections.map((section) => (
              <li key={section.label} className="p-3 text-app-base text-app-ink">
                {section.label}. {section.name}
                {section.suggestedWords && <span className="text-app-grey">{` · about ${section.suggestedWords} words`}</span>}
                {section.indicativeContent.length > 0 && (
                  <ul className="mt-1 list-disc pl-5 text-app-small text-app-copy">
                    {section.indicativeContent.map((line) => <li key={line}>{line}</li>)}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="rules-heading" className="flex flex-col gap-2 lg:col-start-2 lg:row-start-1 lg:row-span-2">
          <h2 id="rules-heading" className={sectionTitle}>Report rules</h2>
          <dl className="flex flex-col gap-2">
            <dt className={eyebrow}>Length</dt>
            <dd className={lead}>{`${brief.wordLimit.toLocaleString("en-IE")} words at most. ${brief.wordsNotCounted}`}</dd>
            <dt className={eyebrow}>Images</dt>
            <dd className={lead}>{`${brief.imageLimit} at most.${brief.imageNote ? ` ${brief.imageNote}` : ""}`}</dd>
            {brief.rules.map((rule) => (
              <div key={rule.key} className="contents">
                <dt className={eyebrow}>{rule.key}</dt>
                <dd className={lead}>{rule.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="marks-heading" className="flex flex-col gap-2 lg:col-start-1 lg:row-start-2">
          <h2 id="marks-heading" className={sectionTitle}>{"How it's marked"}</h2>
          <p className={lead}>{`${component.marksTotal} marks, ${component.weightingPercent}% of Leaving Cert ${component.subjectName}.`}</p>
          <dl className="flex flex-col gap-2">
            {component.markBands.map((band) => (
              <div key={`${band.label}${band.name}`} className="flex flex-col gap-0.5">
                <dt className="font-semibold text-app-ink">
                  {[band.label, band.name].filter(Boolean).join(" · ")} · {band.marks} marks
                  {band.wholeReport ? " · the whole report" : band.sectionLabels.length ? ` · sections ${band.sectionLabels.join(", ")}` : ""}
                </dt>
                {band.criteria.length > 0 && <dd className="text-app-small text-app-copy">{band.criteria.join(" · ")}</dd>}
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}
