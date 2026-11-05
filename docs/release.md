# Releasing the app

How a change goes from a pull request to users' phones. `main` is development; merging `main` into `production` releases. Until the accounts and secrets in [Setup](#setup) exist, every workflow below skips or dry-runs cleanly. Steps marked **(agent)** an agent can do once the human asks.

```
PR (conventional title + changeset) ──squash──▶ main ──▶ staging.yml: migrations + Edge Functions → staging Supabase
                                                  │      changesets.yml: "Version packages" PR (version + CHANGELOG.md)
                                                  │
                         PR main → production ──merge commit──▶ production ──▶ release.yml
                                                                                 plan: fingerprint per platform
                                                                                 staging-check: staging has every migration?
                                                                                 backend: db push + functions → production
                                                                                 ship: unchanged fingerprint → eas update --channel production
                                                                                       changed fingerprint   → eas build --auto-submit
                                                                                                               (TestFlight, Play internal testing)
                                                                                 tag v<version> + GitHub release
```

## Environments

| | Backend (Supabase) | App build (eas.json profile → EAS environment → update channel) | Who uses it |
|---|---|---|---|
| Local | each worktree's own stack (`pnpm wt up`) | the cached dev client (`pnpm wt`), values from `apps/mobile/.env.local` | agents, simulators |
| Staging | the staging project, deployed from `main` by `staging.yml` | `preview` → `preview` → `preview` (internal distribution) | testers |
| Production | the production project, deployed from `production` by `release.yml` | `production` → `production` → `production` (TestFlight, Play internal testing, then the stores) | users |

The `development` profile builds a dev client on EAS for a real phone; agents never need it. `production-apk` (`eas build --profile production-apk --platform android`) makes an installable Android APK of the production app, for testers to sideload before Google Play exists. A production binary in TestFlight is the one the store gets, so it talks to production.

Per-environment values live in the **EAS environment** of the profile (expo.dev → the project → Environment variables): `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` (staging's in `preview`, production's in `production`), the Google sign-in ids and `GOOGLE_IOS_URL_SCHEME`. `EAS_PROJECT_ID` (and `EAS_OWNER` for an organisation) is set in every EAS environment and as a GitHub repository variable, so `eas` in CI finds the project. `app.config.ts` reads the native ones (project id → the update URL); Metro inlines the `EXPO_PUBLIC_*` ones. None of them is set locally, so every worktree resolves the same config and shares one native build; a preview or production EAS build without a Supabase URL fails instead of shipping an app that can't sign in.

The native fingerprint must be the same on a laptop, on CI and on EAS's servers, or every release looks like a native change: `apps/mobile/fingerprint.config.js` leaves out the build-cache path (it names a folder in each machine's home directory). Check it with `pnpm wt fingerprint` locally against `pnpm release plan --dry-run`.

## Every pull request

- **Title:** a Conventional Commit, `type(scope): summary` with `feat`, `fix`, `chore`, `docs`, `refactor`, `perf`, `test`, `build`, `ci`, `style` or `revert`. `pr-body` checks it; the squash commit on main keeps it.
- **Changeset:** a change a user notices adds one: `pnpm changeset`, pick the app package (`apps/mobile`), `patch` for a fix, `minor` for a feature (`major` only when the human says so), and one sentence a user would understand ("Reminders now arrive two hours before the event."). It becomes the CHANGELOG line, the GitHub release notes and the OTA update message. Anything else writes "No user-facing change" in the PR's **Changeset** section. `pr-body` fails a PR with neither.

## Every merge to main

- `staging.yml` deploys migrations (`supabase db push`) and every Edge Function except shared code (`_shared`) and local fakes (`<name>-fake`) to staging, when `supabase/` changed. Re-run it from the Actions tab to redeploy.
- `changesets.yml` opens or updates the **"chore(release): version packages"** PR: it bumps `version` in `apps/mobile/package.json` (the store version, read by `app.config.ts`) and writes `apps/mobile/CHANGELOG.md`. Merge it when you want to release.

## Releasing

1. **Merge the Version packages PR** on main. A release needs a version that was never tagged: `plan` refuses a `v<version>` that already points at another commit, so a release without a changeset (no bump) is blocked. Wait for `staging.yml` if it deployed, and try the change on a preview build or against staging.
2. **Open a PR from `main` to `production`**, titled `chore(release): v<version>`. Merge it with **Create a merge commit**, never squash: a squashed `production` drifts from `main` and the next release PR conflicts.
3. **`release.yml` runs:**
   1. `plan` computes each platform's native fingerprint with the production EAS variables and asks EAS for a production build with that fingerprint. It stops if `v<version>` was already released from another commit, or an iOS store build lacks `submit.production.ios.ascAppId` in `eas.json`.
   2. `staging-check` refuses the release unless staging has applied every migration in this commit.
   3. `backend` pushes the migrations and deploys the Edge Functions to production. The backend goes first so the app never reaches users before the database it needs.
   4. `ship`: per platform, an **OTA update** (`eas update --channel production`) when a production build already has the fingerprint (only JavaScript and assets changed), or a **store build** (`eas build --profile production --auto-submit`) when it changed. Builds run on Expo's servers; the job only queues them. Then it tags `v<version>` and creates the GitHub release from the changelog.
4. **A store build** lands in TestFlight and Google Play internal testing about an hour later. Install it from there and check it.
5. **Promote it** (human): App Store Connect → the version → Add for Review, with **phased release** on; Play Console → Production → Create release from the internal build, with a **staged rollout** (start at 10–20 %).
6. **Check on a phone:** the new version (or update) installs and opens on the production backend.

`RELEASE_PLATFORMS` (a repository variable, comma-separated) limits the platforms a release ships. Set it to `ios` until the Google Play account exists; delete it (or set `ios,android`) afterwards.

### Dry run

Nothing needs a secret to see what a release would do:

- Locally: `pnpm release plan --dry-run` (fingerprints computed on your machine, EAS not asked), and `pnpm release ship|staging-check|deploy-backend --dry-run` print their commands.
- On GitHub: Actions → **release** → Run workflow (dry run is ticked by default). With `EXPO_TOKEN` set, the plan also asks EAS for matching builds, so the decision is the real one. Every PR that changes the pipeline runs one.

## Rolling back

Fix forward when you can (a new PR, a new release). When users are hurting now:

- **A bad OTA update:** `eas update:rollback` (from `apps/mobile`, signed in to EAS) and choose **a previously published update**: it republishes the last good one to the `production` channel, and phones take it on their next launch. Choosing **the embedded update** sends them back to what the store build shipped with. The next `eas update` (the fix) reaches everyone again. **(agent)** can run it.
- **A bad store build:** stop it spreading. App Store Connect → the version → **Pause Phased Release** (up to 30 days); Play Console → Production → the release → **Halt rollout**. Then ship the fix: as an OTA update if only JavaScript changed (it reaches the bad build too, same fingerprint), or as a new store build with a higher version. Apple can't take a version back; **Remove from Sale** is the last resort.
- **A bad migration:** migrations never run backwards. Write a new migration that undoes or repairs it (db-change skill), merge it to main (staging gets it and you check it there), then release: production gets the fix the same way. If the data itself is damaged, Supabase → Database → Backups restores the project to a point in time (paid plans): ask the human first, because it also rolls back every user's data since.
- **A bad Edge Function:** revert the change on main, let staging deploy it, then release; or re-run the last good `release.yml` run's `backend` job (it redeploys that commit's functions; its migrations are already applied).

## Setup

The human creates the accounts; copy these steps into the project's one manual-steps checklist (AGENTS.md, "Working with the human"), in its style: where to click, the cost, and **(agent)** on the steps an agent can do afterwards.

1. **Expo / EAS** (free tier works): create the project (`eas init` from `apps/mobile`, **(agent)** once signed in), then an access token (expo.dev → Account settings → Access tokens) as the `EXPO_TOKEN` repository secret. Set `EAS_PROJECT_ID` (and `EAS_OWNER` for an organisation) as repository variables and in every EAS environment.
2. **Two Supabase projects**, staging and production. A personal access token (supabase.com → Account → Access tokens) as `SUPABASE_ACCESS_TOKEN`; each project's ref and database password as `STAGING_SUPABASE_PROJECT_REF`, `STAGING_SUPABASE_DB_PASSWORD`, `PRODUCTION_SUPABASE_PROJECT_REF`, `PRODUCTION_SUPABASE_DB_PASSWORD`. Each project's URL and publishable key go into the matching EAS environment (`preview`, `production`).
3. **Apple Developer Program** (99 USD a year): the app in App Store Connect, then its numeric Apple ID as `submit.production.ios.ascAppId` (and `appleTeamId`) in `eas.json` **(agent)**. The first `eas build` asks for the Apple credentials once, interactively.
4. **Google Play Console** (25 USD once): the app, a first upload by hand (Play requires it before the API can submit), and a service account key for EAS Submit. Until then, keep `RELEASE_PLATFORMS=ios`.
5. **Optional:** a fine-grained GitHub token (contents and pull requests: read and write) as `CHANGESETS_TOKEN`, so the Version packages PR runs its checks. Without it, close and reopen that PR.

**Secrets: prefixed repository secrets, or GitHub Environments.** On GitHub's free plan a private repository has no Environments (and no branch protection), so the workflows read prefixed repository secrets (`STAGING_*`, `PRODUCTION_*`) and merging the release PR is the approval. On a paid plan (GitHub Team), move each set into an Environment named `staging` or `production` (unprefixed names, required reviewers on `production`), add `environment: production` to `release.yml`'s `backend` and `ship` jobs and `environment: staging` to `staging-check` and `staging.yml`, and protect the `production` branch.

## Store gotchas

- **Export compliance:** `ios.config.usesNonExemptEncryption: false` in `app.config.ts` (the app only uses standard HTTPS/TLS), or TestFlight holds every build until someone answers the encryption question in App Store Connect.
- **NFC on iOS:** if the app reads NFC tags (for example with `react-native-nfc-manager`), the `com.apple.developer.nfc.readersession.formats` entitlement must be `["TAG"]` only. Apple's upload rejects `NDEF` (ITMS-90778); `TAG` still reads and writes NDEF through `NfcTech.Ndef`.
- **Android out of memory on EAS:** Gradle and Kotlin's defaults overrun the free build worker's memory and the build dies late with "Gradle build daemon disappeared". The `production` profile's `GRADLE_OPTS` in `eas.json` caps the heap, the workers and the daemons; keep it when you add profiles that extend `base`.
- **Versions:** the store version is `apps/mobile/package.json` `version`, bumped only by the Version packages PR; the build number is remote (`appVersionSource: remote`, `autoIncrement`), so never edit either by hand.
