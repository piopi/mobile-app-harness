// Icon: Phosphor glyphs (src/lib/icons.ts maps our names to them), tinted with a theme token. Use one wherever a
// font can't be trusted to draw the mark (✓ ◷ ✕ ● render differently or not at all across fonts).
// Decorative: the word next to the icon carries the meaning (and the accessibility label).
// Deep imports keep Metro from bundling all of Phosphor; add a glyph here and in ICON_GLYPHS together.
import { CheckIcon } from 'phosphor-react-native/src/icons/Check';
import { ClockIcon } from 'phosphor-react-native/src/icons/Clock';
import { XIcon } from 'phosphor-react-native/src/icons/X';
import { WarningCircleIcon } from 'phosphor-react-native/src/icons/WarningCircle';
import { CircleIcon } from 'phosphor-react-native/src/icons/Circle';
import { MagnifyingGlassIcon } from 'phosphor-react-native/src/icons/MagnifyingGlass';
import { PlusIcon } from 'phosphor-react-native/src/icons/Plus';
import { MinusIcon } from 'phosphor-react-native/src/icons/Minus';
import { ArrowRightIcon } from 'phosphor-react-native/src/icons/ArrowRight';
import { CaretRightIcon } from 'phosphor-react-native/src/icons/CaretRight';
import { AppleLogoIcon } from 'phosphor-react-native/src/icons/AppleLogo';
import { GoogleLogoIcon } from 'phosphor-react-native/src/icons/GoogleLogo';
import { EnvelopeSimpleIcon } from 'phosphor-react-native/src/icons/EnvelopeSimple';
import { LockSimpleIcon } from 'phosphor-react-native/src/icons/LockSimple';
import { ShieldCheckIcon } from 'phosphor-react-native/src/icons/ShieldCheck';
import { SignOutIcon } from 'phosphor-react-native/src/icons/SignOut';
import { GearSixIcon } from 'phosphor-react-native/src/icons/GearSix';
import { HouseIcon } from 'phosphor-react-native/src/icons/House';
import { ListBulletsIcon } from 'phosphor-react-native/src/icons/ListBullets';
import { UserIcon } from 'phosphor-react-native/src/icons/User';
import * as React from 'react';
import { View } from 'react-native';
import { useCSSVariable } from 'uniwind';
import { ICON_GLYPHS, type IconName, type IconWeight } from '../../lib/icons';

const GLYPHS = {
  Check: CheckIcon,
  Clock: ClockIcon,
  X: XIcon,
  WarningCircle: WarningCircleIcon,
  Circle: CircleIcon,
  MagnifyingGlass: MagnifyingGlassIcon,
  Plus: PlusIcon,
  Minus: MinusIcon,
  ArrowRight: ArrowRightIcon,
  CaretRight: CaretRightIcon,
  AppleLogo: AppleLogoIcon,
  GoogleLogo: GoogleLogoIcon,
  EnvelopeSimple: EnvelopeSimpleIcon,
  LockSimple: LockSimpleIcon,
  ShieldCheck: ShieldCheckIcon,
  SignOut: SignOutIcon,
  GearSix: GearSixIcon,
  House: HouseIcon,
  ListBullets: ListBulletsIcon,
  User: UserIcon,
} satisfies Record<(typeof ICON_GLYPHS)[IconName], unknown>;

/** Same names as Text's tones, plus the fills the icons sit on. */
const TONE_VAR = {
  default: '--color-foreground',
  muted: '--color-muted-foreground',
  inverse: '--color-primary-foreground',
  'on-ink': '--color-on-ink',
  ink: '--color-ink',
  primary: '--color-primary',
  accent: '--color-accent',
  'accent-foreground': '--color-accent-foreground',
  danger: '--color-danger',
} as const;

type IconTone = keyof typeof TONE_VAR;

type IconProps = {
  name: IconName;
  /** Points. Match the text it sits next to: 12 for micro/kicker, 14 for labels, 16 to 20 alone. */
  size?: number;
  tone?: IconTone;
  /** Phosphor weight. `regular` by default; `bold` beside small mono labels, `fill` for a selected state. */
  weight?: IconWeight;
  testID?: string;
};

function Icon({ name, size = 14, tone = 'default', weight, testID }: IconProps) {
  const color = (useCSSVariable(TONE_VAR[tone]) as string | undefined) ?? '#111111';
  const Glyph = GLYPHS[ICON_GLYPHS[name]];
  return (
    <View
      style={{ width: size, height: size }}
      testID={testID ?? `icon-${name}`}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Glyph size={size} color={color} weight={weight ?? (name === 'dot' ? 'fill' : 'regular')} />
    </View>
  );
}

const iconNames = Object.keys(ICON_GLYPHS) as IconName[];

export { Icon, iconNames };
export type { IconName, IconProps, IconTone };
