# Student page redesign — design notes

Page: `/teach/classes/[id]/students/[studentId]` (the teacher's view of one student: checkpoints, then the log).
Chosen 10 Nov 2026: direction **D, checkpoints first**. It takes the stage drawer's design B (white cards on the grey tray, the navy card, the cream note) to this page. This is the first step of the `app-polish` idea in `docs/BACKLOG.md`.

`design/` holds plain HTML frames. Open them in a browser; each has a PNG beside it. `blocks.js` fills every frame with Tim Mc Sweeney's real data from 6th Year Biology (10 Nov 2026), and `mock.css` maps every colour to an existing `--app-*` token.

| File | What it is |
|---|---|
| `d-checkpoints-first.html` | **D, chosen**, laptop (1440) |
| `d-phone.html` | **D, chosen**, phone (375) |
| `a-one-column.html` | A: the waiting checkpoint pulled to the top, a list of one-line checkpoints, the full log with filter chips. Reference only |
| `b-two-columns.html` | B: checkpoints in a left column, the waiting checkpoint and log on the right. Rejected: it pushed the checkpoints to the side |
| `c-phone.html` | A on a phone. Reference only |

## Why D

Tim, 10 Nov 2026: the checkpoints and their actions matter much more than the log. B put the checkpoints in a side column, which was no good. A was close, but the log still had as much weight as the checkpoints.

## What D is

- **Header card:** initials square, name, class, when the last log entry was, and Open Tim's work.
- **Navy card:** "Up to date · 3 of 6 signed off", plus a six-segment bar (green signed off, amber waiting, track not due) and the counts.
- **One card per stage, on a timeline rail, in stage order.**
  - A circle on the rail: green with a tick when signed off, amber with the number when waiting, a grey outline with the number otherwise. The rail is green through the signed-off stages.
  - The actions are always visible:
    - Signed off: the green pill, History (n) and Revoke.
    - Not due: Sign off.
  - The teacher's last note shows on its stage as a small cream chip.
  - The waiting stage is open in place: an amber "Waiting for you" strip, the checkpoint in large text, the request block (request tint) and the answer form.
- **Log as a footer:** the latest three entries, one line each (kind chip, title, one line of detail), then "Show all 6 entries".

## Only new value

`#E4C9B3`, the waiting card's border, is not a token yet. `#9CC9B2`, the rail's green between signed-off stages, is not either. Every other colour is an existing `--app-*` token.
