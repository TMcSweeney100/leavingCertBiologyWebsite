# Claude Design prompt: pack D-6 (the log)

Edit freely, then paste everything below the line into Claude Design, **in the same project as D-1 to D-5** so it keeps the Navy direction. Attach:

- `docs/design/UI-BRIEF.md` (the brief; §5 is the Navy system);
- `docs/design/pilot/D-1-app-shell-auth/tokens.css`;
- screenshots of the D-3 frame for `/components/[id]` (the component page with its tab row) and the D-2 frame for the Students tab of `/teach/classes/[id]`.

Sources: `docs/PILOT-ROADMAP.md` §6.2 (the three `/components/[id]/log…` rows and `/teach/classes/[id]/students/[studentId]`) and §7 Phase 3; `docs/PILOT-DESIGN.md` §6.6, §6.7 and §8.5; FR-24a–e (`docs/newDevelopement/FUNCTIONAL-SPEC.md`); SEC Coursework Rules and Procedures, Appendix 2 §4 (p. 34). Needed for build milestone **3B/3C**.

---

I'm designing the log for the Leaving Cert coursework app, in the same **2e "Navy"** direction you set in D-1 to D-5. The attached `UI-BRIEF.md` and `tokens.css` are the system. **Build on them; don't start a new palette.**

This pack is the **log**: the student's **Log** tab on the component page you drew in D-3 (`/components/[id]/log`, `/components/[id]/log/new`, `/components/[id]/log/[entryId]`), and the teacher's reading view of one student's log (`/teach/classes/[id]/students/[studentId]`, reached from the student's name on the Students tab). Students use the log mostly on their **phones**, so it's phone-first; the teacher's view is used on a laptop but must work on a phone.

Please give me **two or three directions** for the log list at **390px** first, rough. After I pick one, build every state below at **390px and 1140px**.

## What the student is doing

Keeping a dated trail of their project: notes, the sources they used, and every use of an AI tool. The trail proves the work is theirs. Three rules the pages have to make plain without a lecture:

- **Dates are set by the server and can't be changed.** The student never types the date an entry was made.
- **An edit adds a revision and keeps the old one.** The list shows an "edited" marker; the entry page shows the history.
- **Nothing is deleted.** There is no delete button anywhere.

## The three kinds and their fields

Each entry is one of three kinds. The kind is always a word ("Note", "Source", "AI use"), never colour alone. The labels below are the ones the code will use (`FIELD_LABELS` in `frontend/lib/app/log.ts`); improve them in `NOTES.md` if you can do better. **Required** fields are marked; the rest carry "(optional)" in the label.

| Field | Label | Required? |
|---|---|---|
| **Note** | | |
| body | Note | Required |
| **Source** | | |
| type | Type of source | Required |
| title | Title | Required |
| author | Author (optional) | |
| publication | Newspaper, magazine or publisher (optional) | |
| datePublished | Date or year published (optional) | |
| url | Link | Required for online types only |
| dateAccessed | Date accessed | Required for online types only |
| locator | Page, chapter, section or timestamp (optional) | |
| keyInformation | Key information (optional) | |
| relevance | How and why this is relevant to my question (optional) | |
| reflections | My reflections (optional) | |
| body | Notes (optional) | |
| **AI use** | | |
| toolNameAndVersion | AI tool and version | Required |
| developer | Developer or publisher | Required |
| dateGenerated | Date the output was generated | Required |
| howUsed | How you used it | Required |
| prompts | Prompts you used (optional) | |
| shareUrl | Share link (optional) | |
| body | Notes (optional) | |

**Source types** (the choice list for "Type of source"): Book · Newspaper or magazine article · Text or image online · Audio online · Video online · Other (journal, report, organisation, person). **The three "online" types need a link and a date accessed**; the others don't show those two fields as required. Design how the form changes when the type changes.

Links (Link, Share link) must be absolute `https` addresses. The app stores and shows them; it never opens them for the student. Design the message for a refused link (for example someone typing `http://…` or `www.example.ie`).

Length limits: a note or "Notes" up to 4,000 characters; each short field up to 500; "Prompts you used" up to 4,000. Show the limit only where it helps (for instance, a counter once the student is near it).

## Visibility: the page's most important job

- **New entries are visible to the teacher by default** (FR-24b). The student can switch it before saving.
- **Hiding or showing is one tap on the list** (FR-24c), not buried in the entry page. The control's name says what it will do to that entry: "Hide *[entry title]* from your teacher" and "Show *[entry title]* to your teacher".
- **At the moment of writing, the form says in words who can read it** (FR-24e). Exactly this copy, for each state of the visibility control:
  - visible: "Your teacher can read this."
  - hidden: "Only you can read this. Your teacher sees that you made an entry on 3 March."
- **A hidden entry must look different from a visible one without relying on colour**: an icon plus a word, a different edge, whatever you choose, but a person who can't tell colours apart, or reads with a screen reader, must know which is which.
- Visibility belongs to the entry, not to a revision. If a student edits an entry while it's hidden and later shows it, the teacher sees everything.

## Sample content

Placeholders for layout. The AI-use example follows the SEC's own example row; nothing here is real student work.

- **Class:** 6A Biology, 2026/27. **Component:** Biology in Practice Investigation, 2027. Student: "Aoife Kelly".
- **Note**, 12 Oct 2026, visible: "Ran the pilot titration. First readings look too high; need to recheck the burette."
- **Source**, 8 Oct 2026, visible: type Book, title "Inclusion", author (placeholder), locator "Chapter 3".
- **Source**, 6 Oct 2026, hidden: type Video online, title "Osmosis explained", link `https://example.ie/osmosis`, date accessed 6 Oct 2026.
- **AI use**, 3 Oct 2026, visible: tool "ChatGPT-4", developer "OpenAI", date generated 3 Oct 2026, how used "Asked for feedback on my research question wording", prompts "Is this question specific enough to test?", share link empty.
- **An edited entry:** the 12 Oct note above with 3 revisions (created 12 Oct, revised 13 Oct, revised 15 Oct).
- **Hidden from the start:** a Note made 3 Mar 2027 and never shown.

## States to draw

Student, `/components/[id]/log` and its children:

1. **Log list, empty:** no entries yet; the primary action starts a new entry; the "nothing is deleted, dates can't be changed" rule is said once, plainly.
2. **Log list, mixed:** newest first; visible and hidden entries, one edited entry; each row shows the kind word, a title taken from what the student wrote, the date, the "edited" marker where it applies, who can read it, and the one-tap hide/show control.
3. **New entry, kind choice:** choosing Note, Source or AI use; the visibility line and its control, defaulting to visible.
4. **New entry, each kind:** Note; Source (a Book, then an online type, showing the link and date accessed fields); AI use.
5. **New entry, validation errors on a field:** required fields missing, with row errors as in D-2's field group, and the shared error panel from D-1.
6. **A refused non-https link:** the message on the Link field.
7. **New entry, hidden:** the visibility control switched, and the plain-words line changing to match.
8. **Entry detail:** the entry, its date, its visibility and the one-tap control, and its **history of 3 revisions** (newest first, each with its number and date; the current one marked).
9. **Revise form:** editing an entry in place; the button names the outcome, and the page says the old version is kept.
10. **The shared error panel** for a failed load and a failed save.
11. **Tab row** on the component page: the tabs as drawn in D-3, with **Log** now live and current.

Teacher, `/teach/classes/[id]/students/[studentId]`:

12. **Visible entries:** each with its kind, date, content, an "edited" marker, and an expandable history of earlier revisions.
13. **A hidden entry:** one line, "Hidden by the student on 3 Mar". No title, no content, not even a hint of the kind's fields.
14. **A private-from-the-start entry:** one line, "Private entry · 3 Mar".
15. **No entries yet.**
16. **The class has no component yet:** nothing to read; say why and point back to the Component tab.
17. **Mixed list** at 390px and 1140px, and the way back to the Students tab.

## Things I want your view on

- **List row anatomy on a phone.** Kind, title, date, edited marker, who can read it and the hide/show control all want to be on one row at 390px. Which to promote, which to fold away, and how you keep a 44px hide/show target that can't be hit by accident when scrolling.
- **Kind choice.** Three tabs, a segmented control, a radio group, or a menu when the student taps "New entry". Recommend one, thinking about a student adding an AI-use entry in a hurry after a lesson.
- **Hidden entry, teacher side.** The teacher sees only that an entry exists and when it was hidden. Say whether that reads as respectful and clear, or as accusing, and adjust the wording if so.

## Rules that constrain you

- Build on `tokens.css` and the D-1 to D-5 component language: white cards with hairlines, the field group with row errors, 4px-edge messages, in-place confirmations.
- Light only. Body and inputs 16px; nothing under 12px. Dates "12 Oct 2026". Sentence case. One primary button per screen. Nothing only on hover.
- **Role-and-name-queryable controls.** The existing specs query by role and accessible name, so every control needs a real name. These are proposals and will become the tests' contract; improve them in `NOTES.md` "Open questions": **Save entry**, **Save new revision**, **Hide *[title]* from your teacher**, **Show *[title]* to your teacher**, **New entry**, **Log** (tab).
- **44px touch targets;** focus visible on every control; **one `h1` per page**; **no colour-only meaning** (kind, visibility and "edited" each have a word or icon).
- Links open with `rel="noopener noreferrer"`. Show a link's host so the reader sees where it goes.
- Amber is reserved for pending work. Red is for errors only. If the hidden state needs a colour, say what and why in `NOTES.md`, or propose a token.
- Any behaviour change goes in `NOTES.md` under "Open questions". The fixed rules (server-set dates, revisions kept, nothing deleted, visible by default, one-tap visibility, the plain-words line) aren't open.
- Field names and the AI-use fields come from the SEC and NCCA documents. Don't invent or reword fields; propose label wording only.

## What I want back

1. Two or three rough directions for the log list at 390px.
2. After I choose: every state above, at 390px and 1140px where it makes sense (at least 2, 4, 7, 8 and 13 at both), plus the error panel.
3. `tokens.css` additions only (a hidden-entry treatment, if you add one), with measured contrast ratios.
4. `NOTES.md` on the brief's §8 template, with exact copy and your answers to the three questions above, answering every open question.
5. Frame HTML per state, saved as `docs/design/pilot/D-6-log/`.
6. Calm and exact. A student should be able to add a note in under ten seconds and never wonder who can read it.
