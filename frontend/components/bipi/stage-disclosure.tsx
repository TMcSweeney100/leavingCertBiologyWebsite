"use client";

import * as React from "react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

/**
 * The stage card's "What this involves +" disclosure — the trigger row and
 * the panel beneath it (README §"Interactions & behaviour", plan §5 Phase 7).
 *
 * **This is the site's only client component**, and it is deliberately a
 * separate file from `stage-card.tsx` rather than the directive landing on
 * the card itself, which is what plan §4.3 and the Phase 6 handoff note
 * anticipated. The reason is that §4.3's actual instruction — "keep that
 * boundary as small as it can be", "pass primitives, never the whole
 * `Stage`" — and the handoff README's progressive-enhancement requirement
 * ("render stage states server-side and let *only the disclosure toggles*
 * hydrate") are both better served this way: the card, including everything
 * inside the panel, stays a server component and arrives as rendered HTML
 * through `children`; what crosses the boundary is one id, one boolean, and
 * the panel's already-rendered markup. Making the card itself a client
 * component would have shipped all five stages' copy to the browser as
 * serialized props for no gain. Everything else under `components/bipi/`
 * stays a server component — this is the one exception, and the only file
 * that should ever carry `"use client"`.
 *
 * State is local and per-card, which is what makes the panels independent:
 * there is no shared `openStages` map, so the README's warning about a
 * seeded entry being clobbered on the next write cannot arise. Opening a
 * second card cannot touch the first because they share nothing.
 *
 * `defaultOpen` seeds `useState`, so the current stage's panel is open in
 * the server-rendered HTML — its teacher checkpoint (required by the brief
 * to be reachable) is in the initial payload, before and without hydration.
 *
 * `keepMounted` is set for two reasons beyond taste: it keeps
 * `aria-controls` pointing at an element that actually exists (Base UI
 * omits the attribute entirely while a panel is unmounted, which the plan's
 * §6 accessibility checklist asks for explicitly), and Phase 9's print
 * stylesheet has to force every panel open — CSS cannot reveal markup that
 * was never rendered.
 */

type StageDisclosureProps = {
  /**
   * `id` for the panel, and the trigger's `aria-controls` target. Passed in
   * rather than generated so it stays stable and readable in the HTML
   * (`stage-4-detail`) — `useId` would emit a different value per render
   * pass and per card.
   */
  panelId: string;
  /** Open in the server-rendered HTML. True for the current stage only. */
  defaultOpen: boolean;
  /** The panel's contents, rendered on the server by `stage-card.tsx`. */
  children: React.ReactNode;
};

export function StageDisclosure({ panelId, defaultOpen, children }: StageDisclosureProps) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    // The root renders a plain <div> wrapping trigger and panel. It carries
    // the trigger's top margin so that nothing depends on margin collapsing
    // through it.
    <Collapsible open={open} onOpenChange={setOpen} className="mt-3.25 lg:mt-3.5">
      {/* Base UI renders a real <button> and manages `aria-expanded`; the
          explicit `aria-controls` overrides its own (it only emits the
          attribute while the panel is open — see `keepMounted` above).
          `min-h` is the design's 34px mobile hit target, 30px on laptop
          where the pointer is precise. Focus ring is explicit: this is the
          first genuinely interactive control on the page, and the base
          layer's `outline-ring/50` alone leaves it faint. */}
      <CollapsibleTrigger
        aria-controls={panelId}
        className="flex min-h-8.5 w-full cursor-pointer items-center pt-2.25 pb-0.5 text-left font-mono text-label leading-none font-bold tracking-[.1em] text-(--bipi-now) uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--bipi-now) lg:min-h-7.5 lg:pt-2 print:hidden"
      >
        {open ? "Hide detail —" : "What this involves +"}
      </CollapsibleTrigger>

      {/* The one transition the design allows ("Transitions — only the
          disclosure. height/opacity, ~150-200ms, ease-out"). Base UI
          measures the panel and publishes `--collapsible-panel-height`,
          resolving to `auto` once a transition has settled, so the open
          card keeps reflowing normally with long copy. `overflow-hidden`
          is what makes the height transition legible and also blocks
          margin collapse, which keeps the measured height honest.
          `motion-reduce:transition-none` drops the animation to an instant
          state change — the same call-site pattern term-ruler.tsx uses.

          Forcing every panel open on paper is handled in globals.css's
          print block rather than by a `print:` utility here: a closed panel
          carries the `hidden` attribute, and Tailwind's preflight hides
          that with `display: none !important` from `@layer base` — which,
          because important declarations reverse the layer order, no
          utility-layer class can outrank (measured; even `print:block!`
          computes to `display: none`). It works at all only because the
          panel is `keepMounted` and therefore in the DOM to be revealed. */}
      <CollapsibleContent
        id={panelId}
        keepMounted
        className="h-(--collapsible-panel-height) overflow-hidden transition-[height,opacity] duration-180 ease-out motion-reduce:transition-none data-ending-style:h-0 data-ending-style:opacity-0 data-starting-style:h-0 data-starting-style:opacity-0"
      >
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
