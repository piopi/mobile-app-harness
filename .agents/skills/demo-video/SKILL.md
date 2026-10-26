---
name: demo-video
description: >-
  Record a polished demo video of a feature for a client or stakeholder: the agent drives the app on its own
  slot tap by tap while agent-device records (taps shown as dots), then `pnpm demo stop` cuts the dead time
  and writes a shareable MP4. Saved demos replay from Maestro with `pnpm demo run`. Use when asked to record,
  film, or make a video or demo of a feature, a flow or the app.
---

# demo-video

A demo is a short film of one feature, shot on seeded data with a clean status bar. You drive it the way you verify a change (verify-in-app): one action at a time, checking each result. The recorder keeps everything; `pnpm demo stop` removes the dead air afterwards, so take your time between steps.

## Record a demo (agent-driven)

1. **Know the story.** One feature, one path, ending on the payoff screen (the saved thing, the confirmation, Home after sign-up). Aim for 15 to 45 seconds of final video. If the human named the feature loosely ("sign-up"), the story is its happy path from the first screen a new person sees.

2. **Bring up your slot** with `pnpm wt up` (add `--android` when the demo is for Android too), and seed data that makes the feature look alive: `pnpm seed` lists the scenarios. Use seeded people only, never a real account.

3. **Rehearse off camera.** Open the session, walk the path once, and note the refs and labels you will press:

   ```bash
   pnpm exec agent-device open <bundle-id> --platform ios --udid <udid> --session wt-<k> --metro-port <8100+k>
   pnpm exec agent-device snapshot -i --session wt-<k>
   ```

   Fix anything that breaks the story (a warning toast, a missing state, wrong copy) before you film. A warning toast means a real warning: fix its cause.

4. **Reset to the first frame.** `pnpm demo prep` relaunches the app the way `wt up` does (no dev tools button) and sets the theme (the app's default appearance unless `--light` / `--dark`). Then navigate, still off camera, to the screen where the story starts.

   ```bash
   pnpm demo prep [--light|--dark]          # add --android for the emulator
   pnpm seed <scenario>                     # again, if the rehearsal changed data
   ```

5. **Roll.** `pnpm demo start <name>` sets the 9:41 status bar and starts recording. `<name>` is the feature in kebab case (`sign-up`). Use one recording per slot at a time.

6. **Act it out.** You rehearsed the path, so run it as one or a few `agent-device batch` requests (verify-in-app, step 6) with `--on-error stop`; a long take is several batches. Without a batch, use one action per call with `--settle` and read the diff before the next. A press that reports an error or changes nothing means the take is spoiled: stop and redo it rather than recover on camera. `fill` types into fields; scroll gently. Hold on the payoff screen for a moment before you stop.

7. **Cut.** `pnpm demo stop` stops the recorder and keeps about 1.4 s of every still stretch, enough to read, and none of your thinking time. It restores the status bar and writes:
   - `demos-out/<name>-<ios|android>-<light|dark>.mp4`: H.264, plays anywhere;
   - `demos-out/<name>-…sheet.png`: a contact sheet of every change.

8. **Watch it.** Open the contact sheet and check every cell: the right screens in order, no red screen, no dev tools button, no error toast, no half-loaded state, and real seeded content. If anything is off, go back to step 4. Never hand over a take you have not checked.

9. **Hand it over.** Give the human the absolute path of each MP4 (iOS and Android, in the default appearance unless another was asked for) and a one-line summary of what it shows. Videos stay in `demos-out/` (gitignored). Sending them to a client is the human's call: never upload or share them yourself.

## Save a demo to replay it

When a demo will be re-recorded after the UI changes (a sales flow, the onboarding), save it as Maestro flows in `apps/mobile/.maestro/demos/<name>/`:

- `setup.yaml` runs off camera. Start with `- runFlow: ../_open.yaml`, which opens this slot's bundle cleanly and applies `THEME`, then reach the first frame.
- `record.yaml` is what's on camera. Put `- runFlow: ../_pause.yaml` (or `{ file: ../_pause.yaml, env: { MS: 2500 } }`) between steps, so a viewer can follow.
- `demo.json` holds `{ "title": "…", "scenario": "<seed>" }`. The scenario is seeded before setup.

Replay it with `pnpm demo run <name> [--android] [--light]`; `pnpm demo` lists the saved demos. Maestro taps are not drawn on the video, and the cut, the sheet and the hand-over steps are the same. `apps/mobile/.maestro/demos/tour` is the reference.

## Gotchas

- `pnpm demo prep` relaunches the app, so open the agent-device session **before** it and keep it open. Any other relaunch can bring the dev tools button back; run `pnpm demo prep` again.
- Android: close the agent-device Android session before `pnpm demo run --android`, because Maestro and agent-device cannot share UiAutomator. Recordings longer than 180 s come back in chunks, so keep Android demos short.
- Android ignores `__expo_disable_fab`, so the dev tools button (a gear) stays on screen. Before recording, open the dev menu (`adb -s <serial> shell input keyevent 82`) and switch **Tools button** off; it stays off until the emulator restarts.
- `demos/_open.yaml` sends `__agent/demo`, which hides the dev-only panels (seeded accounts on sign-in, the harness card on Home). A setup flow that signs in uses `__agent/sign-in`, not a `session` override, so the screens show real data.
- A failed `pnpm demo run` deletes its half-recorded video. A failed agent take is yours to delete: take it again under the same name and it is overwritten.
- `pnpm demo stop` needs ffmpeg (`brew install ffmpeg`).
