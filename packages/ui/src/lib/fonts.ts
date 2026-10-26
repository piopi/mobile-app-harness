// Static OFL font instances bundled with the app (packages/ui/assets/fonts, licences alongside).
// The keys are the family names: they match the --font-* tokens in theme.css and the names in navigation.ts.
export const fontAssets = {
  Inter_400Regular: require('../../assets/fonts/Inter_400Regular.ttf'),
  Inter_500Medium: require('../../assets/fonts/Inter_500Medium.ttf'),
  Inter_600SemiBold: require('../../assets/fonts/Inter_600SemiBold.ttf'),
  Inter_700Bold: require('../../assets/fonts/Inter_700Bold.ttf'),
  Inter_800ExtraBold: require('../../assets/fonts/Inter_800ExtraBold.ttf'),
  JetBrainsMono_400Regular: require('../../assets/fonts/JetBrainsMono_400Regular.ttf'),
  JetBrainsMono_500Medium: require('../../assets/fonts/JetBrainsMono_500Medium.ttf'),
} as const;

/** The families native chrome needs by name (it can't read CSS tokens). */
export const FONT = {
  title: 'Inter_700Bold',
  largeTitle: 'Inter_800ExtraBold',
  tabLabel: 'Inter_500Medium',
} as const;
