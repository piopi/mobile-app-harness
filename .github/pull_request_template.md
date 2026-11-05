## Summary

<!-- 3-5 bullets on what a user, an admin or a tester notices. No file names or code identifiers. -->

-

## Context

<!-- 1-2 lines: why this PR exists. Link the ticket (Closes #N) and the map. -->

## Changeset

<!--
Title this PR as a Conventional Commit: `feat(scope): …`, `fix: …`, `chore: …` (CI checks it; the squash commit keeps it).
A change a user notices adds a changeset: `pnpm changeset`, pick the app package (apps/mobile), patch (a fix) or minor
(a feature), and one sentence they'd understand. It becomes the release notes and the update message (docs/release.md).
Otherwise write "No user-facing change" here. CI fails a PR with neither.
-->

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

## Delight

<!--
Required for every PR a user can see. Run the delight skill and write what you did:
- the quiet polish each new or changed screen got (motion primitives, haptics), and
- any real peak: the signature moment candidates you proposed to the human (or "no real peak").
Write "Not user-facing" for backend, data or harness-only PRs.
-->

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
![Home, dark](https://github.com/<owner>/<repo>/blob/<sha>/docs/screenshots/<feature>/ios-dark-home.png?raw=true)
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

## Guides

<!--
CI's guide-impact check lists every how-to guide whose screens this PR changes (the guide's `covers`) while the guide file is unchanged.
Update those guides (how-to-guide skill), or name each one on the line below with why its steps and screenshots still hold,
for example: Guides: browse-items (copy only, no step changes), edit-profile (testID rename only)
Write "None affected" when the check lists none.
-->

Guides:

## Checklist

- [ ] Delight skill run: polish applied and peaks proposed, or not user-facing
- [ ] `pnpm typecheck && pnpm lint && pnpm test:unit` green locally
- [ ] `pnpm test:integration && pnpm test:db` green locally (DB changes)
- [ ] Maestro flow added or updated and green (`pnpm e2e`), or no user-facing path changed
- [ ] Screenshots committed, mapped in docs/screenshots/README.md and embedded above (SHA-pinned), or no UI change
- [ ] How-to guides follow the change (how-to-guide skill): updated or added and `pnpm guide check` green for the guides this flow touches, or no user-facing flow changed
- [ ] Changeset added (`pnpm changeset`), or "No user-facing change" above
- [ ] Reference app studied first (`pnpm reference`), or no reference app / not a ported screen
- [ ] Deferred work filed on a ticket (linked above), or nothing deferred
- [ ] Screens compose packages/ui only; new visual patterns added there with a story
- [ ] Feature doc in docs/features/ updated, or not a feature
- [ ] Harness kept current: ran the harness-retro skill; changes listed here (or "nothing surprising")
