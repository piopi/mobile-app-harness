---
name: how-to-guide
description: >-
  Write or update a how-to guide (for users or admins) captured from the app itself: one YAML file per guide in
  apps/mobile/.maestro/guides/, a seed scenario plus captioned steps each reached by Maestro steps, built with
  `pnpm guide build` into a static, searchable guides site (Astro Starlight, in guides-out/) that the app's Help row
  opens. Use when a user-facing flow changes (its guide must follow), when asked for a guide, help page or
  walkthrough, or to check that every guide still runs (`pnpm guide check`).
---

# how-to-guide

The guides are a static site anyone can visit, linked from Help in the app (the Me tab). Every picture on it is taken from the app on seeded data, so a guide is never drawn by hand and never drifts: when a flow changes, its guide is rebuilt or it fails `pnpm guide check`.

The site is **Astro Starlight** (`packages/guides-site`): full-text search (Pagefind, a static index, works offline), the sidebar grouped by audience, the phone menu and the light/dark switch. The capture side is ours (YAML, Maestro, `guides-captures/<audience>/<slug>/` with `capture.json`); `pnpm guide render` turns the captures into Starlight's input (`scripts/guide/render.mjs`: a Markdown page per guide, `src/generated/site.json` for the landing and audience pages, `src/generated/tokens.css` from `packages/ui/src/theme.css`, the glossary from `GLOSSARY.md` through `scripts/guide/glossary.mjs`), then runs Astro's build into `guides-out/`. Everything under `packages/guides-site/src/{content/docs,generated}` and `public/` is generated and gitignored; edit `render.mjs` (the site's words), the components (`src/components/`, `src/pages/`), `src/styles/brand.css` (the look) and `src/lib/site.js` (the one script: when things reveal, the progress line, clips).

## The format

`apps/mobile/.maestro/guides/<audience>/<slug>.yaml`, where `<audience>` is `users` or `admins` (`AUDIENCES` in `scripts/guide/model.mjs`: the site's folders and sidebar groups; a project renames or adds audiences there) and `<slug>` is the page's address. Files starting with `_` are shared flows, not guides (`_user.yaml` and `_admin.yaml` open the app clean and sign in as a seeded account).

```yaml
title: Browsing items                    # the page's title, sentence case, no full stop
audience: users                          # the same as the folder
summary: Find an item and open it.       # one line on the index (optional)
copy: placeholder                        # placeholder until the human approves the captions, then approved
scenario: base                           # a `pnpm seed` scenario, or a list applied in order
order: 1                                 # place in its audience's list (lower first)
open: items                              # optional: the app screen it starts on; phones get "Open in the app" (<scheme>://items)
covers:                                  # the screens its steps show, as repo paths or globs (the impact check)
  - 'apps/mobile/src/app/(tabs)/items/index.tsx'
  - 'apps/mobile/src/features/items/copy.ts'
setup:                                   # Maestro commands, off the page: open, sign in, reach the first screen
  - runFlow: ../_user.yaml
steps:
  - caption: Tap Items to see everything published.
    do:                                  # the Maestro commands that reach this step's screen (may be [])
      - tapOn: Items
      - extendedWaitUntil: { visible: { id: items-list }, timeout: 15000 }
  - caption: Tap an item to read it.
    clip: true                           # a short clip of this step instead of a still (the payoff of a flow)
    alt: An item open on its own screen  # optional: the image's alt text (default: the caption)
    do:
      - tapOn: Welcome
      - extendedWaitUntil: { visible: { id: item-screen }, timeout: 15000 }
```

- Paths in `runFlow` / `runScript` are relative to the guide file, as in any Maestro flow: `../_user.yaml`, `../../subflows/sign-in-as.yaml`, `../../scripts/mailpit-code.js`. Reuse the demos' and flows' subflows; a guide is a Maestro flow with captions, never a new driver. Generated flows get the same env as `pnpm e2e` (`${APP_ID}`, `${SCHEME}`, `${METRO_PORT}`, `${MAILPIT_URL}`, `${THEME}`).
- Every step ends on a screenshot once the screen settles; the command list only has to *reach* the screen. Wait for an element (`extendedWaitUntil`) before the step ends, or the shot catches a loading state.
- `clip: true` films that step alone (the platform recorder around its own Maestro run, dead time cut like a demo) and keeps its last frame as the poster. Use one per guide at most, for the moment a still can't show.
- Client-only states go through the agent links, as in demos (verify-in-app lists them).
- `covers` (required) lists the files whose change can stale the guide: the route file of every screen a step shows, the feature components that draw it, and their copy file. Paths are from the repo root, under `apps/mobile/src/` or `packages/ui/src/` (the impact workflow's trigger paths; a unit test holds them to it). A glob (`apps/mobile/src/features/items/**`) is fine; a route with brackets (`app/(tabs)/items/[id].tsx`) matches as written. Leave out queries, shared hooks and packages/ui primitives unless a step is about them: every hit asks the PR author for a reason. `pnpm guide check --static` fails an entry that matches no file (a renamed screen).

## Captions

- Sentence case, short, one action and what happens: "Tap Drafts to see only what isn't published yet."
- Name buttons as the app shows them, in sentence case.
- No name, place, date, time or count from the seed in a caption: the screenshot shows seed data, the words must stay true for every user.
- Use the words in GLOSSARY.md.
- Captions are new copy: write them with `copy: placeholder`, propose them to the human (question tool) and switch to `approved` once they say yes. The site marks placeholder pages "Draft", and `pnpm guide build` lists them.
- A caption's first use of a glossary term links to the glossary page by itself, with the definition on hover. The site's glossary shows only the terms in `guides.glossary` in `harness.config.json` (empty by default: no glossary page), an allowlist of user-facing words from GLOSSARY.md, each `{}` or `{ "text": "plain words", "link": false }` where GLOSSARY.md reads like a developer note or the word is too common to link. A term renamed in GLOSSARY.md fails `pnpm guide render` and the unit tests until the allowlist follows; a new `text` is new copy.
- The site's own words live in `render.mjs` (`SITE`, `LANDING`), placeholders in a plain voice: a project rewrites them in the app's voice, with the human's yes. The site's name is `app.name` from `harness.config.json`.

## Build, check, look

```bash
pnpm wt up                                   # your slot: the simulator and the stack the guide runs on
pnpm guide                                   # list the guides: steps, scenario, copy state, last build
pnpm guide check --static                    # parse every guide, the files it names and its covers (no device; CI runs it: .github/workflows/guides.yml)
pnpm guide check [name…]                     # run each guide's flow on the simulator without capturing: does each step still reach its screen?
pnpm guide build [name…]                     # seed, capture each step (2x, 9:41 status bar), render the site to guides-out/
pnpm guide render                            # build the site again from the last captures (caption or style change: no device needed, seconds)
pnpm guide render --base=/my-guides/         # build it for a sub-path, as GitHub Pages serves a project site
pnpm guide serve [--set-help-url]            # serve guides-out/ on 8300+slot (8300 with no slot); --set-help-url points this slot's Help row at it
pnpm guide publish                           # release step: build every guide, copy the site into the Pages clone, print the push
```

- A build or check reseeds your stack once per guide: re-seed before you go back to the app.
- Open the pages and look at every step (`pnpm guide serve`, then a browser or the app's Help). A step that shows a spinner, a half-entered screen or a toast you didn't mean is a guide bug: add a wait to its `do`.
- Captions can change without a rebuild (`pnpm guide render`); adding, removing or reordering steps needs `pnpm guide build <name>` (the site leaves out a guide whose capture no longer matches its steps).
- The site is never committed (`guides-out/` and `guides-captures/` are gitignored). For a PR, commit shots of rendered pages under `docs/screenshots/guides/` (mapped in its README). Take them with Playwright on the system Chrome (`playwright-core`, `channel: 'chrome'`), no simulator: a context with `viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, isMobile: true` lays the page out at phone width. Wait about 2 s after load so the entrances settle, and scroll a guide before its shot: steps rise in as they scroll into view.
- Motion (delight skill): CSS only, plus `src/lib/site.js` saying when (IntersectionObserver). Steps rise in as they scroll into view, the progress line fills as they pass, and the last step lands the closing line. With reduced motion it is a short fade and clips wait for a tap. A bigger moment needs the human's yes.
- Print: a guide prints as screens beside captions, without the chrome, the progress line or the app link.
- A build takes about 1.5 min per guide on a warm slot: build the one you changed, not all of them. Clips need ffmpeg (`brew install ffmpeg`).

## When a flow changes

A PR that changes a user-facing flow (new-feature-slice) updates the guide that walks through it, or adds one: run `pnpm guide check <name>` for the guides that touch the screens you changed, fix the ones that fail (usually a testID or a step), and rebuild them. A testID a guide uses keeps the guide stable; prefer `id:` over text in guides.

CI enforces it (`.github/workflows/guide-impact.yml`, on every code PR and again when the description is edited): `node scripts/guide/impact.mjs <base>` diffs `origin/<base>...HEAD` and lists every guide whose `covers` match a changed file while the guide file is unchanged. It fails unless the PR description has a `Guides:` line (the template's **Guides** section) naming each one with a reason in brackets:

```
Guides: browse-items (copy only, no step changes), review-drafts (testID rename only)
```

The name is the slug or `<audience>/<slug>`; a name without a reason doesn't count, nor does a line inside the template's comment. Run it locally before you open the PR: `node scripts/guide/impact.mjs main --body .wt/tmp/pr-body.md`. A reason is a claim that the steps and screenshots still hold: if a step's screen looks different, rebuild the guide instead (`pnpm guide build <name>`), which changes nothing in git, so say so ("rebuilt, captions unchanged") or touch the guide if its steps changed.

## Help in the app

The Me tab's **Help** row opens the site, read from `EXPO_PUBLIC_GUIDES_URL` (`apps/mobile/src/lib/env.ts`); the row is hidden while it is empty. Locally, `pnpm guide serve --set-help-url` writes this slot's server address into `apps/mobile/.env.local` (kept across `pnpm wt up` and `pnpm sb start`); `pnpm wt open` reloads the app with it. On Android, `adb reverse tcp:<port> tcp:<port>` first. A store build sets it in the EAS environment of its profile.

An env value changes only with a new build or update. When admins should change the address themselves (a move to a custom domain, a second language), move it into project data, as for any project value (AGENTS.md, "Build capabilities"): a nullable `guides_url` column on the settings table (`app_settings`) in a migration, its admin RPC taking a jsonb `patch` and its editor (db-change skill), the app reading it with the other settings and hiding Help while it is null, and `pnpm guide serve --set-help-url` updating that column on the slot's stack instead of the env file. Never point it at a site the app doesn't own.

## Publishing (a release step)

Hosting is a human step on the setup checklist (AGENTS.md, "Working with the human"): a **GitHub Pages** repository serving `guides-out/`, then its address goes into Help (above). Never create the repository or a hosting account yourself.

Each release republishes the site: `pnpm guide publish` builds every guide again (all screenshots retaken from the current app), builds the site for the path Pages serves it under (`/<repo>/` for a project site, `/` with a custom domain's `CNAME` or a `<owner>.github.io` repository; `guides.base` in `harness.config.json` or `GUIDES_BASE` overrides it: Starlight's links need it at build time), copies `guides-out/` plus a `.nojekyll` into a local clone of the Pages repository (`~/.<slug>/guides-pages`, or `GUIDES_PAGES_DIR`; it keeps the clone's `CNAME`), and prints the `git add`, `commit` and `push` to run. It never pushes by itself, and it refuses to run while `guides.pagesRepo` in `harness.config.json` (or `GUIDES_PAGES_REPO`) is empty, or while any guide fails to build. Push only when the human asked for the release.

## Gotchas

- Astro's CLI can refuse the repo's Node version even where the build runs fine; `pnpm guide` calls Astro's build API instead. Don't run `astro build` in `packages/guides-site` yourself: its pages are generated, and the base path comes from `pnpm guide`.
- Maestro writes `takeScreenshot` files only inside its `--test-output-dir`; `pnpm guide` names them `step-NN` and finds them there. An absolute path outside it fails the flow.
- Guides start from `_user.yaml` / `_admin.yaml`, which use the demos' `_open.yaml` (clean bundle, the default theme, dev panels hidden): no seeded-accounts panel or harness cards in a guide.
- The simulator has no camera: a step that scans shows an empty viewfinder; feed the result through an agent link.
