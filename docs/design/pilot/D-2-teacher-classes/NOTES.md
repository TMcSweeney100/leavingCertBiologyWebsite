# Pack D-2 — `/teach`, `/teach/classes/new`, `/teach/classes/[id]` (Students tab)

Frames: `D-2 Teacher classes.dc.html` (18 frames, every page at 390 and 1140, every state in the pack spec).
Tokens: `tokens.css` (shared with D-1 — same file, no D-2-only tokens).
Repo destination: `docs/design/pilot/D-2-teacher-classes/`.

## Direction chosen

**2e "Navy"**, continued from D-1. The one memorable thing on the class page is the **join code**: white Space Mono at 68px on a solid navy card, with its expiry under it. It is the only saturated surface in either pack, and it exists because a teacher reads it aloud to a room while it sits on a projector — it has to be legible from the back row. Everything around it is white cards, hairlines and one accent.

The only other colour allowed to interrupt is attention amber `#A04806`, carrying the pending-request count and nothing else. Subject identity is a 4px bar down the left edge of a class row — never type, never a badge — so a subject can never be misread as a state.

Before finishing, one decoration was removed: the class rows on `/teach` originally also carried a subject dot beside the class name, duplicating the edge bar. The dot is gone.

## Tokens added

Same `tokens.css` as D-1. The tokens D-2 introduces use:

| Token | Value | Measured contrast | Used for |
|---|---|---|---|
| `--app-attention` | `#A04806` | 6.13:1; white on it 6.13:1 | pending count badge (solid, white text), section count |
| `--app-subject-biology` | `#0E6E7A` | 5.95:1 | 4px row edge |
| `--app-subject-business` | `#6D3AA8` | 7.44:1 | 4px row edge |
| `--app-subject-chemistry` | `#8E2846` | 8.26:1 | 4px row edge |
| `--app-subject-physics` | `#4B535C` | 7.80:1 | 4px row edge |
| navy card ground | `--app-accent` `#1F3A6E` | white on it 11.12:1; `#C3CDE1` label on it 6.96:1 | join code card |

Subject hues deliberately avoid amber, green and red so a subject bar cannot read as pending, approved or error. The bars are decoration, not information — subject is always also written in the row's metadata line.

## Per page

### `/teach` — My classes
- **1140:** 860px column. Heading left, **Create class** as a navy button on the same baseline, right. Class rows are full-width cards with the subject edge, class name at 19px, metadata line under it, and the pending badge right-aligned on the same row. **390:** Create class becomes a full-width button under the heading; the badge drops below the metadata line, left-aligned.
- Copy verbatim: heading "My classes"; **Create class**; empty state "No classes yet. Create one and read its join code out to the class."
- The badge reads "6 pending requests" / "1 pending request" — the count in mono at 17px, the words in 15px, solid amber with white text. Rows with a zero count have no badge at all, so the eye lands only on classes that need work.
- Metadata order: subject, year, academic year, level — "Biology · Year 6 · 2026/27 · Higher". Level is omitted when unset, as in `ClassList`.
- Empty state is a dashed card with the sentence and the primary action inside it, so the page is never a bare line of text.
- Rows are ordered as the API returns them; classes with pending requests are **not** floated to the top (see open questions).

### `/teach/classes/new` — Create a class
- **1140:** 560px column. **390:** full width. One field group, five rows: Subject, Class name, Year group, Academic year, Level (optional) — selects and inputs share the row treatment so the form reads as one object.
- Copy verbatim: heading "Create a class"; **Subject**, **Class name**, **Year group**, **Academic year**, **Level (optional)**; button **Create**; **Cancel** link. Options: Biology, Business, Chemistry, Physics; 5th year / 6th year; Not set / Higher / Ordinary / Mixed.
- Validation errors sit inside the field row that caused them: the row tints red, gains a 2px red edge, and the message replaces the helper line. The shared error panel is used only for a request failure, not for field problems.
- Error strings used in the frames are invented (see open questions).

### `/teach/classes/[id]` — One class, Students tab
- **1140:** 880px column; the three sections stack with 32px between them. **390:** same order, 26px between, buttons wrap under the row content.
- Tab row: **Students** selected with a 2px navy underline; **Component** and **Progress** drawn greyed at `#9AA2AC` with `aria-disabled="true"` and `cursor: not-allowed`. Room is left; nothing is designed.
- Heading is the class name at 32px with "Biology, year 6, 2026/27" beneath, and a "My classes" link above it.
- **Join code.** Navy card, code in mono at 68px (38px at 390), `.1em` tracking, "expires 14 Oct 2026" beneath in `#C3CDE1`. **New code** (navy) and **Turn joining off** (outline) sit under the card. A 44px icon-only copy button sits in the card's top-right corner with the accessible name "Copy join code". Joining-off state replaces the card with a dashed card reading "Joining is off. Make a new code to let students join." and shows only **New code**.
- **Pending requests.** Amber count beside the section heading ("2 waiting"). Each row: name at 17px, then username in mono and "asked 2 days ago". **Approve** (navy) and **Decline** (outline), accessible names "Approve Cian Murphy" and "Decline Cian Murphy". Empty: "No requests waiting." and no amber anywhere.
- **Students.** Each row: name, username in mono, then **Issue reset code** and **Remove** (red text, white fill), accessible names "Issue reset code for Aoife Byrne" and "Remove Aoife Byrne". Empty: "No students yet."
- **Issued reset code** opens as an inline panel **inside that student's row only** — navy left edge, tinted ground, code in mono at 30px, then "Shown once; valid for 24 hours, until 15 Oct 2026." and a **Hide code** button. It is deliberately not a modal and not projector-sized: the teacher turns the laptop toward one student. `role="status"`.
- **Removing** replaces that row's action buttons in place with "Remove Aoife Byrne from 6A Biology?", a red **Remove** and an outline **Keep**; the row tints red while the question stands. This replaces `window.confirm`.
- Section order is fixed: Join code, Pending requests, Students — the code first because that is what a teacher opens the page to read out.

## Components restyled

- **Button** — as D-1, plus a **destructive** variant: red text on white with a red-tinted hairline for the resting Remove, and a solid red fill only for the confirming Remove. Row actions are 40px tall; page primaries 48px.
- **Badge** — the pending count is a Badge-shaped pill but built as a `<span>` with two children (mono count, words) so the number can be set at a different size from the label. Solid amber, white text.
- **Table** — not used. The student and request lists are `<ul>` of cards, because each row carries two buttons and wraps to two lines at 390; a table would need a horizontal scroll.
- **Collapsible** — the reset-code panel is a disclosure inside a row, not a Collapsible around the whole section.
- **Input / Select** — both live in the field-group row treatment from D-1; the native select keeps its own chevron.

## Motion

One moment per page. On `/teach` nothing animates. On the class page, the reset-code panel and the inline remove confirmation expand in place — height and opacity, 160ms, `cubic-bezier(.2,.7,.3,1)` — because both appear inside a row the teacher is already looking at, and an instant jump loses that row's position. Under `prefers-reduced-motion: reduce` the duration token drops to 0ms and both appear without expanding.

## Open questions for Tim

1. **"Turn joining off" is destructive-ish and unconfirmed.** It is one press, next to **New code**, and it locks the class out. Suggest either a confirmation like Remove's, or reordering so New code is not adjacent. Not changed in the frames.
2. **Validation strings for Create a class are invented** — "A class name is needed." and "Use the form 2026/27." Both need real copy, and the academic-year format needs a stated rule (the field is a free-text input today, defaulting to `2026/27`).
3. **Should classes with pending requests sort first on `/teach`?** The frames keep API order, so a class with 6 waiting can sit below one with none. Sorting by pending count would make the amber badge redundant as a scanning aid, which is why it was not done — but it is a real call.
4. **Icon-only copy button.** You chose icon-only with the accessible name "Copy join code", which is the one deliberate exception to the pack rule "no icon-only buttons". Noting it so the rule is not read as broken by accident. There is no text fallback at 390 either.
5. **No copy confirmation designed.** Pressing copy gives no feedback in the frames. A short "Copied" status beside the button would need a new string and a 2-second timer; say the word and it goes in.
6. **Reset code is shown once and only inline.** If a teacher hides it before the student has it, it is gone and a new code must be issued. That matches `class-students.tsx` (component state, cleared on navigation), but it is worth confirming the teacher sees that consequence — the panel does not currently warn.
7. **"asked 2 days ago"** is a relative time the API does not return today (`Member` has no `requestedAt` in the schema I read). Either add it, or the row drops to name and username only.
8. **Subject colours assume four subjects.** A fifth subject has no colour. Suggest the palette lives with the subject record rather than the front end.
9. **Pending count does not appear in the header** — your call, and it means a teacher on `/school` or a class page gets no signal that new requests arrived. Revisit if the pilot shows requests sitting unanswered.

## Answers (Tim, 16 Sep 2026)

1. "Turn joining off" confirms in place, like Remove (R27).
2. Validation messages come from the API's field errors. The frames' invented strings aren't used.
3. Classes stay in API order.
4. The icon-only copy button is the agreed exception.
5. "Copied" status: built (R27).
6. The reset-code panel warns that hiding the code can't be undone (R27).
7. "asked …": built from `Member.requestedAt`, which the API already returns.
8. Subject colours stay in the frontend for the four pilot subjects. Revisit if a fifth arrives.
9. No pending count in the header, as drawn.

The tab row is built as a `nav` with one current link and two disabled items, not `role="tab"`. There are no tab panels yet, and ARIA tabs without panels fail axe.
