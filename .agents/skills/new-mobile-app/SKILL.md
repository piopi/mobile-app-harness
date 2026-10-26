---
name: new-mobile-app
description: >-
  Start a new mobile app from the piopi/mobile-app-harness template: ask the human for the app's identity
  and starting points, create the private repo from the template, fill harness.config.json, apply it,
  install, run the checks and a one-simulator smoke test, then offer to chart a wayfinder map. Use when
  the human says "new app", "start a project from the harness", or runs /new-mobile-app.
---

# new-mobile-app

Turns the template into a working, private, project-named repo in about fifteen minutes, most of it the first native build. Read `HARNESS.md` once if you haven't: it explains every piece you are about to set up.

## 0. Preconditions (check, don't ask)

```bash
gh auth status && node -v && pnpm -v && supabase --version && docker info >/dev/null && xcodebuild -version
df -h / | tail -1          # keep at least 10 GB free after the first native build (~5 GB)
sysctl -n vm.loadavg       # the 5-minute load (2nd number); boot nothing while it is above the core count
```

Node 22, pnpm 10, Supabase CLI 2.122.0 (the version CI pins), Docker running, Xcode with an iOS simulator runtime. Android Studio and Maestro are optional until the first Android parity check or `pnpm e2e`. If something is missing, list it for the human in one message and stop.

## 1. Ask (one AskUserQuestion call, recommended option first)

Ask everything at once; the human can pick "Other" to type a value:

| Question | Options (recommended first) |
|---|---|
| App name (shown under the icon) | type it |
| Repo `owner/name` | `<gh user>/<slug>` (private), or type another |
| URL scheme | the slug without dashes, or type one |
| Bundle ID / Android package | `com.<owner>.<slug>`, or type one |
| Platforms | iOS and Android · iOS only · Android only |
| Brand starting point | Neutral template palette (decide later) · One primary colour I'll give you · From an existing brand guide (link or file) |
| Default appearance | Dark · Light · Follow the system |
| Backend | Supabase, local-first (the template) · No backend yet (keep Supabase local only, decide later) |
| Reference app to port | None · A repo (`owner/name`) to keep read-only |

Derive the slug from the name (lowercase, dashes). If the human gave a colour or a brand guide, pick `primary`, `accent` and readable `*-foreground` values for light and dark and show them in your summary. Only Supabase is wired today: another backend means replacing `supabase/`, `scripts/sb.mjs`, the integration tests and the auth library, which is its own ticket (say so).

## 2. Create the repo

```bash
cd ~/Projects
gh repo create <owner>/<name> --private --template piopi/mobile-app-harness --clone
cd <name>
```

## 3. Fill and apply the config

Edit `harness.config.json`: `app` (name, slug, scheme, bundleId, androidPackage, platforms), `github.repo`, `reference` (`{ "repo": "owner/name" }` or `null`), `brand` (`defaultAppearance`, the colours), and keep `harness.template`. Then:

```bash
pnpm install
pnpm harness:apply            # tokens, placeholder icons, the name/scheme/repo in the docs and package.json
pnpm harness:apply --check    # must print "applied"
```

Fill the `PROJECT:` slots you can already fill from the answers: the first line of `README.md`, `GLOSSARY.md`'s one-line description, AGENTS.md's PROJECT sections (leave the rest marked for later).

## 4. Checks (no devices)

```bash
pnpm sb start && pnpm seed base
pnpm typecheck && pnpm lint && pnpm test:unit
pnpm test:integration && pnpm -s seed base && pnpm test:db
```

All green before you go on. A failure here is a template bug: fix it, and offer it back to the template (harness-retro, step 5).

## 5. Smoke check (one iOS simulator)

Wait until the 5-minute load is under the core count, then:

```bash
pnpm wt up                    # first run builds the dev client (minutes); later runs reuse the cache
pnpm agent sign-in '{"email":"member@app.test"}'
pnpm exec agent-device open <bundleId> --platform ios --udid <udid from .wt/state.json> --session wt-<k> --metro-port <port>
pnpm exec agent-device wait text "Harness ready." --session wt-<k>
pnpm exec agent-device screenshot /tmp/smoke.png --scale 0.4 --session wt-<k>
pnpm exec agent-device close --session wt-<k>
pnpm wt down
```

Look at the screenshot: Home with "Harness ready." and "BACKEND ok". No Android emulator here unless the human asks; the first feature's parity check boots it.

## 6. Commit and push

```bash
git add -A && git commit -m "chore: apply the harness config for <name>"
git push && gh run watch
```

## 7. Hand over

Tell the human, briefly: the repo URL, what was applied, the smoke result (with the screenshot path), the `PROJECT:` slots still open (brand paragraph and decisions in the design-system skill, glossary, voice), and the account checklist they will need before release (Apple developer, Google Play, a hosted Supabase project, Sign in with Apple and Google ids): offer to open it as one issue.

Then ask (AskUserQuestion): **Chart a wayfinder map now?** · Yes, run `/mattpocock-skills:wayfinder` with the app's goal · Not yet. On yes, invoke it.

## Rules

- Create no external accounts and enter no secrets; that list is for the human.
- Never push to the template from here. Improvements go back through `pnpm harness:diff --patch` and a PR on the template.
- One simulator, one slot. `pnpm wt down` before you finish.
