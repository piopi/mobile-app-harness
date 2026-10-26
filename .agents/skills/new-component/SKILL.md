---
name: new-component
description: >-
  Add or change a component in packages/ui, the only place where styling lives: copy it in from
  react-native-reusables, convert it to tailwind-variants with typed variants, restyle it with the project's
  tokens, and ship it with a Storybook story, an RNTL test and a screenshot. Use whenever a screen needs
  a visual pattern that packages/ui does not have yet.
---

# new-component

Screens may not style anything (ESLint enforces it). When a screen needs something new, it goes here.

## Steps

1. **Check what exists.** `packages/ui/src/index.ts` lists every component; Storybook (`<scheme>://storybook`) shows them. Prefer a new variant on an existing component over a new component. If the component touches platform behaviour (insets, keyboard, sheet, blur, haptics, image, gesture), apply "Official before custom" from AGENTS.md: find the Expo or official module first and wrap it, rather than rebuilding it. If none, search npm and GitHub for a maintained library before you write one: we don't reinvent the wheel.
2. **Start from react-native-reusables** when it has the component:

   ```bash
   cd packages/ui
   npx @react-native-reusables/cli@0.7.1 add <name> -y --styling-library uniwind
   ```

   It writes `src/components/ui/<name>.tsx` and may ask for `@rn-primitives/*` packages: add them to `packages/ui/package.json` at an exact version (the newest stable, `npm view <pkg> version`). Then:
   - replace `@/…` imports with relative ones (`../../lib/utils`, `./text`);
   - replace `cva` with `tv` and `VariantProps` from `../../lib/utils` (not from `tailwind-variants`: ours knows the font and radius tokens, so `cn` merges them correctly);
   - restyle with the tokens and the [design-system](../design-system/SKILL.md) rules: radius tokens (`rounded-md`, `rounded-object`, `rounded-sheet`), `Text variant` from the type scale, `font-*` family tokens instead of `font-bold` (Android fakes weights), `Icon` instead of typed symbols (✓ ◷ ✕ ● render differently across fonts);
   - remove web-only branches we do not need.
3. **Variants, not props for looks.** Expose `variant`, `size`, `tone` and similar through `tv`. Layout primitives (`Stack`, `Screen`) take variant props such as `gap="md"` so screens never need `className`.
4. **Tokens.** A new colour, radius or font goes into `packages/ui/src/theme.css` (light and dark), never as a hex in a component.
5. **Story.** `src/components/ui/<name>.stories.tsx`, CSF with `satisfies Meta<typeof X>`, `title: 'UI/<Name>'`, a `Variants` story that shows every variant on one screen, plus single-variant stories where controls help (see the `writing-react-native-storybook-stories` skill). The story id is the kebab-cased title and export with no separator inside a word: `UI/ListRow` + `Variants` is `ui-listrow--variants`. Edge-to-edge stories (heroes, screens, tab bars, sheets) set `parameters: { layout: 'fullscreen' }`; others sit on a padded scrolling `Screen`.
6. **Test.** `src/components/ui/<name>.test.tsx` with RNTL (see `react-native-testing`): roles, labels, interactions, disabled states. `pnpm --filter @app/ui test`. Under Jest, Reanimated and Uniwind are stubbed in the root `jest.setup.js` (animations jump to their end value; className passes through): test structure and behaviour, not pixels. Extend the stubs there when you use a new API. `Icon` is hidden from accessibility, so query it with `{ includeHiddenElements: true }`. Safe-area insets come from the library's own Jest mock (zero insets, no provider needed).
7. **Export** it from `src/index.ts`.
8. **Screenshot** each new or changed story (verify-in-app, step 8): `docs/screenshots/ui/ios-<theme>-<name>-<story>.png`, and a row in `docs/screenshots/README.md`.
9. `pnpm typecheck && pnpm lint && pnpm test:unit`.

## Rules

- Interactive components get `role`/`accessibilityLabel` and accept `testID`.
- Animation: reuse the motion primitives (`FadeInBackground`, `Stagger`, `PressScale`, `NumberRoll`) and the tokens in `src/lib/motion.ts` before writing new motion. Decide with `expo-animation`, implement with Reanimated 4 (`swm-react-native-best-practices`). Animated views that take `className` are `AnimatedView`/`AnimatedText` from `src/motion/animated.ts`. Respect reduced motion.
- Haptics: only through `haptics.*` (`src/lib/haptics.ts`), with the meanings in the design-system skill. Buttons take `haptic="tap"`.
- Gestures use the Gesture Handler 3 hook API (`gesture-handler-3-migration`).
