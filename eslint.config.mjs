// ESLint flat config for the whole monorepo.
import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** Raw React Native building blocks a screen must not use directly: compose packages/ui instead. */
const RAW_PRIMITIVES = ['View', 'Text', 'Pressable', 'TouchableOpacity', 'ScrollView', 'Image', 'TextInput', 'StyleSheet'];

/** Navigation, tabs, headers and modals come from Expo Router and native components (AGENTS.md "Navigation and layout"). */
const ROUTER_ONLY_PATHS = [
  {
    name: 'react-native',
    importNames: ['Modal'],
    message: 'Use an Expo Router route with `presentation` (modal, formSheet, fullScreenModal) instead of <Modal>.',
  },
  {
    name: 'react-native',
    importNames: ['Alert', 'ActionSheetIOS'],
    message: 'No native alert popups: use AlertDialog / ActionSheet from packages/ui (AGENTS.md).',
  },
  {
    name: 'react-native',
    importNames: ['SafeAreaView', 'StatusBar'],
    message: 'Official before custom: use packages/ui Screen (react-native-safe-area-context) and expo-status-bar.',
  },
  {
    name: '@react-navigation/native',
    importNames: ['useNavigation', 'useRoute', 'NavigationContainer'],
    message: 'Use expo-router (useRouter, useLocalSearchParams, useNavigation from expo-router).',
  },
];
const ROUTER_ONLY_PATTERNS = [
  {
    group: ['@react-navigation/bottom-tabs', '@react-navigation/stack', '@react-navigation/native-stack', '@react-navigation/drawer', '@react-navigation/material-top-tabs'],
    message: 'Navigators come from the expo-router file tree: _layout.tsx with Stack, NativeTabs or Tabs. See the new-screen skill.',
  },
];

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.expo/**',
      '**/dist/**',
      'apps/mobile/ios/**',
      'apps/mobile/android/**',
      'apps/mobile/.rnstorybook/storybook.requires.ts',
      '**/*.d.ts',
      'packages/shared/src/database.types.ts',
      '.agents/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['**/*.{js,cjs,mjs}', 'apps/mobile/*.ts'],
    languageOptions: { globals: { ...globals.node } },
  },
  // Integration tests are not React: `useScenario` is a Vitest hook helper, not a React hook.
  {
    files: ['supabase/tests/**/*.ts'],
    rules: { 'react-hooks/rules-of-hooks': 'off' },
  },
  {
    files: ['**/*.test.{ts,tsx}', 'jest.setup.js'],
    languageOptions: { globals: { ...globals.jest } },
  },
  // No one-off styles outside packages/ui: screens and app code compose components and their variants.
  {
    files: ['apps/**/*.{ts,tsx}'],
    ignores: ['apps/mobile/.rnstorybook/**', '**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXOpeningElement[name.name!='StatusBar'][name.name!='NavigationBar'] > JSXAttribute[name.name='style']",
          message: 'No inline styles outside packages/ui. Use a packages/ui component or add a variant there (new-component skill).',
        },
        {
          selector: "JSXAttribute[name.name=/^(className|contentContainerClassName|.*ClassName)$/]",
          message: 'No className one-offs outside packages/ui. Use a packages/ui component or add a variant there (new-component skill).',
        },
        {
          selector: "CallExpression[callee.object.name='StyleSheet'][callee.property.name='create']",
          message: 'No StyleSheet.create outside packages/ui.',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react-native',
              importNames: RAW_PRIMITIVES,
              message: 'Screens compose packages/ui (Screen, Stack, Text, Button, Card…). Add what is missing to packages/ui with a story.',
            },
            ...ROUTER_ONLY_PATHS,
          ],
          patterns: ROUTER_ONLY_PATTERNS,
        },
      ],
    },
  },
  // packages/ui ships components, not navigation: no navigators or RN <Modal> there either.
  {
    files: ['packages/ui/src/**/*.{ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}', '**/*.stories.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { paths: ROUTER_ONLY_PATHS, patterns: ROUTER_ONLY_PATTERNS }],
    },
  },
);
