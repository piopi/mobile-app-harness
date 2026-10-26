#!/usr/bin/env node
// Optional: a read-only checkout of the reference app this project ports (harness.config.json `reference`),
// shared by every worktree. `pnpm reference` clones or updates it in ~/.<slug>/reference and prints the path.
// Pushing is disabled. Read its source for a screen's exact copy, assets, structure and rules before building it.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { APP, CONFIG } from './lib/env.mjs';

const ref = CONFIG.reference;
if (!ref?.repo) {
  console.error('No reference app configured (harness.config.json "reference": { "repo": "owner/name" }).');
  process.exit(2);
}
const DIR = path.join(APP.home, 'reference');
const git = (...args) => execFileSync('git', args, { stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8' });

if (!existsSync(DIR)) {
  git('clone', '--quiet', `git@github.com:${ref.repo}.git`, DIR);
} else {
  git('-C', DIR, 'pull', '--quiet', '--ff-only');
}
git('-C', DIR, 'remote', 'set-url', '--push', 'origin', 'DISABLED-reference-only');
console.log(DIR);
