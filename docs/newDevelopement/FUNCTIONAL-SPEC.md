# Functional Specification
## Leaving Cert Coursework & Year Planner

**Version:** 0.1 (draft)
**Date:** September 2026
**Companion documents:** `LC-AAC-PROJECT-CONTEXT.md` (background and decisions),
`TECHNICAL-SPEC.md` (implementation)

This document describes *what* the product does and *why*, in language a non-developer
should be able to follow. It does not describe how it is built.

---

## 1. Purpose

One place where every assessed component in Irish senior cycle lives — the Additional
Assessment Components (AACs), orals, practicals, coursework and mocks — with a view for
teachers of who is on track, and a view for school leaders of how a year group is doing.

It is deliberately **not** a replacement for Google Classroom, Microsoft Teams, VSware or
Aladdin. It is the layer above them. Those systems are organised per subject; none of
them can show a sixth year everything they are being assessed on this year in one place.

## 2. Why it exists now

Senior Cycle Redevelopment gives every redeveloped subject an Additional Assessment
Component worth at least 40% of the grade, rolling out subject by subject to 2029.
Coursework has moved from something a few subjects did to something nearly every student
has several of. Existing products (StudyClix, grinds, past-paper sites) are about exam
*content*. Nobody has built the *workflow*.

## 3. Glossary

For readers who aren't deep in the exam system.

| Term | Meaning |
|---|---|
| **SEC** | State Examinations Commission. Sets and marks the exams. Publishes the annual brief and the Coursework Rules and Procedures. |
| **NCCA** | National Council for Curriculum and Assessment. Writes the curriculum and the teaching guidelines. |
| **AAC** | Additional Assessment Component. The non-written-exam part of a subject's assessment — a project, investigation, practical or oral. |
| **Brief** | The SEC document issued annually setting the topic and rules for a subject's AAC. |
| **Completion date** | The date by which every candidate must have finished. Schools have no power to extend it. |
| **Submission date** | The later date by which the school sends the work to the SEC. |
| **Form P.2** | The SEC authentication form, signed by the student, then the class teacher, then the principal. |
| **Authentication** | The process by which a school satisfies itself that coursework is the student's own work. |
| **Investigative log** | A record the student keeps of their own process. Recommended by the NCCA, never submitted to the SEC. Called an inquiry log, engagement log or investigative folder in other subjects. |
| **Component** | Any assessed item that isn't the written paper: an AAC, an oral, a practical, a mock. |
| **Template** | Our national, reusable definition of a component — its stages, sections, rules and marks. |
| **Instance** | One class group's version of a template, with that teacher's own dates. |

## 4. Users and roles

| Role | Who | What they need |
|---|---|---|
| **Student** | 5th and 6th year student | One timeline of everything they're assessed on; a way to keep their log; help not losing marks on mechanical rules |
| **Teacher** | Class teacher for a subject | To see at a glance who is behind, without asking 30 people individually |
| **School leader** | Year head, deputy principal or principal — whoever the school puts in that seat | Whole-year-group status by subject, so they can see where a problem is forming |

A **role**, not a job title. One person can hold more than one — a year head normally
also teaches.

**Not a user: parents.** Deliberately excluded. Parents want grades, which the product
doesn't hold, and a student who knows a parent is watching will stop recording honestly,
which degrades the data the teacher relies on.

## 5. Access routes

Two, and the product must work under both.

1. **School licence.** The school buys; students and teachers use it free.
2. **Individual subscription.** A student (or their parent) subscribes where their school
   hasn't bought a licence.

**Consequence that runs through the whole spec:** a student account must work with no
school, no teacher and no class. Everything on the student side has to stand alone.
Teacher features enhance the experience; they must never be a precondition for it.

---

## 6. Functional requirements

Numbered for reference. "MUST" is required for the product to make sense; "SHOULD" is
intended but not load-bearing.

### 6.1 Accounts and enrolment

- **FR-1** A student MUST be able to create an account and use the product with no school
  and no class.
- **FR-2** A teacher MUST be able to create a class group, specifying subject, level
  (Higher/Ordinary) and year group.
- **FR-3** Creating a class group MUST generate a **join code** the teacher can read out
  or write on the board.
- **FR-4** A student MUST join a class by entering a join code. The system MUST NOT offer
  a browsable directory of schools or classes — that would let anyone enumerate a
  school's class groups.
- **FR-5** A join request MUST require teacher approval before the student appears in the
  class.
- **FR-6** Join codes MUST be expirable and regenerable, so last year's students can't
  rejoin.
- **FR-7** A student MUST have **one account across all subjects**. Joining a second
  class must not create a second identity. This is the single most important structural
  requirement in the product — without it there is no cross-subject view, and without the
  cross-subject view there is no product.
- **FR-8** A teacher MUST only see class groups they own.
- **FR-9** A school leader MUST be assignable to a school by an administrator, and MUST
  see all class groups in that school.

### 6.2 Student — timeline ("what's on")

The default screen. The thing that makes the product worth opening.

- **FR-10** The student MUST see a single chronological list of everything they are
  assessed on, across every subject: AAC milestones, orals, practicals, mocks, plus
  pushed class deadlines and their own added items.
- **FR-11** Each item MUST show days remaining and which subject it belongs to.
- **FR-12** The student MUST be able to switch between a week view and a month view.
- **FR-13** The student MUST be able to add their own items (a test, a personal deadline)
  that only they see.
- **FR-14** Items MUST be visually distinguishable by type, since a 40%-weighted
  milestone and a homework deadline are not the same thing.

### 6.3 Student — component detail

- **FR-15** For each component the student MUST see: its stages with the teacher's dates,
  the report sections, the formatting and length rules, and the mark allocation.
- **FR-16** The student MUST be able to tick checklist items themselves.
- **FR-17** The interface MUST make clear that ticks are self-reported and are not
  evidence of submission.
- **FR-18** Stage progression MUST NOT be enforced as linear. The NCCA states explicitly
  that the process is iterative and students move backwards and forwards between stages.
  No wizard that locks a student into sequence.
- **FR-19** Some checklist items MUST be markable as requiring teacher sign-off rather
  than student tick — for example conducting an experiment, which must happen under
  direct teacher supervision.

### 6.4 Student — log

The product's strongest single feature. See context document, Part 3 nugget 1.

- **FR-20** The student MUST be able to add short dated text entries against a component.
- **FR-21** Entries MUST support an optional reference URL.
- **FR-22** Entries MUST record when they were created and when last edited, and MUST NOT
  be silently back-dateable. The dated trail is the entire value — a log that can be
  filled in retrospectively proves nothing.
- **FR-23** The log MUST NOT accept file uploads, images or report drafts.
- **FR-24** The student MUST be able to read their whole log for a component in one view,
  since several subjects expect them to draw on it when writing the final report.
- **FR-24a** Visibility of the log MUST be controlled by the **student**, per entry.
- **FR-24b** New entries MUST default to visible to the teacher. Students generally want
  their teacher to see they are working, and a default of hidden would make the log
  useless for authentication in most cases.
- **FR-24c** Changing an entry's visibility MUST be a one-tap action, not buried in
  settings. The point of student control is that it is available in the moment they
  write something they'd rather keep to themselves.
- **FR-24d** Where an entry is hidden, the teacher SHOULD still see that an entry exists
  and when it was made, without its content. This keeps the record of *activity* intact
  even where the *content* is private — otherwise a hidden entry is indistinguishable
  from no entry, and the proof-of-work claim quietly stops being true.
- **FR-24e** The student MUST be told plainly, at the point of writing, who can see the
  entry. No inferring it from an icon.

### 6.5 Student — AI declaration builder

- **FR-25** The student MUST be able to record each use of an AI tool with the fields the
  SEC requires: tool name and version, developer or publisher, date generated, a
  description of how it was used, the prompt(s) used, and the shareable URL where one
  exists.
- **FR-26** The system MUST be able to output these as a formatted block the student can
  paste into their report as a dedicated section.
- **FR-27** The interface SHOULD state plainly that properly referenced AI material earns
  no credit in itself — credit is only for the use made of it.
- **FR-28** The interface SHOULD prompt the student that the SEC expects them to discuss
  proposed AI use with their teacher *before* starting coursework.

### 6.6 Student — reference builder

- **FR-29** The student MUST be able to record sources with: source type, the citation
  details for that type, and date accessed.
- **FR-30** The system MUST produce both an in-text citation and a reference list entry.
- **FR-31** The system MUST NOT enforce a formal style (APA, Harvard). The SEC requires
  only enough detail to authenticate the source.
- **FR-32** Recorded sources SHOULD be linkable from log entries, since the NCCA suggests
  the log is where research references are kept.

### 6.7 Student — length and format checker

- **FR-33** The student MUST be able to paste report text and get a word count against
  the limit for their subject and exam year.
- **FR-34** The count MUST apply the real exclusions: references, data tables, formulae
  and equations, and labels do not count.
- **FR-35** Where a subject defines per-section word budgets (Business: 200/400/600/300),
  the checker MUST show progress against each section, not only the total.
- **FR-36** The system MUST NOT persist pasted text. It is measured and discarded.
- **FR-37** The student SHOULD see the image limit for their subject, with the note that
  formulae and equations don't count toward it.

### 6.8 Student — coursework document link

- **FR-38** The student MUST be able to attach a URL pointing at wherever their report
  actually lives (Google Drive, OneDrive, school system).
- **FR-39** The system MUST NOT upload, fetch, mirror or cache the document.
- **FR-40** The interface SHOULD remind the student that the SEC recommends keeping their
  own backup.

### 6.9 Student — planner and study log

- **FR-41** The student SHOULD be able to record their class timetable.
- **FR-42** The student SHOULD be able to log a study session with minimum friction —
  pick subject, start, stop. No forms, no topic tagging, no mood rating.
- **FR-43** The student SHOULD be able to set a target number of hours per week per
  subject.
- **FR-44** The system SHOULD show hours logged against those targets and surface
  neglected subjects.
- **FR-45** Any nudge MUST be non-punitive. Streaks that break cause abandonment; a
  neutral "you haven't done French in a while" does not.

### 6.10 Teacher — setting up a component

- **FR-46** A teacher MUST be able to create a component for a class group by choosing a
  template and the relevant exam year's brief.
- **FR-47** The system MUST pre-fill a suggested stage schedule derived from the
  indicative hours in the NCCA guidelines, working back from the completion date.
- **FR-48** The teacher MUST be able to change stage dates, rename stages, add their own
  stages and checkpoints, and map stages to report sections.
- **FR-49** The system MUST reject any teacher-set date after the SEC completion date.
  This is not a nicety: the SEC rules state school authorities have **no discretion** to
  extend a completion date for any candidate or group.
- **FR-50** Teacher edits to an instance MUST NOT propagate back to the template.
  Corrections to national rules MUST propagate forward to live instances.

### 6.11 Teacher — class progress

- **FR-51** The teacher MUST see a grid of students against checklist items, showing tick
  status and date.
- **FR-52** The grid MUST sort so that students furthest behind appear first.
- **FR-53** The teacher MUST be able to record sign-off on items requiring it.
- **FR-54** The teacher MUST NOT see any student's coursework content — only status.

### 6.12 Teacher — push to students

- **FR-55** The teacher MUST be able to push a **class deadline**: a title, a due date, a
  type (homework, assignment, test, other), and optionally a link to wherever the work
  was actually posted.
- **FR-56** The teacher MUST be able to push a **revision recommendation**: a short line
  of guidance and an optional target date, landing in the student's planner.
- **FR-57** Both MUST be targetable at the whole class or a chosen subset.
- **FR-58** The teacher SHOULD see who has marked a recommendation as done.
- **FR-59** The system MUST NOT provide notes hosting, assignment submission or marking.
  A title, a date and a link — never content.
- **FR-60** Pushed items MUST be fully useful without the link, since a Classroom or Teams
  deep link will not resolve for a student outside that school's account.

### 6.13 Teacher — supervised session scheduling

- **FR-61** For components whose practical work must happen under supervision, the teacher
  SHOULD be able to create sessions with a capacity and assign students to them.
  (The NCCA notes a school may not be able to run more than eight experiments at once,
  so a class of 24+ needs several sessions — currently organised in a teacher's head.)

### 6.14 School leader

- **FR-62** A school leader MUST see, for a year group, the status of every class group on
  every component: on track, behind, not started.
- **FR-63** The default view MUST be aggregate — counts per class group, not individual
  students' checklist detail or logs.
- **FR-64** Drilling into an individual MUST be a deliberate action, not the landing page.
- **FR-65** The view MUST be comprehensible without subject knowledge. The SEC states
  explicitly that the principal's role concerns the process and that they "do not require
  any subject specific knowledge".

### 6.15 Notifications

- **FR-66** Students SHOULD receive reminders ahead of deadlines, with the lead time
  configurable by them.
- **FR-67** Notification volume MUST be conservative. An app that emails a teenager daily
  gets muted, and a muted app is a churned one.

---

## 7. Business rules

These are invariants, not preferences.

1. Checklist ticks are **self-reported**, not evidence of submission. Say so in the UI.
2. Teacher-set dates must fall on or before the SEC completion date. Hard validation —
   schools have no power to extend.
3. No component instance without a template. No free-text components in the first
   release.
4. Teachers see only their own class groups. School leaders see their school in
   aggregate by default.
5. Students never see other students' progress.
6. **No student file storage anywhere in the system.** Documents are referenced by URL
   only — never uploaded, fetched, mirrored or cached. The word counter measures pasted
   text and discards it.
7. The school is the data controller; the product is a processor. Individual subscribers
   are a separate case and unresolved.
8. Rule corrections propagate from template to live instances. Structure and dates never
   do — nobody should be able to move a class's deadlines from a laptop mid-term.
9. Stage progression is never enforced as linear.
10. The product is never the official submission route. The SEC chain runs student →
    class teacher → school authority → Schools Portal, with no third-party step.

---

## 8. Deliberately out of scope

| Not building | Reason |
|---|---|
| Coursework file hosting | Compliance cost is paid in full the moment one school enables it; losing a file means a student losing 40% of a subject |
| Official SEC submission | Not possible — no third-party step exists in the chain |
| Notes hosting, assignment submission, marking | That is Classroom/Teams and always will be |
| Parent dashboards | Parents want grades; visibility degrades honest recording |
| Student-entered grades or predicted points | Rejected — unreliable data, and holding grades raises the sensitivity of everything |
| Past paper or exam content hosting | Copyright, cost, and a crowded field |

---

## 9. Non-functional requirements

- **Mobile-first for students, desktop-first for teachers.** Different problems: a
  student checks a timeline on a phone between classes; a teacher scans a 30×12 grid on
  a laptop. Don't build one responsive compromise.
- **Load is spiky and predictable** — September, February mocks, deadline weeks. Trivial
  volumes by web standards. Term-time only; near-dead June to August.
- **Accessibility:** the SEC provides reasonable accommodations for students with
  additional needs. Meeting WCAG 2.2 AA is both right and a likely procurement question.
- **Irish-language interface:** not required initially, but Gaelscoileanna exist and it
  will be asked about. Don't hardcode English strings.
- **Availability:** deadline weeks are the moments that matter. Downtime in late February
  is far worse than downtime in October.

---

## 10. Open questions

| # | Question | Blocks |
|---|---|---|
| OPEN-2 | Authentication for individual subscribers with no school identity | Individual tier launch |
| OPEN-3 | Pricing for both tiers and how they relate | Commercial launch |
| OPEN-4 | Whether teachers will enter deadlines that already exist in Classroom | Whether FR-55 is worth building before an import exists |
| OPEN-5 | Who reviews template content for subjects outside Biology | Template rollout beyond the sciences |
