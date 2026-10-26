# AGENTS.md

The single instruction file for every coding agent (Claude Code reads it natively; a CLAUDE.md would override it, so there is none). Domain words: [GLOSSARY.md](GLOSSARY.md). Why the harness is built this way: [HARNESS.md](HARNESS.md).

<!-- PROJECT:about -->
**Acme** is PROJECT: one sentence on what the app does and for whom. Planning lives on PROJECT: the wayfinder map (issue link).
<!-- /PROJECT -->

## Working with the human

- **Ask through the structured question tool** (`AskUserQuestion` or your harness's equivalent), recommended option first.
- **Local first.** Third-party services are faked locally (sign-in providers have dev stand-ins, email codes land in the stack's Mailpit). External accounts come last, as one checklist for the human; create none yourself.
<!-- PROJECT:human -->
<!-- Where the human's manual-steps checklist lives (one issue comment), and anything else about how they work. -->
<!-- /PROJECT -->

## Where knowledge lives

- **Before a feature:** its doc in `docs/features/`, the ticket and its parent map, and the decisions on the map's closed tickets.
- **The look:** the design-system skill. **The data model:** the db-change skill. **Devices and slots:** the worktree and verify-in-app skills.
- `package.json` scripts and `.agents/skills/` are the index; the gotchas below are the traps.

## Gotchas the repo won't tell you

- **Use `pnpm wt up`, not `expo start`.** It claims your slot: Metro port, simulator, Supabase stack, `.env.local`, cached dev client. Run it again after any native change (new native package, config plugin, `app.config.ts`, fonts, icons): the fingerprint changes and one worktree rebuilds under a machine-wide lock. `expo start --clear` wipes the Metro cache every worktree shares.
- **Stay in your slot.** Use only your simulator, emulator, Metro port, agent-device `--session wt-<k>` and stack. Use `pnpm sb`, never `supabase start` (legacy mode grabs fixed shared ports). Stack ports are random: read `.env.local`.
- **Mind the laptop.** Several agents share one machine. One Android emulator machine-wide (`wt up --android` refuses a second): boot it for the final parity pass and kill it right after. Batch known device paths into one `agent-device batch`. Keep 10 GB of disk free. `pnpm wt down` when idle.
- **Per-worktree values stay out of `app.config.ts`**, or the shared native fingerprint breaks. They reach the app as `EXPO_PUBLIC_*` in `apps/mobile/.env.local`.
- **The app's identity lives in `harness.config.json`.** `app.config.ts` and every script read it; `pnpm harness:apply` writes the brand tokens and icons. Never hard-code the name, scheme or bundle id.
- **Use the newest stable version, pinned exactly.** When you add or touch a dependency, check that it is the latest stable release (`npm view <pkg> version`) and that it is actively maintained. For Expo/RN native modules, "latest" means the version the current Expo SDK pins (`expo install --check`); newer native versions arrive by upgrading the SDK (expo-upgrade skill), not one at a time. If a newer major is out and you can't take it, say why in the PR. `node-linker=hoisted` is required by React Native.
- **App tests live in `src/__tests__`.** Anything under `src/app` becomes an expo-router route.
- **Expo changes every SDK.** Check the SDK docs (`https://docs.expo.dev/llms.txt`) or the expo skills before using an API.
- **Gesture Handler 3 + Reanimated 4:** hook API (`usePanGesture`, `onActivate`) and `scheduleOnRN`.
- **After a migration, regenerate and commit DB types** (`gen:types` in `packages/shared`). A compile-time check in `packages/shared/src/rpc.ts` fails until every RPC has a zod input schema that matches its generated `Args`.
- **`members.id` is not `auth.uid()`.** A member links to `auth.users` through `auth_user_id`. In SQL use `public.current_member_id()`; for roles use `is_staff()` / `is_admin()` / `has_role()`, which read `member_roles` on every call. The JWT `app_roles` claim is a UI hint only.
- **Project values production needs are seeded by migrations, not `seed.sql`,** with fixed ids that seeds name through `seed.<name>()` helpers. A scenario that should go through an admin RPC (so audit rows are real) calls `seed.act_as('admin@app.test')` first.
- **Admin edit RPCs take a jsonb `patch`:** an absent key keeps the value, `null` clears it, an unknown key fails with `invalid_patch`. The zod patch schemas in `packages/shared` are `.strict()` to match.
- **RPC errors are codes, not copy.** RPCs raise `P0001` (rule) or `42501` (access) with a snake_case `message` listed in `RPC_ERROR_CODES` and a plain `hint`. Map the code to copy in the app.
- **In plpgsql RPCs, parameters shadow columns** (`item_id`, `status`, `member_id`…). Add `#variable_conflict use_variable` and qualify parameters as `fn_name.param`, or Postgres reports an ambiguous column.
- **`pnpm test:integration` resets your stack's database** (each file calls `useScenario`). Re-seed before you go back to the app.
- **`pnpm run link`, not `pnpm link`:** the bare form is pnpm's own command and writes a bogus dependency.
- **Skills live in `.agents/skills/`.** `.claude/skills` is only a symlink to it, because Claude Code still discovers project skills from `.claude/skills` alone. Add skills under `.agents/skills/`. Delete the link once Claude Code reads `.agents/skills` natively.
- **No device CI.** CI runs typecheck, lint, unit and integration; Maestro and screenshots are on you, before the PR.
<!-- PROJECT:gotchas -->
<!-- Project-specific traps, one line each, as they are found (the harness-retro skill adds them). -->
<!-- /PROJECT -->

## Invariants

- **Screens compose `packages/ui` only.** A new visual pattern goes into `packages/ui` with typed variants and a story; tokens live in `packages/ui/src/theme.css`. Lint enforces it.
- **Value-granting writes go through RPCs or Edge Functions** with shared zod schemas; reads go direct under RLS. Every table has RLS and a pgTAP test.
- **Official before custom.** Before you build anything that touches device edges, system UI or platform behaviour (safe areas and insets, edge-to-edge, status and navigation bars, keyboard, headers, tabs, sheets, modals, blur, haptics, images, icons, fonts, gestures, scroll-linked headers), look for the official or Expo module that already does it: the SDK docs, the expo skills, and the dependencies we already have. Use it, and customise it through its API. Hand-build only when nothing fits, and say in the PR what you checked and why it fell short.
- **Navigation and layout are Expo Router.** Structure lives in the file tree: route groups (`(auth)`, `(onboarding)`, `(tabs)`), `_layout.tsx` per level, `Stack.Protected` for the account gates, modals and sheets through `presentation`, headers through `Stack.Screen` options, deep links through `+native-intent`, typed routes. Chrome is native (`NativeTabs`, native stack headers, sheets), branded through its API. Safe areas come from `react-native-safe-area-context` (through `Screen` in packages/ui or the native header), never from hard-coded padding. Lint blocks hand-rolled navigators and RN `<Modal>`.
- **No native alert popups.** `Alert.alert`, `ActionSheetIOS` and system confirm dialogs are banned (lint). Confirmations, errors and choices use the branded `AlertDialog` / `ActionSheet` from packages/ui, or a router sheet route. This is the one deliberate exception to native chrome.
- **Build capabilities, not one-offs.** Model each feature as a general, configurable capability (a catalogue rather than three hard-coded items, a schedule rather than "every Thursday"). Project data (places, schedules, thresholds, windows, labels) lives in seeded database rows that admins can edit, and RPCs and screens read it; the app holds only copy. When a feature needs a new project value, add it to the data model along with an admin path to change it.
- **Dev hooks stay dev-only:** `<scheme>://__agent/*` is ignored outside `__DEV__`; Storybook ships only with `EXPO_PUBLIC_STORYBOOK=true`.
<!-- PROJECT:invariants -->
<!-- Brand, domain and parity rules that bind every PR. Examples: the default appearance and why; "port the reference
     app 1 to 1 (features, copy, assets), the design may improve, say why in the PR"; "never assume one city or
     one time zone". Keep each to one line with its reason. -->
<!-- /PROJECT -->

## Working conventions

- **One ticket, one worktree, one PR**, filling every section of the PR template. **Foundation PRs** (harness, data model, sign-in/onboarding, design system): squash-merge yourself once CI is green. **Feature PRs**: stack on the parent branch; the human merges.
- **Same-change tests:** logic → Vitest, components → RNTL, database → pgTAP + integration, a feature's critical path → Maestro.
- **Document the feature.** Each capability has a living doc in `docs/features/`. A feature PR updates its doc's status, capabilities, customisation surface and "where it lives", and adds the ideas it surfaced to "Ideas to expand". A new capability gets a new doc plus a row in the index.
- **Prove UI changes in the app** with the verify-in-app skill: commit shots under `docs/screenshots/`, map them in its README, embed them in the PR with links pinned to the commit SHA, retake the ones you made stale.
- **File what you defer.** Anything a ticket asked for that the PR doesn't ship is a comment on the ticket that will build it, or a new ticket, before the PR opens. A deferral that only lives in a PR is lost.
- **Keep the harness lean and current.** This file holds only what an agent can't find by looking: gotchas, reasons, unwritten conventions. End every feature PR with the harness-retro skill: when your change creates a gotcha or kills one, edit this file, the affected skill and `README.md` in the same PR. Leave scripts, layout and versions to the repo itself. `pnpm harness:diff` shows what changed against the template, so improvements can go back to it.
- **Say the words in `GLOSSARY.md`**, and add new domain terms there.
