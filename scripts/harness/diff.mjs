#!/usr/bin/env node
// Drift control between this repo's generic harness and the template it came from (or should feed back into).
//
//   pnpm harness:diff                      list each harness file: same, changed, only here, only in the template
//   pnpm harness:diff --diff [path...]     show the changes (this repo against the template)
//   pnpm harness:diff --patch > h.patch    a patch in the template's own terms: `git apply h.patch` in a template clone
//   options: --ref <branch>  --template-dir <local checkout>  (default: a cached clone of harness.template)
//
// Self-contained on purpose (only node and git): it must run in any repo, including one not made from the template.
// Files are compared after mapping each side's identity (harness.config.json: name, slug, scheme, bundle ids,
// workspace scope, GitHub repo, home dir) to neutral tokens, so "exampleapp" vs "myapp" is not a difference. The paths
// compared are the template's harness.manifest.json. Blocks between <!-- PROJECT:<name> --> and <!-- /PROJECT -->
// belong to the project and are ignored.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const argv = process.argv.slice(2);
const opt = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const MODE = argv.includes('--patch') ? 'patch' : argv.includes('--diff') ? 'diff' : 'list';
const only = argv.filter((a, i) => !a.startsWith('--') && !['--ref', '--template-dir'].includes(argv[i - 1]));

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const local = readJson(path.join(ROOT, 'harness.config.json'));
const templateRepo = local.harness?.template ?? 'piopi/mobile-app-harness';

// ─── The template checkout ────────────────────────────────────────────────────────────────────────
function templateDir() {
  const given = opt('template-dir');
  if (given) return path.resolve(given);
  const dir = path.join(os.homedir(), '.cache', 'mobile-app-harness', templateRepo.replace('/', '__'));
  const ref = opt('ref') ?? 'main';
  const git = (...args) => execFileSync('git', args, { stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8' });
  if (!existsSync(dir)) {
    mkdirSync(path.dirname(dir), { recursive: true });
    git('clone', '--quiet', `git@github.com:${templateRepo}.git`, dir);
  }
  git('-C', dir, 'fetch', '--quiet', 'origin', ref);
  git('-C', dir, 'checkout', '--quiet', '--detach', `origin/${ref}`);
  git('-C', dir, 'remote', 'set-url', '--push', 'origin', 'DISABLED-read-only-cache');
  return dir;
}
const TPL = templateDir();
const template = readJson(path.join(TPL, 'harness.config.json'));
const manifest = readJson(path.join(TPL, 'harness.manifest.json'));

// ─── Identity mapping ─────────────────────────────────────────────────────────────────────────────
function identity(cfg) {
  const a = cfg.app ?? {};
  return {
    repo: cfg.github?.repo,
    bundleId: a.bundleId,
    androidPackage: a.androidPackage ?? a.bundleId,
    scope: cfg.harness?.workspaceScope ?? '@app',
    homeDir: cfg.harness?.homeDir ?? `.${a.slug}`,
    scheme: a.scheme ? `${a.scheme}://` : undefined,
    name: a.name,
    slug: a.slug,
  };
}
const LOCAL_ID = identity(local);
const TPL_ID = identity(template);
const isTemplateItself = path.resolve(TPL) === ROOT;

/** Replace each identity value (longest first) with a neutral token, then optionally render it as `to`. */
function mapIdentity(text, from, to) {
  const keys = Object.keys(from)
    .filter((k) => from[k])
    .sort((a, b) => from[b].length - from[a].length);
  for (const k of keys) text = text.split(from[k]).join(`\u0000${k}\u0000`);
  for (const k of keys) text = text.split(`\u0000${k}\u0000`).join(to ? (to[k] ?? `{{${k}}}`) : `{{${k}}}`);
  return text;
}
const stripProject = (text) => text.replace(/<!-- PROJECT:([\w-]+) -->[\s\S]*?<!-- \/PROJECT -->/g, '<!-- PROJECT:$1 --><!-- /PROJECT -->');

// ─── Files ────────────────────────────────────────────────────────────────────────────────────────
function* walk(base, rel) {
  const abs = path.join(base, rel);
  if (!existsSync(abs)) return;
  if (statSync(abs).isFile()) {
    yield rel;
    return;
  }
  for (const name of readdirSync(abs)) {
    if (name === 'node_modules' || name === '.DS_Store') continue;
    yield* walk(base, path.join(rel, name));
  }
}
const files = new Set();
for (const p of manifest.paths) {
  for (const f of walk(TPL, p)) files.add(f);
  for (const f of walk(ROOT, p)) files.add(f);
}
const selected = [...files].sort().filter((f) => !only.length || only.some((o) => f === o || f.startsWith(o.endsWith('/') ? o : `${o}/`)));

const isText = (buf) => !buf.includes(0);
function compare(rel) {
  const t = path.join(TPL, rel);
  const l = path.join(ROOT, rel);
  const tb = existsSync(t) ? readFileSync(t) : null;
  const lb = existsSync(l) ? readFileSync(l) : null;
  if (!lb) return { rel, status: 'only in template' };
  if (!tb) return { rel, status: 'only here', text: isText(lb) ? stripProject(mapIdentity(lb.toString('utf8'), LOCAL_ID, TPL_ID)) : null };
  if (!isText(tb) || !isText(lb)) return { rel, status: tb.equals(lb) ? 'same' : 'changed (binary)' };
  const tText = stripProject(tb.toString('utf8'));
  const lText = stripProject(mapIdentity(lb.toString('utf8'), LOCAL_ID, TPL_ID));
  return { rel, status: tText === lText ? 'same' : 'changed', tText, lText };
}

const results = selected.map(compare);

if (MODE === 'list') {
  const groups = {};
  for (const r of results) (groups[r.status] ??= []).push(r.rel);
  console.log(`harness:diff against ${templateRepo}${isTemplateItself ? ' (this is the template)' : ''} · ${TPL}`);
  for (const status of ['changed', 'changed (binary)', 'only here', 'only in template']) {
    if (!groups[status]) continue;
    console.log(`\n${status} (${groups[status].length})`);
    for (const f of groups[status]) console.log(`  ${f}`);
  }
  console.log(`\nsame: ${groups.same?.length ?? 0} file(s)`);
  if (groups.changed || groups['only here'])
    console.log('\nPush an improvement back: `pnpm harness:diff --patch [path...] > harness.patch`, then `git apply harness.patch` in a template clone and open a PR there.');
  process.exit(0);
}

// --diff / --patch: unified diffs in the template's terms (a = template, b = this repo).
const tmp = mkdtempSync(path.join(os.tmpdir(), 'harness-diff-'));
let out = '';
for (const r of results) {
  if (r.status === 'same' || r.status === 'changed (binary)') {
    if (r.status === 'changed (binary)') process.stderr.write(`skipped binary: ${r.rel}\n`);
    continue;
  }
  const a = path.join(tmp, 'a');
  const b = path.join(tmp, 'b');
  writeFileSync(a, r.status === 'only here' ? '' : (r.tText ?? ''));
  writeFileSync(b, r.status === 'only in template' ? '' : (r.lText ?? r.text ?? ''));
  const d = spawnSync('git', ['diff', '--no-index', '--no-color', a, b], { encoding: 'utf8' }).stdout;
  if (!d) continue;
  const [, ...rest] = d.split('\n');
  const body = rest
    .filter((line) => !/^(index |new file mode|deleted file mode)/.test(line))
    .map((line) => (line.startsWith('--- ') ? `--- ${r.status === 'only here' ? '/dev/null' : `a/${r.rel}`}` : line.startsWith('+++ ') ? `+++ ${r.status === 'only in template' ? '/dev/null' : `b/${r.rel}`}` : line))
    .join('\n');
  out += `diff --git a/${r.rel} b/${r.rel}\n${r.status === 'only here' ? 'new file mode 100644\n' : r.status === 'only in template' ? 'deleted file mode 100644\n' : ''}${body}`;
}
rmSync(tmp, { recursive: true, force: true });
process.stdout.write(out);
if (MODE === 'diff' && !out) console.log('no differences');
