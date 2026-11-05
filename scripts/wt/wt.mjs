#!/usr/bin/env node
// Worktree slots: one isolated, fast dev environment per git worktree. See .agents/skills/worktree/SKILL.md.
//
//   pnpm wt up [--android] [--no-ios] [--reset] [--no-storybook]   claim a slot, start everything, open the app
//   pnpm wt open [ios|android]                                      re-open the app on this slot's Metro
//   pnpm wt down [--destroy]                                        stop everything and release the slot
//   pnpm wt status                                                  every slot on this machine
//   pnpm wt build ios|android                                       populate the shared native build cache
//   pnpm wt fingerprint                                             print the native fingerprint
//   pnpm wt gc                                                      reclaim slots whose worktree is gone
//
// Slot k owns: Metro port 8100+k, simulator <slug>-wt-k (cloned from <slug>-golden, kept between sessions),
// emulator port 5554+2k (Pixel_9, -read-only, on demand, one running machine-wide), its own Supabase stack.
// Native builds: one per fingerprint at a time, at most two machine-wide (WT_NATIVE_BUILDS), at full speed.
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, openSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync, appendFileSync, cpSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { assertDockerResponsive } from '../lib/docker.mjs';
import { APP, CONFIG, ROOT, readEnv, regenerateEnv } from '../lib/env.mjs';

const HOME = APP.home;
const SLOTS = path.join(HOME, 'slots');
const LOCKS = path.join(HOME, 'locks');
const CACHE = path.join(HOME, 'build-cache');
const MOBILE = path.join(ROOT, 'apps/mobile');
const LOCAL = path.join(ROOT, '.wt');
const MAX_SLOTS = Number(process.env.WT_MAX_SLOTS ?? 4);
// One at a time: an emulator alone can take ~4-5 cores and heats the laptop with parallel agents.
const MAX_EMULATORS = 1;
const BUNDLE_ID = APP.bundleId;
const ANDROID_ID = APP.androidPackage;
const GOLDEN = `${APP.slug}-golden`;
const DEVICE_TYPE = 'com.apple.CoreSimulator.SimDeviceType.iPhone-17';
const AVD = process.env.WT_AVD ?? 'Pixel_9';
const ANDROID_HOME = process.env.ANDROID_HOME ?? path.join(os.homedir(), 'Library/Android/sdk');
const ADB = path.join(ANDROID_HOME, 'platform-tools/adb');
const EMULATOR = path.join(ANDROID_HOME, 'emulator/emulator');

const metroPort = (k) => 8100 + Number(k);
const emulatorPort = (k) => 5554 + 2 * Number(k);
const simName = (k) => `${APP.slug}-wt-${k}`;

// ---------- small helpers ----------
const args = process.argv.slice(2);
const cmd = args[0];
const flag = (name) => args.includes(`--${name}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (msg) => console.log(`\x1b[2m[wt]\x1b[0m ${msg}`);

function run(command, argv, opts = {}) {
  const r = spawnSync(command, argv, { encoding: 'utf8', ...opts });
  if (r.status !== 0 && !opts.allowFail) {
    throw new Error(`${command} ${argv.join(' ')} failed (${r.status}):\n${r.stderr || r.stdout}`);
  }
  return (r.stdout ?? '').trim();
}

/** Async spawn so Metro, the simulator and the emulator really progress in parallel. */
function runAsync(command, argv, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, argv, { stdio: opts.stdio ?? ['ignore', 'pipe', 'pipe'], ...opts });
    let out = '';
    let err = '';
    child.stdout?.on('data', (d) => (out += d));
    child.stderr?.on('data', (d) => (err += d));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0 || opts.allowFail) resolve(out.trim());
      else reject(new Error(`${command} ${argv.join(' ')} failed (${code}):\n${err || out}`));
    });
  });
}

const timings = [];
async function step(name, fn) {
  const t0 = Date.now();
  // A fresh worktree has no node_modules: install first (hardlinks from the store, ~10 s), or the fingerprint
  // step fails on a missing @expo/fingerprint after the stack has already started.
  if (!existsSync(path.join(ROOT, 'node_modules', '.modules.yaml'))) {
    await step('pnpm install (fresh worktree)', () => run('pnpm', ['install', '--frozen-lockfile'], { cwd: ROOT }));
  }
  const result = await fn();
  const s = (Date.now() - t0) / 1000;
  timings.push([name, s]);
  log(`${name} ${s.toFixed(1)}s`);
  return result;
}

// The laptop is shared by several agents: say so when it is already busy before booting devices on top.
function warnIfBusy() {
  const load5 = Number(spawnSync('sysctl', ['-n', 'vm.loadavg'], { encoding: 'utf8' }).stdout.trim().split(/\s+/)[2]);
  const cores = os.cpus().length;
  if (load5 > cores) log(`\x1b[33mthe machine is busy (5-min load ${load5} on ${cores} cores): batch device work, keep one emulator, \`pnpm wt down\` when idle\x1b[0m`);
}

function portListening(port) {
  return spawnSync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN'], { encoding: 'utf8' }).stdout.trim() !== '';
}

// ---------- locks (one native build per platform on this machine) ----------
// Native builds that may run at once machine-wide, at full speed. Two is the measured sweet spot on a 14-core laptop:
// background priority (taskpolicy -b) kept the machine cool but made a cold iOS build several times slower, and
// waiting agents cost more than the heat. WT_NATIVE_BUILDS overrides.
const NATIVE_BUILD_SLOTS = Math.max(1, Number(process.env.WT_NATIVE_BUILDS ?? 2));

/** Hold one of `slots` numbered locks: `<name>` when slots is 1, else `<name>-1` … `<name>-N`. */
async function withLock(name, fn, slots = 1) {
  mkdirSync(LOCKS, { recursive: true });
  const names = slots === 1 ? [name] : Array.from({ length: slots }, (_, i) => `${name}-${i + 1}`);
  let dir;
  let waited = false;
  for (;;) {
    for (const n of names) {
      const d = path.join(LOCKS, n);
      try {
        mkdirSync(d);
        writeFileSync(path.join(d, 'owner'), `${process.pid} ${ROOT}\n`);
        dir = d;
        break;
      } catch {
        const owner = existsSync(path.join(d, 'owner')) ? readFileSync(path.join(d, 'owner'), 'utf8').split(' ')[0] : '';
        if (owner && spawnSync('kill', ['-0', owner]).status !== 0) rmSync(d, { recursive: true, force: true }); // stale lock from a dead process
      }
    }
    if (dir) break;
    if (!waited) log(`waiting for a free ${name} slot (${slots} in use)…`);
    waited = true;
    await sleep(2000);
  }
  try {
    return await fn();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function waitForUnlocked(name) {
  const dir = path.join(LOCKS, name);
  for (;;) {
    if (!existsSync(dir)) return;
    // A lock left by a build killed mid-way would otherwise stall this wait forever.
    const owner = existsSync(path.join(dir, 'owner')) ? readFileSync(path.join(dir, 'owner'), 'utf8').split(' ')[0] : '';
    if (owner && spawnSync('kill', ['-0', owner]).status !== 0) {
      rmSync(dir, { recursive: true, force: true });
      return;
    }
    await sleep(2000);
  }
}

// ---------- slots ----------
function worktreePaths() {
  return run('git', ['worktree', 'list', '--porcelain'])
    .split('\n')
    .filter((l) => l.startsWith('worktree '))
    .map((l) => l.slice('worktree '.length));
}

function slotPath(k) {
  const f = path.join(SLOTS, String(k), 'path');
  return existsSync(f) ? readFileSync(f, 'utf8').trim() : null;
}

function isStale(k) {
  const p = slotPath(k);
  return !p || !existsSync(p);
}

function currentSlot() {
  const f = path.join(LOCAL, 'slot');
  if (!existsSync(f)) return null;
  const k = readFileSync(f, 'utf8').trim();
  return slotPath(k) === ROOT ? k : null;
}

function claimSlot() {
  const existing = currentSlot();
  if (existing) return existing;
  mkdirSync(SLOTS, { recursive: true });
  mkdirSync(LOCAL, { recursive: true });
  for (let k = 1; k <= MAX_SLOTS; k++) {
    const dir = path.join(SLOTS, String(k));
    if (existsSync(dir) && isStale(k)) rmSync(dir, { recursive: true, force: true });
    if (portListening(metroPort(k))) continue;
    try {
      mkdirSync(dir); // atomic claim
    } catch {
      continue;
    }
    writeFileSync(path.join(dir, 'path'), `${ROOT}\n`);
    writeFileSync(path.join(LOCAL, 'slot'), `${k}\n`);
    return String(k);
  }
  throw new Error(`no free slot (1..${MAX_SLOTS}). Run \`pnpm wt status\`, then \`pnpm wt down\` in an idle worktree or \`pnpm wt gc\`.`);
}

// ---------- fingerprint + shared native build cache ----------
async function fingerprint() {
  const req = createRequire(path.join(MOBILE, 'package.json'));
  const { createFingerprintAsync } = req('@expo/fingerprint');
  const fp = await createFingerprintAsync(MOBILE);
  return fp.hash;
}

// Same naming as expo/local-build-cache-provider with no --configuration/--variant ("unknown"), so a plain
// `expo run:ios` / `expo run:android` by a human hits the same entries.
const cacheEntry = (platform, hash) =>
  platform === 'ios' ? path.join(CACHE, `ios-${hash}-unknown.app`) : path.join(CACHE, `android-${hash}-unknown.apk`);

// ---------- iOS ----------
function simctlDevices() {
  const json = JSON.parse(run('xcrun', ['simctl', 'list', 'devices', '--json']));
  return Object.values(json.devices).flat();
}

function findSim(name) {
  return simctlDevices().find((d) => d.name === name && d.isAvailable);
}

function ensureGolden() {
  const golden = findSim(GOLDEN);
  if (golden) return golden.udid;
  const runtimes = JSON.parse(run('xcrun', ['simctl', 'list', 'runtimes', '--json'])).runtimes.filter(
    (r) => r.isAvailable && r.platform === 'iOS',
  );
  const runtime = process.env.WT_IOS_RUNTIME ?? runtimes.at(-1)?.identifier;
  if (!runtime) throw new Error('no iOS simulator runtime installed (Xcode → Settings → Components)');
  log(`creating golden simulator ${GOLDEN} (${runtime})`);
  return run('xcrun', ['simctl', 'create', GOLDEN, DEVICE_TYPE, runtime]);
}

function ensureSlotSim(k) {
  const existing = findSim(simName(k));
  if (existing) return existing.udid;
  const golden = ensureGolden();
  if (findSim(GOLDEN)?.state !== 'Shutdown') run('xcrun', ['simctl', 'shutdown', golden], { allowFail: true });
  log(`cloning ${GOLDEN} → ${simName(k)}`);
  return run('xcrun', ['simctl', 'clone', golden, simName(k)]);
}

async function bootSim(udid) {
  const d = simctlDevices().find((x) => x.udid === udid);
  if (d?.state !== 'Booted') await runAsync('xcrun', ['simctl', 'boot', udid], { allowFail: true });
  await runAsync('xcrun', ['simctl', 'bootstatus', udid, '-b']);
}

async function ensureIosApp(udid, hash, { force = false } = {}) {
  await waitForUnlocked(`ios-build-${hash}`);
  const entry = cacheEntry('ios', hash);
  if (existsSync(entry) && !force) {
    await runAsync('xcrun', ['simctl', 'install', udid, entry]);
    return 'cache hit';
  }
  return withLock(`ios-build-${hash}`, () => withLock('native-build', async () => {
    if (existsSync(entry) && !force) {
      await runAsync('xcrun', ['simctl', 'install', udid, entry]);
      return 'cache hit (after wait)';
    }
    log(`no cached iOS build for ${hash.slice(0, 12)}: building (expo run:ios), this takes minutes`);
    // `expo run:ios` only prebuilds when ios/ is missing: in a worktree that has built once, a changed splash, icon or
    // config plugin would build from the stale ios/ (and ship the old splash). Sync it first.
    await runAsync('npx', ['expo', 'prebuild', '--platform', 'ios', '--no-install'], { cwd: MOBILE, stdio: 'inherit' });
    // No --configuration: with `--configuration Debug` Expo CLI always starts Metro and never exits.
    await runAsync('npx', ['expo', 'run:ios', '--device', udid, '--no-bundler'], {
      cwd: MOBILE,
      stdio: 'inherit',
      env: { ...process.env, EXPO_PUBLIC_STORYBOOK: 'true' },
    });
    if (!existsSync(entry)) throw new Error(`build finished but ${entry} is missing (check buildCacheProvider in app.config.ts)`);
    return 'cache miss (built)';
  }, NATIVE_BUILD_SLOTS));
}

// ---------- Android ----------
function runningEmulators() {
  return run(ADB, ['devices'], { allowFail: true })
    .split('\n')
    .map((l) => l.split('\t')[0])
    .filter((s) => s.startsWith('emulator-'));
}

async function ensureEmulator(k) {
  const serial = `emulator-${emulatorPort(k)}`;
  let exited = null;
  if (!runningEmulators().includes(serial)) {
    if (runningEmulators().length >= MAX_EMULATORS) {
      throw new Error(`${MAX_EMULATORS} emulators already running (${runningEmulators().join(', ')}); another agent is using it; wait, or stop yours with \`pnpm wt down\``);
    }
    mkdirSync(LOCAL, { recursive: true });
    const out = openSync(path.join(LOCAL, 'emulator.log'), 'w');
    // Every instance -read-only so several instances of one AVD can run; they share the Quick Boot snapshot.
    const child = spawn(
      EMULATOR,
      ['-avd', AVD, '-read-only', '-port', String(emulatorPort(k)), '-no-window', '-no-audio', '-no-boot-anim', '-no-snapshot-save'],
      { detached: true, stdio: ['ignore', out, out] },
    );
    child.on('exit', (code) => (exited = code));
    child.unref();
  }
  for (let i = 0; i < 180; i++) {
    if (exited !== null) {
      const tail = readFileSync(path.join(LOCAL, 'emulator.log'), 'utf8').trim().split('\n').slice(-3).join('\n');
      throw new Error(`the emulator exited (${exited}):\n${tail}`);
    }
    if ((await runAsync(ADB, ['-s', serial, 'shell', 'getprop', 'sys.boot_completed'], { allowFail: true })) === '1') return serial;
    await sleep(1000);
  }
  throw new Error(`${serial} did not finish booting in 180 s; see .wt/emulator.log`);
}

async function buildAndroidApk(hash) {
  log(`no cached Android build for ${hash.slice(0, 12)}: prebuild + gradle assembleDebug, this takes minutes`);
  await runAsync('npx', ['expo', 'prebuild', '--platform', 'android', '--no-install'], { cwd: MOBILE, stdio: 'inherit' });
  await runAsync('./gradlew', ['app:assembleDebug', '-PreactNativeArchitectures=arm64-v8a'], {
    cwd: path.join(MOBILE, 'android'),
    stdio: 'inherit',
  });
  const apk = path.join(MOBILE, 'android/app/build/outputs/apk/debug/app-debug.apk');
  mkdirSync(CACHE, { recursive: true });
  const tmp = `${cacheEntry('android', hash)}.tmp-${process.pid}`;
  cpSync(apk, tmp);
  renameSync(tmp, cacheEntry('android', hash)); // atomic publish
}

async function ensureAndroidApp(serial, hash, { force = false } = {}) {
  await waitForUnlocked(`android-build-${hash}`);
  let how = 'cache hit';
  if (!existsSync(cacheEntry('android', hash)) || force) {
    how = await withLock(`android-build-${hash}`, () => withLock('native-build', async () => {
      if (existsSync(cacheEntry('android', hash)) && !force) return 'cache hit (after wait)';
      await buildAndroidApk(hash);
      return 'cache miss (built)';
    }, NATIVE_BUILD_SLOTS));
  }
  if (serial) await runAsync(ADB, ['-s', serial, 'install', '-r', cacheEntry('android', hash)]);
  return how;
}

// ---------- Metro ----------
/** The lockfile's hash: Metro resolves modules once, so a running Metro keeps serving the old dependency tree. */
function depsStamp() {
  const lock = path.join(ROOT, 'pnpm-lock.yaml');
  return existsSync(lock) ? createHash('sha256').update(readFileSync(lock)).digest('hex').slice(0, 16) : '';
}

async function startMetro(k) {
  const port = metroPort(k);
  const stampFile = path.join(LOCAL, 'metro.deps');
  if (portListening(port)) {
    // After a pull, rebase or `pnpm add`, a Metro started on the old tree fails with "Unable to resolve module" or
    // serves a stale copy: restart it when the lockfile changed since it started.
    const before = existsSync(stampFile) ? readFileSync(stampFile, 'utf8').trim() : '';
    if (before === depsStamp()) return 'already running';
    log('dependencies changed since Metro started: restarting it');
    stopMetro(k);
    for (let i = 0; i < 20 && portListening(port); i++) await sleep(250);
  }
  mkdirSync(LOCAL, { recursive: true });
  writeFileSync(stampFile, `${depsStamp()}\n`);
  const out = openSync(path.join(LOCAL, 'metro.log'), 'w');
  const child = spawn('npx', ['expo', 'start', '--dev-client', '--port', String(port)], {
    cwd: MOBILE,
    detached: true,
    stdio: ['ignore', out, out],
    env: {
      ...process.env,
      EXPO_PUBLIC_STORYBOOK: flag('no-storybook') ? 'false' : 'true',
      EXPO_NO_TELEMETRY: '1',
      STORYBOOK_DISABLE_TELEMETRY: '1',
    },
  });
  child.unref();
  writeFileSync(path.join(LOCAL, 'metro.pid'), `${child.pid}\n`);
  for (let i = 0; i < 120; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/status`);
      if ((await res.text()).includes('packager-status:running')) return 'started';
    } catch {
      // not listening yet
    }
    await sleep(500);
  }
  throw new Error(`Metro did not come up on ${port}; see .wt/metro.log`);
}

function stopMetro(k) {
  const pidFile = path.join(LOCAL, 'metro.pid');
  if (existsSync(pidFile)) {
    const pid = readFileSync(pidFile, 'utf8').trim();
    spawnSync('kill', ['--', `-${pid}`]); // the whole process group (npx → expo → workers)
    rmSync(pidFile, { force: true });
  }
  const pids = spawnSync('lsof', ['-t', `-iTCP:${metroPort(k)}`, '-sTCP:LISTEN'], { encoding: 'utf8' }).stdout.trim();
  for (const pid of pids.split('\n').filter(Boolean)) spawnSync('kill', [pid]);
}

/** Point the installed dev client at this slot's Metro. */
function devClientUrl(k) {
  // SDK 58 dev-client launch URL (the same one `expo run` opens).
  return `exp+${APP.slug}://?__expo_url=${encodeURIComponent(`http://127.0.0.1:${metroPort(k)}`)}&__expo_disable_onboarding=1&__expo_disable_fab=1`;
}

function openIos(k, udid) {
  // Hide the dev-menu floating button so screenshots are clean (shake or `agent-device` still opens the menu),
  // and skip the dev-menu onboarding sheet that a fresh simulator clone shows on first launch.
  for (const [key, value] of [
    ['EXDevMenuShowFloatingActionButton', 'NO'],
    ['EXDevMenuIsOnboardingFinished', 'YES'],
    ['EXDevMenuShowsAtLaunch', 'NO'],
  ]) {
    run('xcrun', ['simctl', 'spawn', udid, 'defaults', 'write', BUNDLE_ID, key, '-bool', value], { allowFail: true });
  }
  // `--initialUrl` is read by expo-dev-launcher at launch: no "Open in …?" prompt, unlike `simctl openurl`.
  run('xcrun', ['simctl', 'launch', '--terminate-running-process', udid, BUNDLE_ID, '--initialUrl', `http://127.0.0.1:${metroPort(k)}`]);
}

function openAndroid(k, serial) {
  const env = readEnv();
  run(ADB, ['-s', serial, 'reverse', `tcp:${metroPort(k)}`, `tcp:${metroPort(k)}`]);
  const apiPort = env.API_URL ? new URL(env.API_URL).port : null;
  if (apiPort) run(ADB, ['-s', serial, 'reverse', `tcp:${apiPort}`, `tcp:${apiPort}`]);
  run(ADB, ['-s', serial, 'shell', 'am', 'force-stop', ANDROID_ID], { allowFail: true });
  run(ADB, ['-s', serial, 'shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', `'${devClientUrl(k)}'`, ANDROID_ID]);
}

// ---------- commands ----------
async function up() {
  const t0 = Date.now();
  const k = await step('claim slot', () => claimSlot());
  log(`slot ${k} · Metro ${metroPort(k)} · simulator ${simName(k)} · emulator emulator-${emulatorPort(k)}`);
  const env = { SUPABASE_EXPERIMENTAL_STACK: '1' };

  await step('supabase stack start + .env.local', () => {
    assertDockerResponsive();
    run('supabase', ['stack', 'start', '--runtime', 'docker', '--output-format', 'text'], { cwd: ROOT, env: { ...process.env, ...env } });
    if (flag('reset')) run('supabase', ['db', 'reset', '--local', '--yes'], { cwd: ROOT, env: { ...process.env, ...env } });
    regenerateEnv({ k, metroPort: metroPort(k) });
  });

  const wantIos = !flag('no-ios');
  const wantAndroid = flag('android');
  if (wantAndroid && !(CONFIG.app.platforms ?? []).includes('android')) throw new Error('android is not in harness.config.json app.platforms');
  warnIfBusy();
  const hash = await step('native fingerprint', () => fingerprint());
  log(`fingerprint ${hash}`);

  // Metro, the iOS chain and the Android chain run in parallel.
  const metro = step('metro start', () => startMetro(k));
  const ios = wantIos
    ? (async () => {
        const udid = await step('simulator clone/boot', async () => {
          const id = ensureSlotSim(k);
          await bootSim(id);
          return id;
        });
        const cache = await step('ios app install', () => ensureIosApp(udid, hash));
        return { udid, cache };
      })()
    : Promise.resolve({});
  const android = wantAndroid
    ? (async () => {
        const serial = await step('emulator boot', () => ensureEmulator(k));
        const cache = await step('android app install', () => ensureAndroidApp(serial, hash));
        return { serial, cache };
      })()
    : Promise.resolve({});
  const [{ udid, cache: iosCache }, { serial, cache: androidCache }] = await Promise.all([ios, android, metro]);
  if (udid) await step('open app (ios)', () => openIos(k, udid));
  if (serial) await step('open app (android)', () => openAndroid(k, serial));

  const total = (Date.now() - t0) / 1000;
  const record = { at: new Date().toISOString(), root: ROOT, slot: k, total, iosCache, androidCache, steps: Object.fromEntries(timings) };
  mkdirSync(HOME, { recursive: true });
  appendFileSync(path.join(HOME, 'timings.jsonl'), `${JSON.stringify(record)}\n`);
  writeFileSync(
    path.join(LOCAL, 'state.json'),
    JSON.stringify({ slot: k, metroPort: metroPort(k), udid, serial, fingerprint: hash }, null, 2),
  );
  console.log(`\nwt up: slot ${k} ready in ${total.toFixed(1)}s`);
  if (udid) console.log(`  iOS      ${simName(k)} (${udid}) · native build: ${iosCache}`);
  if (serial) console.log(`  Android  ${serial} · native build: ${androidCache}`);
  console.log(`  Metro    http://127.0.0.1:${metroPort(k)} (log: .wt/metro.log)`);
  console.log(`  Supabase ${readEnv().API_URL} (env: .env.local, apps/mobile/.env.local)`);
  if (udid) console.log(`  Drive it: pnpm exec agent-device open ${BUNDLE_ID} --platform ios --udid ${udid} --session wt-${k} --metro-port ${metroPort(k)}`);
  if (serial) console.log(`  Drive it: pnpm exec agent-device open ${ANDROID_ID} --platform android --serial ${serial} --session wt-${k}-android --metro-port ${metroPort(k)}`);
}

function down() {
  const k = currentSlot();
  if (!k) {
    log('this worktree holds no slot');
    return;
  }
  stopMetro(k);
  const sim = findSim(simName(k));
  if (sim && sim.state === 'Booted') run('xcrun', ['simctl', 'shutdown', sim.udid], { allowFail: true });
  const serial = `emulator-${emulatorPort(k)}`;
  if (runningEmulators().includes(serial)) run(ADB, ['-s', serial, 'emu', 'kill'], { allowFail: true });
  const env = { ...process.env, SUPABASE_EXPERIMENTAL_STACK: '1' };
  if (flag('destroy')) {
    run('supabase', ['stack', 'destroy', '--yes'], { cwd: ROOT, env, allowFail: true });
    if (sim) run('xcrun', ['simctl', 'delete', sim.udid], { allowFail: true });
  } else {
    run('supabase', ['stack', 'stop'], { cwd: ROOT, env, allowFail: true });
  }
  rmSync(path.join(SLOTS, k), { recursive: true, force: true });
  rmSync(path.join(LOCAL, 'slot'), { force: true });
  rmSync(path.join(LOCAL, 'state.json'), { force: true });
  log(`slot ${k} released${flag('destroy') ? ' (simulator clone and stack destroyed)' : ' (simulator clone and stack data kept)'}`);
}

function status() {
  const slots = existsSync(SLOTS) ? readdirSync(SLOTS).sort() : [];
  const sims = simctlDevices();
  const emus = runningEmulators();
  console.log('slot  metro       simulator              emulator         worktree');
  for (const k of slots) {
    const p = slotPath(k) ?? '?';
    const sim = sims.find((d) => d.name === simName(k));
    const metro = portListening(metroPort(k)) ? `${metroPort(k)} up` : `${metroPort(k)} down`;
    const emu = emus.includes(`emulator-${emulatorPort(k)}`) ? `emulator-${emulatorPort(k)}` : '-';
    const stale = isStale(k) ? ' (stale: run pnpm wt gc)' : '';
    console.log(`${k.padEnd(5)} ${metro.padEnd(11)} ${(sim ? `${sim.name} ${sim.state}` : '-').padEnd(22)} ${emu.padEnd(16)} ${p}${stale}`);
  }
  if (slots.length === 0) console.log('(no slots claimed)');
  const cache = existsSync(CACHE) ? readdirSync(CACHE) : [];
  console.log(`\nnative build cache (${CACHE}): ${cache.length ? cache.join(', ') : 'empty'}`);
  const locks = existsSync(LOCKS) ? readdirSync(LOCKS) : [];
  if (locks.length) console.log(`locks held: ${locks.join(', ')}`);
}

function gc() {
  const slots = existsSync(SLOTS) ? readdirSync(SLOTS) : [];
  const live = new Set(worktreePaths());
  for (const k of slots) {
    const p = slotPath(k);
    if (!p || !live.has(p) || !existsSync(p)) {
      rmSync(path.join(SLOTS, k), { recursive: true, force: true });
      log(`reclaimed slot ${k} (${p ?? 'no path'})`);
    }
  }
  run('xcrun', ['simctl', 'delete', 'unavailable'], { allowFail: true });
}

async function main() {
  switch (cmd) {
    case 'up':
      return up();
    case 'down':
      return down();
    case 'status':
      return status();
    case 'gc':
      return gc();
    case 'fingerprint':
      return console.log(await fingerprint());
    case 'open': {
      const k = currentSlot();
      if (!k) throw new Error('no slot: run `pnpm wt up` first');
      if (args[1] === 'android') return openAndroid(k, `emulator-${emulatorPort(k)}`);
      return openIos(k, findSim(simName(k)).udid);
    }
    case 'build': {
      const hash = await fingerprint();
      if (args[1] === 'android') return console.log(await ensureAndroidApp(null, hash, { force: flag('force') }));
      const k = claimSlot();
      const udid = ensureSlotSim(k);
      await bootSim(udid);
      return console.log(await ensureIosApp(udid, hash, { force: flag('force') }));
    }
    default:
      console.log(readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 12).join('\n').replaceAll('// ', ''));
      process.exit(cmd ? 2 : 0);
  }
}

main().catch((e) => {
  console.error(`\x1b[31m[wt] ${e.message}\x1b[0m`);
  process.exit(1);
});
