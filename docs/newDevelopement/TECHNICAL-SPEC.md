# Technical Specification
## Leaving Cert Coursework & Year Planner

**Version:** 0.1 (draft)
**Date:** September 2026
**Companion documents:** `FUNCTIONAL-SPEC.md` (what it does),
`LC-AAC-PROJECT-CONTEXT.md` (background, decisions, domain research)

Requirement references (FR-n) point at the functional spec.

---

## 1. Stack

| Layer | Choice | Note |
|---|---|---|
| Frontend | Next.js (App Router), TypeScript | Server components for data-heavy views, client components for interactive ones |
| UI | shadcn/ui on Radix primitives, Tailwind | Radix gives accessible primitives free, which matters for the WCAG requirement |
| Backend | Spring Boot 3.x, Java 21 | Plays to existing strength; Spring Security and JPA carry most of the auth and persistence weight |
| Database | PostgreSQL | |
| Migrations | Flyway | Versioned SQL, checked into the repo |
| Build | Gradle or Maven (either), pnpm | |

**Two deployables**, not one. The Next.js app talks to the Spring Boot API over HTTPS.

Worth being honest about the trade-off, since it's a real cost: two deployables, two
languages, two dependency trees and CORS to configure, for a product one person is
building in evenings. A single Next.js app with API routes would be less work. The
argument for the split is that the domain logic here is genuinely non-trivial —
template/instance resolution, date validation, role-scoped queries — and that is work
you'll do faster and more safely in Java than in TypeScript. That is a legitimate reason.
"It's more professional" is not.

---

## 2. Architecture

```
Browser
   │
   ▼
Next.js  ── server components fetch from API with the user's token
   │        client components call API directly
   ▼
Spring Boot API  (/api/v1)
   │
   ▼
PostgreSQL
```

Stateless API. All authorisation decisions are made server-side in Spring, never in the
Next.js layer — the frontend can hide a button, but it cannot be the thing that stops a
teacher reading another teacher's class.

---

## 3. Authentication and authorisation

### 3.1 School route

OIDC against Google Workspace for Education and Microsoft Entra ID.

- Next.js handles the login flow (Auth.js / NextAuth) and holds the session.
- Spring Boot is configured as an **OAuth2 resource server**, validating the JWT on every
  request. No session state in the API.
- On first successful login the API provisions an `app_user` row keyed on
  `(auth_provider, auth_subject)` — never on email, which changes.

Why this split rather than Spring handling login: the browser session belongs with the
thing serving the browser. It also leaves the API able to serve a mobile client later
without rework.

### 3.2 Individual route — UNRESOLVED (OPEN-2)

Individual subscribers have no school-provisioned identity, and the school is not their
data controller. Options: personal Google/Microsoft OIDC, or email-and-password with
verification. Both raise questions about minors' accounts that need answering before
launch, not during. **Do not design the school route in a way that assumes OIDC is the
only path** — keep `app_user` provider-agnostic.

### 3.3 Authorisation model

Every request resolves to a set of `(role, scope)` pairs:

| Role | Scope | Can read |
|---|---|---|
| `STUDENT` | self | Own everything; own class groups' components and pushed items |
| `TEACHER` | class groups they own | Status for enrolled students; never content |
| `SCHOOL_LEADER` | a school | Aggregates across class groups; individual detail only on deliberate drill-down |

Implement with Spring Security method security (`@PreAuthorize`) plus a scope check in
the service layer. **Do not rely on `@PreAuthorize` alone for row-level scoping** — the
common failure is an endpoint that checks the role but not whether *this* teacher owns
*this* class group. Every repository method that takes an id must also take the acting
principal, or go through a service that has already resolved scope.

A conservative addition worth considering given the data involved: Postgres row-level
security as a second line, so a query bug can't leak across schools.

---

## 4. Data model

Postgres. `snake_case`. All ids `uuid` (`gen_random_uuid()`). All tables carry
`created_at timestamptz not null default now()`.

### 4.1 Identity and organisation

```sql
school              (id, name, roll_number, created_at)
app_user            (id, auth_provider, auth_subject, email, display_name, created_at)
                    unique (auth_provider, auth_subject)
user_role           (id, user_id → app_user, school_id → school NULL,
                     role enum('STUDENT','TEACHER','SCHOOL_LEADER'), created_at)
```

`school_id` is nullable: an individual-tier student has a `STUDENT` role with no school
(FR-1). One user may hold several roles — a year head who also teaches (FR-9).

```sql
subject             (id, name, code)          -- reference data
class_group         (id, school_id, subject_id, level enum('HIGHER','ORDINARY','COMMON'),
                     year_group smallint, name, owner_user_id → app_user,
                     academic_year, join_code, join_code_expires_at, created_at)
                    unique (join_code) where join_code is not null
enrolment           (id, class_group_id, student_user_id → app_user,
                     status enum('PENDING','APPROVED','REMOVED'),
                     requested_at, decided_at, decided_by_user_id)
                    unique (class_group_id, student_user_id)
```

Join codes (FR-3, FR-6): short, unambiguous, and drawn from an alphabet excluding
0/O/1/I/l, because a teacher reads them aloud. Expiry is a column, not a deletion.

### 4.2 Template layer (national content)

```sql
component_template  (id, subject_id, name, slug, deliverable_type enum('REPORT',
                     'FOLIO_AND_ARTEFACT','PORTFOLIO','AUDIOVISUAL','PRACTICAL_TASK'),
                     weighting_percent, marks_total NULL,
                     indicative_hours_min, indicative_hours_max,
                     supervised_setting_required boolean,
                     brief_issue_term enum('T2_YEAR1','T1_YEAR2','OTHER'),
                     status enum('DRAFT','PUBLISHED','RETIRED'), created_at)

template_stage      (id, template_id, ordinal, name, description,
                     hours_min NULL, hours_max NULL,
                     combined_with_stage_id NULL,
                     teacher_supervised boolean)

template_section    (id, template_id, ordinal, number_label, name,
                     indicative_content, marks NULL, suggested_word_count NULL)

template_checklist_item
                    (id, template_id, ordinal, text,
                     section_id NULL → template_section,
                     stage_id NULL → template_stage,
                     requires_teacher_signoff boolean)
```

Notes that come straight from the research and are easy to get wrong:

- `weighting_percent` and `marks_total` must be per-template. Engineering is 50%,
  Construction Technology's two components are 30% and 20%, the sciences are 40%.
  Nothing may hardcode 40% or 200 marks.
- `deliverable_type` exists because the SEC defines coursework as "a digital or written
  submission; a physical artefact; a portfolio; an audio-visual submission; or a task".
  A model that assumes "a report" breaks on Engineering and PE.
- `hours_min/max` nullable and `combined_with_stage_id` present because Business gives
  stages 4 and 5 a single combined 6–8 hour estimate.
- `brief_issue_term` because Engineering and Construction get their brief in Term 1 of
  Year 2, while the sciences, Business and Geography get it in Term 2 of Year 1. There is
  no single start to the year.
- Checklist items hang off **sections** by preference, not stages. Sections are national
  and stable; stages get restructured by teachers. Anchoring to sections means
  "§3 complete" means the same thing in every school, which is what makes the school
  leader rollup possible.

### 4.3 Annual brief

```sql
annual_brief        (id, template_id, exam_year smallint,
                     topic_title, topic_body,
                     completion_date, submission_date NULL,
                     word_limit NULL, image_limit NULL,
                     file_format, source_url, published_at)
                    unique (template_id, exam_year)
```

This table exists because the SEC's annual instructions carry the topic **and** the
report rules — word count, image count, section headings, file size. That is why Business
is 10 images and the sciences are 20 in the same year. Putting limits on the template
would be wrong.

`completion_date` and `submission_date` are distinct by SEC definition and must not be
collapsed.

### 4.4 Instance layer (a class group's version)

```sql
component_instance  (id, class_group_id, annual_brief_id,
                     created_by_user_id, created_at)
                    unique (class_group_id, annual_brief_id)

instance_stage      (id, component_instance_id, template_stage_id NULL,
                     ordinal, name, due_date)

instance_stage_section
                    (instance_stage_id, template_section_id)   -- many-to-many

student_progress    (id, enrolment_id, checklist_item_id,
                     completed boolean, completed_at,
                     signed_off_by_user_id NULL, signed_off_at NULL)
                    unique (enrolment_id, checklist_item_id)
```

**FR-49 constraint.** `instance_stage.due_date <= annual_brief.completion_date`. Enforce
in the service layer; consider also a database-level check via trigger, because this is
the rule with a legal edge to it and the one a future refactor is most likely to skip.

`template_stage_id` is nullable so a teacher can add a checkpoint of their own that has
no national equivalent.

### 4.5 Student-generated records

```sql
log_entry           (id, student_user_id, component_instance_id NULL,
                     body text, reference_url NULL,
                     visible_to_teacher boolean not null default true,
                     created_at, edited_at)

document_link       (id, student_user_id, component_instance_id,
                     url, label, created_at)

ai_declaration      (id, student_user_id, component_instance_id,
                     tool_name, tool_version, developer,
                     generated_on date, usage_description, prompts text,
                     share_url NULL, created_at)

reference_source    (id, student_user_id, component_instance_id,
                     source_type enum('BOOK','ARTICLE','WEB','AUDIO','VIDEO','AI','OTHER'),
                     author, title, publication, published_on, accessed_on,
                     url NULL, locator, created_at)
```

**Visibility (FR-24a–e)** is per entry and student-controlled, defaulting to true. The
teacher-facing query must return *metadata for every entry* — id, `created_at`,
`edited_at` — but the `body` and `reference_url` only where `visible_to_teacher` is true.
Do not filter hidden entries out of the result set entirely: a hidden entry and a
non-existent entry must look different to the teacher, or the activity record silently
stops being complete. Enforce this in a dedicated projection/DTO rather than by
remembering to null the field at each call site.

**`log_entry` is the audit trail (FR-22).** `created_at` must be set server-side and be
immutable; edits update `edited_at` and never `created_at`. If the trail is the value,
a back-dateable entry is worse than no entry. Consider append-only revisions rather than
in-place edits — more work, but it makes the claim "this cannot be reconstructed
afterwards" actually true rather than approximately true.

`ai_declaration` fields map one-to-one onto Appendix 2 of the SEC Coursework Rules and
Procedures. Don't improvise them.

**Never add a `file` or `blob` column to any of these tables.** Business rule 6.

### 4.6 Class activity

```sql
class_deadline      (id, class_group_id, created_by_user_id,
                     title, due_date, type enum('HOMEWORK','ASSIGNMENT','TEST','OTHER'),
                     source_url NULL, created_at)
class_deadline_target   (class_deadline_id, student_user_id)   -- empty = whole class

recommendation      (id, class_group_id, created_by_user_id,
                     body, target_date NULL, created_at)
recommendation_target   (recommendation_id, student_user_id)
recommendation_ack      (recommendation_id, student_user_id, done_at)

supervised_session  (id, component_instance_id, starts_at, location, capacity)
supervised_session_slot (supervised_session_id, student_user_id)
```

### 4.7 Personal planner

```sql
personal_event      (id, student_user_id, title, due_date, type)
timetable_slot      (id, student_user_id, day_of_week, period, subject_id, room)
study_session       (id, student_user_id, subject_id, minutes, started_at)
subject_priority    (id, student_user_id, subject_id, target_minutes_per_week)
```

### 4.8 The timeline query

FR-10 is the product's differentiator and is a union across sources: instance stages for
every approved enrolment, class deadlines targeted at the student, recommendations with
target dates, and personal events.

Expect this to be the hottest query. Index `(student_user_id, due_date)` on personal
events, `(class_group_id, due_date)` on class deadlines, and
`(component_instance_id, due_date)` on instance stages. A materialised view is premature
at this scale — revisit only if measurement says so.

---

## 5. API design

REST, `/api/v1`, JSON. Resource-shaped.

```
POST   /auth/session                     exchange OIDC token, provision user
GET    /me                               identity + roles

GET    /me/timeline?from=&to=            FR-10, the primary read
GET    /me/components                    every component across every class
GET    /components/{id}                  stages, sections, rules, checklist
POST   /components/{id}/progress         tick/untick a checklist item

GET    /components/{id}/log
POST   /components/{id}/log
PATCH  /log/{id}
GET    /components/{id}/ai-declarations
POST   /components/{id}/ai-declarations
GET    /components/{id}/ai-declarations/export      formatted block (FR-26)
GET    /components/{id}/sources
POST   /components/{id}/sources
POST   /components/{id}/document-link

POST   /classes                          create class group (teacher)
POST   /classes/{id}/join-code/rotate
POST   /enrolments                       student submits join code
POST   /enrolments/{id}/approve
GET    /classes/{id}/progress            the grid (FR-51)
POST   /classes/{id}/deadlines
POST   /classes/{id}/recommendations
POST   /classes/{id}/components          instantiate template + brief

GET    /schools/{id}/overview?year=      school leader aggregate (FR-62)

GET    /templates                        published templates
GET    /templates/{id}/briefs
```

Word counting (FR-33–36) is **client-side only**. The text never reaches the server;
that is the whole point of FR-36.

Errors: RFC 9457 problem details. The completion-date violation (FR-49) deserves its own
type so the frontend can show a real message rather than "400".

---

## 6. Migrations

Flyway, `V{n}__{description}.sql`, checked in.

Two categories, kept in separate directories:

- **Schema** — `db/migration/`
- **Reference and template content** — `db/content/`, run as a second Flyway instance
  with its own history table.

The reason: template and brief content changes annually and far more often than the
schema. Mixing them makes the schema history unreadable within a year, and makes it hard
to answer "what changed in the Biology template for 2028".

Templates and briefs are seeded as SQL, not entered through an admin UI, in the first
release. They are small in number, need review before they go live, and belong in version
control where a change is diffable — a wrong template is the failure mode that costs a
teacher's trust permanently.

---

## 7. Security and data protection

Implementation of business rules 6 and 7.

- **No file upload endpoint exists anywhere in the API.** Not disabled — absent. The
  cheapest way to guarantee a rule is to make it unimplementable.
- URLs in `document_link` and `class_deadline.source_url` are stored and rendered, never
  fetched server-side. Fetching them would turn the API into an SSRF vector *and* pull
  the content into scope.
- Validate stored URLs are `https` and render with `rel="noopener noreferrer"`.
- All personal data resident in the EU. Given the users are Irish minors, this is not
  optional in practice even where it might be arguable in law.
- Data export and deletion per school, since the school is the controller and will ask.
- Audit logging on: role assignment, enrolment approval, teacher sign-off, and any
  drill-down from a school leader into an individual student.
- Secrets in the platform's secret store, never in the repo.

*Not legal advice — a DPIA and a school-facing data processing agreement will need
someone qualified before this is in more than one school.*

---

## 8. Testing

- **Domain logic** — plain JUnit, no Spring context. Template-to-instance date
  derivation, the completion-date constraint, and timeline assembly are where the real
  bugs will be.
- **Repository and query** — Testcontainers against real Postgres. H2 will lie to you
  about enum and timestamptz behaviour.
- **Authorisation** — a dedicated test class per role asserting that scope violations
  return 403. Write these before the endpoints. This is the category of bug that ends
  a schools product.
- **Frontend** — Playwright over the two flows that matter: a student joining a class
  and ticking through a component, and a teacher setting up a component and reading the
  grid.

---

## 9. Environments and operations

- Local: Docker Compose — Postgres, API, web.
- Preview per branch.
- Production: Next.js on Vercel; Spring Boot on Fly.io, Railway or a small VPS; managed
  Postgres with point-in-time recovery.
- Backups tested by restoring, not by existing.
- Structured JSON logging with a correlation id through both tiers. Error tracking
  (Sentry or similar) on both.
- Uptime monitoring weighted to February and deadline weeks.

Load is small and seasonal. Resist infrastructure that assumes otherwise.

---

## 10. Technical open questions

| # | Question |
|---|---|
| T-1 | Individual-subscriber auth (blocks OPEN-2) — and the minors' accounts question underneath it |
| T-2 | Log edits: in-place with `edited_at`, or append-only revisions? Affects how strong the proof-of-work claim can honestly be. Related: whether a visibility change should itself be recorded, since toggling an entry to hidden after the fact is a thing a teacher might reasonably want to know happened |
| T-3 | Whether Postgres row-level security is worth the complexity as a second line of defence |
| T-4 | Whether the two-deployable split earns its cost, or whether Next.js API routes would do |
| T-5 | Multi-school users — a teacher working across two schools is rare but real |
| T-6 | Classroom/Teams import for deadlines (OPEN-4), and whether it should exist before FR-55 ships |
