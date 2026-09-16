# Handoff — coursework pilot

Rewritten at the end of every session: where things stand, what's half-done, what's waiting on a human. Anything permanent goes elsewhere (`docs/ARCHITECTURE.md` for how the code and hosts work, `docs/PILOT-ROADMAP.md` §2–§3 for decisions, the plans for per-task deviations). The live BiPi site's final handoff is archived at `docs/archive/bipi-site/HANDOFF.md`; its open items (Katelyn's copy sign-offs, print page count) still stand.

**Standing rule (16 Sep 2026):** `docs/ARCHITECTURE.md` describes the code as built. When a session changes anything it describes (a filter, a pattern, an env var, a file's job), it fixes that section in the same commit, and at the end of the session checks it for anything else the session made false. A wrong map is worse than none.

## Where things are (16 Sep 2026)

- **Phase 1 is built.** 1A and 1B are merged and live on `pilotMain` (PRs #3, #4). **1C and 1D are built but unmerged:** `pilot/1c-classes-and-enrolment` (branched from `pilotMain` at `3d9dbcb`) and `pilot/1d-app-shell-and-first-journey` (stacked on 1C at `5f11ab6`). Both pushed to `origin`. `make verify` and `make e2e` are green on 1D; axe reports no WCAG 2.2 AA violations on any page of the journey.
- **Docs written 16 Sep 2026:** `docs/ARCHITECTURE.md` (the code as built) and `docs/design/UI-BRIEF.md`, `UI-STANDARDS.md`, `UI-CHECKLIST.md` (the front-end source of truth, merged from the `frontend-design`, `ui-ux-pro-max` and Vercel web-interface-guidelines skills). Decisions taken there: the app shares BiPi's type, neutrals and radii but has its own accent; light only; 16px body. Root `CLAUDE.md`, roadmap §0, §4.5, §6.3 and the 1D plan's Task 11 point at them.
- **1D Task 11 (restyle from design packs D-1 and D-2) is not started.** `docs/design/pilot/` doesn't exist; the packs follow in a few days. Every app page is plain semantic HTML with the shadcn `Button`; every component spec queries by role and name, so the restyle has a contract to keep.
- **1D's deviations from its plan** are in `docs/ARCHITECTURE.md` §10 and the commit messages on the branch (`git log 5f11ab6..pilot/1d-app-shell-and-first-journey`).

## Gate P1 — walked locally, 16 Sep 2026

- [x] `make verify` green — 151 backend tests; 85 `node:test`, 75 Vitest specs, lint, types, build.
- [x] `make e2e` green on `laptop` and `phone`: the whole roadmap §8.1 journey plus a keyboard-only sign-in; axe clean on every page visited.
- [ ] The same journey by hand on the Vercel Preview against Render (operator commands from Render's Shell; see `ARCHITECTURE.md` §9.1 for the Starter-instance trick).
- [ ] Keyboard-only run of the whole journey by hand on a laptop.
- [ ] Tim has reviewed the pages.

Gates 1A and 1B passed on the real host on 16 Sep 2026; Gate 1C passed locally the same day (all nine checkpoints, not yet walked on the preview). The records are in the roadmap's status board; what's still open from them is listed below.

## Waiting on a human

- **Open the 1C PR** (`pilot/1c-classes-and-enrolment` → `pilotMain`, "Pilot 1C: classes and enrolment"), then **the 1D PR** (`pilot/1d-app-shell-and-first-journey` → `pilotMain`, "Pilot 1D: app shell and first journey", body per the 1D plan's Task 12 Step 4, noting the restyle is pending).
- **Walk Gate P1 on the Vercel Preview**, which also covers Gate 1C's journey on the real host.
- **Design packs D-1 and D-2** into `docs/design/pilot/<pack>/` on the `UI-BRIEF.md` §8 template, then Task 11.
- **Phase 2 preconditions (roadmap §8.2):** the four final 2027 briefs and the Coursework Rules and Procedures in `docs/newDevelopement/subjectDocs/`; design packs D-3, D-4, D-5 requested. **The 2A plan can't be written until those documents are in the repo.**
- **Carried over from earlier gates:** redeploy Render while holding a live session cookie and confirm `/auth/me` still answers (passed locally, not yet on Render); confirm Katelyn's `main` project 404s `/login` and `/api/v1/health`; **delete the gate-check data before any real onboarding** (`Gate Check School` ×2, roll `00009Z`, users `gate.teacher*`, `gate.student.c`; `gate.teacher`'s password is `gate-check-password`); upgrade the Render database before the first real account; roadmap §9 R3–R5 are calendar-bound.

## Half-done

Nothing in code.
