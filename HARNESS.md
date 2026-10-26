# HARNESS.md

The playbook behind this template: what each piece of the agent harness is, **why** it exists, the incident or measurement that shaped it, and how to rebuild it on another stack. AGENTS.md tells an agent what to do; this file tells whoever maintains or ports the harness why.

It was extracted from a real app built mostly by AI agents working in parallel (see [Origin](#origin)). Numbers below come from that project's PRs, issues and research notes; the lessons are stated generically.

## Contents

0. [Origin](#origin)
1. [Principles](#1-principles)
2. [Instructions: AGENTS.md, skills, the glossary](#2-instructions-agentsmd-skills-the-glossary)
3. [Working with the human](#3-working-with-the-human)
4. [Worktree slots](#4-worktree-slots)
5. [The shared native build cache](#5-the-shared-native-build-cache)
6. [The local backend: Supabase stack mode](#6-the-local-backend-supabase-stack-mode)
7. [Seeds and scenarios](#7-seeds-and-scenarios)
8. [Dev links, the dev panel and Storybook](#8-dev-links-the-dev-panel-and-storybook)
9. [Driving devices: agent-device, batching, the laptop](#9-driving-devices-agent-device-batching-the-laptop)
10. [Screenshots as proof](#10-screenshots-as-proof)
11. [Maestro and demo videos](#11-maestro-and-demo-videos)
12. [UI: packages/ui, native chrome, lint](#12-ui-packagesui-native-chrome-lint)
13. [Data: capabilities, RPCs, types](#13-data-capabilities-rpcs-types)
14. [Tests and CI](#14-tests-and-ci)
15. [PRs, merge policy, deferred work, feature docs](#15-prs-merge-policy-deferred-work-feature-docs)
16. [Porting a reference app (optional)](#16-porting-a-reference-app-optional)
17. [Dependencies](#17-dependencies)
18. [The config file and drift control](#18-the-config-file-and-drift-control)
19. [Self-improvement: retro, eval, push-back](#19-self-improvement-retro-eval-push-back)
20. [Rebuilding the harness on another stack](#20-rebuilding-the-harness-on-another-stack)
21. [Incident log](#21-incident-log)
22. [Open problems](#22-open-problems)

## Origin

<!-- The one place this file names the project the template came from. -->

The template was extracted in October 2026 from **The 25th Hour** app (`piopi/25th-hour-app`), the mobile app of a run club: members RSVP to weekly runs, check in with a sticker tap or a staff scan of their Club Card, and earn kit at run-count thresholds. Agents ported it from the club's existing webapp, about 30 merged PRs in its first week, with several agents at once on one 14-core laptop.

The club-specific episodes behind some generic lessons below:

- **Capabilities, not one-offs (section 13):** the first data model hard-coded the club's time zone, check-in windows, Thursday schedule, meeting point and reward tiers; they became admin-editable rows (settings, locations, a run series that generates runs, a reward catalogue). When a second city and a seasonal Sunday run were announced, both were data changes.
- **The reference never ships (section 16):** an agent put the webapp's https domain into the Club Card's QR payload; it became an app deep link.
- **Study the reference source (section 16):** the sign-in port invented copy, merged the landing into sign-in, split the one-page onboarding into three screens and swapped the photos, because agents worked from screenshots.
- **Native chrome (section 12):** the human chose, then rejected, every hand-built branded tab bar.
- **Account-specific onboarding:** the club's onboarding (an emergency contact, an 18+ confirmation, a liability waiver) is domain content; the template keeps only the mechanism (a display name, versioned terms, and a PROJECT slot for fields and steps).

`pnpm harness:diff` in that repo compares its harness with this template.

## 1. Principles

- **An agent should never have to guess.** Every recurring task has a script or a skill; every trap the code doesn't show is one line in AGENTS.md.
- **Enforce before you explain.** A script that refuses the mistake beats a sentence that warns about it. When a script starts enforcing a rule, delete the warning.
- **Isolation by construction.** Parallel agents never coordinate; each one gets its own numbered slot of resources, and scripts refuse resources they don't own.
- **Local first.** Everything runs on fakes and local stacks before anyone creates an account.
- **Proof, not claims.** UI changes ship with committed screenshots and a Maestro flow; data changes with pgTAP and integration tests.
- **Native over custom.** Use the platform's chrome and the official module, branded through its API.
- **Data over literals.** Project values live in database rows an admin can change; the app holds only copy.
- **Lean and current.** The harness holds only what an agent can't find by looking, and every PR leaves it more accurate.

## 2. Instructions: AGENTS.md, skills, the glossary

**What.** `AGENTS.md` (the one instruction file), `.agents/skills/<name>/SKILL.md` (how to do each kind of task), `GLOSSARY.md` (the words), `docs/features/` (what each capability does).

**Why, and what we learned.**

- **One file, no CLAUDE.md.** Claude Code reads AGENTS.md natively, but a CLAUDE.md would take precedence over it. Two files drift; one doesn't.
- **Only what an agent can't find by looking.** The first AGENTS.md had a repo map, a command table and a skill index. A pruning pass removed 84 lines (adding 24) because they restated `package.json`, the directory tree and each skill's description, and went stale on the next PR. What stays: gotchas (traps the code doesn't show), reasons, and unwritten conventions.
- **Read pointers matter as much as update pointers.** Feature docs were first listed only as something to update after a change. Agents didn't read them before starting. A "Where knowledge lives" section fixed it: read the feature doc and the ticket's map first; past decisions are on closed tickets; research is on unmerged `research/*` branches (`git show`).
- **Skills live in `.agents/skills/`**, the cross-agent location, with `.claude/skills` as a symlink because Claude Code (2.1.x) only discovers project skills there. Delete the link when it reads `.agents/skills` natively.
- **Vendored skills are pinned** in `skills-lock.json` (agent-device, the expo skills, React Native best practices, Storybook, testing). Our own skills (worktree, verify-in-app, demo-video, new-screen, new-component, db-change, new-feature-slice, design-system, harness-retro, harness-eval, new-mobile-app) are the project's procedures.
- **PROJECT slots.** In the template, project-specific parts are marked `<!-- PROJECT:<name> --> … <!-- /PROJECT -->` (AGENTS.md, the design-system skill, new-screen, the glossary). `pnpm harness:diff` ignores them, so a project fills them freely and still diffs cleanly against the template.
- **The glossary.** Agents name things the way the code they read names them. A glossary with "avoid" words ("Member, not user") keeps code, copy and PRs consistent; the domain-modeling skill grows it.

**Rebuild it.** Any agent that reads a root instruction file works. Keep it under ~100 lines; move procedures to skills; move reasons here.

## 3. Working with the human

- **Ask through the structured question tool** (`AskUserQuestion`), recommended option first and labelled. Prose questions get lost in long replies; a tool call is answered. Batch independent questions into one call.
- **New copy or new assets need a yes.** When an agent invents copy ("Run with us after dark.") the human has to find it in review. Copy changes go through the question tool or are flagged in the PR.
- **Local first, accounts last.** Every third-party service is faked locally (Apple and Google sign-in have dev stand-ins that sign in to local accounts; email codes land in the stack's Mailpit). Accounts (Apple developer, Play console, hosted Supabase, provider ids) come last, batched into **one** plain-language checklist for the human: where to click, what it costs, and which steps an agent can do afterwards. It lives in one issue comment, never only in a PR or a skill, because the human asked "where are the manual steps?" and they were scattered.
- **Model routing.** Routine subagent work (screenshot retakes, demo recordings, CI fixes, doc updates) can run on a faster model; feature builds, research and design stay on the strongest.

## 4. Worktree slots

**What.** `pnpm wt up|down|status|open|build|gc` (`scripts/wt/wt.mjs`). Each git worktree claims a numbered slot `k` (atomic `mkdir ~/.<slug>/slots/<k>`) that owns: Metro on port `8100+k` (8081 stays free for humans), an iOS simulator `<slug>-wt-k` cloned from a golden device, an Android emulator on port `5554+2k` (on demand), its own Supabase stack, and `.env.local` files generated for it.

**Why.** Parallel agents need fixed, non-colliding resources with no coordination. Before slots, two agents fought over port 8081, the booted simulator and the database.

**Measured** (14-core, 24 GB MacBook):

| Step | Time |
|---|---|
| `wt up`, warm | **11.6 s** (target was ≤ 90 s) |
| `wt up`, cold slot | 27.3 s |
| `wt up`, two worktrees in parallel, cache hit | 45 s each |
| iOS native build, cache miss | 269 s (a cold `wt up` with it: 294 s) |
| Android native build, cache miss | ~4 min of Gradle |
| Cache-hit install | iOS 2.6–6 s, Android < 1 s |
| Simulator clone / first boot / re-boot | 2–4 s / 12–18 s / ~5 s (~1.4 GB disk per booted clone) |
| Emulator read-only Quick Boot / cold boot | 1.4–1.8 s / 21 s (~3 GB RAM each) |

**Traps it encodes.**

- **Address simulators by UDID**, never `booted`: with several booted, `booted` picks one at random.
- **Every emulator instance starts `-read-only`**, the first one included: a normal first instance makes a read-only second fail with "Another emulator instance is running". Emulator ports must be even, or `adb devices` may not see them.
- **Scripts check slot ownership**, not a local state file. Incident: two merged worktrees still had `.wt/state.json` pointing at slot 1, which another agent owned by then; `pnpm demo`, `pnpm e2e` and `pnpm run link` would have driven that agent's simulator. Now `readSlotState()` checks the slot registry and `wt down` deletes `state.json`.
- **`wt up` opens the dev client with `--initialUrl`** (no "Open in…?" prompt) and hides the dev-menu button so screenshots are clean.
- **Timings are logged** (`~/.<slug>/timings.jsonl`) so regressions show.

**Rebuild it.** The idea is stack-agnostic: a slot number derived from an atomic directory claim, and every port, device name and backend instance derived from it. Store the claim outside the repo (machine-wide), the slot number inside the worktree, and make every script refuse a slot it doesn't own.

## 5. The shared native build cache

**What.** `buildCacheProvider: expo/local-build-cache-provider` with `cacheDir: ~/.<slug>/build-cache`, shared by every worktree. `wt up` computes the Expo fingerprint of `apps/mobile`; on a hit it installs the cached `.app` / `.apk` in seconds; on a miss it takes a machine-wide lock per platform, checks again, builds once, and publishes.

**Why.** Native builds are the slowest thing in the loop (4–5 minutes) and the heaviest on the CPU. Two worktrees with the same native inputs should never both compile.

**Lessons.**

- The provider's default cache is per worktree, which defeats sharing: set `cacheDir`.
- Its upload deletes the old entry then copies, which isn't atomic: two builds of one fingerprint can race and a reader can install a half-copied app. The per-platform lock covers both the race and CPU starvation.
- **Per-worktree values never go in `app.config.ts`.** The fingerprint hashes the resolved config; a slot number or port there gives every worktree its own fingerprint and nothing is shared. They travel as `EXPO_PUBLIC_*` in `apps/mobile/.env.local`, which `wt up` generates (a new worktree doesn't get untracked files, so it can't be copied).
- **Never `expo start --clear`:** Metro's transform cache in `$TMPDIR/metro-cache` is shared by every worktree.
- `rm -rf apps/mobile/ios apps/mobile/android` after a build frees disk; the cache keeps the binary.

## 6. The local backend: Supabase stack mode

**What.** `pnpm sb start|stop|destroy|env` (`scripts/sb.mjs`) runs the Supabase CLI in experimental stack mode (CLI pinned at 2.122.0, `supabase.lock` committed), and regenerates `.env.local` (root, for scripts and tests) and `apps/mobile/.env.local` (for the app) after every start.

**Why.** Each worktree needs its own database. Legacy `supabase start` uses fixed ports that collide across worktrees.

**Measured.** Stack mode starts in 2.9 s cold and 1.8 s warm, against 23 s / 22 s for fixed-port slots; a reset takes 2.6 s against 12.3 s; ~250 MB per stack.

**Traps.** The database port can move after a destroy, so `.env.local` is regenerated from `stack status --env` after every start. A worktree that forgets its env targets the default port, which during the spike was another agent's live stack; a taken port isn't detected and start fails after 44 s with a misleading 404. `[auth]` config changes need a stop and start (a plain start resumes old containers). Locally the experimental stack can't serve email body templates, so sign-in codes ride in the email subject.

## 7. Seeds and scenarios

**What.** `supabase/seed.sql` (base people and data, plus a local-only `seed` schema of helpers) and `supabase/seeds/scenarios/<name>.sql`, each starting with `-- sign-in: <email>`. `pnpm seed <name>` resets the slot's database to base + scenario in 2–4 s and prints who to sign in as.

**Why.** Agents verify states, not just happy paths. A named scenario makes any state reproducible in one command, by an agent, a Maestro flow (`# scenario: <name>`), a demo (`demo.json`), an integration test (`useScenario`) or a reviewer (the PR's Scenarios table).

**Lessons.**

- **Values production needs are seeded by migrations,** not `seed.sql` (which never runs in production), with fixed ids that seeds name through `seed.<name>()` helpers.
- **A scenario that should go through an admin RPC calls `seed.act_as(email)`** first, so audit rows and side effects are real.
- **pgTAP and integration tests pass on every scenario:** they reset their own fixtures (`seed.reset_base_members()`), use fixture ids no scenario uses, and assert relative counts. CI applies every scenario.
- A scenario that depends on "now" computes its times from `now()`, so it's right whenever it is loaded.

## 8. Dev links, the dev panel and Storybook

**What.**

- `<scheme>://__agent/<event>?payload=<json>` (`apps/mobile/src/dev/agent-events.ts`) flips client-only state: offline, theme, time travel, a session override (any account gate, any role), sign-in as a seeded account, sign-out, demo mode (hide dev panels), plain chrome (compare with system defaults), refetch, reset. Release builds ignore it (unit-tested).
- `<scheme>://__storybook/<story-id>` renders one Storybook story full screen with no chrome, ready for a screenshot.
- `pnpm agent <event> [json]` and `pnpm run link <url>` open these on the slot's device and answer iOS's "Open in…?" prompt.
- Me → Dev panel (dev builds only) sends the same events by hand and lists the seeded accounts.

**Why.** Many states can't be seeded (offline, a native API's result, the clock, a forced role). Without a hook, agents fake them in code or skip them. `+native-intent.tsx` handles agent links before the router sees them, so the app stays on its screen.

**Rule.** Every new client-only state gets an event, a unit test and a row in the verify-in-app table. Time comes from `now()` / `useNow()` so time travel works. `pnpm run link`, not `pnpm link` (pnpm's own command writes a bogus dependency).

## 9. Driving devices: agent-device, batching, the laptop

**What.** [agent-device](https://github.com/callstack/agent-device) drives the simulator/emulator from the shell (snapshot with refs, press, fill, wait, screenshot, logs, record), always with the slot's `--session wt-<k>` and `--udid` / `--serial`.

**Batch known paths.** The human asked why subagents were slow: about 28 s per tool call, almost all of it model round trips, because the skill made one call per tap. A batch of 2 taps and 2 screenshots runs in 3 s in one call. Rule: one verb per call while exploring; once the path is known (retakes, state sweeps, a theme pass), one `agent-device batch` (60 s budget, `--on-error stop`, no links inside: flip agent events between batches).

**Mind the laptop.** Incident: the laptop overheated, load ~62 on 14 cores with three agents, one emulator alone at ~455 % CPU. Rules since:

- **One Android emulator machine-wide** (`wt up --android` refuses a second). Boot it only for the final parity pass, take every Android shot in one batch, kill it.
- **At most two feature agents at a time**, each in its own slot.
- `wt up` warns when the 5-minute load is above the core count.
- **Disk is the binding constraint.** With 2–5 GB free and 16 GB of swap, Android builds failed twice with "No space left on device"; the shared AVD's `/data` was 98 % full. Keep 10 GB free; delete generated native folders after a build.
- A cost of the cap: Android shots were sometimes left stale because the emulator was off to cool the laptop. List stale shots in the PR rather than hiding them.

**Smaller traps.** The agent-device session remembers an old UDID after a re-clone (close it first). zsh passes flags kept in a variable as one argument. Maestro and agent-device can't share UiAutomator on Android ("Device server died"). Maestro doesn't recurse into subfolders, so `demos/` isn't run by `pnpm e2e`.

## 10. Screenshots as proof

**What.** Committed shots under `docs/screenshots/<feature>/<platform>-<theme>-<state>.png` (2x, normalised status bar), mapped in `docs/screenshots/README.md` (screen, shot, scenario, events), embedded in the PR and in the feature doc.

**Why.** Reviewers (human or agent) can't run every branch. A committed, mapped shot is reviewable, diffable and retakeable at the same path.

**Lessons.**

- **Pin image links to the commit SHA**, never the branch. Incident: the human compared an old sign-in shot with the reference app after it had been retaken; GitHub caches images by URL. Re-pin every link after a retake and open the PR to check.
- **The default appearance first.** The app was dark by default, so shots and demos are dark first; the other theme goes in a collapsed `<details>`, only when colour changed.
- **Android parity is mandatory**, not "at least once per feature": every time a change touches something that differs by platform (edges, bars, headers, sheets, keyboard, fonts, shadows, gestures, haptics, permissions), otherwise once per PR on the final state. Fix drift rather than recording it.
- **Look at every shot.** A blank or red screen means the bundle failed.
- Enforced by the PR template and skills, not CI (there is no device CI).

## 11. Maestro and demo videos

**Maestro.** One flow per critical path in `apps/mobile/.maestro/`, with `# scenario: <name>` (the runner seeds it first) and `${APP_ID}` / `${SCHEME}` / `${METRO_PORT}` from `pnpm e2e`, so flows never hard-code the app's identity. A flow takes 25–27 s. Sign-in codes are read from Mailpit over HTTP (`scripts/mailpit-code.js`).

**Demos.** `pnpm demo prep|start|stop|run` and the demo-video skill: the agent drives the app tap by tap while agent-device records (taps drawn), then ffmpeg cuts every still stretch to 1.4 s (a 33 s take became 13 s; Android 42 s became 12 s), with a 9:41 status bar and seeded data. Saved demos replay from Maestro. Reviewing each take's contact sheet found two bugs: the dev tools button showing on Android (fixed by `demo prep`) and a trailing still escaping the cut (fixed by converting to a constant frame rate before still detection). Videos stay local (`demos-out/`, gitignored); sending them is the human's call.

## 12. UI: packages/ui, native chrome, lint

**What.** `packages/ui` is the only place styling lives: react-native-reusables components copied in and converted to tailwind-variants (Button, Text, Card, ListRow, Input, Field, Checkbox, AlertDialog, ActionSheet, Sheet, Badge, Toast, Divider, Progress, FilterChips, Feature, Prose, Avatar, Screen, Stack, Icon), motion primitives (FadeInBackground, Stagger, PressScale, NumberRoll), the haptic vocabulary, native chrome theming (`useNativeTabsTheme`, `useStackTheme`), the Phosphor icon map and the tab-icon rasteriser. Every component has a story; most have an RNTL test.

**Why copy in.** The kit was chosen for long-term maintenance: components copied into the repo can't be stranded by a slowing upstream.

**Lint enforces the invariants** (`eslint.config.mjs`, `scripts/check-one-off-styles.mjs`):

- no `style`, `className`, `StyleSheet.create`, raw `View`/`Text`/`Pressable` in app code; no hex colours or arbitrary Tailwind values (a grep catches what ESLint can't, including `eslint-disable`);
- no hand-rolled react-navigation navigators or hooks, no RN `<Modal>` (Expo Router `presentation` instead);
- no RN `SafeAreaView` / `StatusBar` (safe-area-context and expo-status-bar);
- no `Alert.alert` / `ActionSheetIOS` (the branded AlertDialog / ActionSheet).

**Native chrome over custom.** The human first chose a custom branded tab bar, picked one from prototypes, then rejected every hand-built bar: they "don't sit right at the bottom or sides" and full-bleed ones "look stretched". The decision moved to Expo Router `NativeTabs` (Liquid Glass on iOS 26, Material 3 on Android), branded only through its props. What the API can't do is written down (the glass shape, label tracking, the iOS badge text colour, the Android indicator shape) instead of hand-built around. The rule became an invariant: **official before custom**, and say in the PR what was checked. Alerts are the one deliberate exception: system popups can't carry the brand.

**One icon system.** Phosphor (maintained, six weights including `fill`; Lucide was rejected for having no filled variants). NativeTabs takes images, not components, so `pnpm --filter @app/ui tab-icons` rasterises the same glyph data to template PNGs with CanvasKit.

**The template uses the system font** (real weights, nothing bundled) and a neutral palette as placeholders. A brand font lives in four places (assets, `fonts.ts`, the CSS tokens, the native chrome names in `FONT`), because native chrome can't read CSS tokens: the design-system skill's "Change the font" recipe keeps them in step. Static instances only, one family token per weight: Android fakes a weight applied on top of a single-weight family.

**Form stacks need an opaque iOS header.** Under a floating one, React Native's keyboard inset handling scrolls a short form under the bar (`useStackTheme({ header: 'opaque' })`).

## 13. Data: capabilities, RPCs, types

**Capabilities, not one-offs.** The source project's first data model hard-coded its rules (a time zone, time windows, a schedule, a place, thresholds) in SQL and code. A follow-up moved every one of them to admin-editable rows and removed the shared constants. When the human then announced a second region and a seasonal variant, both were data changes, not code changes ([Origin](#origin)). Rule: name the general capability behind a ticket and what an admin will want to change, and model that; copy that names a place, a time or a count is filled from data.

**RPC conventions.** Reads go direct under RLS; anything that grants value goes through a `security definer` RPC with the gate inside (`private.require_member()`, `require_admin()`). Errors are codes, not copy: `P0001` (rule) or `42501` (access) with a snake_case message from `RPC_ERROR_CODES` and a plain hint; the app maps codes to copy. Admin edits take a strict jsonb patch (absent keeps, null clears, unknown fails). Every staff or admin action writes the append-only audit log in the same transaction. plpgsql parameters shadow columns: `#variable_conflict use_variable`.

**Types are a compile-time contract.** `packages/shared/src/rpc.ts` fails `pnpm typecheck` until every RPC has a zod input schema matching its generated `Args`, and until every database function has a schema (policy helpers excepted). So types are regenerated and committed after every migration.

**Why no ORM.** Only `supabase gen types` produces function `Args`. In a spike, a popular ORM's migration generator silently dropped the `USING` / `WITH CHECK` of 3 policies and stripped regex backslashes from 6 CHECK constraints, and all 453 pgTAP tests still passed; its new migration folder format was silently skipped by the Supabase CLI. Hand-written SQL migrations plus pgTAP won.

**Identity.** `members.id` is not `auth.uid()`; a member links to `auth.users` through `auth_user_id` and SQL uses `current_member_id()`. Roles are grants in `member_roles`, read on every call; the JWT claim is a UI hint only, so a revoked role stops working before the token expires.

**Onboarding is a PROJECT slot.** The template's profile is only a display name, `created_at` and `onboarded_at`, plus versioned terms. Domain fields (an age confirmation, a contact, a preference) are added per project with one recipe (the db-change skill, "Add an onboarding field or step"): a column, the `complete_onboarding` argument, the `launch_status` check when the app can't open without it, the zod schema, and a field or a step in the onboarding stack. One EXAMPLE field (`about`, optional) shows every place it touches and is meant to be replaced.

## 14. Tests and CI

| Level | Tool | Where |
|---|---|---|
| Domain logic, harness scripts | Vitest | `packages/shared/src/*.test.ts`, `scripts/**/*.test.mjs` |
| Components and screens | jest-expo + RNTL | `packages/ui/src/**/*.test.tsx`, `apps/mobile/src/__tests__` |
| Database rules | pgTAP | `supabase/tests/database` |
| API contract | Vitest against the local stack | `supabase/tests/integration` |
| Critical paths | Maestro, local | `apps/mobile/.maestro` |

CI (`.github/workflows/ci.yml`) runs typecheck, lint, unit, and integration (stack start, **every scenario applies**, pgTAP, Vitest) on every PR, in ~2 minutes. **No device CI:** simulators in CI are slow and flaky for an agent team's PR volume; Maestro and screenshots are required locally by the PR template instead.

A flaky test caught by CI: a pgTAP test failed about 1 run in 64 because it "tampered" with a token by overwriting a character with `A`, which was sometimes already `A`. Tamper with a value guaranteed to differ.

## 15. PRs, merge policy, deferred work, feature docs

- **One ticket, one worktree, one PR**, every template section filled: Summary (what a person notices), Context, Reference parity (optional), Scenarios (how to reproduce each state), Screenshots (SHA-pinned, default theme first, Android parity), Tests, Checklist.
- **Merge policy.** Foundation PRs (harness, data model, sign-in/onboarding, design system, docs) are squash-merged by the agent once CI is green. Feature PRs stack on their parent branch and the human merges. The earlier rule had the human merge everything, which blocked the foundation for no review value.
- **File what you defer.** Incident: a sign-in PR noted two half-ported pieces only in its body; the human asked whether they'd ever be built. Now every deferral is a ticket comment or a new ticket before the PR opens, and the PR links it.
- **Feature docs** (`docs/features/<capability>.md`): status, capabilities, what admins can customise, where it lives, ideas to expand, and a Screens section embedding the committed shots, so `docs/features/` doubles as the visual catalogue.

## 16. Porting a reference app (optional)

When a project rebuilds an existing app (a webapp, an old native app), set `reference` in `harness.config.json`. `pnpm reference` keeps a read-only checkout in `~/.<slug>/reference` with pushing disabled.

- **Study the reference screen first, from its source.** Incident: a sign-in PR invented copy, merged two screens into one, split a one-page form into three and used other photos, because agents ported from screenshots alone. Screenshots miss copy, assets and rules.
- **Port 1 to 1** (features, copy word for word, assets); the design may improve with a stated UX reason in the PR's parity table.
- **Fix the reference's bugs rather than port them**, and list them.
- **The reference never ships:** an agent once put the reference app's web domain into a native payload ([Origin](#origin)).
- **Retire the tooling after the port** (the invariant, the parity step, the PR section), then run a harness eval to check new agents no longer reach for it.

## 17. Dependencies

- **Newest stable, pinned exactly** (`save-exact=true`). Check `npm view <pkg> version` and that it's maintained. For Expo / React Native native modules, "latest" means the version the SDK pins (`expo install --check`); newer native versions arrive with an SDK upgrade (the expo-upgrade skill). When a newer major can't be taken, say why in the PR (today: TypeScript 7 is out but typescript-eslint supports `<6.1`; `@types/node` follows the Node major in `.nvmrc`).
- `node-linker=hoisted`: React Native autolinking and Metro need a flat `node_modules`.
- Vendored skills pinned in `skills-lock.json`; the Supabase CLI pinned in CI and `supabase.lock`.

## 18. The config file and drift control

**`harness.config.json`** holds what differs between apps made from the template: identity (name, slug, scheme, bundle id, Android package, platforms), the GitHub repo, the template it came from, the optional reference app, and the brand starting point (light and dark colours, radius, default appearance). Two ways it reaches the code:

- **Read at run time** by `app.config.ts`, `scripts/lib/env.mjs` (simulator names, `~/.<slug>`, deep links, Maestro's `APP_ID` / `SCHEME`) and the app (`expo-constants`). These files are therefore identical in every project, which is what makes drift control possible.
- **Written by `pnpm harness:apply`**: the colour and radius tokens between markers in `theme.css`, placeholder app icons drawn from the brand colours (replaced only while they're still the generated ones), and the name, scheme, bundle id and repo in `package.json`, `supabase/config.toml` and the docs (it remembers the previous values in `.harness/applied.json`, so a rename is one edit and one apply). `--check` fails CI-style when the repo is out of date; a unit test runs it.

The workspace scope is fixed (`@app/ui`, `@app/shared`, `@app/mobile`) on purpose: imports are identical across projects and never need rewriting.

**`pnpm harness:diff`** compares the files listed in the template's `harness.manifest.json` with the template (a cached clone, or `--template-dir`). It maps each side's identity to neutral tokens first, and ignores PROJECT blocks, so only real differences show. `--diff` prints them; `--patch` writes a patch in the template's own terms, ready for `git apply` in a template clone. It is self-contained (node and git only), so it also runs in repos that were not made from the template, such as the app the template was extracted from.

## 19. Self-improvement: retro, eval, push-back

The harness improves only if the agents using it feed back what they learned.

- **`harness-retro`** (every feature PR, last step; the PR checklist points at it): list what had to be discovered the hard way (repeated searches, failures that weren't your code, corrections, wrong instructions, manual work a script could do), file each in the right place (AGENTS.md line, skill step, script or lint rule, feature doc, HARNESS.md), prune stale lines, and say in the PR what changed.
- **`harness-eval`** (after big harness changes, on a new project, every few PRs): a cold-start discovery test. A fresh agent with only the repo gets a realistic task, plans without building, and reports what it read, its plan, and what it couldn't find. Each gap becomes a fix, and the gap is closed only when a fresh agent gets it right. The source project ran it once: a fresh agent found everything except where a new screen belonged, so the new-screen skill gained a pointer to the navigation decision.
- **Push-back.** A generic improvement made in a project goes back to the template through `pnpm harness:diff --patch` and a template PR.

## 20. Rebuilding the harness on another stack

The pieces map onto any mobile stack:

| Piece | This template | On another stack |
|---|---|---|
| Instruction file + skills | AGENTS.md, `.agents/skills` | the same files; any agent that reads a root instruction file |
| Slots | `scripts/wt` (Metro port, simulator clone, emulator port, Supabase stack) | the same claim; derive the dev server port, device and backend instance from `k` |
| Native build cache | Expo fingerprint + local build cache provider + a lock | hash your native inputs (Podfile.lock, Gradle files, native dirs) yourself; cache `.app` / `.apk` by hash; lock per platform |
| Local backend | Supabase stack mode, env regenerated | Docker Compose per slot with ports from `k`; regenerate env after every start |
| Seeds and scenarios | `seed.sql` + `scenarios/*.sql` + `pnpm seed` | the same with your DB's fixtures; one command, named states, "sign in as" |
| Dev links | `__agent` deep links, `__storybook`, dev panel | any deep-link handler gated to debug builds; a component catalog (Storybook, Flutter widgetbook, SwiftUI previews) reachable by link |
| Device driving | agent-device (+ batch) | agent-device supports iOS and Android generally; otherwise XCUITest / UIAutomator through a CLI |
| E2E | Maestro with scenario headers | Maestro works for Flutter and native apps too |
| UI invariant | packages/ui + lint bans | a design-system module + lint rules that ban raw primitives and inline styles in screens |
| Data contract | zod schemas + generated types + compile-time check | generated client types + a check that every endpoint has a schema |
| Drift control | `harness.config.json` read at run time + `harness:diff` | keep identity out of scripts so they stay byte-identical; diff the manifest |

Keep the order of work: slots and the local backend first (everything else depends on isolation), then seeds and dev links, then device driving and screenshots, then the UI and data invariants, then the self-improvement loop.

## 21. Incident log

| Incident | What changed |
|---|---|
| Laptop overheated: load ~62 on 14 cores, one emulator at ~455 % CPU | One emulator machine-wide, at most two feature agents, `wt up` load warning |
| Android builds failed twice: "No space left on device" | Keep 10 GB free; delete generated native folders; AVD data partition noted |
| Subagents ~28 s per tool call, one tap per call | `agent-device batch` for known paths |
| Human compared a stale screenshot after a retake | SHA-pinned image links, re-pinned after every retake |
| Deferred pieces noted only in a PR | Deferrals filed on tickets before the PR opens |
| Merged worktrees' state files pointed at another agent's slot | Scripts check slot ownership; `wt down` deletes state |
| Hand-built tab bars rejected after prototyping | NativeTabs, branded through its API; "official before custom" |
| Invented copy, merged and split screens in a port | Study the reference source first; parity table in the PR |
| Reference app's web domain in a native payload | "The reference never ships" |
| Hard-coded schedule, windows and thresholds | Project values as admin-editable rows; "capabilities, not one-offs" |
| ORM spike lost policy expressions silently | Hand-written SQL + pgTAP; generated types |
| pgTAP failure 1 in 64 runs | Tamper with a value guaranteed to differ |
| AGENTS.md restating package.json and the tree | Pruned to non-discoverable gotchas |
| Feature docs never read before work | "Where knowledge lives" read pointers |
| Manual steps scattered across PRs | One checklist for the human, in one place |

## 22. Open problems

- **Backends other than Supabase** aren't wired: `supabase/`, `scripts/sb.mjs`, the integration helpers and the auth library assume it. A different backend is a port of section 6, 7 and 13.
- **Declarative database schema** with drift checks in CI (Supabase's declarative schema is still alpha; renames become DROP + ADD while exiting 0).
- **Tab minimise-on-scroll** is set but doesn't engage while each tab nests a native Stack (react-native-screens 4.30 hides it behind a flag).
- **The Android dev client** opens the React Native dev menu on first launch; demos switch the tools button off by hand.
- **No device CI**: a remote device farm could take screenshots in CI.
- **Measure Metro memory per slot** to revisit the two-agent cap on bigger machines.
