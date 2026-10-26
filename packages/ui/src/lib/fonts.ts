// Fonts bundled with the app. The template uses the system font (San Francisco / Roboto), so nothing is bundled
// yet. To brand the type, follow the design-system skill's "Change the font": add static OFL files to
// packages/ui/assets/fonts, list them here (the keys are the family names), and point theme.css and FONT at them.
export const fontAssets: Record<string, number> = {};

/**
 * Native chrome can't read CSS tokens, so the header and tab label type is named here. `fontFamily: undefined`
 * keeps the system font; a branded font sets its family name and drops the weight (one file per weight).
 */
export const FONT = {
  title: { fontFamily: undefined as string | undefined, fontWeight: '700' as const },
  largeTitle: { fontFamily: undefined as string | undefined, fontWeight: '800' as const },
  tabLabel: { fontFamily: undefined as string | undefined, fontWeight: '500' as const },
};
