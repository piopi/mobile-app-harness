---
name: verify-in-app
description: >-
  Run the real dev client on this worktree's simulator (or emulator) against this worktree's local Supabase
  stack, drive it with agent-device, and take the screenshots a PR commits. Seed a named scenario, flip
  client-only states through the dev-only `<scheme>://__agent/<event>` link, open a single Storybook story with
  `<scheme>://__storybook/<id>`, and batch known paths. Use when asked to verify, screenshot or "check in the
  app" a change, and before claiming a UI change works.
---

# verify-in-app

Run the app on fake local data, drive it step by step, look at the result, and keep the shots that prove the change. Everything here uses **your slot**: never another worktree's simulator, Metro port, session or stack. `<scheme>` and `<bundle-id>` are `app.scheme` and `app.bundleId` in `harness.config.json`.

## Steps

1. **Bring the slot up.** From the worktree root:

   ```bash
   pnpm wt up                # iOS: simulator <slug>-wt-<k>, Metro 8100+<k>, Supabase stack, dev client installed and open
   pnpm wt up --android      # also an emulator (emulator-<5554+2k>); one machine-wide, stop it right after
   cat .wt/state.json        # slot, metroPort, udid, serial
   ```

   A JS-only change never needs a native build. If `wt up` says "cache miss (built)", your change touched native inputs (see the worktree skill).

2. **Seed a scenario.** Each one resets this slot's database:

   ```bash
   pnpm seed                 # list every scenario and who to sign in as (db-change skill describes them)
   pnpm seed onboarding      # prints who to sign in as (password123)
   ```

   Then refetch in the app: `pnpm agent refetch`, or sign in at once: `pnpm agent sign-in '{"email":"olly@app.test"}'`.

3. **Open a session** (once per slot). Pass this slot's device so you never grab another agent's simulator:

   ```bash
   pnpm exec agent-device open <bundle-id> --platform ios --udid <udid> --session wt-<k> --metro-port <8100+k> --relaunch
   pnpm exec agent-device open <bundle-id> --platform android --serial emulator-<5554+2k> --session wt-<k>-android --metro-port <8100+k>
   ```

4. **Drive it.** While you explore, one verb per call, each with `--settle`, continuing from the printed diff:

   ```bash
   pnpm exec agent-device snapshot -i --session wt-<k>                    # @refs; give elements testID / accessibilityLabel
   pnpm exec agent-device press @e18 --settle --session wt-<k>
   pnpm exec agent-device fill @e4 "ada@app.test" --settle --session wt-<k>
   pnpm exec agent-device wait text "Harness ready." --session wt-<k>     # verify by text, not by eye
   ```

5. **Flip client-only states** with the dev-only agent link (`apps/mobile/src/dev/agent-events.ts` is the event table; the Me tab's dev panel sends the same events by hand). The app stays on its screen:

   | Event | Payload | Effect |
   |-------|---------|--------|
   | `offline` / `online` | none | TanStack Query goes offline/online, `NETWORK` flips |
   | `theme` | `{"theme":"light"\|"dark"\|"system"}` | Uniwind theme (not saved, unlike Me → Appearance) |
   | `time-travel` | `{"iso":"2026-10-28T22:10:00Z"}` or `{"offsetMinutes":90}`; none resets | `now()` / `useNow()` shift |
   | `refetch` | none | invalidate every query (after `pnpm seed`) |
   | `sign-in` | `{"email":"ada@app.test"}` (`password` optional, default password123) | signs in to this slot's stack as a seeded account; the gates follow the database |
   | `sign-out` | none | signs out (back to the landing) |
   | `session` | `{"mode":"signed_out"\|"onboarding"\|"terms"\|"suspended"\|"member"}`, `{"roles":["member","staff"]}`, `{"real":true}` | overrides the real session: which gate opens, staff-only UI; `real` drops the override |
   | `demo` | none, or `{"on":false}` | hides the dev-only panels (seeded accounts, the harness card) for demo videos |
   | `chrome` | `{"plain":true}` | the tab bar without our branding (system defaults), for side-by-side shots |
   | `reset` | none | back to defaults (not the session: send `session` with `{"real":true}`) |

   ```bash
   pnpm agent theme '{"theme":"dark"}'          # add --android for the emulator
   pnpm agent offline
   pnpm run link '<scheme>://items'             # any deep link (`pnpm link` without `run` is pnpm's own command)
   ```

   `pnpm agent` / `pnpm run link` open the link on this slot's device and tap iOS's "Open in <app>?" prompt for you. A plain `agent-device open <link>` on a running app leaves that prompt up (answer it with `snapshot -i` then `press` on "Open").

   A new client-only state (a fake native result, a permission answer, a feature flag) gets a new event in `agent-events.ts`, a unit test, and a row in this table.

6. **Batch what you already know.** One verb per call is for exploring. Once the path is known (retakes, a sweep of every state, a dark and light pass), run it as one `batch` request: every model turn costs far more than the steps themselves (measured: ~28 s per tool call, against 3 s for 2 taps and 2 shots in one batch). A batch has a 60-second budget, stops on the first failure with `--on-error stop`, and cannot open links, so flip agent events with `pnpm agent` between batches (one batch per theme or state):

   ```bash
   cat > /tmp/sweep.json <<'JSON'
   [
     {"command":"press","input":{"target":{"kind":"selector","selector":"label=\"Items\""},"settle":true}},
     {"command":"screenshot","input":{"path":"docs/screenshots/items/ios-dark-list.png","pixelDensity":2,"normalizeStatusBar":true}},
     {"command":"press","input":{"target":{"kind":"selector","selector":"label=\"Me\""},"settle":true}},
     {"command":"screenshot","input":{"path":"docs/screenshots/me/ios-dark-me.png","pixelDensity":2,"normalizeStatusBar":true}}
   ]
   JSON
   pnpm agent theme '{"theme":"dark"}'
   pnpm exec agent-device batch --steps-file /tmp/sweep.json --on-error stop --session wt-<k>
   ```

   Steps take the structured input (a CLI flag `--settle` becomes `"settle":true`, a positional becomes a named field); `agent-device batch --help` has the rules.

7. **Screenshot.** Working shots small, committed shots at 2x with a normalised status bar:

   ```bash
   pnpm exec agent-device screenshot /tmp/look.png --scale 0.3 --session wt-<k>                          # to look at
   pnpm exec agent-device screenshot docs/screenshots/<feature>/ios-dark-<state>.png --pixel-density 2 --normalize-status-bar --session wt-<k>
   ```

   Open every shot and look at it. A blank or red screen means the bundle failed: read `.wt/metro.log`.
   Name files `<platform>-<theme>-<state>.png`. Committed shots follow the app's default appearance first (`brand.defaultAppearance`, dark in the template); add the other theme only when the change touches colour, and put those shots in a collapsed `<details>` in the PR.

   **Android parity check.** iOS is the fast loop; Android is the parity check, and it is not optional:
   - **Every time** the change touches something that differs by platform: screen edges and safe areas, tab/nav bars, headers, sheets and modals, the keyboard, fonts and text metrics, shadows/blur/elevation, gestures and back behaviour, haptics, permissions, camera.
   - **Otherwise once per PR**, on its final state, before you open it.
   - Compare against the iOS shot of the same state and fix any drift, rather than recording it. Commit `android-<theme>-<state>.png` beside the iOS shots so the PR shows both.
   - Check `df -h` first and keep at least 10 GB free. Only one emulator runs machine-wide: boot it for the final parity pass (all Android shots in one batch), then shut it down at once (`adb -s <serial> emu kill`). Several agents share one laptop; keep the load down.

8. **One component in isolation.** Metro from `wt up` bundles Storybook. Story ids are `<title>--<story>` in kebab case (`UI/Button` + `Variants` → `ui-button--variants`):

   ```bash
   pnpm run link "<scheme>://__storybook/ui-button--variants"
   pnpm exec agent-device screenshot docs/screenshots/ui/ios-dark-button-variants.png --pixel-density 2 --session wt-<k>
   ```

9. **Check for errors.** `pnpm exec agent-device logs clear --restart --session wt-<k>` before a repro, `logs path --session wt-<k>` after. `react-devtools errors` lists React errors. Metro output is in `.wt/metro.log`.

10. **Commit the proof.** Put the shots in `docs/screenshots/<feature>/`, add or update their rows in `docs/screenshots/README.md` (screen, shot, scenario, agent events), and embed them in the PR:

    ```markdown
    ![Items, dark](https://github.com/<owner>/<repo>/blob/<sha>/docs/screenshots/items/ios-dark-list.png?raw=true)
    ```

    Pin links to the commit SHA that holds the shots (`git rev-parse HEAD` after pushing), never the branch: GitHub caches images by URL, so a branch link shows the old picture after a retake. After every retake, re-pin all links in the PR body and open the PR to check each image.

    Retake every committed shot your change made stale, at the same path and state. List retaken files in the PR.

11. **Run the flow.** `pnpm e2e` (and `pnpm e2e --android`) runs the Maestro flows on your slot. Add or update the flow for your feature's critical path. On Android, `agent-device close` the Android session first: Maestro and agent-device cannot both hold UiAutomator (Maestro fails with "Device server died").

12. **Clean up.** `pnpm exec agent-device close --session wt-<k>`, then `pnpm wt down` when you are done with the slot.

## Rules

- In zsh, do not keep flags in a variable (`S="--session wt-1"`): zsh passes it as one argument. Write the flags out.
- After `pnpm wt down --destroy` or a re-cloned simulator, run `agent-device close --session wt-<k>` before `open`: the session remembers the old UDID.
- Only your slot: `--session wt-<k>`, your `--udid`/`--serial`, your Metro port. A `DEVICE_IN_USE` error means you picked someone else's device.
- Commit only screenshots of seeded data. Never real accounts.
- No real external calls: third-party services are faked locally (AGENTS.md, "Local first").
- Report what you checked and what you could not check (real hardware, a real store account).
