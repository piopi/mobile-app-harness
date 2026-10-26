// Metro: Expo defaults (monorepo-aware), Storybook behind a flag, Uniwind outermost (required).
const { getDefaultConfig } = require('expo/metro-config');
const { withStorybook } = require('@storybook/react-native/metro/withStorybook');
const { withUniwindConfig } = require('uniwind/metro');
const path = require('node:path');

const config = getDefaultConfig(__dirname);

module.exports = withUniwindConfig(
  withStorybook(config, {
    // EXPO_PUBLIC_STORYBOOK=true (set by `pnpm wt up` and `pnpm storybook`) bundles the on-device catalog.
    // Without it, Storybook is replaced by empty modules and never ships.
    enabled: process.env.EXPO_PUBLIC_STORYBOOK === 'true',
    configPath: path.resolve(__dirname, '.rnstorybook'),
    liteMode: true,
  }),
  {
    cssEntryFile: './src/global.css',
    dtsFile: './src/uniwind-types.d.ts',
  },
);
