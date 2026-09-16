# Design pack prompts

One file per pack (or pair of packs), ready to paste into Claude Design alongside `../UI-BRIEF.md`. Each is assembled from the same sources; when writing the next one, pull from:

| Source | What it gives the prompt |
|---|---|
| `docs/PILOT-ROADMAP.md` §6.1 | Navigation: what's in the header, the primary nav per role, tabs inside a class or component |
| `docs/PILOT-ROADMAP.md` §6.2 | The page inventory: for every route, what it shows, its actions, and every state it must handle |
| `docs/PILOT-ROADMAP.md` §6.3 | Which packs exist (D-1 to D-9) and which phase needs each |
| `docs/PILOT-DESIGN.md` §8 | How each flow works from the user's side (joining, setting up a component, what the student sees, what "behind" means, the log, the checker) |
| `docs/PILOT-DESIGN.md` §6 | The data behind a page, when the prompt needs to name fields |
| `frontend/components/app/*.tsx` and `*.spec.tsx` | Built pages: the exact copy on screen today and the control names the tests assert |
| `frontend/components/bipi/` and the live schedule | The BiPi components D-3 reuses (stage cards, crosswalk, rules, marks) |
| `docs/newDevelopement/subjectDocs/` | SEC and NCCA wording that must be quoted, never paraphrased |

| Pack | Pages | Prompt |
|---|---|---|
| D-1, D-2 | App shell, auth pages, teacher class pages | `D-1-D-2-app-shell-auth-teacher-classes.md` |
| D-3 | Student component page | to write at Phase 2E, from roadmap §6.2 and design §8.3 |
| D-4 | Timeline (`/home` list, week, month, add item) | Phase 2F, design §3.2 and §6.8 |
| D-5 | Teacher component setup | Phase 2D, design §8.2 |
| D-6 | The log | Phase 3, design §8.5 and §6.6 |
| D-7 | Progress grid | Phase 4, design §8.4 |
| D-8 | School overview | Phase 5 |
| D-9 | Writing tools | Phase 6, design §8.6 and §6.7 |
