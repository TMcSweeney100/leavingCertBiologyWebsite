# BiPi Schedule Hub — Design Brief

**What this doc is:** a creative brief, meant to go to Claude Design *alongside* the implementation spec (`bipi-schedule-website-spec.md`) and the existing poster (attach the HTML or a screenshot of it). This doc says what the design needs to achieve and how it should feel — it deliberately doesn't prescribe a layout, so there's room for Claude Design to propose real options rather than just recreate the poster.

---

## One-liner

A live, mobile-first schedule page for 6th Year Biology students, replacing a static poster, that always shows "where we are right now" in a six-stage coursework timeline.

## Who's looking at this, and when

- **Students**, split roughly evenly between school laptop (in class) and phone (checking a date on the go) — laptop is at least as common here as mobile, so this isn't a phone-dominant audience.
- **Parents**, mostly on a laptop, wanting reassurance and a sense of the shape of the term — not detail.
- **The teacher**, projecting it in class or linking it in a message, wanting it to look credible enough that she doesn't have to explain it.

Start the design system on mobile — it forces the simpler, clearer version first — but treat desktop/laptop as equally important from the outset rather than a stretched-out afterthought, since that's where a lot of the actual classroom viewing happens.

## Reference material (attach these)

- `BiPi_Schedule_Poster.html` — an existing draft poster, useful for the schedule content and wording (stage descriptions, checkpoint copy, audience notes). **Its visual design — palette, fonts, layout — isn't a reference for this brief; start the visual direction fresh.**
- The official SEC coursework brief (PDF) — mainly for tone/credibility reference (this is real exam coursework, not a casual project), not for visual style.

## Mood

Sleek, modern, uncluttered, a little warm rather than clinical — this should feel more like a well-designed editorial page than a school admin form. Trustworthy enough that a teacher is comfortable pointing 30 students and their parents at it. Nothing twee or overly "back to school."

## What needs to be designed

1. **The "you are here" moment** — this is the whole point of moving from a poster to a live site. However it's expressed (a banner, a highlighted card, a progress marker on the timeline itself), it needs to be the first thing a student's eye lands on: *what stage are we in, and what's due.*
2. **A timeline/stage card component** with three visual states: done, current, upcoming. Needs to hold: date range, stage title, a short description, a teacher-checkpoint callout, and a "Report §X due" badge (the report-section crosswalk is core content — see the spec for what it means).
3. **Mobile layout** — the practical starting point for the design system, even though it's not necessarily the dominant way this gets viewed.
4. **Desktop/laptop layout**, built out immediately after with equal care — students will be viewing this on school laptops just as often as phones, so this isn't a lightweight afterthought pass.

## Constraints

- Fast-loading, no heavy imagery required — this is a content/typography-led design, not a photo-driven one.
- Needs to hold six stage cards plus a catch-up-window card plus a completed-stages summary without feeling cluttered on a phone screen. Collapsed/expandable cards are fair game if that helps.
- Colour and type choices should work well as CSS variables / design tokens (this is going straight into a shadcn/ui + Tailwind build), not as a one-off Figma file that has to be manually translated later.

## What a good deliverable looks like

2–3 distinct directions (even rough ones) rather than a single polished mockup — easier to react to and pick from than to critique one option in isolation. For whichever direction gets picked, the useful output is: a colour palette (as tokens), type choices (display + body + label, if a mono/label font is used), and the stage-card component in its three states, at mobile width.

---

## Pointers on running this with Claude Design → Claude Code

1. Give Claude Design this brief + the spec + the poster attachment (for content reference, not visual direction) in one go, and ask for a few directions rather than one.
2. Pick a direction (or merge pieces of two) before moving to implementation — don't take an unresolved decision into Claude Code.
3. Bring the *decided* design output (tokens + the stage-card component, not the whole exploration thread) into Claude Code along with the spec. Handing over the resolved decision rather than the full back-and-forth keeps the implementation session focused and lighter on usage.
4. Implement the timeline component and the "you are here" logic first — everything else (audience strip, footer) is copy-paste-able once that's solid.
