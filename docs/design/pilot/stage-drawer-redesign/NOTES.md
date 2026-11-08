# Stage drawer redesign — design notes

The design is the "Stage Drawer Redesign" Claude Design canvas: https://claude.ai/artifact/4pQ2htktpxPRsSyL2PWX3u (private to Tim). Chosen 8 Nov 2026: direction **B**. Intent: `docs/intent/stage-drawer-redesign.md`.

`design/` holds the canvas's source files as they were when B was chosen. They are Design Component files (`.dc.html`): they need the canvas's runtime to render, so open the canvas link to see them. Read the files for exact colours, sizes and copy.

| File | What it is |
|---|---|
| `NavyCheckpoint.dc.html` | **B, the chosen drawer**, Stage 3 at rest |
| `States.dc.html` | B's states: no note, reading the note, editing it (unsaved), the checkpoint with students waiting |
| `ItemInDrawer.dc.html` | B's item view: who has ticked it |
| `ItemEditing.dc.html` | The item view after pressing Edit |
| `Main.dc.html`, `TwoZones.dc.html` | Directions A and C, reference only |
| `canvas.json` | The canvas's layout |

The canvas uses sample student names and a sample "3 waiting" count. Everything else is from Tim's class (31 students, Stage 3 and Stage 4, Tim's items and note).

## Where the build differs from the canvas

- **Close is a text button**, not B's ✕ icon. `components/ui/drawer.tsx` says every drawer has a text Close (no icon-only controls).
- **The item view keeps the stage's header** (number, meta, name, Close) above "‹ Back to Stage N", as the calendar view does. The canvas draws the item view with its own header. Keeping the stage's header means the dialog stays named by the stage and Close is in one place.

## New tokens

Added to `frontend/app/globals.css` beside the other `--app-*` colours. Contrast is measured with the WCAG relative-luminance formula.

| Token | Value | Used for | Contrast |
|---|---|---|---|
| `--app-tray` | `#F1F3F6` | The grey behind the sheet's cards | ink 16.6:1, muted 4.86:1 on it |
| `--app-approved-on-accent` | `#7FD1A8` | "Signed off": the number and the bar's segment, on the navy checkpoint card | 6.13:1 on `--app-accent` |
| `--app-attention-on-accent` | `#F2B15C` | "Waiting": the bar's segment on the navy card (a bar segment, never text) | 5.9:1 on `--app-accent` |
| `--app-accent-track` | `#4A6396` | The rest of the bar on the navy card | 3.29:1 against `--app-approved-on-accent`, 3.19:1 against `--app-attention-on-accent` |
| `--app-note-ground` | `#FBF4E6` | The cream note card | ink 16.9:1, navy link 10.2:1 on it |
| `--app-note-line` | `#EBDDC2` | The note card's border (decorative) | — |
| `--app-note-muted` | `#5C5340` | Secondary text on the note card | 6.93:1 on `--app-note-ground` |

Reused rather than added: `--app-on-accent-muted` (`#C3CDE1`, 6.96:1 on navy) for the "Checkpoint" label and the counts' words on the navy card, and `--app-approved-tint` / `--app-inset` for the tick pills.
