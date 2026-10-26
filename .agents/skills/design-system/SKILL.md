---
name: design-system
description: >-
  The project's visual language for packages/ui: tokens, the type scale, shape, native chrome branding
  (NativeTabs, headers), dialogs and sheets, when to use each motion primitive, the haptic mapping, voice and
  copy, do/don't, and where to change what. A fill-in skeleton until the brand is decided. Use before any
  visual decision, new token, new component, restyle, animation or UI copy.
---

# design-system

<!-- PROJECT:brand -->
**The brand in one paragraph.** PROJECT: write it once the brand is decided (the bootstrap leaves the template's
neutral starting point): what the app should feel like, in words an agent can apply ("a calm utility, one accent,
soft corners"), and the reference screens or shots that show it (`docs/screenshots/design-system/`).

**Decisions.** PROJECT: list each visual decision the human made, with the date and the ticket (default
appearance, the tab bar, the hero, the one signature moment). An agent re-litigates nothing written here.
<!-- /PROJECT -->

The values live in code (`packages/ui/src/theme.css`, `src/lib/motion.ts`, `src/lib/haptics.ts`, `src/lib/fonts.ts`, `src/lib/navigation.ts`, each component's `tv` variants). This file holds the rules.

## Where to change what

| To change | Edit | Then |
|---|---|---|
| A brand colour, the radius, the default appearance | `harness.config.json` → `brand` | `pnpm harness:apply` (writes the `harness:tokens` block in `theme.css` and the placeholder icons) |
| A new semantic colour | `theme.css`, outside the markers, light **and** dark, with its contrast in a comment | use it by name (`bg-<name>`) |
| The font (system font in the template) | see "Change the font" below | retake design-system shots |
| A component's look | its `tv` variants in `packages/ui/src/components/ui/<name>.tsx` | story screenshot |
| The tab bar or headers | `packages/ui/src/lib/navigation.ts` (`useNativeTabsTheme`, `useStackTheme`) | iOS + Android shots |
| A tab icon | `src/lib/icons.ts` (`ICON_GLYPHS`, `TAB_ICONS`, `TAB_ICON_WEIGHTS`) | `pnpm --filter @app/ui tab-icons`, commit the PNGs |
| Motion timing | `src/lib/motion.ts` | replay the motion stories |
| A haptic's meaning | `src/lib/haptics.ts` and the table below | |
| Copy | `apps/mobile/src/features/<feature>/copy.ts` | |
| App icon and splash | `apps/mobile/assets/` (real artwork replaces the generated placeholders; `harness:apply` then leaves them alone) | native rebuild (`pnpm wt up`) |

## Tokens

Semantic classes only (`bg-surface`, `text-muted-foreground`, `border-hairline`). No hex or arbitrary value outside `packages/ui` (lint fails). The names:

| Token | Use |
|---|---|
| `background` / `foreground` | the ground and the text on it |
| `surface` / `surface-elevated` | grouping (cards, chips) / panels over the ground (dialogs, sheets) |
| `muted-foreground` | the only secondary text colour (keep it at AA contrast) |
| `hairline` | dividers only; input and secondary-button edges use `control` (3:1) |
| `primary` / `primary-foreground` | the one primary action per screen, the selected tab |
| `accent` / `accent-foreground` | the rare highlight that is not the primary action |
| `danger` / `danger-soft` | errors and destructive confirmations |
| `ink` / `on-ink` | scrims and forced-dark moments, the same in both themes |

Read a token in JS (`placeholderTextColor`, native chrome) with `useCSSVariable('--color-…')`.

## Type (`<Text variant tone>`)

| Variant | Use |
|---|---|
| `display-xl` | The one hero number on a screen |
| `display` | The hero headline |
| `title-1` / `title-2` / `title-3` | Screen titles / section headlines / card titles |
| `headline` | Row titles |
| `body` / `callout` | Prose / secondary prose |
| `label` | Small UI labels |
| `kicker` | Over-headline metadata |
| `data` | Times, counts, codes (mono, tabular) |
| `micro` | Legal, timestamps. Nothing smaller |

`tone`: `muted`, `primary`, `accent`, `danger`, `on-ink`, `inverse`; an explicit tone beats a parent's colour. The template uses the system font with weight utilities (`font-medium`, `font-semibold`, `font-bold`, `font-extrabold`); data uses tabular figures.

PROJECT: headline case, punctuation and the brand's voice rules.

## Shape

Radius comes from the config: `rounded-sm|md|lg|xl` for interface, `rounded-object` for things that stand for an object (a card, a photo), `rounded-sheet` for sheets. Native chrome keeps the OS shapes (the glass capsule, the Material indicator pill). Edges belong to the OS: the tab bar, headers, home indicator and Android navigation bar come from native chrome and `react-native-safe-area-context` (through `Screen`), never hand-placed padding. 4 pt grid, 16 pt gutter (`px-4`), 52 pt primary buttons, 44 pt touch targets.

## Icons

**Phosphor is the one icon system** (`phosphor-react-native`: maintained, six weights including `fill`). `src/lib/icons.ts` maps our names to glyphs; `Icon` renders them with a tone and a weight; the tab bar gets the same glyphs as template PNGs rasterised by `pnpm --filter @app/ui tab-icons` (NativeTabs takes images, not components). Add a glyph in `icons.ts` and in `Icon`'s deep imports together. No second icon library, no typed symbols (✓ ◷ ✕ ●). An icon always sits next to a word and is hidden from screen readers.

## Motion: which primitive, when

| Primitive | Use it for | Not for |
|---|---|---|
| `FadeInBackground` | One hero per screen (a photo, or the brand wash without one) | Lists, thumbnails, a second hero |
| `Stagger` | The top-level blocks entering after the hero (≤ 6) | Every row of a list |
| `PressScale` | Any custom pressable surface (`weight="object"` for objects) | Things that already use it (`Button`, `ListRow`) |
| `NumberRoll` | The one number that just changed | Static counts on load |

Settle, never bounce. Every primitive handles reduced motion; anything new must too. Animate on the UI thread (Reanimated), never with JS timers. PROJECT: the one authored success moment of a flow, if the brand has one.

## Haptics (`haptics.*` only)

| Name | When |
|---|---|
| `select` | Tab change, segment, filter chip |
| `tap` | One small commit (`Button haptic="tap"`) |
| `success` | The one success moment of a flow |
| `error` | With on-screen error text, always |
| `heavy` | Confirming a destructive action |

Never on scroll, navigation, screen load or passive events.

## Native chrome

App layouts spread `useNativeTabsTheme()` and `useStackTheme()` and pass no colours or fonts of their own. What the API does **not** let you change (accept it; don't hand-build around it): the iOS 26 Liquid Glass bar shape and selection capsule; label case and letter-spacing (no `textTransform`); the iOS badge text colour; the Android indicator shape. Compare with the system default: `pnpm agent chrome '{"plain":true}'`.

## Dialogs and sheets

| Need | Use |
|---|---|
| Confirm a destructive action | `AlertDialog` with `AlertDialogContent tone="destructive"` (heavy haptic on confirm) |
| A decision or an info message | `AlertDialog` (one action and no cancel for info) |
| Pick one of a few choices | `ActionSheet` (`options` with `selected` / `destructive`) |
| A form, a longer list | a route with `presentation: 'formSheet'` (or `modal`) and `<Sheet presentation="route">` as its content |

Never `Alert.alert`, `ActionSheetIOS` or RN `<Modal>` (lint).

## Change the font

The template ships the system font (San Francisco / Roboto), which has real weights. A brand font lives in four places that must agree; change them together in one PR:

1. Add the static OFL `.ttf` files and their licence to `packages/ui/assets/fonts/`, one file per weight (no variable fonts). `npm pack @expo-google-fonts/<family>` is a quick source.
2. Register them in `packages/ui/src/lib/fonts.ts` (`fontAssets`); the keys are the family names. `AppRoot` loads them before the first screen.
3. In `packages/ui/src/theme.css`, add one `--font-<role>` token per file (`--font-sans: 'Brand_400Regular'`, `--font-sans-bold: 'Brand_700Bold'`…), then in `packages/ui` replace each weight utility with its family token (`grep -rnE "font-(medium|semibold|bold|extrabold)" packages/ui/src`). With one file per weight, Android fakes a weight applied on top of a family, so a weight utility and a custom family never go together. Teach `cn` the new family names (`classGroups` in `src/lib/utils.ts`) so later classes win.
4. Set `FONT` in `fonts.ts` (the native chrome's title and tab label families, without `fontWeight`): native chrome can't read CSS tokens.

Then check line heights in the Text variants and retake every design-system and tab-bar screenshot. New fonts are a native asset change: `pnpm wt up` rebuilds.

## Voice and copy

PROJECT: the voice in three rules and three examples. Copy lives in `features/<feature>/copy.ts`; words that name a place, a time, a count or a rule come from data. Use the words in `GLOSSARY.md`.

## Do / don't

PROJECT: a table of do/don't pairs with links to committed screenshots, filled as decisions land.

## Gotchas

- `cn` and `tv` come from `src/lib/utils.ts` (they know the token names); `tv` from `tailwind-variants` breaks merging.
- Reanimated views that take `className` are `AnimatedView` / `AnimatedText` from `src/motion/animated.ts`.
- `Icon` is hidden from accessibility: in RNTL, query it with `{ includeHiddenElements: true }`.
- Full-bleed stories set `parameters: { layout: 'fullscreen' }`.
- `AlertDialog` / `ActionSheet` render into `<PortalHost />` (AppRoot); in RNTL render a `PortalHost` next to them.
