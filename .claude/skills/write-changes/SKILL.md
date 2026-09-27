---
name: write-changes
description: Write the learning doc for a finished implementation to docs/changes/<slug>.md — what was added, the files changed, the patterns and implementation techniques used, and what to know and take forward. Use when an implementation is done (after self-review, before merging), for milestones and for smaller work alike.
---

<!-- Adapted from ~/.claude/agent-workflow repo-template/skills/write-changes
     for this repo: runs straight after implementation rather than after a
     team PR review, reads Superpowers plans, and adds the "Techniques" and
     "Things to know" sections. -->

# Write the learning doc

Input: a slug — `$ARGUMENTS`. Use the plan file's name without its date
(`docs/superpowers/plans/2026-09-16-pilot-2d-teacher-component-setup.md` →
`pilot-2d-teacher-component-setup`). Writes `docs/changes/<slug>.md`.

This document exists so the user **retains** what was learned. Optimise it for
re-reading in three months, not for being a changelog — git already has the
changelog. Write it for an early-career engineer who wants to be able to
explain every part of this change without the agent in the room.

## 1. Gather the real evidence
Use the actual diff, not memory:

```bash
git --no-pager log --oneline <base>..HEAD
git --no-pager diff --stat <base>...HEAD
git --no-pager diff <base>...HEAD
```

`<base>` is `pilotMain` for pilot work and `main` for BiPi work. If the work
is already merged, diff the merge commit against its first parent instead.

Also read:
- the plan in `docs/superpowers/plans/` and any spec in `docs/superpowers/specs/`;
- `docs/intent/<slug>.md` if it exists;
- the self-review findings, if they're in the conversation.

Read the changed files themselves where the diff alone doesn't show how the
pieces fit.

## 2. Ask, briefly
Only what you can't find yourself, one question at a time:
- Did `self-review` catch anything? Those findings are the most valuable
  material here — they're the mistakes to learn not to repeat.
- Was anything redesigned partway through, or did anything surprise the user?

## 3. Write `docs/changes/<slug>.md`

```markdown
# <Title>

## What was added
2–3 sentences of plain English. What can a teacher, student or the system do
now that it couldn't before?

## Files changed
| File | What changed and why |
|---|---|
Group by layer (migration, domain, service, persistence, web, frontend schema,
page, component, tests). Every file in the diff appears once.

## How it fits together
The request path for the new behaviour, end to end — browser → Next.js proxy
→ controller → service → repository → SQL, or whatever applies. Short, with
the real class and function names, so the user can trace it in the code.

## Concepts & patterns used
The core of this document. For each one:
- **What it is** — in plain terms.
- **Why it was the right call here** — the alternative and the trade-off.
- **Where else it's used in this repo** — a real file path to study.
Cover framework behaviour (Spring, JdbcClient, transactions, validation,
Next.js server vs client components, Zod) and any domain concept (SEC / NCCA
components, briefs, checkpoints) that was new.

## Implementation techniques
How the work was actually done, so it can be repeated: the test-first order,
how a test was structured, how a tricky bit was debugged, a tool or command
that helped. Show a short code snippet where it makes the point clearer.

## Things to know
Facts about this area of the code that aren't obvious from reading it:
invariants, ordering constraints, where a change here would ripple to.

## What I'd get wrong next time
Gotchas hit during implementation, and the fix. Be specific and honest —
this is the highest-value section.

## Self-review findings
What the fresh-session review caught and what each one taught. Skip nits.

## Deviations from the plan
Where implementation diverged from the plan, and why.

## Follow-ups
Anything deliberately left out of scope, with enough context to pick up.
```

## 4. Close the loop
Commit the doc on the branch, so it merges with the work. If the work revealed
a durable convention or gotcha the agent should always know, say so — it may
belong in `CLAUDE.md` or `docs/ARCHITECTURE.md`. Only suggest this if removing
it would cause a future mistake.
