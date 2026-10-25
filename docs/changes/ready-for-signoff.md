# Ready for sign-off (ready-for-signoff)

## What was added

A student marks a checkpoint "Ready for sign-off" with a note and a link to their work; the teacher sees who is waiting (oldest first), opens the student's page, and answers Accept (which signs off) or Not yet with a note. Answered requests are kept as history. Pack D-10 restyled the teacher's side: the request and the answer form sit side by side on the row, and a right-hand drawer holds the full history.

## Files changed

| Area | What changed and why |
|---|---|
| Backend (`components`, `progress`, `shared`) | Document links and sign-off requests stored as append-only history; the Ready state (never "behind"); answer endpoint that signs off in the same transaction; waiting count for the class list |
| `components/app/request-review.tsx` | `RequestBlock` (the student's ask and work link) and `AnswerForm` (note, Accept, Not yet) |
| `components/app/request-drawer.tsx`, `components/ui/drawer.tsx` | History drawer (shadcn Drawer on Base UI) with the same answer controls while a request is open |
| `components/app/use-answer.ts` | Posts the answer; keeps `recent` for the answered strip; maps API errors to the right message |
| `components/app/student-checkpoints.tsx` | One `StageRow` per checkpoint owning its draft note and drawer state |
| `components/ui/{alert,label,separator,textarea}.tsx` | shadcn components restyled to `--app-*` tokens |
| `lib/app/ready.ts` | Copy, accessible names, and `CHECKPOINT_STATE` (state to word and colour) |
| `app/globals.css` | D-10 tokens; `.app-theme { position: relative }` for the drawer overlay on iOS |

## Patterns worth knowing

- **Portal into the theme.** Base UI portals to `<body>` by default, outside `.app-theme`, which would drop the navy/amber tokens and the focus ring. `DrawerContent` passes `.app-theme` as the portal container.
- **Derived state, one effect.** `recent` hides the form for a request just answered. An effect clears it when the page has shown the request closed and then a request appears again, so a second ask is never hidden by the first answer.
- **Await before you announce.** Undo waits for the revoke to land before dropping the answered strip. The API revokes the sign-off but does not reopen the request.
- **Functional state update.** `setNote((now) => now === sent ? "" : now)` clears only what was sent, so typing during the request is not lost.

## Take forward

- The drawer's trigger only exists once there is at least one answer; a first request is answered on the row.
- A Not yet cannot be undone (no API for it).
- Keep `body` styles out of `globals.css`: the live BiPi schedule shares it.
