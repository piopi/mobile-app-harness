// `pnpm guide publish`: copy a fresh build of the guides site into a local clone of the project's GitHub Pages
// repository, then print the git commands that commit and push it. It never pushes: a human (or an agent the human
// asked) runs those commands. The repository is `guides.pagesRepo` in harness.config.json, or GUIDES_PAGES_REPO;
// empty by default, and publish refuses to run until it is set (creating it is a step on the human's setup checklist).
import { cpSync, existsSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** Files in the Pages clone that the site doesn't own and a publish keeps: git itself, and a custom domain. */
const KEEP = new Set(['.git', 'CNAME']);

/**
 * Where to publish: the Pages repository (`owner/name` or a git URL) and its local clone. Throws while no repository
 * is set. `GUIDES_PAGES_DIR` moves the clone (default: ~/<homeDir>/guides-pages, one per machine).
 */
export function pagesTarget(config, env = process.env, home = os.homedir()) {
  const repo = (env.GUIDES_PAGES_REPO || config?.guides?.pagesRepo || '').trim();
  if (!repo)
    throw new Error(
      'No GitHub Pages repository for the guides yet: set "guides": { "pagesRepo": "<owner>/<name>" } in harness.config.json (or GUIDES_PAGES_REPO). Creating it is a human step (the setup checklist).',
    );
  const url = /^[\w.-]+\/[\w.-]+$/.test(repo) ? `https://github.com/${repo}.git` : repo;
  const dir = env.GUIDES_PAGES_DIR || path.join(home, config?.harness?.homeDir ?? `.${config?.app?.slug ?? 'app'}`, 'guides-pages');
  return { repo, url, dir };
}

/**
 * The path GitHub Pages serves the site under, which Starlight's links need at build time: `GUIDES_BASE` or
 * `guides.base` when set; `/` for a custom domain (`cname`, the clone has a CNAME file) or a `<owner>.github.io`
 * repository; otherwise `/<repo name>/`, a project site (`https://<owner>.github.io/<repo name>/`).
 */
export function pagesBase(target, { config, cname = false, env = process.env } = {}) {
  const set = (env.GUIDES_BASE || config?.guides?.base || '').trim();
  if (set) return `/${set.split('/').filter(Boolean).join('/')}/`.replace(/^\/\/$/, '/');
  if (cname) return '/';
  const name = target.url
    .replace(/\.git$/, '')
    .replace(/\/$/, '')
    .split(/[/:]/)
    .pop();
  return /\.github\.io$/i.test(name) ? '/' : `/${name}/`;
}

/** Whether a clone's `origin` URL is the Pages repository (https or ssh, with or without .git). */
export function sameRepo(a, b) {
  const norm = (u) =>
    u
      .trim()
      .replace(/\.git$/, '')
      .replace(/^git@github\.com:/, 'https://github.com/')
      .replace(/\/$/, '')
      .toLowerCase();
  return norm(a) === norm(b);
}

/**
 * Replace the clone's content with the built site: everything but .git and CNAME goes, guides-out/ comes in, plus an
 * empty .nojekyll so Pages serves it as is (Jekyll would drop Astro's `_astro/` folder).
 */
export function copySite(outDir, cloneDir) {
  if (!existsSync(path.join(outDir, 'index.html'))) throw new Error(`${outDir} has no index.html: build the site first`);
  if (!existsSync(path.join(cloneDir, '.git'))) throw new Error(`${cloneDir} is not a git clone`);
  for (const entry of readdirSync(cloneDir)) if (!KEEP.has(entry)) rmSync(path.join(cloneDir, entry), { recursive: true, force: true });
  cpSync(outDir, cloneDir, { recursive: true });
  writeFileSync(path.join(cloneDir, '.nojekyll'), '');
}

/** The commands that publish what copySite left in the clone. */
export function pushCommands(dir, sha, source = 'the app') {
  const at = JSON.stringify(dir);
  return [`git -C ${at} add -A`, `git -C ${at} commit -m ${JSON.stringify(`Guides from ${source} ${sha}`)}`, `git -C ${at} push origin HEAD:main`];
}
