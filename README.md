# Example App

PROJECT: one paragraph on the app for humans. Until then: this repo was made from [piopi/mobile-app-harness](https://github.com/piopi/mobile-app-harness), a template for Expo + Supabase mobile apps built mostly by AI agents working in parallel git worktrees.

**Agents: read [AGENTS.md](AGENTS.md).** This README is for humans. Why the harness looks the way it does: [HARNESS.md](HARNESS.md).

## Start a new app from this template

In Claude Code, inside a checkout of the template: `/new-mobile-app`. It asks for the name, scheme, bundle id, platforms, brand starting point, backend and reference app, creates your private repo from the template, applies the config, runs the checks and a one-simulator smoke test. By hand:

```sh
gh repo create <owner>/<name> --private --template piopi/mobile-app-harness --clone && cd <name>
$EDITOR harness.config.json      # app identity, brand colours, default appearance, github.repo, reference
pnpm install && pnpm harness:apply
pnpm sb start && pnpm typecheck && pnpm lint && pnpm test:unit && pnpm test:integration
pnpm wt up                       # first run builds the dev client
```

## Stack

| Layer | Choice |
|-------|--------|
| App | Expo SDK 58 (dev client), expo-router (NativeTabs, native stacks), TanStack Query |
| UI | `packages/ui`: react-native-reusables (copied in), Uniwind, tailwind-variants, Reanimated 4, Phosphor icons, Storybook RN |
| Backend | Supabase: Postgres + RLS, Auth (Apple, Google, email code), Edge Functions |
| Tests | Vitest, jest-expo + RNTL, pgTAP, Maestro |

## Layout

```
apps/mobile        the Expo app
packages/ui        component library + Storybook stories
packages/shared    domain logic, zod schemas, DB types
supabase/          migrations, RLS, RPCs, seeds and scenarios, pgTAP, integration tests
scripts/           harness: worktree slots, seed, Maestro, links, demos, harness:apply/diff
docs/              feature docs, screenshots
.agents/skills/    agent skills (vendored + our own)
harness.config.json  the app's identity and brand starting point
```

## Run it locally

Prerequisites: macOS with Xcode and an iOS simulator, Android SDK (optional), Docker Desktop running, Node 22, pnpm 10, Supabase CLI 2.122.0, Deno 2 (Edge Function tests), Maestro (optional), ffmpeg (for demos).

```sh
pnpm install
pnpm wt up             # claims a slot: Metro, simulator, Supabase stack, dev client
pnpm seed onboarding   # load a scenario (run `pnpm seed` to list them)
pnpm wt down           # release the slot
```

Seeded accounts (password `password123`): `admin@app.test`, `staff@app.test`, `member@app.test` and `member2@app.test` (members). Each scenario's first line names who to sign in as. In a dev build they are listed under the sign-in form (one tap), Sign in with Apple and Google are local stand-in accounts, and an email sign-in code arrives in this stack's Mailpit (`MAILPIT_URL` in `.env.local`, code in the subject). Me → Dev panel flips the dev-only states and opens Storybook.

## Checks

```sh
pnpm typecheck && pnpm lint && pnpm test:unit
pnpm test:integration && pnpm test:db   # needs `pnpm wt up` or `pnpm sb start`
pnpm test:functions                     # Edge Functions' shared code (Deno)
pnpm e2e                                # Maestro, on your slot's device
```

CI runs typecheck, lint, unit and integration tests on every pull request that changes code (docs, skills, screenshots and Maestro flows alone skip it), and `pr-body` checks every PR's title, required sections and changeset.

## Releases

`main` deploys the backend to staging; merging `main` into `production` releases: an over-the-air update when the native fingerprint matches a store build, a store build submitted to TestFlight and Google Play internal testing when it doesn't. Every user-facing PR adds a changeset (`pnpm changeset`). See what a release would do with `pnpm release plan --dry-run`. Setup, the store steps and rollback: [docs/release.md](docs/release.md). Debugging a hosted Supabase project's logs: the db-change skill.

## The harness config

`harness.config.json` holds the app's identity (name, slug, scheme, bundle id, Android package, platforms), the GitHub repo, the template it came from, the optional reference app, and the brand starting point (colours for light and dark, radius, default appearance). `app.config.ts` and the scripts read it directly; `pnpm harness:apply` writes the rest (tokens, placeholder icons, the name in the docs). Rename the app by editing it and re-applying.

## Drift control

`pnpm harness:diff` compares the generic harness files (listed in `harness.manifest.json`) with the template and lists what changed; `--diff` shows the changes and `--patch` writes a patch in the template's terms, so an improvement made here can go back to the template.

## Demo videos

Ask an agent to "record a demo of <feature>" (demo-video skill): it drives the app on its own simulator and hands you an MP4 with the dead time cut, in `demos-out/`. Saved demos replay with `pnpm demo run <name>`.

## Features

What the app can do, what admins can customise, and where each capability could go next: [docs/features](docs/features/README.md).
