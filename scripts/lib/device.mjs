// The slot's device, for the scripts that capture the app (pnpm guide): the clean status bar, Maestro on this slot's
// device, the platform screen recorder and the final cut that removes dead time.
import { spawn, spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CONFIG, maestroBin, maestroEnv, readEnv, ROOT } from './env.mjs';

/** Longest a still frame may stay on screen in the final cut, in seconds: enough to read, never dead air. */
export const MAX_STILL = 1.4;
/** How much of the frame may change and still count as still (ffmpeg freezedetect `n`). */
export const STILL_NOISE = 0.002;
/** The app's default appearance (harness.config.json brand.defaultAppearance): what captures show unless told otherwise. */
export const DEFAULT_THEME = CONFIG.brand?.defaultAppearance === 'light' ? 'light' : 'dark';

export const adb = path.join(process.env.ANDROID_HOME ?? path.join(os.homedir(), 'Library/Android/sdk'), 'platform-tools/adb');

export const run = (bin, args, opts = {}) => {
  const r = spawnSync(bin, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts });
  if (r.status !== 0 && !opts.allowFail) throw new Error(`${bin} ${args.join(' ')} failed\n${r.stdout ?? ''}${r.stderr ?? ''}`);
  return r;
};

export const hasFfmpeg = () => run('ffmpeg', ['-version'], { allowFail: true }).status === 0;

// The status bar every capture shows: 9:41, full battery, full signal, no notifications.
export function cleanStatusBar(isAndroid, device) {
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

export function restoreStatusBar(isAndroid, device) {
  if (!isAndroid) run('xcrun', ['simctl', 'status_bar', device, 'clear'], { allowFail: true });
  else run(adb, ['-s', device, 'shell', 'am', 'broadcast', '-a', 'com.android.systemui.demo', '-e', 'command', 'exit'], { allowFail: true });
}

/**
 * Run one Maestro flow on this slot's device with the env every saved flow reads (APP_ID, SCHEME, METRO_PORT,
 * MAILPIT_URL, THEME). `outDir` is where Maestro writes; a flow's `takeScreenshot: <name>` lands under it (Maestro
 * refuses paths outside it). Throws when the flow fails.
 */
export function runMaestro({ device, slot, theme = DEFAULT_THEME, flow, outDir = path.join(ROOT, '.maestro-out'), quiet = false }) {
  const env = readEnv();
  const r = spawnSync(maestroBin(), ['--device', device, 'test', ...maestroEnv(slot, { THEME: theme }), '--test-output-dir', outDir, flow], {
    stdio: quiet ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ...env, MAESTRO_CLI_NO_ANALYTICS: '1', MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED: 'true' },
  });
  if (r.status !== 0) {
    if (quiet) process.stderr.write(`${r.stdout ?? ''}${r.stderr ?? ''}`.split('\n').slice(-40).join('\n'));
    throw new Error(`maestro flow failed: ${path.relative(ROOT, flow)} (see ${path.relative(ROOT, outDir)}/)`);
  }
}

/**
 * The platform screen recorder (no tap overlay: Maestro holds the device, and its taps are steady). Resolves once
 * recording has started; pass the result to `stopRecorder`.
 */
export function startRecorder(isAndroid, device, raw) {
  if (!isAndroid) {
    const p = spawn('xcrun', ['simctl', 'io', device, 'recordVideo', '--codec=h264', '--mask=black', '--force', raw], { stdio: ['ignore', 'ignore', 'pipe'] });
    return new Promise((resolve, reject) => {
      p.stderr.on('data', (d) => d.toString().includes('Recording started') && resolve({ p, isAndroid, device, raw }));
      p.on('exit', (code) => reject(new Error(`recordVideo exited (${code})`)));
    });
  }
  run(adb, ['-s', device, 'shell', 'rm', '-f', '/sdcard/capture.mp4'], { allowFail: true });
  const p = spawn(adb, ['-s', device, 'shell', 'screenrecord', '--bit-rate', '12000000', '/sdcard/capture.mp4'], { stdio: 'ignore' });
  return new Promise((resolve) => setTimeout(() => resolve({ p, isAndroid, device, raw }), 1000));
}

export async function stopRecorder({ p, isAndroid, device, raw }) {
  const exited = new Promise((resolve) => p.on('exit', resolve));
  if (!isAndroid) p.kill('SIGINT');
  else run(adb, ['-s', device, 'shell', 'pkill', '-INT', 'screenrecord'], { allowFail: true });
  await exited;
  if (isAndroid) {
    await new Promise((r) => setTimeout(r, 1500));
    run(adb, ['-s', device, 'pull', '/sdcard/capture.mp4', raw]);
  }
}

const seconds = (f) => Number(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).stdout.trim());

/**
 * The final cut: every still stretch longer than `maxStill` (a slow load, a wait) is cut down to `maxStill`, then
 * re-encoded as H.264 / yuv420p / faststart so it plays everywhere. `width` scales the video (a guide's clip matches
 * its 2x screenshots). Returns the durations before and after.
 */
export function finalCut(raw, out, { maxStill = MAX_STILL, noise = STILL_NOISE, width = null, crf = 20 } = {}) {
  // Recorders write frames only when the screen changes, so a still at the very end has no frames to detect.
  // Normalise to a constant 30 fps first; then every still, the trailing one included, is measurable.
  const cfr = raw.replace(/(\.raw)?\.mp4$/, '.cfr.mp4');
  run('ffmpeg', ['-hide_banner', '-y', '-i', raw, '-an', '-vf', 'fps=30', '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '12', cfr]);
  const probe = run('ffmpeg', ['-hide_banner', '-i', cfr, '-vf', `freezedetect=n=${noise}:d=${maxStill}`, '-map', '0:v', '-f', 'null', '-'], { allowFail: true });
  const starts = [...probe.stderr.matchAll(/freeze_start: ([\d.]+)/g)].map((m) => Number(m[1]));
  const ends = [...probe.stderr.matchAll(/freeze_end: ([\d.]+)/g)].map((m) => Number(m[1]));
  const duration = seconds(cfr);
  // Keep the first moments of each still, and the last half second before a change so a tap isn't jarring.
  const cuts = starts.map((s, i) => [s + maxStill - 0.5, (ends[i] ?? duration) - 0.5]).filter(([a, b]) => b - a > 0.1);
  const select = cuts.length ? `select='not(${cuts.map(([a, b]) => `between(t,${a.toFixed(3)},${b.toFixed(3)})`).join('+')})',` : '';
  const scale = width ? `,scale=${width}:-2` : '';
  run('ffmpeg', ['-hide_banner', '-y', '-i', cfr, '-an', '-vf', `${select}setpts=N/30/TB${scale}`, '-c:v', 'libx264', '-crf', String(crf), '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]);
  rmSync(cfr, { force: true });
  return { cuts: cuts.length, before: duration, after: seconds(out) };
}
