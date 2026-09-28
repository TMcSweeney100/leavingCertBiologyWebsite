# Pilot 3B: restyle the log from pack D-6

Branch `pilot/3b-restyle-d6` from `pilotMain`. Pack: `docs/design/pilot/D-6-log/` (its `NOTES.md` is the spec). Frontend only: no API or schema change.

## Decisions made

- **Scope:** restyle plus frontend-only behaviour. Undo on Hide/Show is not built (it needs a backend decision on `hiddenAt`, pack question 4).
- **Teacher wording:** the pack's "Made private by Aoife on 14 Oct 2026" / "Private entry" / "Aoife has shared 3 with you".
- **Revise route:** new `/components/[id]/log/[entryId]/revise`; the entry page becomes read-only.
- **Defaults (not asked):** Link and Date accessed stay hidden for non-online types unless a link is already typed; note titles wrap with `line-clamp-2` and the 80-character cut stays for accessible names; a note's h1 is its date; full `FIELD_LABELS` in the teacher `<dl>`; per-type Title messages not built; dates start at today.

## Concepts in play

- **Tokens as additions:** `--app-kind-*`, `--app-private-ground`, mapped to Tailwind colours in `globals.css`, as D-3 did with `--app-done`.
- **`role="radiogroup"` segmented control and `role="switch"`:** native semantics for a choice and an on/off setting; `log-entry-form.tsx` already uses radios.
- **`<details>`/`<summary>` disclosure:** no JS state; `teacher-log.tsx` already uses it.
- **Unsaved-changes guard:** `beforeunload` plus a confirm on Cancel.

## Tasks (test first, `make verify` before each commit)

1. Tokens in `globals.css`; `KindChip` and `readerWord` helper in `lib/app/log.ts`.
2. `LogVisibilityToggle`: title in the accessible name.
3. `LogList`: ledger card, reader column, new empty state, rule line.
4. `LogEntryForm`: segmented kind control, switch, counters, groups, guard; revise mode gets the "Saving adds revision N" line and no switch.
5. Entry page read-only (h1, history as `<details>`, aside) and the `/revise` page.
6. `TeacherLog`: ledger, new wording, count, empty states; student page header.
7. Update `phase3.e2e.ts`, `ARCHITECTURE.md`, roadmap, `HANDOFF.md`; write `docs/changes/3b-restyle-d6.md`.
