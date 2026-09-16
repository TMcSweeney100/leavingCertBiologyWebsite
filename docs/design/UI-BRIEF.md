# UI brief — the coursework pilot app

**Who this is for:** Claude Design (or any designer) producing a design pack for one or more app pages. Give it this file, the rows of `docs/PILOT-ROADMAP.md` §6.2 for the pages in the pack, and the app's tokens (`docs/design/pilot/D-1-app-shell-auth/tokens.css`, built into `frontend/app/globals.css` as `--app-*`). Ask for two or three directions, pick one, and only bring the decided one into the build.

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

## 5. Visual system: the app's own, "Navy"

**Decided 16 Sep 2026 (roadmap R25), superseding the earlier "shared bones" rule.** The first two design packs (D-1, D-2) moved the app away from the BiPi schedule's look. The app is now its own visual system, direction **2e "Navy"**. Only the three typefaces are still shared with BiPi. The source of truth for every value is `docs/design/pilot/D-1-app-shell-auth/tokens.css` (identical in D-2), built into `frontend/app/globals.css` as `--app-*`. Later packs extend that file; they don't restart it.

**What the app uses** (contrast measured on white unless noted):

- **Type.** Space Grotesk (600–700) for headings, Public Sans for body, Space Mono for codes, usernames and the small uppercase field labels. These are the same families as BiPi, nothing more.
- **Neutrals, cool graphite.** Ground `#F7F8F9`, surface white, inset `#EFF1F3`, ink `#101419`, body `#343A42`, grey `#4B535C`, muted `#636B75`, hairline `#E3E6EA`, field border `#DDE1E6`.
- **Radii.** Cards 10px, controls 8px, inner pills 6px.
- **Accent: navy `#1F3A6E`** (11.12:1). Primary buttons, links, focus rings, the selected role and tab. Hover `#16294E`, tint `#F4F5F8` for the focused field row.
- **Attention: amber `#A04806`** (6.13:1). Reserved for pending work: the pending-request count and rate-limit messages. Nothing else is allowed to interrupt.
- **Status.** Approved green `#0F5C3A` (8.04:1); error red `#B3251E` (6.56:1) with hover and heading `#8E1D17` and tint `#FBF1F0`.
- **Subject identity.** A 4px bar down the left edge of a class row, never type or a badge. Biology `#0E6E7A`, Business `#6D3AA8`, Chemistry `#8E2846`, Physics `#4B535C`. These hues avoid the status trio, so a subject can't read as a state. The subject is always also written out.
- **Motion.** One token pair: 160ms on `cubic-bezier(.2,.7,.3,1)`, dropping to 0ms under reduced motion.

**Component language** (from D-1 and D-2):

- **Field group.** One white card per form, rows split by hairlines, each row a mono uppercase label above a borderless 16px input. The row being typed in is tinted with a 2px navy inner edge. An invalid row is tinted red with a red edge and shows its message under the input.
- **Buttons.** Primary is a navy fill. Secondary is white with a field-border hairline. Destructive at rest is red text on white with a red hairline; confirming is a solid red fill. Form primaries are 48px tall, row actions 40px.
- **Messages.** A compact alert (4px left edge, tinted ground, circled "!" and the sentence) for a failed request. The full error panel (heading, sentence, field list, "Try again") for an unreachable service. Amber for throttling, green for success.
- **Cards and lists.** White cards with a hairline and no shadow. Lists of classes and students are `<ul>`s of cards, not tables.

**BiPi is a separate product surface.** The `--bipi-*` tokens stay exactly as they are for the live schedule, and the app never uses them. Inside the app, BiPi blue `#4662B9` and green `#1A7F51` appear only in reused BiPi components (pack D-3's stage cards and crosswalk), where they keep their "now" and "done" meanings. The app accent must never be BiPi blue.

**Type floor.** Body 16px, form inputs 16px (smaller zooms on iOS), nothing below 12px anywhere, line-height 1.5 for body. The D-1/D-2 exports draw field labels at 11px, so the build sets them at 12px. Headings come from a scale of about five steps.

**Light only.** No dark mode.

## 6. Avoid

These are the defaults a generator reaches for when nothing better is decided. Each one is a legitimate choice somewhere; none of them is a choice here.

- Cream backgrounds with a serif display and a terracotta accent; near-black pages with one acid accent; broadsheet hairline grids.
- Every block as an identical rounded card with the same soft grey shadow; gradient washes as decoration; glassmorphism.
- Tracked-out ALL-CAPS eyebrow labels above every heading (the app's uppercase mono labels are for form fields and one-word status eyebrows only); meta strings joined with middle dots; "WORD — fragment" labels; an arrow glued to every link and button.
- One word of a headline in a different colour or italic.
- Fade-and-slide-up on every section; hover lift on every card; skeletons and spinners for work that takes 100ms.
- Icon-only buttons (the one agreed exception is the copy-join-code button, with its accessible name), emoji as icons, a second icon set.
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
