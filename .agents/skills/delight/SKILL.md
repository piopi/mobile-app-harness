---
name: delight
description: >-
  Motion, haptics and small details for user-facing screens: the quiet "feel" polish every new screen gets
  from the motion primitives, and the app's short list of signature (wow) moments at real peaks. Use when
  building or reshaping a screen, when a state changes at a peak (achievement, unlock, milestone, arrival),
  or when asked for polish, animation or "wow". Not for backend, data or harness work.
---

# delight

The app should feel alive and crafted, not loud. Most of that is quiet polish users barely notice. A few moments, at the real peaks of a user's journey, are allowed to be big. Motion explains what happened; it is never decoration for its own sake.

## Feel: quiet polish on every new screen

Use the primitives in `packages/ui/src/motion/` where they fit; don't invent new effects for ordinary screens.
- Press feedback: `PressScale`.
- Content that enters in order: `Stagger`.
- Images that fade in: `FadeInBackground`.
- Numbers that change: `NumberRoll`.
- Loading: skeletons that pulse.
- The native transitions: stack push, sheets, tabs.
- Haptics only where they carry meaning (see Rules).

If a screen needs none of this, that's fine. Say so in the PR's **Delight** section.

## Signature moments: rare, at real peaks

A signature moment is the one big, memorable beat at a peak in the user's journey: a first success, an achievement, a milestone, an arrival. There are few on purpose: too many and none of them land, and the app feels busy.

**The register** (the only signature moments in the app; add one only with the human's yes):

| Moment | Where | What happens | Status |
|---|---|---|---|
| _none yet_ | | | |

**To propose a new one:**
1. The moment must be a genuine peak: an achievement, a milestone, a first time, or an arrival. It is never an ordinary list, form or setting.
2. Ask the human through the question tool. Say what the moment is and why it is a peak, and describe the effect.
3. Only after a yes, build it, add it to the register, and mark it "built in #<PR>".

At most one signature moment plays at a time.

## Rules

- **Fast, on the UI thread.** Reanimated worklets only. Transitions take 200–400 ms. A signature moment takes up to about 1.5 s, and the screen stays usable while it plays.
- **Sharp, not cute.** Ease out and settle. No cartoon bounce, no generic confetti. Celebrate with the brand's own materials (its colours, type and shapes, from the design-system skill).
- **Haptics carry meaning.**
  - `selection`: choices.
  - `success`: signature moments only, on the beat that lands. Passive moments have none.
  - `warning` / `error`: problems.
  - Never one on every tap.
- **Reduced motion.** Movement becomes a short fade; the information stays the same.
- **Native first.** Use what the platform and existing libraries already do before custom motion (AGENTS.md "Official before custom").
- **Reusable.** A new effect becomes a primitive in `packages/ui/src/motion/`, with a story.
- **"Once per user" moments** (a first time, an anniversary) are a server flag, never a device flag, so a second phone doesn't replay them.
- **Prove a signature moment** in the feature's demo video, with a pause long enough to see it.
- **Every user-facing PR fills the template's Delight section:** the polish applied, and the peaks proposed (or "no real peak"). Backend, data and harness PRs write "Not user-facing".
