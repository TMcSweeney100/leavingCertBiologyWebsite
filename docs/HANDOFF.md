# Handoff — coursework pilot

Rewritten at the end of every session: where things stand, what's half-done, what's waiting on a human. Anything permanent goes elsewhere (`docs/ARCHITECTURE.md` for how the code and hosts work, `docs/PILOT-ROADMAP.md` §2–§3 for decisions, the plans for per-task deviations). The live BiPi site's final handoff is archived at `docs/archive/bipi-site/HANDOFF.md`; its open items (Katelyn's copy sign-offs, print page count) still stand.

**Standing rule (16 Sep 2026):** `docs/ARCHITECTURE.md` describes the code as built. When a session changes anything it describes (a filter, a pattern, an env var, a file's job), it fixes that section in the same commit, and at the end of the session checks it for anything else the session made false. A wrong map is worse than none.

## Where things are (17 Sep 2026: 2A built)

- **2A Template schema is built** (`pilot/2a-template-schema`, branched from `pilot/design-prompts-d3-d5`): `V6__templates_and_briefs.sql` (`component_template` → `template_version` → stages, sections, mark bands, checkpoints, prompts, and `annual_brief`/`brief_rule`) and `V7__template_guards.sql` (triggers that freeze a PUBLISHED or RETIRED version's structure while still taking text corrections, and the matching brief guard). `make verify` is green: 201 backend tests (146 before 2A, plus four new classes: `TemplateSchemaTest`, `ContentResetPolicyTest`, `TemplateStructureGuardTest`, `BriefGuardTest`). No app-facing UI in this milestone — it's schema and triggers only, so nothing needed a design placeholder.
- **All six Phase 2 plans are written** (2A–2F, in `docs/superpowers/plans/2026-09-16-pilot-2*.md`, listed at the top of the roadmap). Continue with 2B next. The four brief PDFs Tim added are still untracked; 2B Task 1 renames and commits them.
- **The content and SQL in the plans were checked before they were written down.** On a throwaway Postgres 18 (not the dev database): migrations V1–V5 as built, then the planned V6–V10, the three content migrations and the timeline query. Every one of the 434 quoted strings in 2B/2C was found on the PDF page its `source_ref` names. The triggers refused what they should and allowed text corrections.
- **Findings that changed the plan from the design.** The three science guidelines aren't word-for-word identical: punctuation differs, Chemistry and Physics say "school laboratory", and their Stage 4 authentication sentence differs. So quotes are per subject and only structure is shared (P2-9). The Physics guideline heads Stage 1 "Initial Response to the Brief"; the plans use the briefs' stage names (P2-10). Neither the SEC nor the NCCA says which stage each report section is written during (Q-P2-B). The BiPi components need teacher-written fields the template doesn't have, so 2E builds app components (Q-P2-C).
- **Plan decisions P2-1 to P2-52 are proposed, not confirmed**, except three Tim confirmed on 16 Sep 2026: no section-to-stage mapping (Q-P2-B, P2-13), new app components for the student page (Q-P2-C, P2-33, and §8.2's 2E row reworded), one component per class (Q-P2-D, P2-23). Three questions are still open: roadmap §3 "Phase 2 questions". The plans are written to a stated default for each, so building doesn't wait on them.

- **Phase 1 is built, restyled and merged.** 1A–1D are all in `pilotMain`: PRs #3, #4 and #5. The D-1/D-2 restyle (`pilot/1d-restyle`) was merged at `78ef007` on 16 Sep 2026 without a PR page: this machine has no `gh`, so it was merged locally at Tim's request.
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

- **After deploying 1D to Render, set the short name on any school that already exists:** `operator set-school-short-name --roll=… --short-name=…`. Without it the header shows the full name.
- **Walk Gate P1 on the Vercel Preview**, which also covers Gate 1C's journey on the real host.
- **Phase 2 questions still open: Q-P2-A (stage description sentences), Q-P2-E (completion dates on the timeline), Q-P2-F (brief URLs)** (roadmap §3).
- **Confirm or change plan decisions P2-1 to P2-52** (each plan's decisions table).
- **Design packs D-3, D-4, D-5**: prompts written (`docs/design/prompts/`), packs not back. D-5 is needed first (2D Task 10). The pages are built working-first either way.
- **The Coursework Rules and Procedures** is still not in `subjectDocs/`. Phase 2 doesn't need it; Phase 6 does (Q6).
- **Content reviews for Gate P2:** Tim reads V2–V4 against the PDFs (checklists in plans 2B Task 5 and 2C Task 4); Katelyn reviews the Biology checkpoints; Q1 names the other three reviewers.
- **Carried over from earlier gates:** redeploy Render while holding a live session cookie and confirm `/auth/me` still answers (passed locally, not yet on Render); confirm Katelyn's `main` project 404s `/login` and `/api/v1/health`; **delete the gate-check data before any real onboarding** (`Gate Check School` ×2, roll `00009Z`, users `gate.teacher*`, `gate.student.c`; `gate.teacher`'s password is `gate-check-password`); upgrade the Render database before the first real account; roadmap §9 R3–R5 are calendar-bound.

## Half-done

Nothing in code.
