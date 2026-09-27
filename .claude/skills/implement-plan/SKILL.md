---
name: implement-plan
description: Execute an agreed plan from docs/plans/ in a fresh session. Implements the change step by step, explaining the patterns used as it goes, and verifies with the plan's own verification commands. Use at the start of a clean session once a plan file exists.
disable-model-invocation: true
---

# Implement a plan

Input: a plan slug or path — `$ARGUMENTS`. Resolves to `docs/plans/<slug>.md`.

## 1. Load context
- Read `docs/plans/<slug>.md` in full. It is the source of truth for this
  session.
- Read the repo's instruction files (`CLAUDE.md`, `AGENTS.md`) and any related `docs/specs/` or `docs/business/` file.
- If the plan has a **Contract** section, read `~/.claude/contracts/<slug>.md`
  too. It is binding: the other repo is building against it. Match it exactly —
  field names, types, status codes, error shapes. If you think it's wrong,
  **stop and say so**; changing it unilaterally silently breaks the other side.
- If the plan is ambiguous or the code has drifted since it was written, **stop
  and say so** before writing code. Do not silently improvise a different
  design — the decisions in the plan were agreed deliberately.

## 2. Confirm the plan still holds
Summarise what you're about to change, where, and the
verification command you'll finish with. Flag anything in the plan that no
longer matches the code.

## 3. Implement
- Follow the plan's numbered steps in order.
- Respect the **Out of scope** section. If you find an unrelated bug, note it
  for later; don't fix it.
- As you go, add a short `★ Insight` note in chat the first time you use a
  pattern the plan flagged in **Concepts in play** — what it does, why here.
- Write tests alongside the code, not after. Respect any coverage gate
  listed in the repo's instruction files.
- Follow existing conventions in the area you're touching rather than inventing new
  ones. Point out where you copied the pattern from.

## 4. Verify — with evidence
Run the plan's verification commands. Show real output.

Use the commands from the plan's Verification section, or failing that
the repo's verification commands (`AGENTS.local.md`, or wherever
`CLAUDE.md` / `AGENTS.md` lists them). Scope them as narrowly as the change allows.

If tests fail, fix and re-run. Do not report "done" on an assumption. If you
cannot get it green, say exactly what is failing and why.

## 5. Report
- What changed, file by file, one line each.
- Anything you did differently from the plan, and why.
- Anything the user should review carefully.
- If there was a contract and you served the endpoint, update
  `~/.claude/contracts/<slug>.md` to `Status: implemented` and correct any
  field that ended up different from the agreed shape. Tell the user what
  changed so they can pass it on to the other repo.
- Tell them to run **`self-review`** in a **fresh session** before opening the
  PR — a fresh context catches what this one will miss, because this session
  will re-read its own intent rather than the code it actually wrote.
- If the implementation ended up heavier than the plan implied, say so and
  suggest **`code-simplification`** as a separate commit after review.
- After the team's PR review, `write-changes <slug>`.
