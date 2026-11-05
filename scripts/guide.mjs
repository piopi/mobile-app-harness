#!/usr/bin/env node
// How-to guides, captured from the app on this worktree's slot (guides-captures/) and built into a static
// site in guides-out/ with Astro Starlight (packages/guides-site). Captures need `pnpm wt up` (and ffmpeg for clips);
// the site needs neither. The format and the workflow: the how-to-guide skill.
//
//   pnpm guide                         list the guides (apps/mobile/.maestro/guides/<audience>/<slug>.yaml)
//   pnpm guide build [name…]           seed, run each guide on the simulator, capture its steps, build the site
//   pnpm guide render [--base=/x/]     build the site again from what was captured (after a caption or style change)
//   pnpm guide check [name…]           run every guide's flow without capturing: does each step still reach its screen?
//   pnpm guide check --static          only parse the guides and the files they name (no device)
//   pnpm guide serve [--set-help-url]  serve guides-out/ on this slot's port (8300+slot); --set-help-url points the app's Help at it
//   pnpm guide publish                 build every guide, copy the site into the Pages clone, print the push commands (never pushes)
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { CONFIG, MOBILE_ENV, readSlotState, ROOT } from './lib/env.mjs';
import { cleanStatusBar, finalCut, hasFfmpeg, restoreStatusBar, run, runMaestro, startRecorder, stopRecorder } from './lib/device.mjs';
import { findGuide, flowYaml, loadGuides, referencedFiles, segmentsFor, shotName, staleCovers } from './guide/model.mjs';
import { copySite, pagesBase, pagesTarget, pushCommands, sameRepo } from './guide/publish.mjs';
import { siteGlossary, termsOf } from './guide/glossary.mjs';
import { normalizeBase, renderContent, themeTokens, tokensCss } from './guide/render.mjs';
import { siteFile, TYPES } from './guide/serve.mjs';

const GUIDES = path.join(ROOT, 'apps/mobile/.maestro/guides');
const OUT = path.join(ROOT, 'guides-out');
/** Each guide's screenshots, clips and capture.json, kept apart from the site (a build replaces guides-out/). */
const CAPTURES = path.join(ROOT, 'guides-captures');
const TMP = path.join(ROOT, '.wt/tmp/guides');
const SITE_DIR = path.join(ROOT, 'packages/guides-site');
const FAVICON = path.join(ROOT, 'apps/mobile/assets/icon.png');
const THEME_CSS = path.join(ROOT, 'packages/ui/src/theme.css');

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith('--')));
const [cmd = 'list', ...names] = argv.filter((a) => !a.startsWith('--'));
/** `--base=/<repo>/` builds the site for a sub-path (what publish does for a Pages project site). */
const baseFlag = () => argv.find((a) => a.startsWith('--base='))?.slice(7) || '/';
const log = (msg) => console.log(`\x1b[2m[guide]\x1b[0m ${msg}`);
function fail(msg) {
  console.error(msg);
  process.exit(1);
}

const { guides, errors } = loadGuides(GUIDES);
if (errors.length) fail(`${errors.length} guide(s) have problems:\n\n${errors.map((e) => e.message).join('\n\n')}`);

function selected() {
  if (!names.length) return guides;
  return names.map((n) => findGuide(guides, n) ?? fail(`no guide "${n}" (have: ${guides.map((g) => g.slug).join(', ')})`));
}
const outDir = (g) => path.join(CAPTURES, g.audience, g.slug);
const captureOf = (g) => {
  const f = path.join(outDir(g), 'capture.json');
  return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null;
};
function seed(g) {
  log(`seed ${g.scenarios.join(' + ')}`);
  run('node', [path.join(ROOT, 'scripts/seed.mjs'), ...g.scenarios], { stdio: 'inherit' });
}
function device() {
  const slot = readSlotState();
  if (!slot.udid) fail('no iOS simulator for this slot: run `pnpm wt up`');
  return { slot, udid: slot.udid };
}
/** The file Maestro wrote for `takeScreenshot: <name>`, somewhere under its output folder. */
function findShot(dir, name) {
  for (const entry of readdirSync(dir)) {
    const p = path.join(dir, entry);
    if (statSync(p).isDirectory()) {
      const found = findShot(p, name);
      if (found) return found;
    } else if (entry === `${name}.png` && path.basename(dir) === 'takeScreenshot') return p;
  }
  return null;
}
const pngSize = (f) => {
  const out = run('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', f]).stdout;
  return { width: Number(out.match(/pixelWidth: (\d+)/)[1]), height: Number(out.match(/pixelHeight: (\d+)/)[1]) };
};

/** Run one guide on the simulator and keep a 2x screenshot (and clip) per step in guides-captures/<audience>/<slug>/. */
async function capture(g) {
  const { slot, udid } = device();
  const tmp = path.join(TMP, g.slug);
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
  const segments = segmentsFor(g, 'build');
  if (segments.some((s) => s.kind === 'clip') && !hasFfmpeg()) fail('ffmpeg is missing (clips need it): brew install ffmpeg');
  seed(g);
  cleanStatusBar(false, udid);
  const clips = {};
  try {
    for (const [i, segment] of segments.entries()) {
      const flow = path.join(tmp, `${String(i + 1).padStart(2, '0')}-${segment.kind}.yaml`);
      writeFileSync(flow, flowYaml(g, segment, i));
      log(`${g.slug}: steps ${segment.steps.map((s) => s + 1).join(', ')}${segment.kind === 'clip' ? ' (clip)' : ''}`);
      if (segment.kind !== 'clip') {
        runMaestro({ device: udid, slot, flow, outDir: path.join(tmp, 'out'), quiet: true });
        continue;
      }
      const raw = path.join(tmp, `${shotName(segment.steps[0])}.raw.mp4`);
      const recorder = await startRecorder(false, udid, raw);
      try {
        runMaestro({ device: udid, slot, flow, outDir: path.join(tmp, 'out'), quiet: true });
      } finally {
        await stopRecorder(recorder);
      }
      clips[segment.steps[0]] = raw;
    }
  } finally {
    restoreStatusBar(false, udid);
  }

  const dest = outDir(g);
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  const steps = g.steps.map((_, i) => {
    const shot = findShot(path.join(tmp, 'out'), shotName(i));
    if (!shot) throw new Error(`${g.slug}: no screenshot for step ${i + 1}`);
    // 2x, as verify-in-app commits them: a 3x simulator's 1206 px becomes 804 px (402 pt × 2).
    const { width } = pngSize(shot);
    const scale = width > 900 ? 3 : 2;
    const image = `${shotName(i)}.png`;
    run('sips', ['--resampleWidth', String(Math.round((width * 2) / scale)), shot, '--out', path.join(dest, image)]);
    const size = pngSize(path.join(dest, image));
    let clip = null;
    if (clips[i]) {
      clip = `${shotName(i)}.mp4`;
      const cut = finalCut(clips[i], path.join(dest, clip), { width: size.width, crf: 26 });
      log(`${g.slug}: step ${i + 1} clip ${cut.before.toFixed(1)}s → ${cut.after.toFixed(1)}s`);
    }
    return { image, clip, ...size };
  });
  writeFileSync(path.join(dest, 'capture.json'), `${JSON.stringify({ slug: g.slug, capturedAt: new Date().toISOString(), steps }, null, 2)}\n`);
  rmSync(tmp, { recursive: true, force: true });
  log(`${g.slug}: ${steps.length} step(s) → ${path.relative(ROOT, dest)}/`);
}

/** Where the last build is served from (`/`, or `/<repo>/` for Pages): `pnpm guide serve` mounts it there. */
const BASE_FILE = path.join(CAPTURES, 'site-base');

/** Build the site from every guide that has a capture: Starlight's pages and media, then its build into guides-out/. */
async function render(base = '/') {
  base = normalizeBase(base);
  const captures = Object.fromEntries(guides.map((g) => [g.slug, captureOf(g)]).filter(([, c]) => c));
  const glossary = siteGlossary(readFileSync(path.join(ROOT, 'GLOSSARY.md'), 'utf8'), termsOf(CONFIG));
  const { pages, media, site, skipped, built } = renderContent({ guides, captures, base, glossary, app: CONFIG.app });
  const content = path.join(SITE_DIR, 'src/content/docs');
  const generated = path.join(SITE_DIR, 'src/generated');
  const pub = path.join(SITE_DIR, 'public');
  for (const d of [content, generated, pub]) {
    rmSync(d, { recursive: true, force: true });
    mkdirSync(d, { recursive: true });
  }
  for (const [rel, body] of pages) {
    mkdirSync(path.dirname(path.join(content, rel)), { recursive: true });
    writeFileSync(path.join(content, rel), body);
  }
  for (const m of media) {
    const to = path.join(m.to.startsWith('public/') ? pub : content, m.to.replace(/^(public|content)\//, ''));
    mkdirSync(path.dirname(to), { recursive: true });
    copyFileSync(path.join(outDir(m.guide), m.from), to);
  }
  writeFileSync(path.join(generated, 'site.json'), `${JSON.stringify(site, null, 2)}\n`);
  const theme = readFileSync(THEME_CSS, 'utf8');
  writeFileSync(path.join(generated, 'tokens.css'), tokensCss({ light: themeTokens(theme, 'light'), dark: themeTokens(theme, 'dark') }));
  copyFileSync(FAVICON, path.join(pub, 'favicon.png'));

  log(`astro build (Starlight) → ${path.relative(ROOT, OUT)}/ at ${base}`);
  process.env.ASTRO_TELEMETRY_DISABLED = '1';
  // Astro's API, not its CLI: the CLI refuses Node below its floor (22.23.4) even where the build runs fine.
  const { build } = await import('astro');
  await build({ root: SITE_DIR, outDir: OUT, base, logLevel: 'error' });
  mkdirSync(CAPTURES, { recursive: true });
  writeFileSync(BASE_FILE, base);

  for (const s of skipped) log(`left out ${s.guide.audience}/${s.guide.slug}: ${s.reason} (pnpm guide build ${s.guide.slug})`);
  const drafts = built.filter((g) => g.copy === 'placeholder');
  if (drafts.length) log(`${drafts.length} guide(s) still have placeholder copy (marked Draft): ${drafts.map((g) => g.slug).join(', ')}`);
  log(`site: ${path.relative(ROOT, OUT)}/ (${built.length} guide(s), searchable); \`pnpm guide serve\` to open it`);
  return { skipped, built };
}

/** The Pages clone, cloned on first use and fast-forwarded to its remote; refuses one with local changes. */
function pagesClone(target) {
  const git = (...args) => run('git', ['-C', target.dir, ...args]).stdout.trim();
  if (!existsSync(path.join(target.dir, '.git'))) {
    log(`clone ${target.url} → ${target.dir}`);
    mkdirSync(path.dirname(target.dir), { recursive: true });
    run('git', ['clone', target.url, target.dir], { stdio: 'inherit' });
  }
  const origin = git('remote', 'get-url', 'origin');
  if (!sameRepo(origin, target.url)) fail(`${target.dir} is a clone of ${origin}, not ${target.url}: move it, or set GUIDES_PAGES_DIR`);
  if (git('status', '--porcelain')) fail(`${target.dir} has uncommitted changes: commit, push or discard them first (git -C ${target.dir} status)`);
  git('fetch', 'origin');
  const remoteMain = run('git', ['-C', target.dir, 'rev-parse', '--verify', '--quiet', 'origin/main'], { allowFail: true });
  if (remoteMain.status === 0) git('merge', '--ff-only', 'origin/main');
}

if (cmd === 'list') {
  for (const g of guides) {
    const c = captureOf(g);
    console.log(`${`${g.audience}/${g.slug}`.padEnd(34)} ${String(g.steps.length).padStart(2)} steps  ${g.scenarios.join('+').padEnd(22)} ${g.copy.padEnd(11)} ${c ? `built ${c.capturedAt.slice(0, 16)}` : 'not built'}`);
  }
} else if (cmd === 'build') {
  for (const g of selected()) await capture(g).catch((e) => fail(`${g.slug}: ${e.message}`));
  await render(baseFlag());
} else if (cmd === 'render') {
  await render(baseFlag());
} else if (cmd === 'check') {
  const list = selected();
  const missing = list.flatMap((g) => referencedFiles(g).filter((f) => !existsSync(f)).map((f) => `${path.relative(ROOT, g.file)}: ${path.relative(ROOT, f)} does not exist`));
  // Every `covers` entry still names a file: a renamed screen would otherwise drop out of the impact check unnoticed.
  missing.push(...list.flatMap((g) => staleCovers(g, ROOT).map((c) => `${path.relative(ROOT, g.file)}: covers "${c}" matches no file`)));
  if (missing.length) fail(missing.join('\n'));
  if (flags.has('--static')) {
    log(`${list.length} guide(s) parse, every file they name exists, and every \`covers\` entry matches a file`);
    process.exit(0);
  }
  const { slot, udid } = device();
  const failed = [];
  for (const g of list) {
    const tmp = path.join(TMP, `${g.slug}-check`);
    rmSync(tmp, { recursive: true, force: true });
    mkdirSync(tmp, { recursive: true });
    const flow = path.join(tmp, 'check.yaml');
    writeFileSync(flow, flowYaml(g, segmentsFor(g, 'check')[0], 0));
    seed(g);
    try {
      runMaestro({ device: udid, slot, flow, outDir: path.join(tmp, 'out'), quiet: true });
      rmSync(tmp, { recursive: true, force: true });
      log(`ok   ${g.audience}/${g.slug}`);
    } catch (e) {
      failed.push(g.slug);
      log(`FAIL ${g.audience}/${g.slug}: ${e.message}`);
    }
  }
  if (failed.length) fail(`${failed.length} guide(s) no longer reach their screens: ${failed.join(', ')}. Fix the guide (or the app), then \`pnpm guide build\` them again.`);
  log(`${list.length} guide(s) reach every step`);
} else if (cmd === 'serve') {
  if (!existsSync(path.join(OUT, 'index.html'))) fail('nothing to serve: `pnpm guide build` (or `pnpm guide render`) first');
  // Serving needs no slot (anyone can open the site on their laptop): with one, the port follows it. --set-help-url
  // needs one: it writes this slot's app env.
  const hasSlot = existsSync(path.join(ROOT, '.wt/state.json'));
  if (flags.has('--set-help-url') && !hasSlot) readSlotState();
  const slot = hasSlot ? readSlotState() : { slot: 0 };
  const port = Number(argv.find((a) => a.startsWith('--port='))?.slice(7)) || 8300 + Number(slot.slot ?? 0);
  const base = existsSync(BASE_FILE) ? normalizeBase(readFileSync(BASE_FILE, 'utf8')) : '/';
  http
    .createServer((req, res) => {
      const found = siteFile(OUT, base, new URL(req.url, 'http://x').pathname);
      if (found.redirect) res.writeHead(301, { location: found.redirect }).end();
      else if (found.file) res.writeHead(200, { 'content-type': TYPES[path.extname(found.file)] ?? 'application/octet-stream' }).end(readFileSync(found.file));
      else res.writeHead(404, { 'content-type': TYPES['.html'] }).end(found.notFound ? readFileSync(found.notFound) : 'not found');
    })
    .listen(port, '127.0.0.1', () => {
      const url = `http://127.0.0.1:${port}${base}`;
      log(`serving ${path.relative(ROOT, OUT)}/ at ${url} (Ctrl-C to stop)`);
      if (flags.has('--set-help-url')) {
        // The app's Help row reads EXPO_PUBLIC_GUIDES_URL (src/lib/env.ts); `pnpm wt up` and `pnpm sb start` keep it.
        const kept = existsSync(MOBILE_ENV) ? readFileSync(MOBILE_ENV, 'utf8').split('\n').filter((l) => l && !l.startsWith('EXPO_PUBLIC_GUIDES_URL=')) : [];
        writeFileSync(MOBILE_ENV, `${[...kept, `EXPO_PUBLIC_GUIDES_URL=${url}`].join('\n')}\n`);
        log(`EXPO_PUBLIC_GUIDES_URL=${url} in apps/mobile/.env.local: \`pnpm wt open\` to reload the app with Help (Android: adb reverse tcp:${port} tcp:${port})`);
      }
    });
} else if (cmd === 'publish') {
  // A release step: every guide retaken from the current app, then handed to the Pages clone.
  let target;
  const config = CONFIG;
  try {
    target = pagesTarget(config);
  } catch (e) {
    fail(e.message);
  }
  if (names.length) fail('publish builds every guide (the whole site goes up at once): drop the names');
  device();
  pagesClone(target);
  for (const g of guides) await capture(g).catch((e) => fail(`${g.slug}: ${e.message}`));
  // A project site lives under /<repo>/; a custom domain (the clone's CNAME) or <owner>.github.io at the root.
  const base = pagesBase(target, { config, cname: existsSync(path.join(target.dir, 'CNAME')) });
  const { skipped } = await render(base);
  if (skipped.length) fail(`not publishing: ${skipped.length} guide(s) left out of the site (${skipped.map((s) => s.guide.slug).join(', ')})`);
  copySite(OUT, target.dir);
  const sha = run('git', ['-C', ROOT, 'rev-parse', '--short', 'HEAD']).stdout.trim();
  log(`the site is in ${target.dir} (${target.repo}), not pushed. Look at it (git -C ${target.dir} status), then publish it:`);
  for (const c of pushCommands(target.dir, sha, config.app.name)) console.log(`  ${c}`);
  log('GitHub Pages serves it a minute or two after the push.');
} else {
  fail(`unknown command "${cmd}": list | build | render | check | serve | publish`);
}
