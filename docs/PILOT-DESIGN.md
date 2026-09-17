# Leaving Cert Coursework Pilot — Design

**Date:** 14 September 2026
**Status:** Draft for review.
- §2 records decisions already made.
- §3 was presented in conversation and is waiting on review.
- Everything from §4 on is proposed design that hasn't been discussed yet.

**Builds on:** `docs/newDevelopement/FUNCTIONAL-SPEC.md`, `TECHNICAL-SPEC.md` and `LC-AAC-PROJECT-CONTEXT.md`. Where this file disagrees with them, this file wins for the pilot.
**Sources:** `docs/newDevelopement/subjectDocs/`, plus the final 2027 SEC briefs listed in §4.1.
**Next step once approved:** one implementation plan per phase in §3, starting with Phase 1.

---

## 1. What this is

The functional spec describes the whole product: around 70 requirements, three roles, two ways to pay and two sign-in providers. This document cuts that down to one release that can be piloted in one school. It also settles the problems found in the spec review that change the database.

**The pilot:** one school, with 5th year classes in Biology, Chemistry, Physics and Business. It starts when the SEC publishes the 2028 briefs in Term 2 of 2027.

**Revision in progress — earliest possible start, 6th years possibly included.** The intent is now to get this in front of a school as soon as it can be, rather than waiting for the 2028 briefs, and to include 6th years if that helps. The build is expected to be heavily AI-assisted, which should shorten development. This changes D3 and §7.4, and raises the question in §1.1 below, which has to be answered before the phase order is worth anything.

### 1.1 Which cohort, and when — DECISION NEEDED (Q9)

The two cohorts are on completely different clocks, and it changes what the pilot can prove.

**6th years (exams 2027).** Their briefs are already final and published (§4.1). There is nothing to wait for — a pilot could start within weeks. But their completion dates are close or past:

| Subject | 2027 completion date | Runway from Oct 2026 |
|---|---|---|
| Physics | 11 December 2026 | ~10 weeks |
| Biology | 26 February 2027 | ~5 months |
| Business | 12 March 2027 | ~5 months |
| Chemistry | 23 April 2027 | ~7 months |

**5th years (exams 2028).** Full runway, and the log starts the week the brief arrives — but nothing can begin until the SEC publishes in Term 2 of 2027.

**What each cohort can and can't prove, against the three criteria in §1:**

| | 6th years, from autumn 2026 | 5th years, from spring 2027 |
|---|---|---|
| School would pay | **Stronger.** The leader view under real deadline pressure is exactly when it matters. | Weaker — nothing is near a deadline for months. |
| Teachers rely on the grid | **Stronger.** Chasing is a live problem for them now. | Weaker early on. |
| Students keep logging | **Weaker.** A log started mid-project can't show a full trail, so the proof-of-work claim is untested. | **Stronger.** This is the only way to test it properly. |

They test different things, which is an argument for **both**: 6th years now for the teacher and leader case, 5th years from spring for the log. That costs nothing extra in build — the same phases serve both — but it does mean loading the 2027 briefs as live content, not just reference data (§7.4).

**Caution on the AI-assisted build.** It will speed up the code: scaffolding, CRUD, migrations, tests, the proxy. It will not speed up the things actually on the critical path — authoring four templates and verifying every line against the source documents, getting four teachers to review the checkpoints (Q1), the data processing agreement and privacy notice (Q5), and choosing and standing up EU hosting. Those are calendar-bound, not typing-bound. If the start date moves earlier, it is those items that decide whether it is achievable, not the development time.

**What the pilot has to show:**

1. **The school would pay.** A deputy principal or principal can see where every class stands, and wants that view.
2. **Teachers rely on it.** They use the progress grid to find who's behind instead of asking around.
3. **Students keep logging.** The log builds a dated paper trail that the student and the teacher can both look back on.

## 2. Decisions made

| # | Question | Decision |
|---|---|---|
| D1 | Repository | Same repo: add `backend/` beside `frontend/`, following `contentCreater`'s layout. *Recommended in review, not yet explicitly confirmed (Q8).* |
| D2 | First release | The coursework core, **plus the cross-subject timeline** (§3.2). Pushed deadlines and revision recommendations still come later. |
| D3 | Pilot timing | ~~Spring 2027, with 5th years, from the week the 2028 briefs arrive.~~ **Under revision** — see §1.1. Earliest possible start now preferred, with 6th years possibly included. |
| D4 | Subjects | Biology, Chemistry, Physics and Business. |
| D5 | Success criteria | All three in §1. That puts a school leader view in the pilot. |
| D6 | Sign-in | Class join codes plus a username and password. No school Google or Microsoft sign-in in the pilot. |
| D7 | Log edits | Every edit is kept as a new version. Nothing is overwritten. |
| D8 | Writing tools | All three: AI-use record, reference builder, word/format checker. |
| D9 | Checklist source | The national template holds only what the NCCA and SEC wrote. Where the guidelines have students share work with the teacher, that becomes a teacher sign-off. Teachers add their own items for their class. |
| D10 | Architecture | A Spring Boot API behind a same-origin Next.js proxy, using session cookies. |

## 3. Scope and build order

The pilot is built in six phases, each with its own implementation plan, like Phase A and Phase B. They're ordered by what the pilot needs on day one. Students start logging the week the brief arrives, and the log only proves something if it starts then.

| Phase | Delivers |
|---|---|
| **1. Foundation** | Spring Boot API, Postgres and the Next.js proxy, deployed to EU hosting straight away. The operator sets up the school, teacher accounts and the school-leader role. Teachers create classes with join codes, students sign up and join, and teachers approve them and reset passwords. |
| **2. Components** | Science and Business templates, with the 2027 briefs as reference content. Teachers create a component for a class, set stage dates and add their own checklist items. Students see stages, report sections, rules, marks and prompts, reusing the BiPi page components. **Plus the cross-subject timeline at `/home`**, including the student's own added items (FR-10 to FR-14) — see §3.2. |
| **3. The log** | Log entries that keep every version, per-entry visibility, and the teacher's reading view. Until Phase 6, students can note AI use as ordinary entries. |
| **4. Teacher grid** | Students against checkpoints, with sign-offs, furthest behind first. |
| **5. School leader view** | Where each class stands, stage by stage, across a year group. Counts only. |
| **6. Writing tools** | AI-use records with export, the reference builder, and the word/format checker. |

**Pilot readiness runs alongside the phases:** loading the 2028 briefs when the SEC publishes them, a privacy notice and data processing agreement with the school, backups and monitoring.

**The order doubles as the cut line.** Four months of evenings is tight for all of this. Phases 1–4 are enough to start the pilot, and phases 5 and 6 can arrive during it.

### 3.1 Not in the pilot

Some of these are MUSTs in the functional spec. Each is deferred, not dropped.

| Not in the pilot | Why |
|---|---|
| Suggested stage dates worked out from indicative hours (FR-47) | Needs class time per week and a school calendar. Teachers type their own dates, as on the BiPi site. |
| School leaders opening an individual student's record (FR-64) | Counts are enough for the purchase conversation, and it's the most sensitive screen in the product. |
| Coursework document links (FR-38–40) | Students write little of the report in 5th year. |
| Supervised session scheduling (FR-61) | Needed at stage 4, in the autumn. |
| Teachers renaming stages or adding stages of their own (part of FR-48) | Keeps stage names national, which the leader view depends on. Teachers can add dated items inside a stage instead. |
| Pushed class deadlines and revision recommendations (FR-55–60) | The rest of the weekly loop is the next release (D2). |
| School sign-in, individual subscribers, planner, study log, notifications, Irish-language interface | Later releases. |
| Engineering, Geography and Construction Technology templates | Their guidelines are already in `subjectDocs/` for when they're needed. |

### 3.2 The cross-subject timeline is in the pilot

Pulled forward out of the weekly loop, and it belongs in for a reason the rest of the loop doesn't share: **it is the product's central claim.** One place where everything a student is assessed on lives, across every subject. A pilot that doesn't test it can't tell us whether the claim holds.

The pilot is also unusually well set up to show it. The four subjects are Biology, Chemistry, Physics and Business, and a science student will typically be doing two or three of them — so a real student in this pilot has several components running at once, on different dates, from different teachers. That is exactly the situation nothing else can display.

**Scope:** `/home` shows a chronological list, week and month views, across every class the student is approved in. Items are the component stage dates, any dated teacher items, **and the student's own added items (FR-13)** — labelled by subject where they have one, with days remaining, and visually distinguished by type (FR-10 to FR-14).

**Student-added items are in the pilot.** Without them the timeline carries stage dates only, and with completion dates months apart (§4.3) it would look sparse for weeks at a time — three items on a screen doesn't feel like "everything in one place". Letting a student add their own test, essay or deadline is what makes it their timeline rather than a read-only view of what teachers have set, and it is the only part of the pilot where the student puts something in that isn't tied to coursework. Data model in §6.8.

**They are private to the student.** Teachers do not see them. They are not coursework, they carry no authentication value, and a student noting "driving test" or "Nana's birthday" should not surface in a teacher's grid. This is a hard rule, not a default — there is no visibility toggle, unlike the log.

**Cost is low.** One small table and a union in the timeline query. The work is the view, not the model.

The existing public schedule pages keep running unchanged beside the app. They live at `/[class]` and are built from the files in `frontend/lib/classes/`.

---

## 4. What the source documents say

These findings come from reading the SEC briefs and NCCA guidelines, and they shape the design. Every fact below was checked against the document named.

### 4.1 Sources

| Document | Where |
|---|---|
| NCCA guidelines for Biology, Chemistry and Physics (Nov 2024) and Business (Nov 2024) | `subjectDocs/AAC_Guidelines_*` |
| SEC **sample** briefs for the four subjects | `subjectDocs/EN-EX-*.pdf` |
| SEC **final** 2027 briefs: Physics `2027L021C2EL`, Chemistry `2027L022C2EL`, Biology `2027L025C2EL`, Business `2027L033C2EL` | `subjectDocs/SEC-<code>-<Subject>-brief.pdf` |
| SEC Coursework Rules and Procedures | **Not held yet.** It's the source for the AI-use fields (§6.7). |

**The `EN-EX` files are sample briefs, not final ones.** Their codes end `C2ES`, they carry no exam year, and their dates are placeholders (the Biology one says "by 2080"). Real dates must come from the final briefs.

**The context doc has two filenames swapped.** `EN-EX-61324862` is Business and `EN-EX-16382013` is Chemistry. The `(1)` file is an identical copy.

**Action:** the four final 2027 briefs are in `subjectDocs/` (added 16 Sep 2026). The Coursework Rules and Procedures is still to add; Phase 6 needs it (Q6).

### 4.2 One science template covers three subjects

The Biology, Chemistry and Physics guidelines agree on:
- the same six stages
- the same indicative hours
- the same four sentences about sharing work with the teacher for authentication

The final 2027 briefs for those subjects also agree on:
- the same seven report sections
- the same formatting rules
- the same 1,500-word and 20-image limits, with the same exclusions
- the same A–D mark bands

The only differences are in wording. For example, Chemistry and Physics say "laboratory" where Biology says "laboratory or field setting".

### 4.3 Completion dates are months apart

| Subject | 2027 completion date (final brief) |
|---|---|
| Physics | Friday 11 December 2026 |
| Biology | 26 February 2027 |
| Business | 12 March 2027 |
| Chemistry | Friday 23 April 2027 |

Dates belong to each year's brief, so "behind" can only be measured against a class's own dates. The leader view compares classes by stage status, never by calendar position.

### 4.4 Rules differ by subject, so they live on the brief

| | Sciences | Business |
|---|---|---|
| Word limit | 1,500 | 1,500, with suggested counts of 200 / 400 / 600 / 300 per section |
| Words not counted | References, data tables, formulae or equations, labels | References, data tables, graphs, diagrams, images, labels |
| Images | 20 at most. Formulae and equations don't count. No videos. Avoid identifiable people. | 10 at most. An image must be labelled (figure 1, figure 2…) when the text refers to it. |
| Section headings | "numbered" | "clearly identified" |

The NCCA guidelines say the brief carries "the word count, number of images permissible, the required structure and section headings, file size". So report sections and rules belong to each year's brief, not to the template.

### 4.5 Marks don't line up with sections

- **Biology:** bands A–C each cover two or three sections. Band D (Scientific Literacy, 50 marks) covers the whole report.
- **Business:** 100 marks go to "Investigation, Findings, Analysis and Evaluation", which spans two sections, and 50 to Overall Coherence, which covers the whole report. References has no marks of its own.

The tech spec's per-section `marks` column can't represent either subject. Mark bands get their own table, which is how the BiPi site already stores them.

### 4.6 There is no national student checklist

None of the four guidelines contains a student checklist. They give stage descriptions, indicative hours, and sample prompt questions for some stages ("not exhaustive"). What they do spell out is when a student shares work with the teacher as part of authentication. That becomes the checkpoint list in §7.3.

Also from the guidelines:

- **The process isn't linear.** Students "should be prepared to iterate; that is move backwards and forwards between the stages" (Biology p. 5). Nothing may lock a student into a sequence.
- **Photos stay out of the app.** Biology students record observations in their log and photograph their apparatus (p. 8). The app's log is text and links only, so photos stay in the student's own drive and the log links to them.
- **Teachers don't correct drafts.** They "should not engage in corrections of the report for redrafting" (Biology p. 9, Business p. 8), and feedback "should be general and nondirective" (Biology p. 13).

---

## 5. Architecture — Proposed

*Phase 1 built this. `docs/ARCHITECTURE.md` describes the result; this section stays as the rationale.*

### 5.1 Shape

```
biologyProject/
  frontend/     Next.js 15.3.9: the existing site plus the app
  backend/      Spring Boot 4.x, Java 21
  compose.yaml  Postgres 18 for local development
  Makefile      the same targets as contentCreater
```

```
Browser
  │  same origin, session cookie
  ▼
Next.js (Vercel, EU function region)
  ├─ pages and server components ──► Spring API directly (BACKEND_INTERNAL_URL)
  └─ app/api/v1/[...path]/route.ts ─► Spring API (calls from the browser)
                                          │
                                          ▼
                                   Postgres (EU, point-in-time recovery)
```

**Copied from contentCreater:**
- the same-origin proxy route
- the typed API client with Zod validation
- RFC 9457 problem details
- feature packages (`domain` / `application` / `adapter.web` / `adapter.persistence`)
- Testcontainers with one shared Postgres 18 container
- `compose.yaml` and the `Makefile`

**Changed from contentCreater:** its proxy forwards no cookies, because that app has no login. This one forwards `Cookie` and the CSRF header in, and `Set-Cookie` back out. Server components forward the incoming session cookie when they call the API.

**Borrowed from developerJournal:** Spring Security session login, but with CSRF protection **on** (developerJournal turns it off) and no `@CrossOrigin`. Browser and API share one origin, so there's no CORS to configure.

**All authorisation happens in Spring.** The frontend can hide a button but never enforces a rule.

**Accessibility target:** WCAG 2.2 AA (functional spec §9).

### 5.2 Sessions and passwords

- Spring Security login over JSON, with sessions stored in Postgres (Spring Session JDBC), so a deploy doesn't sign everyone out.
- The session cookie is `HttpOnly`, `Secure` and `SameSite=Lax`. The CSRF token uses Spring's cookie token repository, and the API client sends it back as a header.
- Passwords are hashed with bcrypt or Argon2id, with a minimum length of 10 and no composition rules. Login attempts are rate-limited per username and per IP address.
- Credentials live in their own table (§6.1), separate from `app_user`. School sign-in can then be added later without restructuring accounts.

### 5.3 Routes

The public schedule stays at `/[class]`. The app claims the top-level names below, and a test fails if any class slug collides with one.

| Route | Who |
|---|---|
| `/login`, `/join` | Everyone. `/join` is sign-up with a join code. |
| `/home`, `/components/[id]` | Students (designed mobile-first) |
| `/teach`, `/teach/classes/[id]` | Teachers (designed desktop-first) |
| `/school` | School leaders |
| `/api/v1/*` | The proxy |

### 5.4 Hosting

- **Next.js stays on Vercel, with its function region set to an EU region.** The live site currently runs its functions in Washington DC (`x-vercel-id: dub1::iad1`). That's fine for a public schedule, but not for student data.
- **Spring Boot goes on a host with an EU region, with managed Postgres in the EU** and point-in-time recovery. The Phase 1 plan picks the vendors.
- **Next.js stays on 15.3.9.** Next 16's Adapter API broke Vercel deploys (commit `8b077e8`). Revisit once Vercel supports it.

---

## 6. Data model — Proposed

The tech spec's conventions apply: Postgres, `snake_case`, `uuid` ids, and `created_at timestamptz` on every table. **There is no file or blob column anywhere.**

### 6.1 People, schools and classes

```sql
school              (id, name, roll_number)
app_user            (id, first_name, last_name, disabled_at)
password_credential (user_id PK, username UNIQUE, password_hash, must_change, updated_at)
password_reset_code (id, user_id, code_hash, issued_by_user_id, expires_at, used_at)
user_role           (id, user_id, school_id, role STUDENT|TEACHER|SCHOOL_LEADER)

subject             (id, code, name)
class_group         (id, school_id, subject_id, name, year_group, academic_year,
                     level HIGHER|ORDINARY|MIXED NULL, owner_user_id,
                     join_code UNIQUE NULL, join_code_expires_at)
enrolment           (id, class_group_id, student_user_id, status PENDING|APPROVED|REMOVED,
                     requested_at, decided_at, decided_by_user_id)
                    UNIQUE (class_group_id, student_user_id)
```

- **No email or date of birth for students.** Nothing is collected that the pilot doesn't use.
- **One person can hold several roles**, such as a year head who also teaches.
- **`user_role.school_id` is required in the pilot.** It becomes nullable when individual subscribers arrive.
- **`level` is optional**, because 5th year classes are often mixed.
- **Join codes** are 8 characters from an alphabet without 0, O, 1, I or L. They expire and can be rotated.

### 6.2 Templates, versioned

```sql
component_template  (id, subject_id, slug, name, deliverable_type, weighting_percent, marks_total)
template_version    (id, template_id, version_no, status DRAFT|PUBLISHED|RETIRED, process_note, published_at)
template_stage      (id, version_id, ordinal, label, name, description,
                     hours_min NULL, hours_max NULL, hours_group NULL, supervised)
template_section    (id, version_id, ordinal, label, name, suggested_words NULL, indicative_content)
template_mark_band  (id, version_id, ordinal, label, name, marks, whole_report)
template_mark_band_section (band_id, section_id)
template_checkpoint (id, version_id, stage_id, ordinal, text, source_ref)
template_prompt     (id, version_id, stage_id, ordinal, text, source_ref)
```

This settles review issue #6: "structure never propagates" wasn't actually enforced.

- **Text corrections propagate.** Fixing a typo or a wording error updates a published version's text columns, and every class on that version sees the fix.
- **Structure doesn't propagate.** Adding, removing or reordering stages, sections, bands or checkpoints means creating a new version. A database trigger rejects inserts, deletes and ordinal changes on a published version's rows, and classes already running stay on their version.
- **There are four templates in the database, one per subject.** "One science template" is a content-authoring fact, so the three science subjects are generated from one content source.
- **`label` covers unnumbered stages.** Business can have "Compilation of the final report" after Stage 6 without calling it Stage 7.
- **`hours_group` covers shared estimates.** Business stages 4 and 5 share one 6–8 hour estimate. Hours are display-only in the pilot.

### 6.3 Annual briefs

```sql
annual_brief (id, template_id, template_version_id, exam_year, sec_code, status DRAFT|PUBLISHED,
              topic_title, topic_body, completion_date,
              word_limit, words_not_counted, image_limit, image_note,
              source_url, published_at)
             UNIQUE (template_id, exam_year)
brief_rule   (id, brief_id, ordinal, key, value)   -- the brief's formatting-rules table
```

- **A brief pins a template version**, because the brief is what carries the section headings (§4.4). If the SEC changes headings in a future year, that year gets a new version.
- **A changed completion date moves nothing.** If the SEC changes it after classes have set their dates, teachers whose dates now fall after it see a warning and are asked to fix them.

### 6.4 A class's component

```sql
component_instance  (id, class_group_id, annual_brief_id, created_by_user_id)
                    UNIQUE (class_group_id, annual_brief_id)
instance_stage_date (instance_id, template_stage_id, due_date)
                    PRIMARY KEY (instance_id, template_stage_id)
teacher_item        (id, instance_id, template_stage_id, ordinal, text, due_date NULL, retired_at)
```

- **Completion-date rule (FR-49):** `due_date <= completion_date`. It's enforced in the service **and** by a trigger, with its own problem type so the teacher sees a real message.
- **Stage dates don't have to be in order**, because the process isn't linear. Out-of-order dates get a warning.
- **Teacher items can carry their own date.** That covers things like the BiPi site's draft hand-in and catch-up window.

### 6.5 Progress

```sql
checkpoint_signoff (id, instance_id, student_user_id, checkpoint_id,
                    signed_off_by_user_id, signed_off_at,
                    revoked_by_user_id NULL, revoked_at NULL)
                   -- at most one un-revoked row per (instance, student, checkpoint)
item_tick          (instance_id, student_user_id, teacher_item_id, done_at NULL)
```

- **Progress is keyed on student and component, not on enrolment.** This settles review issue #3. When the individual route arrives, a student-owned component slots in without restructuring progress.
- **Sign-offs are never deleted.** Undoing one records who revoked it and when.
- **Ticks are self-reported, and the interface says so** (functional spec rule 1). Sign-offs are the teacher's word.

### 6.6 The log

```sql
log_entry             (id, instance_id, student_user_id, kind NOTE|SOURCE|AI_USE,
                       created_at, visible_to_teacher, current_revision)
log_entry_revision    (entry_id, revision_no, body, fields jsonb, created_at)
                      PRIMARY KEY (entry_id, revision_no)
log_visibility_change (entry_id, visible, changed_at)
```

- **Timestamps can't be changed.** The server sets `created_at` once. An edit adds a new revision (D7), and revisions are never updated or deleted.
- **Sources and AI use are log entries**, of kinds `SOURCE` and `AI_USE`. Their details go in `fields`, validated against one Java record per kind. That puts the reference builder and the AI-use record on the same dated, versioned trail as notes, with the same visibility control: one paper trail instead of three.
- **Students can't delete entries in the pilot.** They can hide an entry from the teacher. Erasure on request goes through the school, which is the data controller.
- **The teacher's view is enforced in one projection.** Teachers see metadata for every entry: kind, created, edited and revision count. They see body, fields and history only where `visible_to_teacher` is true. A hidden entry must look different from no entry (FR-24d).

### 6.7 Fields for sources and AI use

**`SOURCE`** fields come from the NCCA referencing appendix (Biology Appendix 1, Business Appendix Four) and Business Appendix Three.

| Field | Notes |
|---|---|
| `type` | Book, newspaper or magazine, online text or image, online audio, online video, other |
| `author`, `title`, `publication`, `date_published` | As available |
| `url`, `date_accessed` | Required for online sources |
| `locator` | Page, chapter, section, or a timestamp range |
| `key_information`, `relevance`, `reflections` | Optional. These are the Business Appendix Three prompts. |

**`AI_USE`** fields come from Appendix 2 of the SEC Coursework Rules and Procedures, as summarised in the context doc. **Check them against the document itself before Phase 6.**

| Field | Example or note |
|---|---|
| `tool_name_and_version` | "ChatGPT (Oct. 20 version)" |
| `developer` | OpenAI |
| `date_generated` | |
| `how_used` | A brief description |
| `prompts` | |
| `share_url` | Where the tool generates one |

**What they produce:**
- **Sources:** an in-text citation and a reference-list entry, shaped like the NCCA's own examples. No formal referencing style is required, so none is enforced.
- **AI use:** a reference-list entry and the appendix block for the report.

The NCCA's example strings become the formatter's test fixtures.

### 6.8 The student's own items

```sql
personal_item (id, student_user_id, title, due_date,
               kind TEST|ESSAY|DEADLINE|OTHER,
               class_group_id NULL, created_at, updated_at)
```

- **Keyed on the student, not on an enrolment or a component.** A student can note something that belongs to no class at all.
- **`class_group_id` is optional**, and only used to label the item with a subject on the timeline. It grants nobody any access.
- **No role but the owner can read this table.** Not teachers, not school leaders, in any view or aggregate. The authorisation tests in §10 get a case for it.
- **Students can edit and delete these freely.** Unlike the log, there is no audit purpose here, so no revisions and no retention rule.

---

## 7. Content — Proposed

### 7.1 How content is loaded

Templates and briefs are SQL, in Flyway content migrations under `db/content/` with their own history table (tech spec §6). Every checkpoint and prompt row carries a `source_ref` giving the document and page. There's no admin screen in the pilot: content changes arrive as reviewed diffs.

### 7.2 What each template holds

| | Science (×3) | Business |
|---|---|---|
| Stages and hours | 6 stages. Hours: 1–2, 2–3, 2–3, stage 4 about 1–2 per lab session (several sessions may be needed), 1–2, up to 4. | 6 stages plus Compilation. Hours: 2–3, 1–2, 1–2, 6–8 for stages 4 and 5 together, 1–2, then 2–3 for Compilation. |
| Sections | 7, from Title and Introduction to References | 5, with suggested word counts of 200 / 400 / 600 / 300 |
| Mark bands | A 50, B 50, C 50, D 50 (whole report) | Introduction 20; Investigation, Findings, Analysis and Evaluation 100; Conclusion 30; Overall Coherence 50 (whole report) |
| Prompts, shown read-only | Stage 1 (Biology p. 6); stage 5 analysis list (p. 9) | Stages 1, 5 and 6; Appendix One (SMART research question); Appendix Two (project plan) |
| Process note | The stages aren't linear; students move back and forth | Reflecting and refining, and monitoring and evaluating, run across all stages |

### 7.3 Checkpoints (teacher sign-offs)

Checkpoints are drawn only from what the guidelines say. The **Basis** column shows how strong each one is:
- **Explicit:** the guidelines name it as a step in authentication.
- ***Described:*** the guidelines describe a discussion with the teacher rather than an authentication step. The reviewing teachers decide whether these stay.

**Science** (page numbers are from the Biology guidelines; Chemistry and Physics say the same):

| Stage | Checkpoint | Basis |
|---|---|---|
| 1 Initial response | Initial ideas discussed with the teacher | *Described:* the teacher interacts with students to "familiarise themselves with their initial idea" and discuss feasibility (p. 6) |
| 2 Background research | Investigative log shared with the teacher | Explicit: "It is advisable that the students' investigative logs are shared with the teacher … supporting the teacher in the ongoing process of authentication" (p. 7) |
| 3 Designing and planning | Plan discussed with the teacher (feasibility and safety) | *Described:* "Discussions between the teacher and student on the feasibility and manageability of their proposed plan" (p. 7). Teachers intervene only if a design is unsafe (p. 8). |
| 4 Conducting the experiment | Experiment carried out under supervision, in line with the research and planning already shared | Explicit: "the teacher is satisfied that the experiment conducted by the student is in line with their research and planning" (p. 8) |
| 5 Data analysis | Data analysis shared with the teacher | Explicit: "sharing the data analysis with the teacher is an important step in the ongoing authentication process" (p. 9) |
| 6 Finalising the report | Final report submitted to the teacher | Explicit: submission step 3 in the SEC brief |

**Business** (page numbers from the Business guidelines):

| Stage | Checkpoint | Basis |
|---|---|---|
| 1 Getting started | Initial ideas discussed with the teacher | *Described:* "Teacher interaction with students at this stage provides an opportunity to familiarise themselves with the students' initial ideas" (p. 5) |
| 2 Developing a question | Research question discussed with the teacher | Explicit: "Students should discuss their proposed question to research with their teacher" (p. 5) |
| 3 Developing a project plan | Project plan shared with the teacher | Explicit: "Sharing the plan with the teacher is an important step in the ongoing authentication process" (p. 6) |
| 4 Sources and information | Research shared when the teacher asks | Explicit: "The teacher can ask for work to be shared by students at regular intervals" (p. 6) |
| 5 Analysis and evaluation | Analysis and evaluation shared with the teacher | Explicit: "Sharing this work with the teacher is an important step in the ongoing authentication process" (p. 7) |
| 6 Applying learning | None | Nothing stated |
| Compilation | Final report submitted for review and authentication | Explicit: "prior to submitting to their teacher for review and authentication" (p. 8) |

**Review before the pilot:** Katelyn for Biology, plus a Chemistry, a Physics and a Business teacher for their subjects. Each confirms the checkpoint wording and whether the *described* rows stay.

### 7.4 Briefs

- **The final 2027 briefs are loaded as reference content**, so teachers can explore the app and the tests have real data. **If 6th years are in the pilot (§1.1), these become live content rather than reference data** — they are already published, so that cohort has no dependency on the SEC.
- **The 2028 briefs are loaded when the SEC publishes them**, in Term 2 of 2027. ~~**The pilot can't start before then**, because completion dates come from the brief.~~ That is only true for a 5th year pilot. A 6th year pilot can start as soon as the software is ready.

---

## 8. How it works — Proposed

### 8.1 Accounts and joining

1. The operator creates the school, the teacher accounts and the school-leader role. Teachers get a temporary password, which they change at first sign-in.
2. A teacher creates a class and reads out its join code.
3. A student opens `/join`, enters the code and sees the class and school name. They then create an account (first name, surname, username, password) or sign in to an existing one.
4. The enrolment stays pending until the teacher approves it. Joining a second class uses the same account: one account across all subjects (FR-7).
5. If a student forgets their password, their teacher issues a one-time reset code, valid for 24 hours. No email is involved.

### 8.2 Setting up a component

The teacher picks the brief for the class's subject and exam year, enters a date for each stage, and adds their own items. Dates after the completion date are rejected (§6.4).

### 8.3 What the student sees

Each component gets a mobile-first page that reuses the BiPi site's stage cards, report-section crosswalk, rules and marks components. The page shows:
- the stages, with the teacher's dates
- each checkpoint's state
- the teacher's items to tick
- the prompts
- the log

The existing date logic in `frontend/lib/schedule.ts`, which is safe for the Dublin timezone, is adapted to drive the current stage and the countdowns.

### 8.4 What "behind" means

- **Due:** a checkpoint is due once its stage's date has passed.
- **Behind:** a student is behind by the number of due checkpoints without a sign-off.
- **Teacher grid:** students are sorted by that number, then by days since their last log entry. Log activity is shown separately from progress, so "hasn't logged in three weeks" and "hasn't had the plan signed off" don't blur together.
- **Leader view:** for each class and stage, it shows "not started" if the stage isn't due yet. Otherwise it shows how many students have every due checkpoint signed off. A class is labelled **on track** when at least 80% of its students are fully signed off on due checkpoints, and **behind** otherwise. The 80% is a placeholder to agree (Q2).

### 8.5 The log, from the student's side

- **New entries are visible to the teacher by default** (FR-24b). One tap hides or shows an entry (FR-24c).
- **The screen says in words who can read the entry**, at the moment of writing (FR-24e): "Your teacher can read this", or "Only you can read this. Your teacher sees that you made an entry on 3 March."
- **An edited entry is marked "edited" and keeps its history.** The student can see the history, and so can the teacher for visible entries.

### 8.6 The word and format checker

- **It runs entirely in the browser.** Pasted text is never sent, stored or cached, not even in `localStorage`. A test asserts that no request is made.
- **It doesn't pretend to detect tables, labels or formulae**, because that can't be done reliably from pasted text. Students paste their body text section by section, with the brief's "words not counted" list shown alongside.
- **Business sections show progress against 200 / 400 / 600 / 300.** The sciences show progress against the 1,500 total.
- **Image limits are shown, not counted.** The checker displays the limit and its note: formulae don't count, and Business images must be labelled.

---

## 9. Security and data protection — Proposed

- **No file upload endpoint exists.** Links must be `https`. They're stored, rendered with `rel="noopener noreferrer"`, and never fetched by the server.
- **Authorisation:** every request resolves to roles and scopes, and every service method takes the acting user as an argument. Resources outside the user's scope return 404 rather than 403, so ids can't be probed. *This changes the tech spec, which says 403.*
- **Audit events** are recorded for role changes, enrolment decisions, password reset codes issued, sign-offs and revocations, and join code rotation.
- **Personal data is limited** to names, usernames, password hashes, class membership, progress, the log, and the student's own timeline items. There's no student email or date of birth. Personal items are free text a student writes about their own life, so the DPIA treats them as content alongside the log.
- **EU residency** applies to the database, the API and the Vercel functions.
- **The log counts as content.** Notes, sources and AI prompts are student-written text about the project. The data protection impact assessment (DPIA) must treat them as content, and the positioning line "if our database leaked tomorrow, nobody's project is in it" needs softening (review issue #8).
- **Before the pilot:** a data processing agreement with the school (the controller), and a privacy notice for students and parents, drafted by someone qualified. This document is not legal advice.

---

## 10. Errors and testing — Proposed

**Errors.** Spring returns RFC 9457 problem details, and the proxy passes them through untouched. Errors a user can act on get named types:
- completion date exceeded
- join code expired or unknown
- enrolment still pending
- wrong username or password (one message covers both, so it doesn't reveal which was wrong)

If the API is down, the proxy returns its own problem response rather than a blank page.

**Tests.**

| Layer | What |
|---|---|
| Domain (JUnit, no Spring) | The completion-date rule; "behind" and the leader-view counts; citation and AI-appendix formatting against the NCCA's example strings; the log revision rules |
| Database (Testcontainers, Postgres 18) | Both triggers (completion date, published-version structure); content migrations load; every checkpoint and prompt has a `source_ref`; each version's mark bands add up to `marks_total` |
| Authorisation | One test class per role, written before the endpoints. Each tries to reach something out of scope: another teacher's class, another student's log, a hidden entry's body, a school the leader doesn't belong to, and any student's `personal_item` rows from a teacher or leader session. |
| Frontend | The existing `node --test` suite for `lib/`; the word checker makes no network request; no class slug collides with an app route |
| End to end (Playwright) | A student joins with a code, the teacher approves, and the student logs an entry and hides it; the teacher sees that the entry exists but not what it says. A teacher sets dates and signs off, and the leader counts change. |

---

## 11. Open questions

| # | Question | Blocks |
|---|---|---|
| Q1 | Which Chemistry, Physics and Business teachers will review their subject's content, and by when? | Phase 2 content sign-off |
| Q2 | What's the leader view's on-track threshold? (80% is a placeholder.) | Phase 5 |
| Q3 | Should a teacher see that a student hid an entry that was previously visible? The history is kept either way. | Phase 3 |
| Q4 | How long is pilot data kept? Proposal: until the SEC appeals process for that cohort ends, unless the school says otherwise. | Pilot readiness |
| Q5 | Who drafts the data processing agreement and the privacy notice? | Pilot readiness |
| Q6 | Do the AI-use fields in §6.7 match the current Coursework Rules and Procedures? | Phase 6 |
| Q7 | If the 2028 briefs are late, does the pilot wait? | Pilot start |
| Q8 | Confirm D1: build in the same repository. | Phase 1 |
| Q9 | Which cohort does the pilot run with — 6th years from autumn 2026, 5th years from spring 2027, or both? See §1.1. | Everything. This sets the start date, which brief content is live, and what the pilot can actually prove. |

## 12. Housekeeping for Phase 1

*All three done during Phase 1 (the scope rules live in the root `CLAUDE.md`; Phases A and B are merged; the report-rules card was fixed on `main`). Kept for the record.*

- **Rewrite the scope rules in `docs/CLAUDE.md`.** They forbid a backend, accounts and a database. Also correct its Next.js version: it says 16.3.3, but the project is on 15.3.9.
- **Branch from wherever Phase A and B land.** They're still unmerged on `phase2.0`. This work doesn't depend on them.
- **Fix the live site's report-rules card separately, for the current class.** It leaves out what's allowed (bold, italics, numbering, bullets) and that formulae and equations don't count toward the image limit.
