---
name: worktree
description: >-
  Give a git worktree its own isolated, fast dev environment with `pnpm wt up|down|status`: a numbered slot
  that owns a Metro port, a cloned iOS simulator, an on-demand Android emulator and its own Supabase stack,
  with native builds shared across worktrees through a fingerprint-keyed cache. Use when starting work in a
  worktree, when a native rebuild happens, when ports or devices collide, or when cleaning up.
---

# worktree

Each ticket runs in its own git worktree, and several agents work in parallel. `pnpm wt` keeps them apart. Why it is built this way, with measurements: HARNESS.md, "Worktree slots". Identity comes from `harness.config.json`: `<slug>` below is `app.slug`.

## Start

```bash
git worktree add ../<repo>-wt-<ticket> -b feat/<ticket>      # from the main checkout
cd ../<repo>-wt-<ticket>
pnpm install                                                # hardlinks from the pnpm store, ~10 s
pnpm wt up                                                  # add --android for an emulator, --reset to reset the DB
```

`wt up` prints the slot, device, Metro URL and how long each step took. Timings are appended to `~/.<slug>/timings.jsonl`. When the machine is already busy (5-minute load above the core count) it says so: batch your device work and keep to one emulator.

## What slot k owns

| Resource | Value | Notes |
|----------|-------|-------|
| Slot claim | `~/.<slug>/slots/<k>/path` (atomic `mkdir`), `.wt/slot` in the worktree | `k` is 1..4. A slot whose worktree path is gone is reclaimed. |
| Metro | port `8100+k`, log `.wt/metro.log`, started with `EXPO_PUBLIC_STORYBOOK=true` | 8081 stays free for humans. Never use `--clear`: the Metro cache in `$TMPDIR` is shared. |
| iOS simulator | `<slug>-wt-k`, cloned from `<slug>-golden` (iPhone 17, newest iOS runtime) | Kept between sessions (re-boot ~5 s). `wt down --destroy` deletes it. |
| Android emulator | AVD `Pixel_9` (`WT_AVD`), `-read-only -port 5554+2k`, serial `emulator-<5554+2k>` | Only with `--android`, and only if `android` is in `app.platforms`. **One** running machine-wide (it takes ~4-5 cores); `wt up --android` refuses a second. `adb reverse` maps Metro and the Supabase API port. |
| Supabase | its own `supabase stack` (CLI 2.122.0, Docker runtime) | Ports are automatic. `.env.local` (root) and `apps/mobile/.env.local` are rewritten after every start. |
| agent-device session | `wt-k` | Pass `--session wt-k` and the slot's `--udid` / `--serial`. |

## Native builds and the shared cache

- The app config sets `buildCacheProvider: expo/local-build-cache-provider` with `cacheDir: ~/.<slug>/build-cache`, shared by every worktree.
- `wt up` computes the Expo fingerprint of `apps/mobile`. On a hit it installs `ios-<hash>-unknown.app` / `android-<hash>-unknown.apk` straight from the cache (seconds; no prebuild, no pods).
- On a miss it takes the machine-wide lock (`~/.<slug>/locks/ios-build` or `android-build`), checks the cache again, then builds: `expo run:ios --device <udid> --no-bundler` (which uploads to the cache), or `expo prebuild` + `gradlew app:assembleDebug` (copied in atomically). Other worktrees wait for the lock instead of building the same thing. Both builds run at background priority (`taskpolicy -b`, Gradle `--max-workers=4`): slower, but the laptop stays usable for the other agents.
- What changes the fingerprint: native packages, config plugins, `app.config.ts`, `package.json` dependency changes, `patches/`. JS, CSS and `.env.local` never do. `pnpm wt fingerprint` prints the hash.
- **Never put per-worktree values in `app.config.ts`.** It would give every worktree its own fingerprint and defeat the cache.
- `pnpm wt build ios|android [--force]` fills the cache without the rest of `wt up`.
- Free disk after a native build with `rm -rf apps/mobile/ios apps/mobile/android` (they are generated; the cache keeps the binary).

## Status, stop, clean up

```bash
pnpm wt status          # every slot: Metro up/down, simulator state, emulator, worktree path, cache entries, held locks
pnpm wt open [android]  # relaunch the dev client on this slot's Metro
pnpm wt down            # stop Metro, shut the simulator, kill the emulator, stop the stack, release the slot
pnpm wt down --destroy  # also delete the simulator clone and the stack (before `git worktree remove`)
pnpm wt gc              # reclaim slots whose worktree is gone, delete unavailable simulators
```

## Troubleshooting

- **"no free slot"**: `pnpm wt status`; `pnpm wt down` in an idle worktree, or `pnpm wt gc`.
- **App shows the dev launcher, a red screen or an old bundle**: `pnpm wt open`, then read `.wt/metro.log`.
- **"Open in <app>?" prompt**: iOS asks when a link is opened with `simctl openurl`. `wt open` launches with `--initialUrl` to avoid it; `agent-device open <link>` accepts it for you.
- **A build waits forever on a lock**: `pnpm wt status` shows the lock and its owner pid. A lock whose pid is dead is removed automatically.
- **Android `install` fails with "not enough space"**: the shared `Pixel_9` AVD's `/data` is nearly full. The instance is `-read-only`, so changes vanish on exit: `adb -s <serial> uninstall <unrelated app>` in the running instance, then `pnpm wt up --android` again. For good, wipe the AVD or give it a bigger data partition in Android Studio.
- **Emulator exits with "not enough disk space to run avd"**: the Mac's disk is nearly full (the emulator wants a few GB free). Free space, then retry.
- **Backend line says error**: `pnpm sb start` (rewrites `.env.local`), then `pnpm wt open`. Android needs `adb reverse` for the API port, which `wt open android` sets.
