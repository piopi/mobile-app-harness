#!/usr/bin/env node
// Client demo videos, recorded on this worktree's slot. Needs `pnpm wt up` (and `--android`) and ffmpeg.
//
//   pnpm demo prep [--android] [--light]           relaunch the app clean (no dev tools button), set the theme
//   ...navigate to the first frame off camera...
//   pnpm demo start <name> [--android] [--light]   clean status bar, start recording (agent-device, taps shown)
//   ...drive the app with agent-device, step by step...
//   pnpm demo stop                                stop, cut the dead time, write demos-out/<name>-<platform>-<theme>.mp4
//
//   pnpm demo run <name> [--android] [--light]     replay a saved demo: apps/mobile/.maestro/demos/<name>/
//                                                 (setup.yaml off camera, record.yaml on camera, demo.json)
//   pnpm demo                                     list saved demos
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { APP, CONFIG, maestroBin, maestroEnv, readEnv, readSlotState, ROOT } from './lib/env.mjs';

const DEMOS = path.join(ROOT, 'apps/mobile/.maestro/demos');
const OUT = path.join(ROOT, 'demos-out');
const PENDING = path.join(ROOT, '.wt/demo.json');
/** Longest a still frame may stay on screen in the final cut, in seconds: enough to read, never dead air. */
const MAX_STILL = 1.4;

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith('--')));
const [cmd, name] = argv.filter((a) => !a.startsWith('--'));
const android = flags.has('--android');
// The app's default appearance (harness.config.json brand.defaultAppearance) unless --light / --dark says otherwise.
const DEFAULT_THEME = CONFIG.brand?.defaultAppearance === 'light' ? 'light' : 'dark';
const theme = flags.has('--light') ? 'light' : flags.has('--dark') ? 'dark' : DEFAULT_THEME;

const log = (msg) => console.log(`\x1b[2m[demo]\x1b[0m ${msg}`);
const run = (bin, args, opts = {}) => {
  const r = spawnSync(bin, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts });
  if (r.status !== 0 && !opts.allowFail) throw new Error(`${bin} ${args.join(' ')} failed\n${r.stdout ?? ''}${r.stderr ?? ''}`);
  return r;
};
const savedDemos = () =>
  existsSync(DEMOS) ? readdirSync(DEMOS).filter((d) => !d.startsWith('_') && statSync(path.join(DEMOS, d)).isDirectory()) : [];
const metaOf = (d) => {
  const f = path.join(DEMOS, d, 'demo.json');
  return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : {};
};

if (!cmd) {
  console.log('pnpm demo prep | start <name> | stop | run <saved>   [--android] [--light]\n\nSaved demos:');
  for (const d of savedDemos()) console.log(`  ${d.padEnd(20)} ${metaOf(d).title ?? ''}`);
  process.exit(0);
}

if (run('ffmpeg', ['-version'], { allowFail: true }).status !== 0) fail('ffmpeg is missing: brew install ffmpeg');
const slot = readSlotState();
const adb = path.join(process.env.ANDROID_HOME ?? path.join(os.homedir(), 'Library/Android/sdk'), 'platform-tools/adb');
const agentDevice = path.join(ROOT, 'node_modules/.bin/agent-device');

function fail(msg) {
  console.error(msg);
  process.exit(1);
}
function deviceFor(isAndroid) {
  const d = isAndroid ? slot.serial : slot.udid;
  if (!d) fail(`no ${isAndroid ? 'Android emulator' : 'iOS simulator'} for this slot: run \`pnpm wt up${isAndroid ? ' --android' : ''}\``);
  return d;
}
const sessionFor = (isAndroid) => `wt-${slot.slot}${isAndroid ? '-android' : ''}`;

// The status bar every demo shows: 9:41, full battery, full signal, no notifications.
function cleanStatusBar(isAndroid, device) {
  if (!isAndroid) {
    run('xcrun', ['simctl', 'status_bar', device, 'override', '--time', '9:41', '--dataNetwork', 'wifi', '--wifiMode', 'active', '--wifiBars', '3', '--cellularMode', 'active', '--cellularBars', '4', '--batteryState', 'charged', '--batteryLevel', '100']);
    return;
  }
  const demo = (...extras) => run(adb, ['-s', device, 'shell', 'am', 'broadcast', '-a', 'com.android.systemui.demo', ...extras]);
  run(adb, ['-s', device, 'shell', 'settings', 'put', 'global', 'sysui_demo_allowed', '1']);
  demo('-e', 'command', 'enter');
  demo('-e', 'command', 'clock', '-e', 'hhmm', '0941');
  demo('-e', 'command', 'battery', '-e', 'level', '100', '-e', 'plugged', 'false');
  demo('-e', 'command', 'network', '-e', 'wifi', 'show', '-e', 'level', '4');
  demo('-e', 'command', 'network', '-e', 'mobile', 'hide');
  demo('-e', 'command', 'notifications', '-e', 'visible', 'false');
}
function restoreStatusBar(isAndroid, device) {
  if (!isAndroid) run('xcrun', ['simctl', 'status_bar', device, 'clear'], { allowFail: true });
  else run(adb, ['-s', device, 'shell', 'am', 'broadcast', '-a', 'com.android.systemui.demo', '-e', 'command', 'exit'], { allowFail: true });
}

/**
 * The final cut: every still stretch longer than MAX_STILL (the agent thinking, a slow load) is cut down to
 * MAX_STILL, then re-encoded as H.264 / yuv420p / faststart so it plays everywhere a client opens it.
 */
function finalCut(raw, out) {
  // Recorders write frames only when the screen changes, so a still at the very end has no frames to detect.
  // Normalise to a constant 30 fps first; then every still, the trailing one included, is measurable.
  const cfr = raw.replace(/\.raw\.mp4$/, '.cfr.mp4');
  run('ffmpeg', ['-hide_banner', '-y', '-i', raw, '-an', '-vf', 'fps=30', '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '12', cfr]);
  const seconds = (f) => Number(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).stdout.trim());
  const probe = run('ffmpeg', ['-hide_banner', '-i', cfr, '-vf', `freezedetect=n=0.002:d=${MAX_STILL}`, '-map', '0:v', '-f', 'null', '-'], { allowFail: true });
  const starts = [...probe.stderr.matchAll(/freeze_start: ([\d.]+)/g)].map((m) => Number(m[1]));
  const ends = [...probe.stderr.matchAll(/freeze_end: ([\d.]+)/g)].map((m) => Number(m[1]));
  const duration = seconds(cfr);
  // Keep the first moments of each still, and the last half second before a change so a tap isn't jarring.
  const cuts = starts
    .map((s, i) => [s + MAX_STILL - 0.5, (ends[i] ?? duration) - 0.5])
    .filter(([a, b]) => b - a > 0.1);
  const select = cuts.length ? `select='not(${cuts.map(([a, b]) => `between(t,${a.toFixed(3)},${b.toFixed(3)})`).join('+')})',` : '';
  run('ffmpeg', ['-hide_banner', '-y', '-i', cfr, '-an', '-vf', `${select}setpts=N/30/TB`, '-c:v', 'libx264', '-crf', '20', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]);
  rmSync(cfr, { force: true });
  log(`cut ${cuts.length} still stretch(es): ${duration.toFixed(1)}s → ${seconds(out).toFixed(1)}s`);
}

function finish(raw, out, isAndroid, device) {
  restoreStatusBar(isAndroid, device);
  finalCut(raw, out);
  rmSync(raw, { force: true });
  const sheet = out.replace(/\.mp4$/, '.sheet.png');
  run(agentDevice, ['record', 'contact-sheet', out, '--out', sheet], { allowFail: true });
  log(`video: ${out}`);
  log(`review sheet (look at it before you share the video): ${sheet}`);
}

const outFor = (n, isAndroid, t) => path.join(OUT, `${n}-${isAndroid ? 'android' : 'ios'}-${t}.mp4`);

if (cmd === 'prep') {
  // The same launch `pnpm wt up` does, which hides the dev tools button; a plain relaunch would show it.
  const device = deviceFor(android);
  const metro = `http://127.0.0.1:${slot.metroPort}`;
  if (android) {
    const url = `exp+${APP.slug}://?__expo_url=${encodeURIComponent(metro)}&__expo_disable_onboarding=1&__expo_disable_fab=1`;
    run(adb, ['-s', device, 'shell', 'am', 'force-stop', APP.androidPackage], { allowFail: true });
    run(adb, ['-s', device, 'shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', `'${url}'`, APP.androidPackage]);
  } else {
    run('xcrun', ['simctl', 'launch', '--terminate-running-process', device, APP.bundleId, '--initialUrl', metro]);
  }
  await new Promise((r) => setTimeout(r, 6000)); // let the bundle load before the theme link lands
  run('node', [path.join(ROOT, 'scripts/link.mjs'), '--agent', 'theme', JSON.stringify({ theme }), ...(android ? ['--android'] : [])], { stdio: 'inherit' });
  log(`app relaunched clean in ${theme}; navigate to the first frame, then \`pnpm demo start <name>${android ? ' --android' : ''}\``);
} else if (cmd === 'start') {
  if (!name) fail('usage: pnpm demo start <name> [--android] [--light]');
  if (existsSync(PENDING)) fail('a recording is already running on this slot: `pnpm demo stop` first');
  const device = deviceFor(android);
  mkdirSync(OUT, { recursive: true });
  const out = outFor(name, android, theme);
  const raw = out.replace(/\.mp4$/, '.raw.mp4');
  cleanStatusBar(android, device);
  run(path.join(ROOT, 'node_modules/.bin/agent-device'), ['record', 'start', raw, '--session', sessionFor(android), '--quality', 'high'], { stdio: 'inherit' });
  writeFileSync(PENDING, JSON.stringify({ name, android, theme, raw, out }));
  log(`recording ${path.relative(ROOT, out)}; drive with --session ${sessionFor(android)}, then \`pnpm demo stop\``);
} else if (cmd === 'stop') {
  if (!existsSync(PENDING)) fail('no recording running on this slot');
  const p = JSON.parse(readFileSync(PENDING, 'utf8'));
  rmSync(PENDING);
  run(agentDevice, ['record', 'stop', '--session', sessionFor(p.android)], { stdio: 'inherit' });
  finish(p.raw, p.out, p.android, deviceFor(p.android));
} else if (cmd === 'run') {
  if (!savedDemos().includes(name)) fail(`no saved demo "${name}" (have: ${savedDemos().join(', ') || 'none'})`);
  const device = deviceFor(android);
  const meta = metaOf(name);
  mkdirSync(OUT, { recursive: true });
  const out = outFor(name, android, theme);
  const raw = out.replace(/\.mp4$/, '.raw.mp4');
  const maestro = (flow) => {
    const r = spawnSync(maestroBin(), ['--device', device, 'test', ...maestroEnv(slot, { THEME: theme, ...(android ? { APP_ID: APP.androidPackage } : {}) }), '--test-output-dir', path.join(ROOT, '.maestro-out'), flow], {
      stdio: 'inherit',
      env: { ...process.env, ...readEnv(), MAESTRO_CLI_NO_ANALYTICS: '1', MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED: 'true' },
    });
    if (r.status !== 0) throw new Error(`maestro flow failed: ${path.relative(ROOT, flow)} (see .maestro-out/)`);
  };
  // Maestro holds the device, so record with the platform recorder (no tap overlay; Maestro taps are steady).
  let recorder = null;
  const startRecorder = () => {
    if (!android) {
      const p = spawn('xcrun', ['simctl', 'io', device, 'recordVideo', '--codec=h264', '--mask=black', '--force', raw], { stdio: ['ignore', 'ignore', 'pipe'] });
      return new Promise((resolve, reject) => {
        p.stderr.on('data', (d) => d.toString().includes('Recording started') && resolve(p));
        p.on('exit', (code) => reject(new Error(`recordVideo exited (${code})`)));
      });
    }
    run(adb, ['-s', device, 'shell', 'rm', '-f', '/sdcard/demo.mp4'], { allowFail: true });
    const p = spawn(adb, ['-s', device, 'shell', 'screenrecord', '--bit-rate', '12000000', '/sdcard/demo.mp4'], { stdio: 'ignore' });
    return new Promise((resolve) => setTimeout(() => resolve(p), 1000));
  };
  const stopRecorder = async (p) => {
    const exited = new Promise((resolve) => p.on('exit', resolve));
    if (!android) p.kill('SIGINT');
    else run(adb, ['-s', device, 'shell', 'pkill', '-INT', 'screenrecord'], { allowFail: true });
    await exited;
    if (android) {
      await new Promise((r) => setTimeout(r, 1500));
      run(adb, ['-s', device, 'pull', '/sdcard/demo.mp4', raw]);
    }
  };
  try {
    if (meta.scenario) {
      log(`seed ${meta.scenario}`);
      run('node', [path.join(ROOT, 'scripts/seed.mjs'), meta.scenario], { stdio: 'inherit' });
    }
    cleanStatusBar(android, device);
    log('setup (off camera)');
    maestro(path.join(DEMOS, name, 'setup.yaml'));
    recorder = await startRecorder();
    log('recording');
    maestro(path.join(DEMOS, name, 'record.yaml'));
    await stopRecorder(recorder);
    recorder = null;
    finish(raw, out, android, device);
  } catch (err) {
    // Never leave a half-recorded video where it could be sent to a client.
    if (recorder) await stopRecorder(recorder).catch(() => {});
    restoreStatusBar(android, device);
    rmSync(raw, { force: true });
    fail(err.message);
  }
} else {
  fail(`unknown command "${cmd}": prep | start | stop | run`);
}
