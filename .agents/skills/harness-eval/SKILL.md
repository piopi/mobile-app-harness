---
name: harness-eval
description: >-
  Cold-start discovery test for the agent harness: give a fresh agent (no conversation, only the repo) a
  realistic task, have it plan without building, and report what it read, what it decided and what it
  could not find. Turn every gap into a harness fix. Use after a big harness change, before handing the
  repo to new agents, on a new project made from the template, or every few feature PRs.
---

# harness-eval

A harness is only as good as what a new agent finds on its own. This test measures exactly that.

## Steps

1. **Pick 2 or 3 realistic tasks** the next agents will actually get, of different kinds. For example:
   - a new screen in an existing tab, with data from a new table ("add a Favourites list to Items");
   - a backend rule with an admin path ("let admins hide an item until a date");
   - a device-facing change ("a pull-to-refresh on the list, verified on iOS and Android");
   - a harness task ("record a demo of sign-up").
   Prefer tasks from the real backlog (the wayfinder map) over invented ones.

2. **Run each in a fresh agent** with no context from this conversation (a subagent with only the prompt below, in the repo root). Plan only: no edits, no devices, no `pnpm wt up`.

   > You are starting work in this repository with no other context. Task: <task>. Do not change any file and do not boot any device. Read whatever you need, then report: (1) the files and skills you read, in order, and why; (2) your step-by-step plan, with the exact commands and files you would touch; (3) every question you could not answer from the repo, and where you looked; (4) anything you read that seemed wrong, contradictory or out of date.

3. **Score the answers** against what a good plan needs. For each task, check that the agent:
   - found AGENTS.md first and the right skill second;
   - used the slot commands (`pnpm wt up`, `pnpm sb`, `pnpm seed`), not raw `expo start` / `supabase start`;
   - put data in the database with an admin path rather than a literal;
   - planned tests at the right levels, screenshots (pinned, default theme first, Android parity) and the feature doc;
   - planned to file deferred work and run the harness retro.
   Note each miss and each question it couldn't answer.

4. **Turn each gap into a fix** (the harness-retro table decides where): a read pointer where the agent looked first, a missing step in a skill, a script that enforces it. Re-run the task that failed after the fix; the gap is closed only when a fresh agent gets it right.

5. **Report** to the human: the tasks, what each agent found and missed, the fixes, and the re-run result. Commit the fixes as a harness PR (a foundation PR: self-merge once CI is green).

## Rules

- The evaluated agent never sees this skill, the expected answers or your notes.
- Change the harness, never the task, to make an agent pass.
- Keep the fixes lean: one line in the right place beats a paragraph in AGENTS.md.
