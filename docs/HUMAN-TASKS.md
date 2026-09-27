# Human tasks

Everything that needs Tim (or someone Tim names) and isn't code. Tick as you go. Built from `docs/PILOT-ROADMAP.md` and `docs/HANDOFF.md` on 20 Sep 2026. When something is done, also record it in `docs/HANDOFF.md`.

## A. Before asking for the Phase 3 plan

- [x] **Q3:** should a teacher see that a student hid an entry that used to be visible? **Yes** (20 Sep 2026). Nothing else blocks the Phase 3 plan.

## B. Finish Gate P2

### Content review (Tim)
- [ ] Read `V2__science_templates.sql` (Biology, Chemistry, Physics) against the PDFs. Checklist: plan 2B Task 5 Step 3.
- [ ] Read `V3__business_template.sql` against the PDFs. Checklist: plan 2C Task 4 Step 2.
- [ ] Read `V4__briefs_2027.sql`: each brief's SEC code, completion date, formatting rules, topic and limits.
- [ ] Decide whether the Physics completion date of 11 Dec 2026 is right for a 6th-year pilot (Q9).
- [ ] Decide whether the checkpoint wording is fit to show teachers (Q1).
- [ ] Record the review in `docs/HANDOFF.md` with the date and what was checked.

### Other reviewers
- [ ] Katelyn reviews the Biology checkpoints (R4).
- [ ] Name the Chemistry reviewer (Q1).
- [ ] Name the Physics reviewer (Q1).
- [ ] Name the Business reviewer (Q1).
- [ ] Each named reviewer checks their subject's checkpoints.

### Design packs (Claude Design)
- [ ] D-3 student component page. Prompt: `docs/design/prompts/D-3-student-component.md`.
- [ ] D-4 timeline. Prompt: `docs/design/prompts/D-4-timeline.md`.
- [ ] D-5 teacher component setup. Prompt: `docs/design/prompts/D-5-teacher-component-setup.md`.
- [ ] Save each pack under `docs/design/pilot/` so the skipped restyle tasks (2E Task 8, 2F Task 7, 2D Task 10) can run.

### Open Phase 2 questions (plans use defaults, so none block)
- [x] Q-P2-A: one verbatim sentence per stage. **Yes** (20 Sep 2026).
- [x] Q-P2-E: show the SEC completion date on the student timeline? **Yes**, as its own item (20 Sep 2026). Needs a 2F follow-up.
- [x] Q-P2-F: fill `source_url`? **Yes** (20 Sep 2026).
- [ ] Q-P2-F: supply the examinations.ie URL for each of the four 2027 briefs (Biology, Chemistry, Physics, Business).
- [ ] Confirm or change plan decisions P2-1 to P2-52 (each plan's "Decisions this plan takes" table).

## C. Finish Gate P1 (Phase 1 leftovers)

- [ ] Walk the journey by hand on the Vercel Preview against Render (see `ARCHITECTURE.md` §9.1).
- [ ] Keyboard-only run of the whole journey on a laptop.
- [ ] Review the restyled pages.
- [ ] Set the school short name on any existing Render school: `operator set-school-short-name --roll=… --short-name=…`.
- [ ] Redeploy Render while holding a live session cookie and confirm `/auth/me` still answers.
- [ ] Confirm Katelyn's `main` Vercel project 404s `/login` and `/api/v1/health`.

## D. Calendar-bound (long lead time, start now)

- [ ] **Q9:** which cohort, 6th years now, 5th years spring 2027, or both?
- [ ] **H2:** which school is the pilot, and who are the teachers and the school leader?
- [ ] **H4:** a product name for the privacy notice and page titles (placeholder "Leaving Cert Practical").
- [ ] **Q5 / R3:** decide who drafts the data processing agreement, privacy notice and DPIA, and get it started.
- [ ] **Q4:** how long is pilot data kept?
- [ ] Confirm R9 (7-day idle session) with the pilot school, since staffroom PCs are shared.
- [ ] Add the Coursework Rules and Procedures PDF to `docs/newDevelopement/subjectDocs/` (needed for Phase 6, Q6).

## E. Later phases (not needed for the Phase 3 plan)

- [ ] Q2: leader view on-track threshold (80% is a placeholder). Blocks the Phase 5 plan.
- [ ] Q6: check the AI-use fields against the Coursework Rules and Procedures. Blocks the Phase 6 plan.
- [ ] Q7: if the 2028 briefs are late, does a 5th-year pilot wait?

## F. Before go-live

- [ ] Delete the gate-check data: `Gate Check School` ×2, roll `00009Z`, users `gate.teacher*` and `gate.student.c`.
- [ ] Upgrade the Render database (point-in-time recovery) before the first real account.
- [ ] R1: a restore actually tested into a scratch database.
- [ ] R3 signed.
- [ ] R4 done for every subject going live.
- [ ] R6 onboarding runbook dry-run with Tim as the teacher.
- [ ] `APP_ENABLED=true` in Vercel Production and the pilot school's accounts created.

## G. Optional, any time

- [ ] R9: fix the live BiPi report-rules card on a small branch off `main` (allowed formatting; formulae don't count toward images). Then merge `main` into `pilotMain`.
