#!/usr/bin/env node
// Apply harness.config.json to the repo: the one place a project's identity and brand starting point live.
//
//   pnpm harness:apply            write the config into the files below, then record it in .harness/applied.json
//   pnpm harness:apply --check    exit 1 if anything is out of date (CI-safe, writes nothing)
//
// What reads the config directly at run time (nothing to apply): apps/mobile/app.config.ts (name, slug, scheme,
// bundle id, package, platforms, default appearance), every script in scripts/ (scripts/lib/env.mjs: simulator
// names, ~/.<slug>, deep links, Maestro's APP_ID/SCHEME).
// What this script writes:
//   - packages/ui/src/theme.css   the colour and radius tokens between the `harness:tokens` markers (light + dark)
//   - apps/mobile/assets/*.png    placeholder icons from the brand colours (only icons it generated itself)
//   - the identity in text files  the previously applied name, slug, scheme, bundle id and GitHub repo, replaced
//                                 by the new ones in package.json, supabase/config.toml and the docs
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { CONFIG, ROOT } from '../lib/env.mjs';
import { encodeIcon } from './png.mjs';

const CHECK = process.argv.includes('--check');
const APPLIED = path.join(ROOT, '.harness/applied.json');
const changed = [];

// ─── Validate ─────────────────────────────────────────────────────────────────────────────────────
const { app, brand } = CONFIG;
const problems = [];
if (!app?.name) problems.push('app.name is required');
if (!/^[a-z][a-z0-9-]*$/.test(app?.slug ?? '')) problems.push('app.slug: lowercase letters, digits and dashes, starting with a letter');
if (!/^[a-z][a-z0-9+.-]*$/.test(app?.scheme ?? '')) problems.push('app.scheme: a lowercase URL scheme (letters, digits, + . -)');
for (const k of ['bundleId', 'androidPackage']) {
  if (app?.[k] && !/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/.test(app[k])) problems.push(`app.${k}: reverse-DNS, e.g. com.company.app`);
}
if (!(app?.platforms ?? []).length || app.platforms.some((p) => !['ios', 'android'].includes(p))) problems.push('app.platforms: ["ios"], ["android"] or both');
if (!['dark', 'light', 'system'].includes(brand?.defaultAppearance)) problems.push('brand.defaultAppearance: dark, light or system');
const TOKENS = ['background', 'surface', 'surface-elevated', 'foreground', 'muted-foreground', 'hairline', 'control', 'primary', 'primary-foreground', 'accent', 'accent-foreground', 'danger', 'danger-soft'];
for (const theme of ['light', 'dark']) {
  for (const t of TOKENS) if (!/^#[0-9a-f]{6}$/i.test(brand?.[theme]?.[t] ?? '')) problems.push(`brand.${theme}.${t}: #rrggbb`);
}
if (problems.length) {
  console.error(`harness.config.json:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}

function write(rel, next) {
  const file = path.join(ROOT, rel);
  const prev = existsSync(file) ? readFileSync(file, 'utf8') : null;
  if (prev === next) return;
  changed.push(rel);
  if (!CHECK) {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, next);
  }
}

// ─── 1. Tokens ────────────────────────────────────────────────────────────────────────────────────
// Semantic names only; components use bg-surface, text-muted-foreground... The shadcn/react-native-reusables
// aliases (card, secondary, muted, border, input, ring, destructive) are derived so copied-in components work.
function themeBlock(t) {
  const lines = [
    ...TOKENS.map((k) => `--color-${k}: ${t[k]};`),
    '/* Scrims and night grounds: the same in both themes (photos, dialogs, forced-dark moments) */',
    '--color-ink: #050608;',
    '--color-on-ink: #f5f5f4;',
    '/* shadcn / react-native-reusables aliases (derived) */',
    `--color-card: ${t.surface};`,
    `--color-card-foreground: ${t.foreground};`,
    `--color-secondary: ${t.surface};`,
    `--color-secondary-foreground: ${t.foreground};`,
    `--color-muted: ${t.surface};`,
    `--color-accent-surface: ${t['surface-elevated']};`,
    `--color-destructive: ${t.danger};`,
    `--color-border: ${t.hairline};`,
    `--color-input: ${t.control};`,
    `--color-ring: ${t.primary};`,
  ];
  return lines.map((l) => `      ${l}`).join('\n');
}
const r = brand.radius ?? {};
const tokens = `/* harness:tokens:start (written by \`pnpm harness:apply\` from harness.config.json; edit the config, not this block) */
@theme {
  --radius-sm: ${Math.round((r.ui ?? 10) * 0.6)}px;
  --radius-md: ${r.ui ?? 10}px;
  --radius-lg: ${Math.round((r.ui ?? 10) * 1.4)}px;
  --radius-xl: ${Math.round((r.ui ?? 10) * 1.8)}px;
  /* Physical objects (cards that stand for a thing, photos) and sheets. */
  --radius-object: ${r.object ?? 16}px;
  --radius-sheet: ${r.sheet ?? 22}px;
}

@layer theme {
  :root {
    @variant light {
${themeBlock(brand.light)}
    }

    @variant dark {
${themeBlock(brand.dark)}
    }
  }
}
/* harness:tokens:end */`;
const themePath = 'packages/ui/src/theme.css';
const theme = readFileSync(path.join(ROOT, themePath), 'utf8');
const marked = /\/\* harness:tokens:start[\s\S]*?harness:tokens:end \*\//;
if (!marked.test(theme)) {
  console.error(`${themePath}: the harness:tokens markers are missing; restore them to let the config manage the tokens`);
  process.exit(1);
}
write(themePath, theme.replace(marked, tokens));

// ─── 2. Placeholder icons ─────────────────────────────────────────────────────────────────────────
// Only files this script generated before (their hash is in applied.json) are replaced: real artwork is kept.
const prevApplied = existsSync(APPLIED) ? JSON.parse(readFileSync(APPLIED, 'utf8')) : {};
const sha = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');
const ICONS = {
  'apps/mobile/assets/icon.png': { size: 1024, background: brand.light.primary, discColor: brand.light['primary-foreground'], disc: 0.42 },
  'apps/mobile/assets/splash-icon.png': { size: 512, background: null, discColor: brand.dark.primary, disc: 0.8 },
  'apps/mobile/assets/android-icon-foreground.png': { size: 432, background: null, discColor: brand.light['primary-foreground'], disc: 0.3 },
  'apps/mobile/assets/android-icon-background.png': { size: 432, background: brand.light.primary },
  'apps/mobile/assets/android-icon-monochrome.png': { size: 432, background: null, discColor: '#ffffff', disc: 0.3 },
};
const iconHashes = {};
for (const [rel, spec] of Object.entries(ICONS)) {
  const file = path.join(ROOT, rel);
  const ours = !existsSync(file) || prevApplied.icons?.[rel] === sha(file);
  if (!ours) {
    iconHashes[rel] = prevApplied.icons?.[rel];
    continue;
  }
  const next = encodeIcon(spec);
  iconHashes[rel] = createHash('sha256').update(next).digest('hex');
  if (existsSync(file) && sha(file) === iconHashes[rel]) continue;
  changed.push(rel);
  if (!CHECK) {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, next);
  }
}

// ─── 3. Identity in text files ────────────────────────────────────────────────────────────────────
const identity = {
  name: app.name,
  slug: app.slug,
  scheme: app.scheme,
  bundleId: app.bundleId,
  androidPackage: app.androidPackage ?? app.bundleId,
  repo: CONFIG.github?.repo ?? '',
};
const before = prevApplied.identity;
const TEXT_FILES = ['package.json', 'README.md', 'AGENTS.md', 'GLOSSARY.md', 'supabase/config.toml', '.github/pull_request_template.md'];
function* docs(dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) yield* docs(p);
    else if (name.endsWith('.md')) yield path.relative(ROOT, p);
  }
}
if (before) {
  // Longest first, so "com.example.acme" is replaced before "acme". Scheme only as "<scheme>://".
  const pairs = [
    [before.repo, identity.repo],
    [before.bundleId, identity.bundleId],
    [before.androidPackage, identity.androidPackage],
    [`${before.scheme}://`, `${identity.scheme}://`],
    [before.name, identity.name],
    [before.slug, identity.slug],
  ].filter(([a, b]) => a && a !== b);
  if (pairs.length) {
    for (const rel of [...TEXT_FILES, ...docs(path.join(ROOT, 'docs')), ...docs(path.join(ROOT, '.agents/skills'))]) {
      const file = path.join(ROOT, rel);
      if (!existsSync(file)) continue;
      let text = readFileSync(file, 'utf8');
      const tokens = new Map();
      // Two passes through unique tokens, so a new value that contains an old one is never replaced twice.
      pairs.forEach(([a], i) => {
        const token = `\u0000harness${i}\u0000`;
        tokens.set(token, pairs[i][1]);
        text = text.split(a).join(token);
      });
      for (const [token, value] of tokens) text = text.split(token).join(value);
      write(rel, text);
    }
  }
}

// ─── Record ───────────────────────────────────────────────────────────────────────────────────────
const applied = `${JSON.stringify({ identity, icons: iconHashes }, null, 2)}\n`;
write('.harness/applied.json', applied);

if (CHECK) {
  if (changed.length) {
    console.error(`harness:apply would change:\n  ${changed.join('\n  ')}\nRun \`pnpm harness:apply\`.`);
    process.exit(1);
  }
  console.log('harness config: applied');
} else {
  console.log(changed.length ? `harness:apply wrote:\n  ${changed.join('\n  ')}` : 'harness:apply: nothing to change');
  if (changed.some((f) => f.endsWith('.png'))) console.log('Icons changed: a native asset. `pnpm wt up` rebuilds the dev client.');
}
