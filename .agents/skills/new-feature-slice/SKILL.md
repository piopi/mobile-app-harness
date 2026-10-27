---
name: new-feature-slice
description: >-
  Build one product feature end to end as a single agent PR from its own worktree: database (db-change),
  shared domain logic and schemas, query hooks, screens (new-screen) and components (new-component),
  unit + integration tests, a Maestro flow, committed screenshots, the feature doc and the harness retro.
  Use for a build ticket that adds a feature or ports one from the reference app.
---

# new-feature-slice

A slice ships a feature a member, staff or admin can use, with proof.

## Steps

1. **Worktree.** `git worktree add ../<repo>-wt-<slug> -b feat/<slug>`, `pnpm install`, `pnpm wt up` (worktree skill).
2. **Read first.** The ticket and its parent map, the feature's doc in `docs/features/` (if it exists), `GLOSSARY.md` for the words, and the decisions on closed tickets the map links.
3. **Study the reference app first** (only when `harness.config.json` names a `reference`). Run `pnpm reference` and read the source of every screen the ticket covers: its copy, assets, states and rules. Write the parity list into the PR's **Reference parity** section now, and build against it. Where a better mobile UX changes the design, note it there; new copy or another asset is a question for the human through the question tool.
4. **Domain first.** Pure rules in `packages/shared/src/<feature>.ts` with Vitest tests (`pnpm test:unit`). Zod schemas for every RPC input and output.
5. **Backend.** Name the general capability behind the ticket and what an admin will want to customise later, then model that (db-change): migration, RLS, RPCs, seed scenario(s) for the feature's states, pgTAP, integration tests.
6. **UI.** Give new screens the quiet polish from the delight skill; if the feature has a real peak (an achievement, milestone or arrival), propose a signature moment to the human, and write both in the PR's Delight section. New components through new-component (story + test + screenshot), screens through new-screen. Client-only states the seed cannot make go through `__agent` events; add events when needed.
7. **Maestro.** One flow per critical path in `apps/mobile/.maestro/<feature>.yaml` (`# scenario: <name>` on a line, `${APP_ID}` / `${SCHEME}` for identity), green on iOS, and on Android once (`pnpm e2e`, `pnpm e2e --android`).
8. **Screenshots.** verify-in-app: every state, default theme first, on iOS, plus the Android parity check, into `docs/screenshots/<feature>/`, rows in `docs/screenshots/README.md`. Batch known paths.
9. **Gate.** `pnpm typecheck && pnpm lint && pnpm test:unit && pnpm test:integration && pnpm test:db`.
10. **Feature doc.** Update `docs/features/<feature>.md` (status, capabilities, what admins can customise, where it lives, ideas to expand) and its row in `docs/features/README.md`. Its **Screens** section embeds the shots you committed; if a client would want to see the feature, save a demo for it (demo-video skill) and name it there.
11. **File what you defer.** Anything from the ticket (or the reference parity list) you don't ship is filed before the PR: a comment on the ticket that will build it, or a new ticket under the map with its blockers. Link it from the PR. A deferral that only lives in the PR is lost when the PR merges.
12. **Harness retro.** Run the harness-retro skill: anything you had to discover the hard way becomes an edit to `AGENTS.md`, a skill or a script in this same PR, and stale lines go.
13. **PR.** Logical commits, push, PR to the parent branch with every section of the template, screenshots embedded with `?raw=true` links pinned to the commit SHA. Watch CI (`gh run watch`). The human merges feature PRs.
14. **Clean up.** `pnpm wt down`.
