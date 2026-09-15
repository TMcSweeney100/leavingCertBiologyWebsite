# Leaving Cert AAC Platform — Project Context

**Purpose:** paste this at the start of a new Claude session so it has the full picture
without re-explaining. Two parts: (1) where the product thinking has got to,
(2) a factual reference on the SEC/NCCA coursework rules, extracted from primary
documents.

**Last updated:** September 2026
**Prototype live at:** https://www.leavingcertaac.com (BiPi Schedule Hub, single class, Biology)

---

## PART 1 — PRODUCT CONTEXT

### One-line pitch

One place where every assessed component in senior cycle lives — the AACs, orals,
practicals, coursework — with a view for teachers of who's on track. Not a replacement
for Google Classroom or VSware. The layer above them that neither of those can be.

### Origin

Started as a schedule hub for one Biology teacher's (the author's partner's) BiPi class
at a school in Wicklow. Question under examination: can it become a commercial product.

### Why now

- Senior Cycle Redevelopment: every redeveloped subject gets an Additional Assessment
  Component (AAC) worth ≥40%. Rolling out in tranches, all subjects revised by 2029.
- Tranche 1 (from Sept 2025): Biology, Chemistry, Physics, Business, Arabic, Latin,
  Ancient Greek. First exams 2027.
- ~70,000 LC candidates/year, 730+ second-level schools.
- Existing players (StudyClix, grinds, Examlearn) are all about exam *content* —
  notes, past papers, marking schemes. Nobody has built coursework *workflow*.
- Long-standing coursework already exists in History, Geography, Home Ec, Construction
  Studies, Engineering, DCG, Art, Music, Ag Science, LCVP, LCPE, plus language orals.
  So the "everything assessed in one timeline" view has content from day one, not 2029.

### Business model — NOT FINALISED

Still open on pricing, but the shape is now settled: **both routes exist.** A school can
buy a licence covering its students, and a student whose school hasn't bought one can
subscribe individually. The author has ruled out parent-facing dashboards (see decisions
table) — that is separate from a parent paying for their own child's access.

Unsettled: price points for each tier, how they relate, and which one leads.

Design consequence worth carrying into the model: a student account must work with no
school licence and, in some cases, no class enrolment at all. That means the deadline
view, the log, the planner and the AI declaration builder have to stand alone without a
teacher present — which is a real constraint on how much of the product depends on
teacher setup.

Reference points gathered, not conclusions:
- StudyClix (nearest comparable) runs exactly this dual structure: free for teachers, a
  paid individual student tier, and a per-student school licence with volume and DEIS
  discounts, priced per academic year with no charge for TY students.
- AAC affects 5th + 6th years only, so ≈ 200–250 students per school.
- 730+ second-level schools nationally.
- School procurement is slow: roughly one buying window a year, ~spring for the
  following September. The individual tier has no such constraint — it can sell all year.

Unresolved, and the question the whole business turns on: does a deputy principal see
this as a purchase, or as a nice thing a teacher found? That is a conversation to have,
not a feature to build.

### The three engines (product needs all three)

1. **Deadlines** — every coursework component, oral, practical, mock across every
   subject, one timeline. Episodic use. This is what schools buy.
2. **The weekly loop** — teacher revision recommendations, teacher-pushed homework and
   assignment deadlines, student planner, past-paper log, study timer. Subject-agnostic,
   works for all 10 of a student's subjects immediately. This is what gets the app opened
   on a quiet Tuesday.
3. **Project detail** — stages, checklists, rules, word counter, investigative log.

Take one away and it's weak: deadlines alone = a nicer PDF; planner alone = MyStudyLife
with an Irish accent.

### Decisions made

Everything in this table is the author's own decision. Anything that is a suggestion,
an assumption, or still open is marked as such — do not treat unmarked recommendations
as settled, and do not add to this table on the author's behalf.

| Question | Decision |
|---|---|
| Who pays | **Two routes, both live.** Primary: the school buys a licence and students use it free. Secondary: a student (or their parent) subscribes individually where their school hasn't bought it — a student in a school with no licence should still be able to use it. Pricing and the relationship between the two tiers are not settled; see "Business model — NOT FINALISED" above. Note the consequence for the model: a student account cannot depend on a school licence existing, and some students will have no `Enrolment` at all. |
| Enrolment | Teacher creates class → **class join code** → student enters code → teacher approves. NOT a browsable public school/class directory (enumeration + identity risk). |
| Auth | School SSO (Google Workspace for Education / Microsoft 365) before multi-school. Invite codes acceptable for pilot only. Avoids personal Gmail accounts for minors. **Covers the school route only** — the individual-subscriber route needs its own answer, since those students have no school-provisioned identity and the school is not the data controller for them. Unresolved. |
| Student accounts | **One account across all subjects.** Non-negotiable — it's the whole differentiator. |
| Data stored | **Status, not content.** Checklist ticks + timestamps. No student coursework uploads, ever. School = data controller, product = processor, DPA signed. |
| Coursework documents | **DECIDED: store a link, not a file.** The student pastes the URL to wherever the report already lives (Google Drive, OneDrive, whatever the school runs). The app shows it alongside the deadline and checklist so it still feels like one place, but the file stays in the school's own system, under the school's own DPA and backups. A URL is not coursework. Rejected: hosting reports, even optionally — the compliance cost (DPIA, per-school DPA, encryption at rest, retention/deletion policy, breach procedure, SARs) is paid in full the moment one school enables it, regardless of uptake, and losing a file would mean a student losing 40% of a subject. Note also that the app can never be the official submission route — see "Submission procedure" below; the chain runs student → class teacher → school authority → SEC Schools Portal, with no third-party step. |
| Student log | **DECIDED: include it — and it is a headline selling point, not a supporting feature.** Three distinct arguments, to different buyers. (1) *Proof of work.* Timestamped entries built up week by week are evidence the student did the work themselves. They cannot be reconstructed after the fact, which is exactly what makes them worth something. (2) *Authentication and audit trail.* The teacher can review a student's log, and the log leaves a durable paper trail behind the Form P.2 signature that both teacher and principal have to give. SEC rules state that non-compliance can arise where a candidate "has not enabled the teacher to have adequate oversight" — so an absent trail is itself a risk, and this closes it. (3) *For the student.* It keeps them organised across a months-long project and is the document they draw on when writing the final report — which several subjects explicitly expect them to do. Scope: short text entries the student authors in the app, plus reference links. Never documents, images or report drafts. Recommended by the NCCA in every subject under a different name (investigative log / inquiry log / engagement log / investigative folder), never submitted to the SEC. See Part 3 nugget 1. **Two things to keep straight:** the SEC never sees the log, so the audit trail serves the teacher and principal who sign P.2, not the SEC — don't market it as an SEC-facing record. And teacher visibility is still an open UI question: Geography's guidelines tell teachers to review the log, but a log a student knows is read is a log written differently. Per-entry visibility, all-visible, or teacher-sees-only-that-entries-exist — unresolved. |
| Templates | **Author's position: deep templates for every subject.** Build order starts with Biology, then Chemistry/Physics (structurally identical to Biology), then Business (different structure). Open risk, not an agreed limit: content accuracy and annual maintenance — a wrong template costs a teacher's trust permanently, and there is no subject-expert reviewer lined up outside Biology. A shallow "name + due date" component type may still be needed as a fallback for subjects not yet templated. |
| Parent view | **Cut.** Parents want grades (which we don't hold), and students who know a parent watches will stop ticking honestly — poisoning the teacher's data. |
| School leader view | **IN SCOPE (no longer deferred).** A whole-year view for anyone above the class teacher — year head, deputy principal, principal, whoever the school puts in that seat. Do not model it as "year head": it is a **role**, not a job title, and different schools assign it differently. Shows, across a year group, where every class stands on each assessed component — on track / behind / not started — so a school leader can see that (say) Chemistry is slipping and go talk to the Chemistry teacher. Strongly supported by the SEC rules: the principal must "stand over the process applied to the completion of the coursework in each class", signs Form P.2 to verify that process, and explicitly "does not require any subject specific knowledge". That is a process-status dashboard described almost word for word — and it is the screen the person holding the budget actually looks at. |
| Teacher push — dates yes, content no | **REVISED.** The earlier "don't build, it's Google Classroom" call was too broad. The line is **content vs dates**. NOT built: notes, files, homework content, assignment submission, marking. That is Classroom/Teams and always will be. DO build: a teacher can push a **homework or assignment deadline** — a title, a date, optionally which students it applies to, and **optionally a link to wherever the work was actually posted** (the Classroom post, the Teams assignment, a doc). The student taps through from the timeline straight to the thing. Same link-not-file principle as coursework documents: a URL, never a copy. Plus *revision recommendations* ("revise 2.4 before Thursday"). These land in the student's week and month timeline alongside the AAC milestones, orals, practicals and mocks. Purpose is reminders, organisation, and perspective: a student looking at their week sees everything they owe in one place rather than per-subject silos. Consistent with the "status, not content" rule — a title and a date are not coursework. It also reinforces the core differentiator: Classroom is per-subject and has no concept of a February oral or a 40%-weighted investigation; this is the only view that holds all of it together. **Risk to watch:** if a school leans hard on Classroom, teachers may resent entering dates twice. Duplicate entry is what would kill this feature. The optional link helps here — it positions the product as a navigation layer over Classroom rather than a rival to it, and the teacher is pasting a URL she already has open. A Classroom/Teams import is the fuller mitigation later — not decided, not v1. **Caveat on links:** a Classroom or Teams deep link only resolves for someone signed into that school account, so it will be dead for an individual-tier student with no school identity. Treat the link as an enhancement, never as where the information lives — the title and date must stand alone. |
| Self-entered grades | Rejected by the author (students enter wrong things; don't want to hold grades). |

### Domain model

```
School
ClassGroup           (subject + level + year, e.g. "6A Biology HL")
Student, Teacher
Enrolment            (student ↔ class group, via join code + teacher approval)

ComponentTemplate    (national, authored centrally: BiPi, Business Alive, PAP...)
  └ ReportSection    (national, fixed — §1..§7)
      └ ChecklistItem
  └ SuggestedStages  (national where the SEC defines them)
  └ AnnualBrief      (CHANGES EVERY EXAM YEAR — topic, completion date, AND the
                      report rules: word count, image count, section headings,
                      file size. Confirmed by the Business guidelines: the SEC's
                      annual instructions carry these, which is why Business is
                      10 images and the sciences are 20.)

ComponentInstance    (template + annual brief + class group + teacher's real dates)
  └ Stage (name, date)      ← teacher's own scheduling
      └ covers ReportSection[]

StudentProgress      (student × checklist item, boolean + timestamp)
LogEntry             (student, component instance, text, timestamp, optional
                      reference URL — the investigative log / inquiry log /
                      engagement log. Text only, never files. Timestamps are the
                      point: this is the audit trail, so entries must record
                      created-at and edited-at and must not be silently
                      back-dateable. Teacher visibility: TBD.)
DocumentLink         (student, component instance, URL, label — a pointer to the
                      report wherever the school already stores it. URL only;
                      the app never fetches, mirrors or caches the file.)
Recommendation       (teacher → students, text, target date — revision guidance,
                      lands in the student's planner)
ClassDeadline        (teacher → class group or subset: title, due date, type
                      (homework | assignment | test | other), optional source URL.
                      Title, date and a link — never content, files or submissions.
                      The URL points at wherever the work was actually posted
                      (Classroom, Teams, a doc) so the student can tap through; it
                      is never fetched or mirrored, and may not resolve for students
                      outside the school's account, so the record must be useful
                      without it. Appears in the student timeline beside AAC
                      milestones, orals, practicals and mocks.)

Role                 (user × school × role type: student | teacher | school_leader.
                      school_leader is a role, not a job title — year head, deputy
                      principal or principal, as the school decides. One person can
                      hold more than one: a year head usually also teaches.)
StudySession         (student self-logged: subject, minutes)
SubjectPriority      (student: target hours/week per subject)
```

**Why checklist items hang off report sections, not stages:** sections are national and
stable; stages are national in the sciences but teachers restructure how they map to
their calendar. Anchoring to sections means "§3 Designing and Planning complete" means
the same thing in every school — which is what makes cross-school rollup possible later.

### Business rules

1. Checklist ticks are **self-reported**, not evidence of submission. The teacher UI
   must say so explicitly.
2. Teacher-set dates must fall on or before the SEC completion date. Hard validation —
   and note this is not just prudence: the SEC rules state school authorities have no
   discretion to extend completion dates for any candidate or group.
3. No ComponentInstance without a template. No free-text components in v1.
4. Teachers see only their own class groups. School leaders see their whole school but
   **aggregate by default** — counts and status per class group, not individual students'
   checklist detail or logs. Drilling into an individual should be a deliberate,
   justifiable action, not the landing page; the principal's remit is the process, not
   the subject work.
5. Students never see other students' progress.
6. No student file storage anywhere in the system. Coursework documents are referenced
   by **URL only** — never uploaded, fetched, mirrored or cached. Engineering and
   Construction Technology design folios are the assessed artefact itself and are the
   worst case of all: link only, no exceptions. The word/image counter operates on
   pasted text in the browser and must never persist what it counts — easy to breach by
   accident, so keep it explicit in the code.
7. **Rule corrections propagate** from template to live instances (central maintenance
   is the point). **Structure and dates never propagate** — you must not be able to
   shift a class's deadlines from your laptop mid-term.
8. Stage progression must NOT be enforced as linear — the NCCA explicitly says the
   process is iterative and students move backwards and forwards between stages.

### Open questions

- Does a deputy principal think this is a *purchase* or *a nice thing a teacher found*?
  That's the whole business in one question, and it's a conversation, not a feature.
  Bringing the school leader view into scope makes it partly testable rather than purely
  conversational — there is now a screen to put in front of that person.
- Smallest test: build the teacher recommendation loop into the existing site, give it
  to 3–4 teachers in one school, and watch one number — **do students open it in a week
  when nothing is due?**

### Known risks

- Policy is still moving: who marks the AAC (teacher vs SEC) has already shifted once,
  and AI rules are still being finalised. Schools will be cautious buyers.
- Content maintenance is the real cost, not engineering. A wrong template is worse than
  a missing one — the teacher who spots the error never trusts the product again.
- Briefs change annually. Anything encoding a topic or a completion date must be
  versioned by exam year.

---

## PART 2 — SEC / NCCA REFERENCE

Extracted from: SEC sample briefs (Biology, Chemistry, Physics, Business 2027),
NCCA *Guidelines to support the Biology in Practice Investigation* (Nov 2024),
LCPE *Guidelines for the Physical Activity Project* (Jan 2019), and the subject
specifications for Biology, Chemistry, Physics, Geography, Engineering.

### Weightings — NOT all 40%, and NOT one per subject

| Subject | Component(s) | Weight | Est. hours | Brief issued |
|---|---|---|---|---|
| Biology | Biology in Practice Investigation | 40% (200 marks) | ~20 | Term 2, Yr 1 |
| Chemistry | Chemistry in Practice Investigation | 40% (200) | ~20 | Term 2, Yr 1 |
| Physics | Physics in Practice Investigation | 40% (200) | ~20 | Term 2, Yr 1 |
| Business | Business Alive Investigative Study | 40% (200) | ~20 | Term 2, Yr 1 |
| Geography | Applied Geography Project | 40% | up to 20 | Term 2, Yr 1 |
| Engineering | Design and Manufacture Project | **50%** | up to **45** | **Term 1, Yr 2** |
| Physical Education | Physical Education Project | **50%** | ~17–24 | Common brief |
| Construction Technology | **Exploring the Constructed Environment** | **30%** | up to **35** | **Term 1, Yr 2** |
| Construction Technology | **Craft Skills Assessment** | **20%** | 3-hour sitting | Prescribed task, Term 3 Yr 2 |

Do not hardcode "40%", "200 marks", or "one AAC per subject".

**Two structural facts that break naive models:**

1. **Construction Technology has TWO additional assessment components**, not one:
   a design-folio-and-artefact project (30%, common brief) *and* a Craft Skills
   Assessment (20%) sat as **one uninterrupted three-hour session in the classroom** in
   term 3 of year 2, against a prescribed task rather than a brief. Written exam is 50%.
   So `ClassGroup → ComponentInstance` must be one-to-many.

2. **Brief timing is not universal.** Tranche 1 sciences, Business and Geography get the
   brief in **Term 2 of Year 1** (spring of 5th year). Engineering and Construction
   Technology get it in **Term 1 of Year 2** (autumn of 6th year). The app's year cycle
   cannot assume a single start point.

**Note on LCPE:** the redeveloped **Physical Education Project is 50%** (Dec 2025
guidelines) and supersedes the 2019 **Physical Activity Project**, which was 20% and one
of three components. If both documents are in the folder, the 2019 one is the old
regime — don't build from it.

### Report rules — Bio / Chem / Physics (identical across all three)

- **Sections (7):** 1 Title and Introduction · 2 Background Research ·
  3 Designing and Planning · 4 Conducting the Experiment · 5 Data and Data Analysis ·
  6 Conclusions · 7 References
- **Word limit:** 1,500. Excludes references, data tables, formulae/equations, labels.
- **Image limit:** 20. Formulae and equations do NOT count toward it. No videos.
- **Headings:** Arial, black, 14pt, bold. Each section numbered, starts on a new page.
- **Body:** Arial, black, 12pt, 1.5 line spacing.
- **Permitted:** bold, italics, numbering, bullets.
  **Not permitted:** coloured text, highlighting, any font other than Arial.
  (Note: the current live site overstates this — it says "no other fonts, black text
  only" without listing what IS allowed.)
- **Margins:** 20 mm all four sides. Portrait only. Page numbers bottom-centre.
- **Marks:** A = 50 (Title/Intro, Background Research, References) · B = 50 (Designing
  and Planning, Conducting) · C = 50 (Data/Analysis, Conclusions) · D = 50 (Scientific
  Literacy — assessed across the whole report, not a section).

### Report rules — Business (DIFFERENT, don't copy the science template)

- **Sections (5):** 1 Introduction · 2 Investigation and Findings ·
  3 Analysis and Evaluation · 4 Conclusions · 5 References
- **Word limit:** 1,500 — but with **per-section suggested counts**:
  200 / 400 / 600 / 300. This is a better UX than one total.
- **Image limit: 10**, not 20. Images must be labelled (figure 1, figure 2…).
- **Marks:** Introduction 20 · Investigation/Findings/Analysis/Evaluation 100 ·
  Conclusion 30 · Overall Coherence 50 (not a section — awarded across the report).
- **Stages (6):** Getting Started · Developing a question to research ·
  Developing a project plan · Identifying sources and gathering information and data ·
  Analysis and evaluation · Applying learning and drawing conclusions.
  Then "Compilation of the final report".
- **Indicative hours:** S1 2–3h · S2 1–2h · S3 1–2h · **S4 + S5 combined 6–8h** ·
  S6 1–2h · compilation 2–3h. Total ~20h.
  Note S4 and S5 are given as a single combined range — hours-per-stage cannot be a
  required field on the model.
- **Two continuous bands run across all six stages**, per the NCCA figure:
  *Reflecting and refining* (above) and *Monitoring and evaluating* (below). They are
  not stages. Same anti-linear point as the sciences.
- Calls the log an **investigative folder**, not a log. Same idea.
- The brief itself carries: the theme, submission protocols (word count, file size, file
  type), authentication instructions, a description of the process, and a broad outline
  of mark allocations.

### Stages by subject — every subject differs

The six-stage science model is NOT the norm. Stage counts, names and hours all vary.

**Biology / Chemistry / Physics — 6 stages, ~20h** (VERIFIED identical across all three:
the Nov 2024 guidelines are word-for-word the same on stages, hours, the lab-session
bottleneck and the teacher non-intervention rules. One template covers all three.)
Initial Response to the Brief (1–2h) · Background Research (2–3h) · Designing and
Planning (2–3h) · Conducting the Experiment (variable) · Data Analysis and Conclusions
(1–2h) · Finalising the Report (up to 4h)

**Business — 6 stages + compilation, ~20h**
Getting Started (2–3h) · Developing a question to research (1–2h) · Developing a project
plan (1–2h) · Identifying sources and gathering information (**S4+S5 combined 6–8h**) ·
Analysis and evaluation · Applying learning and drawing conclusions (1–2h) ·
Compilation of the final report (2–3h)

**Geography — 7 stages, ~20h**
Considering the brief (up to 1h) · Formulating the inquiry question (3–4h) ·
Considering evidence collection (2–3h) · Collecting evidence · Analysing and
communicating (2–3h) · Evaluating evidence and reflecting on findings (1–2h) ·
Finalising the Report

**Engineering — 6 stages, ~45h**
Analysis of Brief, Brainstorming and Developing a Work Plan (3h) · Identify the focus of
enquiry/research (6h) · Development of an Optimum Solution (12h) · Manufacture of
Physical Model (16h) · Testing, Evaluating and Refining (4h) · Finalising Physical Model
and Design Folio
Deliverable is **a physical model plus a design folio**, developed in parallel — not a
report. Model and folio are retained in the school.

**Construction Technology (Exploring the Constructed Environment) — 5 stages, ~35h**
Explore and Investigate (4–5h) · Design Solution (4–5h) · Plan of manufacture (2–3h) ·
**Manufacture (18–20h)** · Evaluate and Reflect (1–2h)
Deliverable is a **design folio and an artefact**. Manufacturing must happen in the
Construction Technology classroom. Process framed as "My Design Journey", explicitly
iterative.

**Physical Education — 5 stages, ~17–24h**
Exploring the Brief (1–2h) · Developing a plan for engagement (3–5h) · Practically
engaging with the plan (**8–10h, spread over consecutive weeks**) · Analysis and
Evaluation (2–3h) · Presentation of project (2–4h)
Evidence includes video, performance data and an **engagement log**.

Implication for the model: hours-per-stage must be optional and range-valued, and must
be able to span more than one stage (Business S4+S5).

### Submission procedure (national, 6 steps — same in Bio/Chem/Physics/Business)

1. Convert report to PDF.
2. **Print the PDF and proof-read it.** Anything not visible on the printed copy is not
   visible to the examiner and scores nothing. ← mark-losing trap, worth surfacing hard.
3. Submit the digital version to the class teacher (naming convention comes from an
   annual SEC Schools Portal circular).
4. School authority retains a printed AND digital copy until appeals are complete.
5. Student signs **SEC Authentication Form P.2** — teacher AND principal also sign.
6. School authority submits via the Schools Portal.

Also: the SEC provides a **.docx cover page** which must be the first page. The SEC does
NOT provide a report template — formatting is the candidate's responsibility.

### SEC Coursework Rules and Procedures (the cross-subject rulebook)

Published annually (current: 2025-2026). Every subject brief points to it. This is where
the binding rules live, as opposed to the NCCA's teaching guidance.

**Coursework is defined broadly:** a digital or written submission, a physical artefact,
a portfolio, an audio-visual submission, or a task — or any combination. So the model
must not assume "a report".

**Completion date vs submission date.** A formal distinction:
- *Completion date* — by which all candidates must have finished all coursework.
- *Submission date* — by which it must reach the SEC.
- **School authorities have NO discretion to extend a completion date** for any
  individual or group. Extensions exist only by application to the SEC, supported by
  evidence, before the deadline (coursework@examinations.ie).
- The SEC reserves the right to check with schools that coursework was completed and
  lodged with the school authority by the completion date.
→ This makes business rule 2 enforceable rather than merely sensible.

**Form P.2 — a three-signature chain, in order:**
1. Candidate signs, confirming the work is their own individual authentic work.
2. Class teacher signs, confirming the same after the authentication process.
3. Principal signs, verifying the *process* was followed.

Critically: "As the principal's role is concerned with the process for the completion of
the coursework, **they do not require any subject specific knowledge**." That is an
unusually direct argument for the deferred year-head/principal view — it wants process
status, not subject content, which is exactly what this product holds.

If the work cannot be authenticated, the teacher and principal must notify the candidate
and follow the **P.20 Report of Inauthentic Coursework** process (Section 18.1).

**Appendix 9 — where coursework may be done.** Practical work in a named list of
subjects (Biology, Chemistry, Physics, Engineering, Construction Studies, PE, Art,
Home Ec, Ag Science, DCG, Technology, Computer Science, Geography field trip, LCVP
enterprise visit) **must** be completed in the supervised setting — "there are no
exceptions to this". But these may be done outside it, subject to teacher oversight:
- initial and ongoing research
- identifying relevant research sources
- **planning of sequencing and timelines**
- "write ups"

→ The planner is explicitly on the permitted list. Worth knowing when a teacher asks.

**Teacher conduct rules (binding, not advisory):** teachers must not "over-assist or
over-direct" candidates, and must be "objective in authenticating... and not coerced by
others". Non-compliance also arises if a candidate "has not enabled the teacher to have
adequate oversight" — i.e. an absent evidence trail is itself a problem, which is the
strongest argument for the log.

**Seven authentication scenarios** cover external candidates, host schools, private
centres and home tuition. Edge cases for the enrolment model — some candidates do
coursework in a school other than the one entering them for exams. Not v1, but don't
model enrolment so rigidly that these become impossible.

**Scale datapoint:** Schools Portal uploads went from ~35,000 items in 2024 to over
85,000 in 2025 (after digital coursework arrived in History, Geography, Home Ec and
Religion). Eight new coursework components land in 2026/27.

### Timeline anchors

- **Brief published annually by the SEC in Term 2 of Year 1** (i.e. spring of 5th year)
  for Bio/Chem/Physics/Geography. So the app's year cycle starts there.
- Completion date set by the SEC and communicated via circular; it appears in the brief.
- LCPE PAP: runs an 8–10 week block, early October to mid-December of 6th year.
- No sample briefs published yet for Geography or Engineering (tranche 2+).

---

## PART 3 — FEATURE NUGGETS FOUND IN THE DOCUMENTS

Things buried in the official docs that make good, defensible features.

### 1. The student log — the single best one, and it is UNIVERSAL

Every subject has one, under a different name, and in every case it is (a) recommended,
(b) not submitted to the SEC, and (c) tied to teacher authentication:

| Subject | Name |
|---|---|
| Biology / Chemistry / Physics | investigative log |
| Business | investigative folder (+ project plan, Appendix Two) |
| Geography | **inquiry log** |
| Physical Education | **engagement log** / activity log |
| Engineering | design folio (NOTE: this one *is* submitted and marked) |
| Construction Technology | design folio (also submitted and marked) |

Biology: "strongly encouraged… **You should not submit your log to the SEC.**"
Geography: the inquiry log is a personal document, not submitted to the SEC.

**Geography goes furthest, and this is the key find:** it instructs that *teachers should
review students' inquiry log* at stage 2, and it repeats the same prompt at every single
stage — "Using my inquiry log, have I documented the decisions I made during this stage".
So the log is not a side note there; it is the spine of the process, with a
teacher-review checkpoint written into the guidelines.

Why this is the strongest feature:
- Officially sanctioned across every subject — not an invented workflow.
- Explicitly NOT submitted → not coursework, outside the SEC submission chain.
- Almost nobody actually keeps one (it means a separate notebook for months).
- It is exactly the evidence a teacher needs to sign Form P.2, and it cannot be produced
  retrospectively. That last point is the whole value: a dated trail built up week by
  week is proof of work precisely because it can't be faked afterwards.
- The SEC rules make an absent trail a risk in itself — non-compliance can arise where a
  candidate "has not enabled the teacher to have adequate oversight of the completion of
  their coursework". The log closes that gap.
- And it earns its place for the student independently of any of that: it keeps them
  organised over a months-long project, and it is the document they draw on when writing
  the final report — which Biology, Business and Geography all explicitly expect.

**Who the audit trail is for.** The teacher and the principal, who both sign Form P.2 —
not the SEC, which never sees the log. Worth being precise about this in any pitch: the
product makes the school's own authentication defensible, it does not create an
SEC-facing record.

Scope discipline: short text entries + reference links only. No documents, no images,
no report drafts. **Important exception:** Engineering and Construction Technology
folios are the assessed artefact itself — never store those.

### 2. Reference builder / AI citation helper

Appendix 1 of the NCCA Biology guidelines gives explicit citation formats — including
for AI tools, with and without a shareable URL. Referencing is directly marked
(part of the 50-mark A band) and the reference section doesn't count toward the word
limit. A simple "add a source → get a formatted reference" tool maps 1:1 onto
something that is both marked and universally fiddly.

**Confirmed shared across subjects.** Business Appendix Four is essentially the same
document as Biology Appendix 1, down to the same worked example. So this is ONE
component, not one per subject.

Note: "No particular, formal style of referencing is required" — so don't force APA.
The requirement is enough detail to authenticate the source.

Business also supplies the input form for it (Appendix Three, "Managing research and
information"): **Source of information / Date accessed / Key information**, plus prompts
on relevance and reliability.

### 2b. Business Appendix Two — a project plan FORM (strongest single find)

Better than the Biology investigative log for building purposes, because it is a
structured form rather than a blank text box. Six fields, each with NCCA-supplied
prompt questions:

**Objectives · My role · Resources · Time schedule · Possible risks · Ongoing
monitoring and evaluation**

Same standing as the Biology log — not submitted to the SEC, but:
- "Sharing the plan with the teacher is an important step in the ongoing authentication
  process."
- Students are expected to refer back to it in the report, reflecting on and evaluating
  the extent to which their planning supported the study. That reflection is marked
  (Overall Coherence, 50 marks).

So it is simultaneously: authentication evidence, a planning tool, and a direct input to
marks. Six prompted fields is a screen. "Keep a log" is a text area nobody fills in.

### 2c. Business Appendix One — SMART research-question refiner

Five rows (Specific / Measurable / Achievable / Relevant / Timebound), each with prompt
questions for narrowing a research question against the year's theme. Stage 2 in a box.

### 3. Word/image counter with the real exclusion rules

Not a naive word count. Must exclude references, data tables, formulae, labels; and
for images, exclude formulae/equations from the limit. Pasted locally, never stored.
Business needs a *per-section* budget (200/400/600/300), not just a total.

### 4. Lab session scheduler (Biology, from NCCA guidelines)

> "it may not be feasible to have any more than **eight experiments** happening at any
> one time and so **three experiment sessions** may be needed for this stage."

Stage 4 is the genuine bottleneck: it must happen under direct teacher supervision, and
a class of 24+ won't fit in one lab session. Scheduling students into lab slots is a
concrete, painful, teacher-facing job that nothing currently solves.

### 5. Teacher-gated checkpoints

Stage 4 cannot be a student self-tick — the experiment must be conducted under the
teacher's direct supervision in a safe setting. Some checklist items need a teacher
signature, not a student tick. (The author's partner also gates the safety assessment
before any practical work — that one is her own addition, not national.)

### 6. "What the teacher may and may not do" reference

Useful because teachers are visibly anxious about it and it's scattered across documents:
- Teachers must NOT intervene at Stage 4 if a student is using equipment incorrectly
  (but safely), not properly recording observations, or making experimental errors.
  They intervene only if the design is unsafe.
- Teachers must NOT correct or edit draft reports for redrafting.
- Feedback must be "general and non-directive."
- Students have ownership of their experimental design.

### 7. Submission checklist with the proof-read trap

The 6-step submission procedure (above) is national, mechanical, and has real
consequences. Step 2 in particular — print it, check nothing is cut off — is the kind of
thing students skip and lose marks on. Cheap to build, applies to every student in the
country.

### 8. Consent forms (LCPE, and any video/photo component)

LCPE PAP requires signed parental consent AND young-person consent where another student
appears in video/photographs, plus a Teaching Council–registered teacher present at any
external recording. The NCCA publishes sample letters (Appendices A and B). A
"which consents are outstanding for which students" tracker is a real administrative
burden that currently lives in a teacher's head.

### 9. AI declaration builder — a defined form, straight from the SEC

Appendix 2 of the Coursework Rules and Procedures is unusually prescriptive, which makes
it directly buildable. AI use must be documented in a **dedicated section of the
coursework (e.g. an appendix)** with:

- name and version of the AI tool (e.g. "ChatGPT-3.5", "Microsoft Copilot GPT-4")
- developer or publisher (OpenAI, Microsoft…)
- date the output was generated
- brief description of how it was used ("used to refine initial research notes")
- the prompt(s) used
- the shareable URL or session link, where the tool generates one

**Permitted uses:** gathering background information from credible sources; structuring
coursework plans; clarifying research material. Candidates must critically evaluate AI
output for accuracy, bias and hallucination.

**Prohibited:** generating coursework content, responses or creative elements; copying
or paraphrasing AI-generated material.

**Two rules worth surfacing to students:**
- Properly referenced AI material earns **no credit in itself** — credit is only for the
  use made of it in developing the candidate's own work. Same as any quoted material.
- Candidates "should discuss the proposed use of any AI tools with their class teacher
  **before** they undertake their coursework" — a teacher-side conversation that
  currently has no home anywhere.

Penalties for misuse: loss of marks for the component, loss of the subject, loss of the
entire examination in all subjects, or debarment from the certificate examinations in
subsequent years.

Six defined fields, set by the SEC, tied to the heaviest penalties in the system, and
sitting next to the reference builder that shares most of its inputs. This is the
strongest build-now item across every document held.

### 10. Individualisation warning

Repeated across subjects: where more than one student in a class works on a similar
investigation, each must take an individualised approach. A teacher-side view of
"how many of my students picked overlapping research questions" would be genuinely
novel — though it needs student-entered research questions, which is content, so weigh
it against the no-content rule.

---

## Source documents held

- `EN-EX-74358952.pdf` — SEC Sample Brief, Biology in Practice Investigation 2027
- `EN-EX-61324862.pdf` / `EN-EX-61375663.pdf` / `EN-EX-16382013.pdf` — SEC Sample Briefs:
  Chemistry, Physics, Business (2027)
- `Coursework_Rules_and_Procedures_For_2025_2026.pdf` — SEC, the cross-subject rulebook
  (annual; check for a newer edition each year)
- `AAC_Guidelines_Biology_Final.pdf` — NCCA Guidelines, BiPi, Nov 2024
- `AAC_Guidelines_Chemistry_Final.pdf`, `AAC_Guidelines_Physics_Final.pdf` — NCCA,
  Nov 2024 (identical in substance to Biology)
- `LCPE_AssessmentGuidelines_PAP_EN.pdf` — NCCA Guidelines, LCPE Physical Activity
  Project, Jan 2019 — SUPERSEDED, old regime, do not build from it
- `GuidelinesAAC_EN.pdf` — NCCA Guidelines, LCPE Physical Education Project, Dec 2025
- `Guidelines-to-support-the-Applied-Geography-Project.pdf` — NCCA, Dec 2025
- `AAC_Guidelines_Engineering_EN.pdf` — NCCA, Dec 2025
- `Guidelines-to-support-the-Additional-Assessment-Components-in-Leaving-Certificate-Construction-Technology.pdf` — NCCA, Dec 2025
- `AAC_Guidelines_LCBusiness_November-2024_EN.pdf` — NCCA Guidelines, Business Alive
  Investigative Study, Nov 2024
- `SC-BIOLOGY-Spec-ENG.pdf`, `SC-Business-Spec-ENG.pdf`, `SC-Chemistry-Specification-EN.pdf`,
  `SC-PHYSICS-Spec-ENG-INTERACTIVE.pdf`, `SC-Geography-Spec-ENG-INT.pdf`,
  `SC-Engineering-Spec-ENG-INT.pdf` — subject specifications

### Who publishes what

- **SEC** — State Examinations Commission. Sets and marks the exams. Publishes the
  annual **brief** per subject: topic, word/image limits, formatting rules, mark
  allocation, submission procedure, completion date.
- **NCCA** — National Council for Curriculum and Assessment. Writes the curriculum.
  Publishes the **specification** (the course itself) and the **guidelines** (how the
  AAC is actually run: stages, indicative hours, what the teacher may and may not do).

So each subject has two documents that matter. Currently held: SEC briefs for Biology,
Chemistry, Physics and Business; NCCA guidelines for Biology, Business and LCPE.

**Where to find them:** curriculumonline.ie → Senior Cycle → Senior Cycle Subjects →
[subject]. The guidelines are a plain text link in the small "i More info" list near the
top of the page — NOT among the large download tiles, which are the specification and
the old syllabus. Filenames follow the pattern `AAC_Guidelines_<Subject>_*.pdf`.

### Still to source, in priority order

1. **SEC sample briefs for the tranche 2 subjects** (Geography, Engineering,
   Construction Technology, PE) — guidelines are now held, briefs are not. Note
   Engineering and Construction briefs issue in Term 1 of Year 2.
2. **Annual SEC Schools Portal circular** on PDF file naming — needed only if the app
   ever surfaces submission mechanics.

Document gathering is now essentially complete. Further reading is not what the project
is short of.
