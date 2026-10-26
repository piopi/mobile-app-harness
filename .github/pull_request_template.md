## Summary

<!-- 3-5 bullets on what a member, staff or tester notices. No file names or code identifiers. -->

-

## Context

<!-- 1-2 lines: why this PR exists. Link the ticket (Closes #N) and the map. -->

## Reference parity

<!--
Only when harness.config.json names a reference app and this PR ports one of its screens; write "Not a ported
screen" otherwise. Each reference screen beside ours, its copy (word for word, or the approved change), its
assets, and every design change with the UX reason. Anything not shipped yet links the ticket (or ticket comment)
that will build it: no deferral lives only here.
-->

| Reference | App | Copy | Assets | Design changes (why) |
|---|---|---|---|---|
|  |  |  |  |  |

## Scenarios

<!-- How a reviewer reproduces each state locally: `pnpm wt up`, `pnpm seed <scenario>`, agent events, deep links. -->

| # | Scenario | How to reach it | Expected |
|---|----------|-----------------|----------|
| 1 |  | `pnpm seed …` → `pnpm agent …` |  |

## Screenshots

<!--
Required when a user can see the change; write "No UI change" otherwise.
Take them with the verify-in-app skill, commit them to docs/screenshots/<feature>/<platform>-<theme>-<state>.png,
and embed the committed files with links pinned to the commit SHA (`git rev-parse HEAD` after pushing the shots), never the branch:
GitHub caches images by URL, so a branch link keeps showing an old shot after a retake.
![Home, dark](https://github.com/piopi/mobile-app-harness/blob/<sha>/docs/screenshots/<feature>/ios-dark-home.png?raw=true)
After a retake, re-pin every link to the new SHA.
The app's default appearance first (the other theme in a collapsed <details>, only when colour changed).
iOS for every state, Android at least once (every time the change touches something that differs by platform).
List any older screenshot you retook (docs/screenshots/README.md maps them).
-->

## Tests

<!--
List the tests this PR adds or updates and what each proves. Write "None" with a reason when none applies.
Unit: Vitest (packages/shared, scripts) and RNTL (packages/ui, apps/mobile).
Integration: Vitest against the local Supabase stack, and pgTAP.
E2E: the Maestro flow(s) for the critical path, run locally with `pnpm e2e` (no device CI).
-->

- **Unit:**
- **Integration:**
- **pgTAP:**
- **Maestro:**

## Checklist

- [ ] `pnpm typecheck && pnpm lint && pnpm test:unit` green locally
- [ ] `pnpm test:integration && pnpm test:db` green locally (DB changes)
- [ ] Maestro flow added or updated and green (`pnpm e2e`), or no user-facing path changed
- [ ] Screenshots committed, mapped in docs/screenshots/README.md and embedded above (SHA-pinned), or no UI change
- [ ] Reference app studied first (`pnpm reference`), or no reference app / not a ported screen
- [ ] Deferred work filed on a ticket (linked above), or nothing deferred
- [ ] Screens compose packages/ui only; new visual patterns added there with a story
- [ ] Feature doc in docs/features/ updated, or not a feature
- [ ] Harness kept current: ran the harness-retro skill; changes listed here (or "nothing surprising")
