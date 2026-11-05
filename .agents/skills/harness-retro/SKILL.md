---
name: harness-retro
description: >-
  End-of-PR retrospective on the agent harness: list what you had to discover the hard way while doing this
  ticket, turn each into an edit to AGENTS.md, a skill or a script in the same PR, and drop lines that are
  stale. Run it at the end of every feature PR (the PR checklist's "Harness kept current" line points here),
  and whenever a human says "you should have known that".
---

# harness-retro

The harness gets better only if every agent leaves it a little more accurate than it found it. This takes five minutes at the end of a PR, before you push the last commit.

## Steps

1. **List the friction.** Go back over this session and write down, for yourself, every moment you:
   - searched more than twice for something (a file, a command, a convention);
   - ran a command that failed for a reason that wasn't your code (a port, a slot, a cache, a flag, an env value);
   - were corrected by the human, CI or a reviewer about a rule you didn't know;
   - read an instruction that was wrong, out of date, or contradicted by the code;
   - did something by hand that a script could have done or checked;
   - skipped or forgot a step a skill asks for (the delight pass, a doc update, a guide, Android parity).

2. **Sort each item into one place.** Keep the harness lean: AGENTS.md holds only what an agent can't find by looking.

   | The lesson is… | It goes in… |
   |---|---|
   | a trap you can't see from the code (a gotcha, a reason, an unwritten rule) | one line in `AGENTS.md` ("Gotchas" or "Invariants") |
   | how to do a kind of task | the skill for that task (`.agents/skills/<name>/SKILL.md`) |
   | something a script could enforce or detect | the script (`scripts/…`), a lint rule, or a test, and **delete** the matching warning from the docs |
   | a project fact (a decision, a value) | the feature doc, the design-system skill, or a database row with an admin path |
   | the why behind a harness piece, for whoever rebuilds it | `HARNESS.md` |
   | already in the repo, just hard to find | a read pointer where you looked first (one line), not a copy |

   Prefer the enforcement column: a script that refuses the mistake beats a sentence that warns about it.

3. **Prune.** Read the `AGENTS.md` sections and the skill(s) you used and delete anything this PR made untrue or that the repo now states itself (a script's own help, `package.json`, the directory tree). A stale line is a bug.

4. **Edit, in this PR.** Make the changes. Follow the writing style of the file you edit (short, direct, one idea per line, the reason after the rule). Don't rewrite what you didn't touch.

5. **Is it generic?** If a change would help any app made from the template (a script fix, a skill step, a gotcha about Expo, Supabase, the slots or the devices), run `pnpm harness:diff --patch <paths> > .wt/tmp/harness.patch` and tell the human it can go back to the template (`harness.template` in `harness.config.json`). Don't push to the template yourself unless asked.

6. **Report.** In the PR's checklist, tick "Harness kept current" and add one line per change under it (`AGENTS.md: …`, `worktree skill: …`), or write "No harness changes: nothing surprising" when that is true.

## Rules

- Never add a line that restates code, a script's `--help`, or a skill's description.
- A rule needs its reason; a reason without a rule is a HARNESS.md entry.
- One change per lesson. If a lesson needs a paragraph, it belongs in a skill, not AGENTS.md.
- If you are unsure the lesson is true beyond this ticket, write it as a question for the human (through the question tool), not as a rule.
