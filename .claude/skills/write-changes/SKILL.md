---
name: write-changes
description: After a change is implemented and code reviewed, write a learning-focused summary to docs/changes/. Covers what changed, the patterns and concepts used, review feedback, and what to take forward. Use once a PR is reviewed or merged.
disable-model-invocation: true
---

# Write the changes doc

Input: a slug — `$ARGUMENTS`. Writes `docs/changes/<slug>.md`.

This document exists so the user **retains** what was learned. Optimise it for
re-reading in three months, not for being a changelog. Git already has the
changelog.

## 1. Gather the real diff
Use actual evidence, not memory:

```bash
git --no-pager diff --stat <base>...HEAD
git --no-pager diff <base>...HEAD
```

`<base>` is the branch this work merges into — `main` unless the repo's
instructions name another. If the work is already merged, diff the merge
commit against its first parent instead.

Also read `docs/plans/<slug>.md` if it exists, and ask the user for the code
review comments if they aren't already in the conversation.

## 2. Ask, briefly
- Which review comments were substantive (not style nits)?
- Was anything pushed back on or redesigned during review?
- Did `self-review` catch anything before the PR? Those findings are the most
  valuable material here — they're the mistakes to learn not to repeat.

## 3. Write `docs/changes/<slug>.md`

```markdown
# <Title>

## What changed
2–3 sentences of plain English. What can the system do now that it couldn't?

## Files touched
| File | What changed and why |
|---|---|

## Concepts & patterns used
The core of this document. For each one:
- **What it is** — in plain terms.
- **Why it was the right call here** — the alternative and the trade-off.
- **Where else it's used in this repo** — a real file path to study.
Cover framework behaviour (e.g. Spring,
transactions, validation, React rendering), and any domain concept from the
product that was new.

## What I'd get wrong next time
Gotchas hit during implementation, and the fix. Be specific and honest —
this is the highest-value section.

## Review feedback
Substantive comments and what they taught. Skip style nits.

## Deviations from the plan
Where implementation diverged from `docs/plans/<slug>.md`, and why.

## Follow-ups
Anything deliberately left out of scope, with enough context to pick up.
```

## 4. Close the loop
If the work revealed a durable convention or a gotcha the agent should always
know, say so — it may belong in the committed instruction file (`AGENTS.md` or
`CLAUDE.md`) or the personal layer (`AGENTS.local.md` / `~/.claude/CLAUDE.md`). Only suggest this if removing it would cause a future mistake.
