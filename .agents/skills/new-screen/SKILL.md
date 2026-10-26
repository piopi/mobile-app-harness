---
name: new-screen
description: >-
  Add an expo-router screen to apps/mobile that composes only packages/ui components, reads data through
  TanStack Query, handles loading/empty/error/offline states, and ships with an RNTL test, a Maestro step
  and screenshots. Use when adding or reshaping a route.
---

# new-screen

## The route tree (apps/mobile/src/app)

<!-- PROJECT:route-tree -->
<!-- When the project has a navigation map (which tab owns which screen, push vs modal vs sheet), link it here
     and check it before adding a route: a screen it doesn't cover is a question for the human. -->
<!-- /PROJECT -->

**Reference app (optional).** When `harness.config.json` names a `reference` app, a screen it has is ported faithfully: open its source with `pnpm reference` and keep its features, copy and assets; improve the design only where the mobile UX is better, and say why in the PR's parity section.

```
_layout.tsx              root Stack: Providers, ThemeProvider, StatusBar/NavigationBar, the account gates
index.tsx                the anchor "/": never guarded, redirects to the open gate's first screen
(auth)/                  gate signed_out: _layout (Stack, opaque header), welcome (landing), sign-in, sign-up, verify (code)
(onboarding)/            gate onboarding (profile, consent) | terms (re-accept); a PROJECT slot: add steps with the db-change recipe
terms-text.tsx           the full terms, a modal over either onboarding gate
suspended.tsx            gate suspended (a hold screen)
(tabs)/_layout.tsx       gate member: NativeTabs (Home, Items, Me)
(tabs)/home/             _layout (Stack, no header on index: the hero runs under the status bar), index = "/home"
(tabs)/items/            _layout (Stack, large title), index (list), [id] (detail, a push on the tab's stack)
(tabs)/me/               _layout, index (profile, appearance, sign out), dev (the dev panel, dev builds only)
storybook.tsx, +native-intent.tsx   dev catalog; link rewriting (agent and storybook links)
```

- **Gates** are `Stack.Protected` in the root layout, driven by `useSession()` (`src/lib/session.ts`: the
  Supabase Auth session, then `launch_status().mode` and roles). Exactly one gate is open; none while the session
  loads (the splash stays up). When a gate closes under the user, Expo Router falls back to the anchor
  (`index.tsx`), which redirects to the open gate; so no gate may own `/` (a group `index.tsx`) itself. Sign in
  for real in dev with `pnpm agent sign-in '{"email":"member@app.test"}'` (seeded accounts, password123), or lay an
  override on top: `pnpm agent session '{"mode":"terms"}'` (or `{"roles":["member","staff"]}`; `{"real":true}`
  drops it). A form stack uses `useStackTheme({ header: 'opaque' })`.
- **Where a new screen goes**: a page inside a tab → that tab's folder (it pushes on the tab's Stack and keeps
  the bar; declare its `Stack.Screen` options in the folder's `_layout.tsx`). A task that covers the tabs → a
  root route with `presentation` (`modal`, `formSheet`, `fullScreenModal`). A new account state → a new mode in
  `launch_status()` and a new `Stack.Protected` gate. A deep link → a route at its path, rewritten in
  `+native-intent.tsx` only if the URL shape differs. A new onboarding field or step → the db-change skill,
  "Add an onboarding field or step" (column, RPC argument, `launch_status` check, zod schema, screen). A new tab → a folder in `(tabs)`, a row in its `TABS`, a
  glyph in `packages/ui/src/lib/icons.ts`, then `pnpm --filter @app/ui tab-icons`.
- **Headers** are native: `title`, `headerLargeTitleEnabled` (tab roots), and buttons through `Stack.Screen`
  options (`headerRight`). No hand-made header rows. Hrefs are typed (`experiments.typedRoutes`): a wrong path
  fails `pnpm typecheck` once Metro has generated `.expo/types`.
- **Screen root**: `<Screen native>` inside native chrome (iOS insets the scroll view under the header and tab
  bar, keyboard included); `edges="none"` with no header for a hero under the status bar.

## Steps

1. **Route.** Add `apps/mobile/src/app/<path>.tsx` (expo-router file routes; see the `expo-router` skill). Only routes and layouts live in `src/app`. Layout concerns (header, safe area, keyboard, modal or sheet presentation, tab placement) come from the route's `_layout.tsx`, `Stack.Screen` options and official modules, never from hand-placed views ("Official before custom" in AGENTS.md). Tests go in `src/__tests__/`, hooks and copy in `src/features/<feature>/` or `src/lib/`.
2. **Compose packages/ui.** Start with `<Screen>` and lay out with `<Stack gap=… align=…>`, `<Text variant=…>`, `<Card>`, `<Button>`, `<ListRow>`. No `style`, `className`, hex colours or raw `View`/`Text` (ESLint fails). Missing a pattern? Use the new-component skill first.
3. **Data.** A query hook per resource with TanStack Query (`useQuery`/`useMutation`, typed with `@app/shared` schemas): `src/features/items/queries.ts` is the pattern. Reads go direct to Supabase under RLS; value-granting writes call an RPC or Edge Function. Domain rules come from `@app/shared`, never inline.
4. **Every state.** Loading, empty, error, offline (agent event `offline`), and the role variants (member, staff, admin). `app/(tabs)/items/index.tsx` shows all of them. Copy lives in `src/features/<feature>/copy.ts`, never inline in the screen.
5. **Time.** Use `now()` / `useNow()` from `src/lib/clock.ts`, never `new Date()`, so `__agent/time-travel` works.
6. **testIDs** on what tests and agents need to find.
7. **Test.** `src/__tests__/<screen>.test.tsx` with RNTL: renders each state with a mocked query (`support/mock-supabase.ts`).
8. **Maestro.** Add the screen's critical path to a flow in `apps/mobile/.maestro/` and run `pnpm e2e`.
9. **Verify and screenshot** with verify-in-app: each state, the default theme first, iOS and the Android parity check. Update `docs/screenshots/README.md`.
