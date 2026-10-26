// The one icon system: Phosphor (phosphor-react-native). Each of our icon names maps to a Phosphor glyph, used
// in-app by `Icon` (react-native-svg) and by the native tab bar as template PNGs that `scripts/tab-icons.mts`
// rasterises from the same glyph data. Plain data: no React Native imports.
// Add a glyph here and in Icon's deep imports (components/ui/icon.tsx) together.

export const ICON_GLYPHS = {
  check: 'Check',
  pending: 'Clock',
  close: 'X',
  alert: 'WarningCircle',
  dot: 'Circle',
  search: 'MagnifyingGlass',
  plus: 'Plus',
  minus: 'Minus',
  'arrow-right': 'ArrowRight',
  'caret-right': 'CaretRight',
  // Sign-in and the account gates
  apple: 'AppleLogo',
  google: 'GoogleLogo',
  email: 'EnvelopeSimple',
  lock: 'LockSimple',
  shield: 'ShieldCheck',
  'sign-out': 'SignOut',
  gear: 'GearSix',
  // Tabs
  home: 'House',
  items: 'ListBullets',
  me: 'User',
} as const;

export type IconName = keyof typeof ICON_GLYPHS;
export type IconWeight = 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';

/** The tabs, in tab bar order. A new tab: add its glyph above, list it here, run `pnpm --filter @app/ui tab-icons`. */
export const TAB_ICONS = ['home', 'items', 'me'] as const satisfies readonly IconName[];
export type TabIconName = (typeof TAB_ICONS)[number];

/** Tab bar weights: outline when unselected, solid when selected. */
export const TAB_ICON_WEIGHTS = { default: 'regular', selected: 'fill' } as const satisfies Record<string, IconWeight>;
