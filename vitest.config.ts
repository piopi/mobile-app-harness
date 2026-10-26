import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: { name: 'shared', include: ['packages/shared/src/**/*.test.ts'] },
      },
      {
        // The harness scripts' own logic (harness:apply, harness:diff, the icon writer).
        test: { name: 'harness', include: ['scripts/**/*.test.mjs'] },
      },
      {
        // Runs against this worktree's local Supabase stack (`pnpm sb start`); loaded via scripts/with-env.mjs.
        // Files run one at a time: they share one database and `useScenario` resets it.
        test: {
          name: 'integration',
          include: ['supabase/tests/integration/**/*.test.ts'],
          testTimeout: 15_000,
          hookTimeout: 120_000,
          fileParallelism: false,
        },
      },
    ],
  },
});
