#!/usr/bin/env node
// The release pipeline's steps (docs/release.md), run by .github/workflows/release.yml and staging.yml.
// Every step takes --dry-run: it prints what it would run and touches neither EAS nor Supabase.
//
//   pnpm release plan [--dry-run]            what a release of HEAD ships: OTA update or store build, per platform
//   pnpm release staging-check [--dry-run]   refuse unless staging has applied every migration of HEAD
//   pnpm release deploy-backend [--dry-run] [--skip-if-unconfigured]
//                                            migrations and Edge Functions to the project in SUPABASE_PROJECT_REF
//   pnpm release ship [--dry-run]            run the plan's EAS commands, then tag v<version> with its notes
//
// Without EXPO_TOKEN, `plan` computes the fingerprints locally (no EAS environment variables) and can't see earlier
// builds, so it reports "store build": good enough to read the decision, not to act on it.
import { execFileSync, spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PLATFORMS,
  appCommands,
  decide,
  deployableFunctions,
  migrationVersions,
  missingOnStaging,
  parseMigrationList,
  releaseNotes,
  supabaseDeployCommands,
  tagCommand,
} from './release/plan.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP = path.join(ROOT, 'apps/mobile');
const TMP = path.join(ROOT, '.wt/tmp');
const PLAN_FILE = path.join(TMP, 'release-plan.json');
const NOTES_FILE = path.join(TMP, 'release-notes.md');

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith('--')));
const [cmd] = argv.filter((a) => !a.startsWith('--'));
const dryRun = flags.has('--dry-run') || process.env.DRY_RUN === 'true';
const SUPABASE_SECRETS = ['SUPABASE_ACCESS_TOKEN', 'SUPABASE_PROJECT_REF', 'SUPABASE_DB_PASSWORD'];

function log(line = '') {
  console.log(line);
}

/** Append to the GitHub job summary (no-op locally). */
function summary(markdown) {
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
}

function output(name, value) {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

function fail(message) {
  console.error(`::error::${message}`);
  process.exit(1);
}

/** Run a shell command, streaming its output; exits on failure. */
function sh(command, cwd = ROOT) {
  log(`$ ${command}`);
  const r = spawnSync('bash', ['-c', command], { cwd, stdio: 'inherit', env: process.env });
  if (r.status !== 0) fail(`Failed (${r.status}): ${command}`);
}

/** Run a command and return its stdout. */
function capture(file, args, cwd = ROOT) {
  return execFileSync(file, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 64 * 1024 * 1024 });
}

const appVersion = () => JSON.parse(readFileSync(path.join(APP, 'package.json'), 'utf8')).version;
const changelog = () => (existsSync(path.join(APP, 'CHANGELOG.md')) ? readFileSync(path.join(APP, 'CHANGELOG.md'), 'utf8') : '');
const head = () => capture('git', ['rev-parse', 'HEAD']).trim();
const functions = () =>
  deployableFunctions(
    readdirSync(path.join(ROOT, 'supabase/functions'), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name),
  );
const releaseMigrations = () => migrationVersions(readdirSync(path.join(ROOT, 'supabase/migrations')));

/** The commit a remote tag points at, or null. */
function tagCommit(tag) {
  const r = spawnSync('git', ['ls-remote', '--tags', 'origin', `refs/tags/${tag}`, `refs/tags/${tag}^{}`], { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0) return null;
  const lines = r.stdout.trim().split('\n').filter(Boolean);
  const peeled = lines.find((l) => l.endsWith('^{}')) ?? lines[0];
  return peeled ? peeled.split(/\s+/)[0] : null;
}

/** The native fingerprint EAS will compute for a production build of HEAD (with EAS's production variables). */
function fingerprint(platform, viaEas) {
  const local = `npx expo-updates fingerprint:generate --platform ${platform}`;
  const out = viaEas ? capture('eas', ['env:exec', '--non-interactive', 'production', local], APP) : capture('npx', local.split(' ').slice(1), APP);
  const json = out.slice(out.indexOf('{'));
  const hash = JSON.parse(json).hash;
  if (typeof hash !== 'string' || !hash) fail(`No ${platform} fingerprint in: ${out.slice(0, 200)}`);
  return hash;
}

/** EAS production builds of this fingerprint (any status; decide() keeps the live ones). */
function buildsFor(platform, hash) {
  const out = capture(
    'eas',
    ['build:list', '--platform', platform, '--buildProfile', 'production', '--runtimeVersion', hash, '--limit', '5', '--json', '--non-interactive'],
    APP,
  );
  return JSON.parse(out.slice(out.indexOf('[')));
}

function printPlan(d) {
  const lines = [];
  lines.push(`Release ${d.tag} of ${d.commit.slice(0, 7)}${dryRun ? ' (dry run: nothing is deployed, built or tagged)' : ''}`);
  if (d.action === 'nothing') lines.push(`${d.tag} already points at this commit: nothing to do.`);
  for (const p of PLATFORMS) {
    const x = d.platforms[p];
    const why =
      x.ship === 'update' ? `production build ${x.build} has this fingerprint` : x.known ? 'no production build has this fingerprint' : 'EAS not asked';
    lines.push(`  ${p.padEnd(8)} ${x.ship === 'update' ? 'OTA update ' : 'store build'}  fingerprint ${x.fingerprint.slice(0, 12)}…  (${why})`);
  }
  lines.push(`  message  ${d.message}`);
  for (const w of d.warnings) lines.push(`  note     ${w}`);
  for (const b of d.blockers) lines.push(`  BLOCKED  ${b}`);
  lines.push('');
  lines.push('Commands, in order:');
  lines.push('  # 1. staging has every migration of this release (STAGING_* secrets)');
  lines.push('  pnpm release staging-check   # supabase link + supabase migration list --linked, compared with supabase/migrations');
  lines.push('  # 2. the production backend (PRODUCTION_* secrets)');
  for (const c of supabaseDeployCommands(functions())) lines.push(`  ${c}`);
  lines.push('  # 3. the app (EAS builds run on Expo’s servers)');
  for (const c of appCommands(d)) lines.push(`  ${c}`);
  lines.push('  # 4. the tag and its release notes');
  if (d.action === 'release') lines.push(`  ${tagCommand(d)}`);
  const text = lines.join('\n');
  log(text);
  summary(`### ${dryRun ? 'Dry run: ' : ''}release ${d.tag}\n\n\`\`\`\n${text}\n\`\`\``);
}

function plan() {
  const viaEas = Boolean(process.env.EXPO_TOKEN);
  const version = appVersion();
  const notes = releaseNotes(changelog(), version);
  const fingerprints = /** @type {Record<'ios'|'android', string>} */ ({});
  const builds = /** @type {Record<'ios'|'android', any>} */ ({});
  for (const p of PLATFORMS) {
    fingerprints[p] = fingerprint(p, viaEas);
    builds[p] = viaEas ? buildsFor(p, fingerprints[p]) : undefined;
  }
  const easJson = JSON.parse(readFileSync(path.join(APP, 'eas.json'), 'utf8'));
  const d = decide({
    version,
    commit: head(),
    tagCommit: tagCommit(`v${version}`),
    fingerprints,
    builds,
    notes,
    ascAppId: easJson.submit?.production?.ios?.ascAppId,
  });
  mkdirSync(TMP, { recursive: true });
  writeFileSync(PLAN_FILE, JSON.stringify({ ...d, notes }, null, 2));
  printPlan(d);
  output('dry_run', String(dryRun));
  output('action', d.action);
  output('tag', d.tag);
  output('blocked', d.blockers.length > 0 ? 'true' : 'false');
  output('plan', JSON.stringify({ ...d, notes }));
  if (d.blockers.length > 0 && !dryRun) fail(`Release blocked:\n${d.blockers.join('\n')}`);
}

function missingSupabaseSecrets() {
  return SUPABASE_SECRETS.filter((k) => !process.env[k]);
}

function stagingCheck() {
  const versions = releaseMigrations();
  if (dryRun) {
    log(`Would check that staging has these ${versions.length} migrations (last ${versions.at(-1)}):`);
    log('$ supabase link --project-ref "$SUPABASE_PROJECT_REF"\n$ supabase migration list --linked');
    return;
  }
  const missing = missingSupabaseSecrets();
  if (missing.length > 0) fail(`The "staging" environment lacks ${missing.join(', ')}: can't confirm staging has this release's migrations (docs/release.md, "Setup").`);
  sh('supabase link --project-ref "$SUPABASE_PROJECT_REF"');
  const r = spawnSync('supabase', ['migration', 'list', '--linked'], { cwd: ROOT, encoding: 'utf8', env: process.env });
  const text = `${r.stdout}\n${r.stderr}`;
  log(text);
  if (r.status !== 0) fail('supabase migration list failed.');
  const { remote } = parseMigrationList(text);
  if (remote.size === 0) fail('Read no migrations from staging: refusing to release blind.');
  const gap = missingOnStaging(versions, remote);
  if (gap.length > 0) {
    fail(`Staging hasn't applied ${gap.join(', ')}. Let staging.yml deploy main (or re-run it), check staging, then release again.`);
  }
  log(`Staging has all ${versions.length} migrations of this release.`);
  summary(`Staging has all ${versions.length} migrations of this release.`);
}

function deployBackend() {
  const commands = supabaseDeployCommands(functions());
  if (dryRun) {
    log('Would run:');
    for (const c of commands) log(`$ ${c}`);
    return;
  }
  const missing = missingSupabaseSecrets();
  if (missing.length > 0) {
    const message = `This workflow lacks ${missing.join(', ')} (docs/release.md, "Setup").`;
    if (flags.has('--skip-if-unconfigured')) {
      log(`::notice::${message} Skipped: nothing was deployed.`);
      summary(`Skipped: ${message}`);
      return;
    }
    fail(message);
  }
  for (const c of commands) sh(c);
  summary(`Deployed ${releaseMigrations().length} migrations and ${functions().length} Edge Functions to ${process.env.SUPABASE_PROJECT_REF}.`);
}

function ship() {
  const raw = process.env.RELEASE_PLAN || (existsSync(PLAN_FILE) ? readFileSync(PLAN_FILE, 'utf8') : '');
  if (!raw) fail('No plan: run `pnpm release plan` first (or pass RELEASE_PLAN).');
  const d = JSON.parse(raw);
  if (d.commit !== head()) fail(`The plan is for ${d.commit.slice(0, 7)}, but HEAD is ${head().slice(0, 7)}.`);
  if (d.blockers.length > 0) {
    if (!dryRun) fail(`Release blocked:\n${d.blockers.join('\n')}`);
    log(`A real release would stop here:\n${d.blockers.join('\n')}\n`);
  }
  if (d.action !== 'release') return log(`${d.tag} is already released: nothing to ship.`);
  const commands = appCommands(d);
  mkdirSync(TMP, { recursive: true });
  writeFileSync(NOTES_FILE, d.notes ?? d.tag);
  if (dryRun) {
    log('Would run:');
    for (const c of [...commands, tagCommand(d)]) log(`$ ${c}`);
    return;
  }
  if (!process.env.EXPO_TOKEN) fail('EXPO_TOKEN is missing (docs/release.md, "Setup").');
  for (const c of commands) sh(c, APP);
  sh(tagCommand(d));
  summary(`Shipped ${d.tag}: ${d.build.length ? `store build (${d.build.join(', ')}) ` : ''}${d.update.length ? `OTA update (${d.update.join(', ')})` : ''}`);
}

const commands = { plan, 'staging-check': stagingCheck, 'deploy-backend': deployBackend, ship };
if (!commands[cmd]) {
  console.error(`Usage: pnpm release <${Object.keys(commands).join('|')}> [--dry-run]`);
  process.exit(cmd ? 1 : 0);
}
commands[cmd]();
