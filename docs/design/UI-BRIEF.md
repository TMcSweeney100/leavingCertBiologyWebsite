# UI brief — the coursework pilot app

**Who this is for:** Claude Design (or any designer) producing a design pack for one or more app pages. Give it this file, the rows of `docs/PILOT-ROADMAP.md` §6.2 for the pages in the pack, and the BiPi tokens in `frontend/app/globals.css`. Ask for two or three directions, pick one, and only bring the decided one into the build.

**Companion files:** `UI-STANDARDS.md` is the build-side rulebook; `UI-CHECKLIST.md` is the review pass. This file says what the design must achieve and how it should feel. It does not prescribe layouts.

---

## 1. The product in one paragraph

Leaving Cert students now have an assessed coursework component in nearly every subject, each with its own stages, deadlines and rules. The app gives a student one place to see every component they're doing, where each one is right now, what's due next, and a dated log of their own work. It gives a teacher one screen showing who is behind, and a school leader counts per class. It never holds the student's actual work. The Biology in Practice Investigation (BiPi) is the first component, and the public BiPi schedule at `/[class]` is the app's older sibling.

## 2. Who is looking, and when

| User | Device | Moment | What they need in the first two seconds |
|---|---|---|---|
| Student (16–18) | Phone, mostly; school laptop in class | Between classes, on the bus, the night before a deadline | What's due next, for which subject, and how many days away |
| Teacher | Laptop, often projected on a classroom screen | Start of a lesson; a free class; a quick check before a parent meeting | Who is behind, and the class join code |
| School leader | Laptop | A planning meeting | Which classes are on track, as counts |

No parents. No marketing pages. Everyone here is signed in and has a job to do.

Students are tech-literate but impatient and often distracted. Teachers vary widely. The rule that satisfies both: **someone who has never seen the app should be able to do the thing they came for without instructions.** Familiar controls, plain words, one obvious next step.

## 3. How it should feel

Four qualities, in priority order, each made concrete:

1. **Low cognitive load.** One job per screen. The answer to the user's question is the first thing on the page, not a heading about it. At most one primary action per screen; everything else visually subordinate. No dashboards of tiles that all shout equally.
2. **Quick.** The page looks finished the moment it arrives: no spinners on first paint, no content jumping. Actions respond instantly and say what happened. Nothing waits on an animation.
3. **Sleek and modern.** Content and typography do the work; no stock imagery, no illustration, no gradient washes. Generous space, a small number of strong type sizes, hairlines rather than boxes. Closer to a well-set editorial page than to a school admin form.
4. **Credible.** This is real exam coursework. Calm, exact, never twee or "back to school". A teacher should be comfortable projecting it in front of thirty students.

## 4. Design principles (the spine of every page)

- **The answer first.** Whatever the page exists to tell the user comes first and largest: the next deadline, the join code, the count of students behind. Titles and context sit around it, smaller.
- **One primary action.** The button the user most likely came to press is the only filled button on the screen. Secondary actions are outline or text. Destructive actions (remove a student, turn joining off) sit apart from the primary one and confirm or offer undo.
- **State in words, not only colour.** "Pending approval", "Approved", "Due in 3 days", "Done". Colour reinforces the word; it never replaces it. The BiPi site already does this and prints legibly in black and white as a result.
- **The next step is always visible.** Empty screens are invitations: "No classes yet. Enter a join code from your teacher." Errors say what went wrong and what to do. Nothing dead-ends.
- **Nothing hidden behind hover.** Phones have no hover. Every action is a visible control, at least 44×44px, with at least 8px between neighbours.
- **Structure is information.** Borders, numbering, badges and dividers appear only where they encode something (a sequence, a state, a grouping). Six stages are a sequence, so they can be numbered. A list of classes is not.
- **Progressive disclosure.** Show the current stage open and the others summarised; show the one field the user needs now and reveal the rest when relevant. Collapsed content must still be reachable by keyboard and readable by screen readers.
- **Motion answers the user.** A panel opening, a row confirming, a code appearing. One deliberate moment per page at most, never decoration on every card, and everything works with motion off.
- **Mobile first, laptop with equal care.** Design each screen at 390px first, then at 1140px as its own layout rather than a stretched phone. Teacher pages are used mostly on laptops and may use the width (tables, two columns); student pages are used mostly on phones.

## 5. Visual system: shared bones, the app's own accent

The app and the public BiPi schedule are one family, not one product. Keep the bones, choose the accent.

**Keep from BiPi** (all in `frontend/app/globals.css`, `--bipi-*`):

- Type: Space Grotesk for display and headings, Public Sans for body, Space Mono for small labels and codes. One display family, one body family; the mono only for codes, dates and labels, never for body text.
- Neutrals: page ground `#F4F6FA`, surface white, inset `#EEF0F4`, ink `#141A23`, body `#333842`, muted `#656B74`, hairline `#DDE0E5`.
- Radii: 12px cards, 8px insets, 7px badges, pill 99px.
- The meaning of two colours. **BiPi blue `#4662B9` means "now": the current stage, and nothing else.** **Green `#1A7F51` means "done".** When a BiPi component is reused inside the app (pack D-3 reuses the stage cards and crosswalk), those two keep their jobs.

**The app chooses for itself:**

- **An accent** for primary actions, links, focus rings and the active nav item. It must not be the BiPi "now" blue, or the current-stage marker and the primary button will compete. It must measure at least 4.5:1 as text on white and on the page ground, and 3:1 as a filled control against both. State the hex and the measured ratios in the pack.
- **Status colours** the BiPi site never needed: error (with an icon and a word), warning, and "pending". Same contrast rule.
- **Component language**: how a form field, a card, a table row, a status badge, the header and the role switcher look. Restyle the shadcn primitives (Button, Input, Card, Badge, Table, Collapsible, Tabs) rather than inventing new ones; where a primitive would need every one of its classes overridden, say so in `NOTES.md` and use a plain element.

**Type floor for the app.** The BiPi poster page runs small (12.5px body, 9px chips) because it is a dense read-only schedule. The app is a tool people type into and read on phones, so: body 16px, form inputs 16px (smaller triggers zoom on iOS), nothing below 12px anywhere, line-height 1.5 for body. Headings from a scale of about five steps, not fifteen.

**Light only.** No dark mode. Every contrast ratio is measured on the light surfaces above.

## 6. Avoid

These are the defaults a generator reaches for when nothing better is decided. Each one is a legitimate choice somewhere; none of them is a choice here.

- Cream backgrounds with a serif display and a terracotta accent; near-black pages with one acid accent; broadsheet hairline grids.
- Every block as an identical rounded card with the same soft grey shadow; gradient washes as decoration; glassmorphism.
- Tracked-out ALL-CAPS eyebrow labels above every heading; meta strings joined with middle dots; "WORD — fragment" labels; an arrow glued to every link and button.
- One word of a headline in a different colour or italic.
- Fade-and-slide-up on every section; hover lift on every card; skeletons and spinners for work that takes 100ms.
- Icon-only buttons, emoji as icons, a second icon set.
- Stock photos, hero illustrations, mascots.
- Colour as the only carrier of a state.
- Anything that needs a tooltip to be understood.

## 7. Copy

Words are part of the design and get the same restraint.

- Sentence case everywhere: "Create class", not "Create Class".
- A button says what it does: "Create account and join", "Issue reset code", "Turn joining off". Never "Submit", "OK", "Continue" on its own.
- The same word all the way through: the button "Approve" produces the status "Approved".
- Second person, active voice, plain verbs. "Enter the join code your teacher gave you."
- Errors say the cause and the fix, without apology or blame: "That code has expired. Ask your teacher for a new one."
- Numerals for counts ("3 pending"), `Intl` formatting for dates ("14 Oct 2026"), Irish English spelling.
- Name things by what the user does, not by how the system works: "reset code", not "credential token".
- Never invent coursework content. Stage names, dates, rules and mark bands come from the SEC and NCCA documents in the repository, quoted exactly. Placeholder copy in a mockup must be marked as placeholder.

## 8. What a design pack contains

One folder per pack in `docs/design/pilot/<pack-name>/` (roadmap §6.3):

| File | What |
|---|---|
| `design/*.dc.html` | The Claude Design export, with a 390px and a 1140px frame for each page. |
| `tokens.css` | Only the tokens the app adds or changes (`--app-*`). Never a changed `--bipi-*` value. |
| `NOTES.md` | Everything the design decides that roadmap §6.2 does not. Template below. |

Each page in the pack shows every state its §6.2 row lists (empty, pending, error, expired…) and the shared error panel. A state that isn't drawn will be built plain.

### `NOTES.md` template

```markdown
# Pack D-n — <pages>

## Direction chosen
One paragraph: the memorable element, and what stays quiet around it.

## Tokens added
| Token | Value | Measured contrast | Used for |

## Per page
### /route
- Layout at 390 and 1140 in one sentence each.
- Copy decisions (exact strings for headings, buttons, empty states, errors).
- What is collapsed by default, and what opens it.
- Ordering decisions.
- Anything that changes behaviour compared with roadmap §6.2 → flagged here, so the roadmap is updated first.

## Components restyled
Which shadcn primitives, which variants, and any primitive replaced by a plain element and why.

## Motion
The one moment per page, its duration and easing, and its reduced-motion behaviour.

## Open questions for Tim
```

## 9. The one memorable thing

Each page is allowed one element that carries the design: the countdown on the student timeline, the join code on the teacher's class page, the "behind by" column on the progress grid. Spend the boldness there. Keep everything else quiet, and before finishing, remove one decoration.
