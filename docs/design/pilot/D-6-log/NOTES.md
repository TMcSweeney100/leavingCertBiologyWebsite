# Pack D-6 — the log

`/components/[id]/log`, `/components/[id]/log/new`, `/components/[id]/log/[entryId]` (+ its revise form), and `/teach/classes/[id]/students/[studentId]`.

Frames: `design/D-6 Log.dc.html`. Turn 2 (top) is the pack; Turn 1 (below) is the three rough directions, kept for the record. Laptop first: every page is drawn at 1140, with its 390 frame beside it.
Tokens: `tokens.css`, additions only. No `--bipi-*` value touched.

| Frame | State (prompt §) |
|---|---|
| 2a | List, mixed, with the tab row: Log live and current (2, 11) |
| 2b | List, empty (1) |
| 2c | Hide, then Undo: before, the 5 seconds, settled |
| 2d | New entry: kind choice (390), Note being typed (1140) (3, 4) |
| 2e | New entry: Source, Video online (1140), Book (390) (4) |
| 2f | New entry: AI use; the counter near the limit (390) (4) |
| 2g | Validation errors (5) and refused links (6) |
| 2h | New entry, hidden (7) |
| 2i | Entry detail with 3 revisions (8); a hidden online source showing its link host |
| 2n | Entry detail for a Source (Book) and an AI use, at both widths; one-revision history (8) |
| 2j | Revise form (9) |
| 2k | Error panel: failed load, failed save, failed hide (10) |
| 2l | Teacher: mixed list at both widths (12, 13, 14, 17) |
| 2m | Teacher: no entries yet (15), class has no component yet (16) |

## Direction chosen

**1a, the ledger**, with a tinted kind chip (your call in the form). The log is a record, so it looks like one: one white card, hairline rows, the date first in mono so the eye runs down a column of dates. The memorable element is the **reader column** at the end of every row. It says in words who can read the entry ("Teacher can read" / "Only you"), with an eye or eye-off icon, and the Hide or Show button sits beside it. Everything else stays quiet. The kind chips are the only colour in the list, and they are pale.

Removed before finishing (brief §9): the summary count above the list from 1c ("Your teacher can read 3 of 4 entries"). The reader column already answers that row by row. The teacher page keeps a count, because there the count is what the teacher came to learn.

## Tokens added

| Token | Value | Measured contrast | Used for |
|---|---|---|---|
| `--app-kind-note` / `-tint` | `#343A42` / `#EFF1F3` | 10.14:1 | Note chip (aliases of body and inset) |
| `--app-kind-source` / `-tint` | `#52561A` / `#F1F2E4` | 6.86:1 on tint · 7.76:1 on white · 7.30:1 on private ground | Source chip |
| `--app-kind-ai` / `-tint` | `#7A2E6B` / `#F7EEF4` | 7.61:1 on tint · 8.64:1 on white · 8.13:1 on private ground | AI use chip |
| `--app-private-ground` | `#F7F8F9` | ink 17.38 · body 10.79 · muted 5.08 · accent 10.46 | hidden rows and cards, both roles |
| `--app-switch-off` | `#636B75` | 5.40:1 on white · 5.08:1 on private ground | visibility switch track when off |
| `--app-undo-ms` | `5000` | — | how long Undo stays |

**Why these kind hues.** Navy is for action, amber for pending, green for done, red for errors, and teal, purple, maroon and graphite are subjects. That leaves few free hues. Note is neutral because it's the default and most common kind. Olive and plum are the two hues furthest from everything else in use. The word is always in the chip, so a reader who can't tell the colours apart loses nothing.

**Why grey for hidden.** A hidden entry isn't wrong, late or pending, so it can't borrow red, amber or navy. The private ground is a withdrawal of the white surface, and it's never the only carrier: the **eye-off icon** and the **bold word** ("Only you" / "Private entry" / "Made private") are there too. In greyscale or with a screen reader, the word and the button's name (`Show … to your teacher`) carry it.

## Per page

### `/components/[id]/log`

- **1140:** 916px column (as D-3). "Your log" h2 with the rule line under it, and **New entry** on the right. One card; each row is a grid: date 104px · kind chip 84px · title and one line of detail · reader column 232px (state word + Hide/Show).
- **390:** New entry full-width under the tabs, then the rule line. Rows stack: chip, date and "Edited" on one line, then the title, then the detail line, then the reader word on the left and the button on the right.
- **Copy.** Rule line: "Each entry is dated when you save it. Editing keeps the earlier version. Nothing is deleted." Reader words: "Teacher can read" / "Only you". Buttons: **Hide** / **Show** (visible), with accessible names **Hide *[title]* from your teacher** / **Show *[title]* to your teacher**. The visible word starts the name, so voice control ("click Hide") works. Edited marker: pencil icon + "Edited · 3 revisions" at 1140, "Edited" at 390.
- **Titles.** Note: the first line of the body. Source: its title. AI use: tool and version. The detail line is the type and locator (source), the host for online types, or "How you used it" (AI use).
- **Empty (2b):** "Nothing in your log yet" + "Keep a note of what you did, each source you used, and every time you used an AI tool. It's how you show the work is yours." + New entry, and the three rules as a short list: **Dated for you.** / **Edits are kept.** / **Nothing is deleted.** At 1140 the rules sit in a right-hand column of the same card.
- **Ordering:** newest first by created date. A revision doesn't move an entry up.
- **Tab row:** Overview · **Log** (live, `aria-current="page"`, navy underline) · Sources · AI use · Word checker (still `aria-disabled`, `#9AA2AC`). This matches `component-tabs.tsx` today.

### `/components/[id]/log/new`

- **1140:** 916px column, the form (1fr) + a 250px aside. The aside shows the **Date** the server will set ("15 Oct 2026 — Set when you save. It can't be changed.").
- **390:** that date becomes one line under the h1: "Dated 15 Oct 2026 when you save. You can't change the date."
- **Kind choice:** a segmented control (`role="radiogroup"`, three `role="radio"` buttons, 44px). **Note is preselected.** The selected segment is white with a hairline, bold ink and a check icon, so selection isn't shown by fill alone.
- **Order on the form:** kind → fields → visibility → Save entry / Cancel. The visibility block is the last thing before the button, so it's read at the moment of saving.
- **Visibility block:** a switch labelled "Let my teacher read this", **on by default**. Under it, in a live region, the FR-24e sentence, word for word:
  - on: eye icon + "Your teacher can read this."
  - off: eye-off icon + "**Only you can read this.** Your teacher sees that you made an entry on 3 March." The block's ground changes to `--app-private-ground` too.
- **Source:** two field groups, "The source" and "Your notes on it". Fields are in `FIELD_LABELS` order. Choosing an online type inserts **Link** and **Date accessed** after "Date or year published". For Book, Newspaper and Other they're **not rendered at all** rather than shown as optional (see open question 3). Link help: "Needed for online sources. Copy it from your browser's address bar; it starts with https://". Date accessed help: "The day you looked at it. Starts at today."
- **AI use:** the four required fields first, then the three optional ones. "Date the output was generated" starts at today. Share link help: "If the tool gives you a link to the conversation. It starts with https://"
- **Counter:** hidden until 90% of the limit, then "3,850 of 4,000" in mono under the field, `aria-live="polite"`. Short fields (500) show it from 450.
- **Aside note on online sources:** "The app keeps the link but never opens it for you. Check it goes where you expect."
- **Leaving with unsaved text** asks for confirmation (UI-STANDARDS §7: log entries are "long forms").

### Validation and links (2g)

- The D-1 panel appears above the form, takes focus, and reads "That didn't save" + "Two fields need another look. Everything you typed is still here." Each item links to its field.
- Row messages (all mine; see open question 5):
  - Title: "Enter the title of the source, as it's shown on the video." (the wording follows the type)
  - Developer or publisher: "Enter who makes the tool, for example OpenAI."
  - How you used it: "Say what you asked the tool to do and what you did with its answer."
  - Link, `http://…`: "This link starts with http://, which isn't secure. Use the https:// address — copy it again from your browser's address bar."
  - Link, `www.…`: "Add https:// to the start, like https://www.example.ie"
  - Link, not a URL: "That isn't a link. Copy the address from your browser's address bar; it starts with https://"
- Links are checked on save, never per keystroke, and the app never rewrites what was typed (no silent `https://` prefix).

### `/components/[id]/log/[entryId]`

- **1140:** content (1fr) + a 260px aside. The aside holds **Revise entry** (the one primary) and the visibility card: "**Your teacher can read this**, including all 3 revisions." + **Hide from your teacher**. Under it: "Revising adds a new version. Earlier ones stay in the history. Nothing is deleted."
- **390:** a compact visibility bar comes first (state word + Hide/Show), then content, Revise entry, and History.
- **h1:** a Note's h1 is its **date** ("12 Oct 2026"), because a note has no title and repeating the body as a heading reads badly. A Source or AI use keeps its title as the h1. The chip and "Edited · 3 revisions" sit above it. Under it: "Last revised 15 Oct 2026. Dates are set by the app and can't be changed."
- **History:** an `<ol reversed>`, newest first. Each row shows "Revision n", its date in mono, and "Created" on the first one. The current one shows a **Current** pill (ink) and "Shown above". Earlier ones are `<details>` ("Show revision 1" / "Hide revision 2"), collapsed by default at 390; at 1140 the most recent earlier revision is open.
- **Source and AI use (2n):** title as h1, chip + date above it. Fields are read-only `<dl>` rows in the field-group card, in form order. A source keeps the form's two groups ("The source" / "Your notes on it"). At 1140 short values sit label-left, value-right (260px label column) and long text sits label-above. Prompts keep line breaks (`white-space: pre-wrap`) on an inset ground. Labels drop the "(optional)" suffix on read. An entry never revised shows a single history row: "Revision 1 · date · Created" + **Current**.
- **Links shown:** the host in bold as the link text ("example.ie"), with the full URL under it in mono. `rel="noopener noreferrer"`, same tab. Fields that are empty aren't shown.

### Revise (2j)

- h1 "Revise note" / "Revise source" / "Revise AI use". The back link names the entry ("Note, 12 Oct 2026").
- An inset line above the fields: "Saving adds **revision 4**. Revision 3, from 15 Oct 2026, is kept in the history."
- Button **Save new revision**. At 1140 the aside shows the revision date and "The entry keeps its first date, 12 Oct 2026."
- No visibility switch, because visibility belongs to the entry. There's a line instead: "Your teacher can read this entry and will see the new revision." (For a hidden entry: "Only you can read this entry. If you show it later, your teacher will see every revision.")

### `/teach/classes/[id]/students/[studentId]`

- **1140:** the D-2 header, 916px column. Back link "6A Biology, Students" (to the Students tab). h1 is the student's name, with the username in mono and the component under it. Then "Log" h2, with "5 entries. Aoife has shared 3 with you." on the right. The same ledger grid without the reader column: date · chip · full content.
- **390:** stacked, like the student list.
- **Shared entry:** the full current revision (a note's body; a source or AI use as a small `<dl>`), plus "Edited · 3 revisions, last on 15 Oct 2026" and a disclosure for earlier revisions (open at 1140 in the frame, collapsed by default at 390).
- **Hidden after being shared:** one line on the private ground: chip, date, eye-off, "**Made private** by Aoife on 14 Oct 2026". No title, no content.
- **Private from the start:** one line: chip, date, eye-off, "**Private entry**".
- **No entries (15):** "Aoife hasn't written any log entries yet." + "Entries appear here as they're saved. You'll read the ones Aoife shares, and see only the kind and date of any she keeps private."
- **No component (16):** "Nothing to read yet." + "6A Biology doesn't have a component set up, so its students don't have a log. Set one up on the class's Component tab." + **Go to the Component tab** (secondary).

## Your three questions

**1. List row anatomy on a phone.** Nothing is folded away, because each item is small once it has its own line. **Promoted:** the title (16px 600, the only large text in the row) and the reader line (the page's main job). **Demoted to one mono meta line:** kind chip, date and "Edited". The revision count moves to the entry page at 390. **The 44px Hide/Show target:** it's a real outlined button, at least 76px wide, on its own line, bottom-right of the row, and more than 8px from the title link. A scrolling thumb lands on text far more often than on a small bordered box. More importantly, a mis-tap is **cheap**: nothing is lost, the row says what happened in words, and **Undo** stays for 5 seconds with focus on it (2c). The 1c idea of a whole-cell toggle was dropped because it made the accidental target bigger.

**2. Kind choice.** A **segmented control with Note preselected**. A student adding an AI use in a hurry after a lesson taps New entry, taps "AI use", and sees the four required fields at once. A menu hides the choice behind a tap and a list. Three big choice buttons add a whole screen before anything can be typed. Tabs would imply three separate pages. A radio group is the same thing as the segmented control, set vertically, and costs 130px on a phone. The segmented control *is* a radio group (`role="radiogroup"`), so it's the same for a screen reader. Switching kind keeps anything already typed in a shared field (Notes).

**3. The hidden entry, teacher side.** "Hidden by the student on 3 Mar" is clear, but "hidden" and "the student" together read slightly as surveillance: the teacher is told something was concealed, by someone unnamed. I've drawn **"Made private by Aoife on 14 Oct 2026"** and **"Private entry"** for the two cases. Both lead with the same word, name the student as a person, and frame it as a choice she's entitled to make. The count line, "Aoife has shared 3 with you", keeps the same framing. If you'd rather keep the spec strings, they drop into the same slot unchanged (open question 2).

## Components restyled

- **Button:** as D-1. Hide/Show is the outline variant at 44px with navy text (it's an action, not neutral). Revise entry and Save entry are the primary.
- **Kind chip:** a plain `<span>`, not Badge, for the same reason as D-3's pills (mono, its own tracking).
- **Segmented control:** plain `<button role="radio">` elements in a `role="radiogroup"`. No shadcn primitive fits cleanly; ToggleGroup would override every class.
- **Switch:** shadcn `Switch` if added (`npx shadcn add switch`), restyled to 48×28 with the tokens above; otherwise `<button role="switch" aria-checked>`. The whole 48px row is its label.
- **Field / FieldGroup:** unchanged from `field.tsx`. The date and select rows reuse the row with an icon on the right.
- **Collapsible:** revision history uses `<details>`/`<summary>` (as D-3's prompts), each summary at least 44px.
- **ErrorPanel / Notice:** unchanged. The failed toggle uses the compact 4px-edge alert inside the row (`role="alert"`).

## Motion

One moment: **the hide/show confirmation** (2c). On tap, the row's ground and reader word change immediately. The new reader line ("Hidden from your teacher") fades in over `--app-duration` (160ms) on `--app-ease`, and the button relabels to **Undo** for `--app-undo-ms`. After that the row settles to "Only you" + Show with no animation. Focus stays on the same button throughout. The live region says "*[title]* is now hidden from your teacher." Under reduced motion the fade is 0ms and the rest is unchanged. The switch knob slides at 160ms, and not at all under reduced motion.

## Open questions for Tim

1. **Control names (the test contract).** Kept: **Save entry**, **Save new revision**, **New entry**, **Log** (tab), **Hide *[title]* from your teacher**, **Show *[title]* to your teacher**. Added: **Revise entry** (link on the entry page), **Undo** (accessible name "Undo: show *[title]* to your teacher again"), **Let my teacher read this** (the switch), the kind radios **Note** / **Source** / **AI use**, and **Show revision *n*** / **Hide revision *n*** for history. `log-visibility-toggle.tsx` today names its button "Hide from your teacher" with the title in `aria-describedby`, so its spec will need changing to the title-in-name form.
2. **Teacher wording.** "Made private by *[first name]* on *[date]*" and "Private entry" replace "Hidden by the student on…" and "Private entry · …" (`teacher-log.tsx`). The first name is already in the API (`log.firstName`). Please confirm.
3. **Link and Date accessed for non-online types.** The prompt says they're not "shown as required" for Book and the others. I've **not rendered them at all**. If the data model should accept an optional link for a book (an e-book, say), they'd need to reappear as "Link (optional)" and "Date accessed (optional)". Which do you want?
4. **Undo is new behaviour.** It's a second `PUT /log/{id}/visibility` within 5 seconds. Does a quick hide-then-show leave any trace for the teacher (a "hidden on" date that sticks)? It shouldn't. The API should probably not record `hiddenAt` until the undo window closes, or should clear it on an immediate re-show.
5. **Error copy for fields** is mine (2g). The prompt fixes the labels, not the messages. The Title message changes with the source type ("as it's shown on the video / on the cover / on the page"). Is that worth the extra strings?
6. **Short labels on the teacher view.** At 1140 the teacher's `<dl>` uses short labels ("Developer", "Generated", "How used", "Prompts", "Page, chapter…") so the content column stays readable. The full `FIELD_LABELS` text would go in each `<dt>`'s accessible name. If labels must be verbatim everywhere, the `<dl>` stacks label-over-value instead, as on the student entry page.
7. **A note's h1 is its date** on the entry page (Sources and AI use keep their title). The accessible names in Q1 still use the note's first line as *[title]*.
8. **List titles for notes.** `entryTitle` cuts at 80 characters with "…". The sample note is 83 characters, so it would be cut two words from the end. I've drawn it wrapping in full. Proposal: no character cut in the list, use `line-clamp-2` instead, and keep the 80-character cut only for accessible names.
9. **Revise route.** Drawn as `/components/[id]/log/[entryId]/revise`, a fourth route not in §6.2 (which lists three). The alternative is `?revise` on the entry page. A route is simpler for Back and for the unsaved-changes guard.
10. **Prefilled dates.** "Date accessed" and "Date the output was generated" start at today and can be changed. They're the student's facts, not server-set dates. Confirm the API accepts a student-supplied value for both (and a past date).
11. **Label wording, proposed.** "Newspaper, magazine or publisher (optional)" is long for a phone label; "Publisher (optional)" with help text "Or the newspaper or magazine" would be shorter, but it rewords an NCCA field, so I haven't drawn it. "How you used it" and "Prompts you used" switch person from the Source fields' "my question" / "My reflections". Either set is fine; the mix is slightly odd.
12. **Hidden-entry revisions.** When a hidden entry is shown again, the teacher sees every revision, including those written while it was hidden (the fixed rule). The student is told this at two moments: the 2h aside, and the entry page's hidden visibility card. Is a line on the Show button's confirmation also wanted ("Your teacher will see all 3 revisions"), or is that one message too many?
13. **Kind hues vs subject hues.** Plum (AI use) sits between the Business purple and the Chemistry maroon. They never appear together (the log is always inside one subject, and subject hues are only ever edge bars), but if a cross-subject log view ever exists, revisit this.
