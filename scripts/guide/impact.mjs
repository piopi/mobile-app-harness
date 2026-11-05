#!/usr/bin/env node
// Guide impact check: a pull request that changes a screen a how-to guide shows (the guide's `covers`) but not the
// guide itself either updates the guide or says on a `Guides:` line of its description why the guide still holds:
//   Guides: browse-items (copy only, no step changes), sign-out (testID rename only)
// Run by .github/workflows/guide-impact.yml on every code PR, and again when the description is edited.
//
//   node scripts/guide/impact.mjs <base>                  diff origin/<base>...HEAD; the description from GITHUB_EVENT_PATH
//   node scripts/guide/impact.mjs <base> --body <file>    the same, with the description from a file (local runs)
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { covered, loadGuides } from './model.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const GUIDES = path.join(ROOT, 'apps/mobile/.maestro/guides');

const rel = (file, root) => path.relative(root, file).split(path.sep).join('/');

/**
 * The guides a change set touches without updating: some changed file is in the guide's `covers` while the guide's
 * own file is unchanged. `changed` are repo paths with forward slashes. Returns each guide with the files that hit it.
 */
export function affectedGuides(guides, changed, root = ROOT) {
  const set = new Set(changed);
  return guides
    .filter((g) => !set.has(rel(g.file, root)))
    .map((g) => ({ guide: g, files: changed.filter((f) => g.covers.some((c) => covered(f, c))) }))
    .filter((a) => a.files.length);
}

/**
 * The guides a PR description vouches for, from its `Guides:` lines (outside HTML comments): each `name (reason)`,
 * where name is a guide's slug or <audience>/<slug>. A name without a reason in brackets does not count.
 */
export function acknowledgedGuides(body) {
  const text = (body ?? '').replace(/\r\n/g, '\n').replace(/<!--[\s\S]*?-->/g, '');
  const named = new Map();
  for (const [, line] of text.matchAll(/^[\s>*-]*(?:\*\*)?Guides:(?:\*\*)?(.*)$/gim)) {
    for (const [, name, reason] of line.matchAll(/([a-z0-9][a-z0-9/-]*)\s*\(([^)]*[^)\s][^)]*)\)/g)) named.set(name, reason.trim());
  }
  return named;
}

/** The affected guides the description doesn't vouch for. */
export function unexplained(affected, body) {
  const named = acknowledgedGuides(body);
  return affected.filter(({ guide: g }) => !named.has(g.slug) && !named.has(`${g.audience}/${g.slug}`));
}

function main(argv) {
  const base = argv.find((a) => !a.startsWith('--'));
  if (!base) throw new Error('usage: node scripts/guide/impact.mjs <base branch> [--body <file>]');
  const bodyAt = argv.indexOf('--body');
  const body =
    bodyAt >= 0
      ? readFileSync(argv[bodyAt + 1], 'utf8')
      : process.env.GITHUB_EVENT_PATH
        ? (JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')).pull_request?.body ?? '')
        : '';
  const changed = execFileSync('git', ['diff', '--name-only', `origin/${base}...HEAD`], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean);
  const { guides, errors } = loadGuides(GUIDES);
  if (errors.length) throw new Error(`${errors.length} guide(s) don't parse (pnpm guide check --static):\n${errors.map((e) => e.message).join('\n')}`);

  const affected = affectedGuides(guides, changed);
  if (!affected.length) {
    console.log(`Guides: no guide shows a screen this PR changes without the guide changing too (${guides.length} guide(s), ${changed.length} file(s)).`);
    return 0;
  }
  const named = acknowledgedGuides(body);
  for (const { guide: g, files } of affected) {
    const reason = named.get(g.slug) ?? named.get(`${g.audience}/${g.slug}`);
    console.log(`${reason ? 'ok  ' : 'NEED'} ${g.audience}/${g.slug}${reason ? ` (${reason})` : ''}: ${files.join(', ')}`);
  }
  const missing = unexplained(affected, body);
  if (!missing.length) {
    console.log('Every affected guide is named on the Guides: line with a reason.');
    return 0;
  }
  console.error(
    `\nThis PR changes screens that ${missing.length === 1 ? 'a guide shows' : `${missing.length} guides show`}, but not the guide${missing.length === 1 ? '' : 's'}: ${missing.map((m) => m.guide.slug).join(', ')}.`,
  );
  console.error('Update the guide (how-to-guide skill: `pnpm guide check <name>`, then `pnpm guide build <name>`), or say why it still holds on a line of the PR description:');
  console.error(`  Guides: ${missing.map((m) => `${m.guide.slug} (why its steps and screenshots still hold)`).join(', ')}`);
  return 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}
