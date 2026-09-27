---
name: plan-feature
description: Turn a user story or problem statement into an agreed implementation plan in docs/plans/. Interviews the user with clarifying questions first, explains the approach and the patterns involved, then writes a self-contained plan file. Use when given a user story, an issue, a bug description, or "I need to do X".
disable-model-invocation: true
---

# Plan a feature

Input: a user story, issue, or problem statement — `$ARGUMENTS`.
Output: an agreed plan at `docs/plans/<slug>.md`. **No production code is
written in this skill.** If you are in Claude Code, stay in plan mode.

The user is an early-career engineer who uses agents to go faster, not to
skip understanding. Teaching is part of the job, not a nice-to-have.

## 1. Orient before asking
Read enough to ask *good* questions, not obvious ones:
- The repo's instruction files (`CLAUDE.md`, `AGENTS.md`) for module layout,
  conventions, and any docs they say to read before planning.
- `docs/intent/<slug>.md` if one exists — that's the confirmed statement of
  intent from `interview-me`. Treat it as settled; don't relitigate it.
- `docs/plans/`, `docs/specs/`, `docs/business/`, `docs/changes/` for an
  existing file on this topic. If one exists, read it and say so.
- The actual code path involved, end to end.

## 2. Interview

**If intent is still fuzzy — the ask is missing who/why/success/constraint,
or there's no `docs/intent/<slug>.md` — stop and use the `interview-me`
skill first.** That skill extracts *what the user actually wants*; this one
works out *how to build it*. Don't do both badly at once.

`interview-me` is installed globally at `~/.claude/skills/interview-me/`, so
it's available in every repo. If it isn't in your skill list, say so rather
than silently carrying on — then run the technique inline: one question at a
time, each with your best guess attached.

Once intent is clear, interview for the **technical design**. Ask questions
**one at a time**, multiple-choice where the options are predictable, and
**attach your best guess** to each one — it's far faster for the user to
react to a wrong guess than to generate an answer from scratch.

**Order matters more than coverage.** Design decisions hang off each other:
where the logic lives depends on what the API shape is; the error handling
depends on both. Ask only what's answerable *now* — a question whose answer
depends on one still open forces the user to guess at a framing you haven't
settled. Park it and say so: *"there's a follow-up about X once we've fixed
this."* You're done when nothing is left unasked, not when you run out of ideas.

**Facts are your job; decisions are the user's.** Never ask something you
could find out. If the question turns on how an existing endpoint behaves, what
a function returns, or whether a library is already a dependency — go and read
it, then fold the answer into your guess or drop the question entirely. Skip
anything you can answer from the code.

Dig into the hard parts they may not
have considered:

- Ambiguity in the story's acceptance criteria.
- Behaviour on edge cases: nulls, empty results, duplicates, concurrent edits.
- Backwards compatibility of any API/DB contract being changed.
- Where the change belongs in this codebase's structure.
- What is explicitly **out of scope** for this piece of work.

Keep going until the remaining unknowns wouldn't change the design.

## 3. Explain the approach before writing the plan
In chat, walk through the approach conversationally:
- The shape of the change and why, including the option you rejected.
- Any pattern/technique being used (e.g. MapStruct mapping, `@Transactional`
  boundaries, Bean Validation, `@ControllerAdvice` error handling, JPA
  fetch strategy) — name it, and say what it does and why it fits here.
- Anything in this codebase that will surprise them.

Get a "yes, that's right" before step 4.

## 4. If the feature spans repos, agree the contract first
Only when the change needs a matching change in another repo (a UI consuming a
new/changed endpoint, or this service consuming another). Otherwise skip.

The contract lives at `~/.claude/contracts/<slug>.md` — **outside both repos**,
because each repo's `docs/` is gitignored and personal, so a file written here
is invisible over there. Same slug as the plan.

- **Read it first if it exists.** Another session may have written it. Treat an
  `agreed` contract as settled; if this plan needs it changed, say so explicitly
  and flag that the other side has to be told.
- **The side that serves the endpoint owns the file.** The consumer reads it.
- Agree it with the user before writing the plan — the plan then *references*
  the contract rather than restating it, so there's one source of truth.

```markdown
# <Feature> — API contract
Status: proposed | agreed | implemented
Producer: <repo that serves it>   Consumer: <repo that calls it>

## Endpoint
`POST /path/to/resource` — what it's for, in one line.

## Auth
Which scheme, which role/scope, and what an unauthenticated call gets back.

## Request
Field table: name, type, required, constraints, example. Say which fields are
optional and what the server does when they're absent.

## Response — success
Status code, body shape, worked example. Note anything nullable, because that's
what breaks the consumer.

## Errors
Each failure case: what triggers it, status code, body shape. Include
validation failures — the consumer has to render them.

## Open questions
Anything unresolved. A contract can be `proposed` with open questions; it
cannot be `agreed` with them.
```

Tell the user the other repo's session should read this file before it plans
its side.

## 5. Write the plan
Write `docs/plans/<slug>.md` (kebab-case slug reused later in `docs/changes/`).
It must be **self-contained** — a fresh session with no memory of this
conversation must be able to execute it.

```markdown
# <Title>

## Problem
What we're solving and why. Link the story/issue.

## Decisions made
Each question that was asked and what we agreed. This is the record of
*why*, and it's the part that's impossible to reconstruct later.

## Concepts in play
For each pattern/library/technique this change uses: what it is, why it's
the right fit here, and where an existing example lives in this repo.
Written for someone who has not used it before.

## Approach
Numbered steps. For each: the exact file path, what changes, and why.
Name the classes, methods, and interfaces involved.

## Out of scope
Explicit list. Prevents scope creep in the implementation session.

## Risks / things to watch
Non-obvious gotchas: build/config quirks, coverage gates, migration
ordering, backwards compatibility.

## Verification
The exact commands that prove this works end to end — take them from
the repo's verification commands (`AGENTS.local.md`, or wherever
`CLAUDE.md` / `AGENTS.md` lists them) — plus any manual check.
Include expected results, not just the command.
```

If a contract was agreed in step 4, add a `## Contract` section pointing at
`~/.claude/contracts/<slug>.md` and naming the fields this plan implements.

## 6. Hand off
Tell the user to start a **fresh session** and run `implement-plan` with the
slug. Do not start implementing in this session.

If there's a contract, remind them the other repo can be planned in parallel —
that's the point of agreeing it up front.
