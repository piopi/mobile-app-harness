import { tabIcons, useNativeTabsTheme, type TabIconName } from '@app/ui';
import { NativeTabs, type SFSymbolIcon } from 'expo-router/native-tabs';
import { useAgentState } from '../../dev/agent-events';

const TABS: { name: TabIconName; label: string; system: SFSymbolIcon }[] = [
  { name: 'home', label: 'Home', system: { sf: { default: 'house', selected: 'house.fill' } } },
  { name: 'items', label: 'Items', system: { sf: 'list.bullet' } },
  { name: 'me', label: 'Me', system: { sf: { default: 'person', selected: 'person.fill' } } },
];

/**
 * The platform tab bar: UITabBar (Liquid Glass on iOS 26) and Material 3 bottom navigation on Android, branded
 * only through NativeTabs props (packages/ui `useNativeTabsTheme`): Phosphor glyphs as template images (regular,
 * fill when selected), the brand's tint and type, a select haptic. A role-only tab uses `hidden` (tabs are static;
 * a role change remounts the navigator). Dev-only `__agent/chrome {"plain":true}` renders the untouched system bar
 * (SF Symbols on iOS) for side-by-side comparison. A new tab: a folder here, a row in TABS, a glyph in
 * packages/ui/src/lib/icons.ts (TAB_ICONS), then `pnpm --filter @app/ui tab-icons`.
 */
export default function TabLayout() {
  const theme = useNativeTabsTheme();
  const { plainChrome } = useAgentState();
  const plain = __DEV__ && plainChrome;
  return (
    <NativeTabs {...(plain ? {} : theme)}>
      {TABS.map((t) => (
        <NativeTabs.Trigger key={t.name} name={t.name} accessibilityLabel={t.label} testID={`tab-${t.name}`}>
          {/* Plain on Android keeps our images: Material Symbols (`md`) need the expo-symbols native module. */}
          {plain && process.env.EXPO_OS === 'ios' ? (
            <NativeTabs.Trigger.Icon sf={t.system.sf} />
          ) : (
            <NativeTabs.Trigger.Icon src={tabIcons[t.name]} renderingMode="template" />
          )}
          <NativeTabs.Trigger.Label>{t.label}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
