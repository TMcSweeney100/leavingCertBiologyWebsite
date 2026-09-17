# Claude Design prompt: pack D-4 (the student timeline)

Edit freely, then paste everything below the line into Claude Design, **in the same project as D-1, D-2 and D-3** so it keeps the Navy direction. Attach:

- `docs/design/UI-BRIEF.md` (the brief; §5 is the Navy system, §9 names the timeline countdown as this page's memorable element);
- `docs/design/pilot/D-1-app-shell-auth/tokens.css`, plus D-3's `tokens.css` additions if D-3 is done;
- screenshots of the D-1 header frames and, if D-3 is done, its chosen component page.

Sources: `docs/PILOT-ROADMAP.md` §6.1 (student navigation) and §6.2 (`/home` 2F row), `docs/PILOT-DESIGN.md` §3.2 (why the timeline is in the pilot), §4.3 (completion dates) and §6.8 (the student's own items). Needed for build milestone **2F**.

---

I'm designing the student's home page for the Leaving Cert coursework app, in the same **2e "Navy"** direction you set in D-1 and D-2. The attached `UI-BRIEF.md` and `tokens.css` are the system. **Build on them; don't start a new palette.**

This pack is **the timeline**, at `/home`, and the **student navigation** that gets them to it. It's the product's central claim: one place where everything a student is assessed on lives, across every subject. A science student in this pilot typically does two or three of Biology, Chemistry, Physics and Business, each with its own teacher, stages and dates, and nothing else shows those together.

Please give me **two or three directions** for the list view at 390px first, rough. After I pick one, build every view and state below at **390px and 1140px**. Students use this mostly on phones, but also on laptops and tablets.

## Student navigation (not designed yet)

D-1's header has the app mark, a role switcher (only for people with more than one role) and the account links. A student also needs primary navigation:

- **Timeline** (`/home`, this page)
- **My components**: one entry per component the student has, labelled by subject ("Biology", "Business"), each opening that subject's component page (D-3)
- **Join a class** (`/join`)

Design where this lives at 390 and 1140 (a bottom bar, a row under the header, a menu, or something better) and how the current place is marked. It has to fit beside D-1's header, work with one thumb, and hold three or four subjects without scrolling sideways.

**Class status needs a home too.** Today `/home` lists the student's classes with "Pending approval" or "Approved" (D-1 drew those status eyebrows). When `/home` becomes the timeline, a student still needs to see that a class is waiting for approval. Propose where that goes: on the timeline, under My components, or elsewhere.

## What's on the timeline

Three kinds of item, across every class the student is **approved** in:

1. **Stage dates**: each component's stage due dates, set by the teacher (e.g. "Biology · Stage 4 Conducting the Experiment · 16 Oct").
2. **Teacher items with a date**: a teacher's own to-dos that carry a date (e.g. "Biology · Full draft in for feedback · 4 Dec").
3. **The student's own items**: things the student adds themselves, with a title, a date, a kind (**Test**, **Essay**, **Deadline**, **Other**) and optionally a class, which only labels the item with that subject. They can belong to no class at all ("Driving test").

Every item shows its **subject** where it has one, **days remaining** ("in 3 days", "today", "2 days ago"), and **what kind of item it is**. Stage date, teacher item and own item must be distinguishable **without colour alone**. Subjects use D-2's convention: a 4px edge bar in the subject colour, and the subject always also written. Biology `#0E6E7A`, Business `#6D3AA8`, Chemistry `#8E2846`, Physics `#4B535C`.

**The student's own items are private.** Teachers and school leaders never see them, and there's no visibility setting (a deliberate rule, unlike the log). Say so plainly where the student adds one, e.g. "Only you can see this." A student noting "Nana's birthday" must feel safe doing it.

## Views and actions

- **List**: chronological, from today onwards, grouped by week or month (your call). This is the default and the phone view.
- **Week**: seven days.
- **Month**: a month grid. On a phone, propose something that works rather than a squashed grid.
- **Switch view**: list / week / month. The chosen view and the date range must be in the URL (e.g. `?view=week&from=2026-10-12`), so back works and a link reopens the same view. Show previous and next.
- **Add my own item**: title, date, kind, class (optional). The form can be a sheet or a page; say which and why. It must close with Escape and return focus.
- **Edit and delete my own item.** Stage dates and teacher items aren't editable here; tapping one goes to that component's page (D-3). Deleting an own item needs a confirmation or an undo.

**The one memorable thing** (brief §9): the countdown to the next thing due. Spend the page's boldness there.

## Sample content

Placeholders for layout, except the completion dates, which are the real 2027 dates from the SEC briefs.

- **Completion dates:** Physics Friday 11 December 2026 · Biology 26 February 2027 · Business 12 March 2027 · Chemistry Friday 23 April 2027.
- **Today:** Monday 12 October 2026.
- **Student:** approved in 6A Biology and 6C Chemistry, pending in 6 Business.
- **Stage dates** (placeholders): Biology Stage 4 16 Oct 2026, Stage 5 20 Nov, Stage 6 22 Jan 2027 · Chemistry Stage 3 30 Oct 2026, Stage 4 4 Dec.
- **Teacher items** (placeholders): Biology "Full draft in for feedback" 4 Dec 2026.
- **Own items** (placeholders): Test "Irish oral mock" 14 Oct 2026 · Essay "English comparative essay" 21 Oct, no class (the pilot only has classes in its four subjects) · Deadline "CAO account" 1 Nov, no class · Test "Biology class test" 23 Oct, class 6A Biology · Other "Driving test" 19 Nov, no class.

## States to draw (each at both widths)

1. **Normal:** a busy fortnight in the list view, with all three item kinds and two subjects.
2. **Week view** and **month view** for the same data.
3. **No components yet:** the student is approved in a class, but no teacher has set a component up. The timeline still shows the student's own items, and says why there's nothing else.
4. **Pending classes only:** the student joined but hasn't been approved anywhere. No stage dates, own items still work, and the page says a teacher needs to approve them.
5. **Nothing in range:** a week or month with no items. Say so, and offer the next item's date or "Add my own item".
6. **Brand new student:** no classes approved, no own items. An empty state that invites the two next steps (join a class, add an item).
7. **Adding an item:** the form, with validation (title missing, date missing), at both widths.
8. **Editing and deleting** an own item, including the confirmation or undo.
9. **Today and overdue:** an item due today, and an own item two days past (not hidden, not alarming).
10. **The shared error panel** from D-1 for a failed load and a failed save.

## Rules that constrain you

- Build on `tokens.css` and the D-1/D-2 component language (field groups, 4px-edge message blocks, white cards with hairlines, subject edge bars).
- Light only. Body and inputs 16px; nothing under 12px. Dates "16 Oct 2026", weekday where it helps ("Fri 16 Oct").
- Sentence case. Buttons name the outcome. Nothing only on hover. At most one designed motion moment on the page.
- No colour-only meaning. Amber is reserved for pending work (it may mark "Pending approval"). Red is for errors, not for "due soon".
- These labels will become the automated tests' contract. They're proposals, so improve them in `NOTES.md` "Open questions": **Timeline**, **My components**, **Join a class**; **List**, **Week**, **Month**; **Add my own item**; kinds **Test**, **Essay**, **Deadline**, **Other**; **Edit**, **Delete**.
- Any behaviour change (a new view, a new field, items a teacher could see) goes in `NOTES.md` under "Open questions" first. The privacy rule above isn't open.

## What I want back

1. Two or three rough directions for the list view at 390px, and for the student navigation.
2. After I choose: every view and state above, both widths, plus the error panel.
3. `tokens.css` additions only (e.g. item-kind markers), with measured contrast.
4. `NOTES.md` on the brief's §8 template, with exact copy, and your answer on where class approval status lives.
5. Sleek and modern, and the page a student opens first on the bus. It should feel like theirs, not like a school system.
