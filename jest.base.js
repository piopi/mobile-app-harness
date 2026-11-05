// Shared Jest config for React Native packages (apps/mobile, packages/ui). jest-expo + RNTL.
/** @type {(dir: string) => import('jest').Config} */
module.exports = (dir) => ({
  preset: 'jest-expo',
  rootDir: dir,
  testMatch: ['<rootDir>/src/**/*.test.ts?(x)'],
  // On CI's two cores Jest finished the app's tests in ~35 s, then waited ~5 min on an open handle before exiting.
  forceExit: Boolean(process.env.CI),
  setupFiles: [require.resolve('./jest.setup.js')],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|expo-router|@rn-primitives/.*|phosphor-react-native|uniwind|tailwind-variants|@storybook/.*)',
  ],
});
