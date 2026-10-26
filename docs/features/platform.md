# Platform

**Status:** template. The harness every feature builds on.

## Capabilities

- Worktree slots (`pnpm wt`): Metro, a simulator, an emulator on demand and a Supabase stack per worktree, native builds shared by fingerprint.
- Named seed scenarios (`pnpm seed`), deep links and agent events (`pnpm run link`, `pnpm agent`), the dev panel (Me → Dev panel), Storybook on device.
- Maestro flows (`pnpm e2e`) with a scenario per flow, demo videos (`pnpm demo`).
- `harness.config.json` for the app's identity and brand; `pnpm harness:apply`, `pnpm harness:diff`.

## Where it lives

`scripts/`, `.agents/skills/`, `apps/mobile/src/dev`, `apps/mobile/.maestro`, `HARNESS.md`.

## Ideas to expand

- A remote device farm for CI screenshots.
- Declarative database schema with drift checks.
