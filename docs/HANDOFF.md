# Handoff — coursework pilot

Rewritten at the end of every session: where things stand, what's half-done, what's waiting on a human. Anything permanent goes elsewhere (`docs/ARCHITECTURE.md` for how the code and hosts work, `docs/PILOT-ROADMAP.md` §2–§3 for decisions, the plans for per-task deviations). The live BiPi site's final handoff is archived at `docs/archive/bipi-site/HANDOFF.md`; its open items (Katelyn's copy sign-offs, print page count) still stand.

**Standing rule (16 Sep 2026):** `docs/ARCHITECTURE.md` describes the code as built. When a session changes anything it describes (a filter, a pattern, an env var, a file's job), it fixes that section in the same commit, and at the end of the session checks it for anything else the session made false. A wrong map is worse than none.

## Where things are (16 Sep 2026, end of the D-1/D-2 restyle)

- **Phase 1 is built and restyled.** 1A and 1B are merged and live on `pilotMain` (PRs #3, #4). **1C and 1D are built but unmerged:** `pilot/1c-classes-and-enrolment` (branched from `pilotMain` at `3d9dbcb`) and `pilot/1d-app-shell-and-first-journey` (stacked on 1C at `5f11ab6`). The restyle commits below are on 1D and **not pushed yet**.
- **1D Task 11 is done.** Design packs D-1 and D-2 are in `docs/design/pilot/`. Every app page now uses the pack designs. `make verify` is green (155 backend tests; 92 `node:test`, 90 Vitest specs, lint, types, build), and `make e2e` is green on `laptop` and `phone`, with axe clean on every page in the journey, including the inline reset-code panel.
- **The app no longer uses the BiPi look (roadmap R25).** Tim chose direction 2e "Navy": navy `#1F3A6E` accent, amber `#A04806` only for pending work, cool graphite neutrals, 10/8/6px radii. Only the typefaces are still shared with BiPi. `UI-BRIEF.md` §5 is rewritten; `--app-*` tokens apply through `.app-theme`; `--bipi-*` and the live schedule are untouched.
- **Decisions Tim confirmed this session:** R26, a school short name for the header (`school.short_name`, migration `V5`, `create-school --short-name`, `set-school-short-name`, `Me.roles[].schoolShortName`); R27, class-page additions (Turn joining off and Remove confirm in place, copy join code with "Copied", "asked … ago", the reset code inline in its row with Hide code and a can't-be-undone warning); R28, "Leaving Cert Practical" and the NWETSS crest as placeholders until H4. Each pack's `NOTES.md` ends with the answers to its open questions.
- **`make e2e` hardening:** `scripts/e2e.sh` refuses to start if :8081 or :3100 is taken, and kills whatever listens there at teardown. An orphaned `next-server` from an earlier run had been answering the readiness check. The axe helper waits for running animations to settle.

## Not done, and worth a follow-up

- **Two `UI-CHECKLIST.md` items were already missing and are still open.** Submit buttons don't change to a present-participle label while busy ("Signing in…"; they only disable), and a failed submit doesn't move focus to the alert. Both need a spec each.
- **Sign in stays enabled during a lockout.** D-1 draws it disabled, but the API returns the wait only as text in `detail` (roadmap §6.2 `/login` row). Disabling it would need a machine-readable retry time from `LoginThrottle`.
- **On phones, student rows wrap their buttons under the name.** "Issue reset code" plus "Remove" is wider than the space D-2 leaves beside a name at 390px. Pending rows fit as drawn.

## Gate P1 — walked locally, 16 Sep 2026

- [x] `make verify` green — 151 backend tests; 85 `node:test`, 75 Vitest specs, lint, types, build.
- [x] `make e2e` green on `laptop` and `phone`: the whole roadmap §8.1 journey plus a keyboard-only sign-in; axe clean on every page visited.
- [ ] The same journey by hand on the Vercel Preview against Render (operator commands from Render's Shell; see `ARCHITECTURE.md` §9.1 for the Starter-instance trick).
- [ ] Keyboard-only run of the whole journey by hand on a laptop.
- [ ] Tim has reviewed the pages (now restyled; the D-1/D-2 frames are in `docs/design/pilot/`).

Gates 1A and 1B passed on the real host on 16 Sep 2026; Gate 1C passed locally the same day (all nine checkpoints, not yet walked on the preview). The records are in the roadmap's status board; what's still open from them is listed below.

## Waiting on a human

- **Push 1D and open the PRs:** the 1C PR (`pilot/1c-classes-and-enrolment` → `pilotMain`, "Pilot 1C: classes and enrolment"), then the 1D PR (`pilot/1d-app-shell-and-first-journey` → `pilotMain`, "Pilot 1D: app shell and first journey", body per the 1D plan's Task 12 Step 4; the restyle is included).
- **After deploying 1D to Render, set the short name on any school that already exists:** `operator set-school-short-name --roll=… --short-name=…`. Without it the header shows the full name.
- **Walk Gate P1 on the Vercel Preview**, which also covers Gate 1C's journey on the real host.
- **Phase 2 preconditions (roadmap §8.2):** the four final 2027 briefs and the Coursework Rules and Procedures in `docs/newDevelopement/subjectDocs/`; design packs D-3, D-4, D-5 requested. **The 2A plan can't be written until those documents are in the repo.**
- **Carried over from earlier gates:** redeploy Render while holding a live session cookie and confirm `/auth/me` still answers (passed locally, not yet on Render); confirm Katelyn's `main` project 404s `/login` and `/api/v1/health`; **delete the gate-check data before any real onboarding** (`Gate Check School` ×2, roll `00009Z`, users `gate.teacher*`, `gate.student.c`; `gate.teacher`'s password is `gate-check-password`); upgrade the Render database before the first real account; roadmap §9 R3–R5 are calendar-bound.

## Half-done

Nothing in code.
