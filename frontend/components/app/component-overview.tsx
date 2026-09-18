import type { StudentComponent } from "@/lib/api/schemas";
import { progress, type StageState } from "@/lib/app/component-progress";
import { formatCalendarDate, hoursLabel } from "@/lib/app/component-setup";

import { ItemTick } from "./item-tick";
import { card, eyebrow, lead, sectionTitle } from "./styles";

const STATE_WORD: Record<StageState, string> = { done: "Done", current: "Now", upcoming: "Upcoming", undated: "No date yet" };
const CHECKPOINT_WORD = { NOT_DUE: "Not due yet", DUE: "Not signed off yet" } as const;

/**
 * Roadmap §6.2 `/components/[id]` (design §8.3), working-first until pack D-3. Answer first: where you are
 * and what's due; then every stage, current one open; then sections, rules and marks. Plan 2E P2-33: built
 * from app components, not the BiPi ones.
 */
export function ComponentOverview({ component }: { component: StudentComponent }) {
  const { brief } = component;
  const p = progress(component.stages, component.today, brief.completionDate);
  const completion = formatCalendarDate(brief.completionDate);

  return (
    <div className="mt-6 flex flex-col gap-8">
      <section aria-labelledby="where-heading" className={`${card} flex flex-col gap-2 p-5`}>
        <h2 id="where-heading" className={eyebrow}>Where you are</h2>
        {p.phase === "closed" ? (
          <p className={lead}>{`The completion date has passed (${completion}). This page is now a record of the coursework.`}</p>
        ) : p.phase === "no-dates" ? (
          <p className={lead}>Dates are coming from your teacher. Everything else about the coursework is below.</p>
        ) : p.current ? (
          <>
            <p className="text-app-title font-bold text-app-ink">{p.current.label ?? p.current.name} · {p.current.name}</p>
            <p className={lead}>{`${p.countdown}. Due ${formatCalendarDate(p.current.dueDate!)}.`}</p>
          </>
        ) : (
          <p className={lead}>{`All the dated stages have passed. ${p.countdown} to the completion date.`}</p>
        )}
      </section>

      <p className={lead}>
        {`Stage dates are your class's plan, set by your teacher. The SEC's completion date is ${completion}: your finished coursework must be with your teacher by then.`}
      </p>
      <p className={lead}>{component.processNote}</p>

      <section aria-labelledby="stages-heading" className="flex flex-col gap-3">
        <h2 id="stages-heading" className={sectionTitle}>Stages</h2>
        <p className="text-app-small text-app-grey">{"Ticks are your own record, not your teacher's sign-off."}</p>
        {component.stages.map((s) => (
          <details key={s.id} open={p.states[s.id] === "current"} className={`${card} p-4`}>
            <summary className="flex cursor-pointer flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-semibold text-app-ink">{s.label ? `${s.label} · ${s.name}` : s.name}</span>
              <span className={eyebrow}>{STATE_WORD[p.states[s.id]]}</span>
              {s.dueDate && <span className="text-app-small text-app-grey">{formatCalendarDate(s.dueDate)}</span>}
            </summary>
            <div className="mt-3 flex flex-col gap-3">
              <p className={lead}>{s.description}</p>
              <p className="text-app-small text-app-grey">
                {[hoursLabel(s, component.stages), s.supervised ? "Done in supervised class time" : ""].filter(Boolean).join(" · ")}
              </p>
              {s.checkpoint && (
                <div className="flex flex-col gap-0.5">
                  <span className={eyebrow}>Checkpoint · {CHECKPOINT_WORD[s.checkpoint.state]}</span>
                  <span className="text-app-base text-app-ink">{s.checkpoint.text}</span>
                </div>
              )}
              {s.items.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className={eyebrow}>From your teacher</span>
                  {s.items.map((item) => <ItemTick key={item.id} componentId={component.id} item={item} />)}
                </div>
              )}
              {s.prompts.length > 0 && (
                <details>
                  <summary className="cursor-pointer text-app-base font-semibold text-app-accent">Questions to help you</summary>
                  <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
                    {s.prompts.map((prompt, i) => (
                      <li key={i} className="text-app-base text-app-copy">
                        {prompt.heading && i > 0 && s.prompts[i - 1].heading === prompt.heading ? null : prompt.heading ? <span className="block text-app-small text-app-grey">{prompt.heading}</span> : null}
                        {prompt.text}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </details>
        ))}
      </section>

      <section aria-labelledby="sections-heading" className="flex flex-col gap-2">
        <h2 id="sections-heading" className={sectionTitle}>Report sections</h2>
        <ol className="flex flex-col gap-2">
          {component.sections.map((section) => (
            <li key={section.label} className="text-app-base text-app-ink">
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

      <section aria-labelledby="rules-heading" className="flex flex-col gap-2">
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

      <section aria-labelledby="marks-heading" className="flex flex-col gap-2">
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
  );
}
