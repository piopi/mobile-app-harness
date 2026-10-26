#!/usr/bin/env node
// Open a deep link on this slot's device and answer iOS's "Open in <app>?" prompt.
//   pnpm run link <url> [--android]             e.g. pnpm run link "$SCHEME://__storybook/ui-button--variants"
//   pnpm agent <event> [json] [--android]       e.g. pnpm agent theme '{"theme":"dark"}'  (dev-only __agent events)
// `pnpm link` (without `run`) is pnpm's own command and writes a bogus dependency: always `pnpm run link`.
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { APP, readSlotState, ROOT } from './lib/env.mjs';

const argv = process.argv.slice(2);
const android = argv.includes('--android');
const rest = argv.filter((a) => a !== '--android');
const mode = rest[0] === '--agent' ? 'agent' : 'link';
const params = mode === 'agent' ? rest.slice(1) : rest;

const state = readSlotState();

let url = params[0];
if (mode === 'agent') {
  const [event, payload] = params;
  if (!event) {
    console.error('usage: pnpm agent <event> [json]   (events: apps/mobile/src/dev/agent-events.ts)');
    process.exit(2);
  }
  url = `${APP.scheme}://__agent/${event}${payload ? `?payload=${encodeURIComponent(payload)}` : ''}`;
}
if (!url) {
  console.error('usage: pnpm run link <url> [--android]');
  process.exit(2);
}

const sh = (cmd, args) => spawnSync(cmd, args, { encoding: 'utf8' });
if (android) {
  const adb = path.join(process.env.ANDROID_HOME ?? path.join(os.homedir(), 'Library/Android/sdk'), 'platform-tools/adb');
  const r = sh(adb, ['-s', state.serial, 'shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', `'${url}'`, APP.androidPackage]);
  process.exit(r.status ?? 1);
}

const r = sh('xcrun', ['simctl', 'openurl', state.udid, url]);
if (r.status !== 0) {
  console.error(r.stderr);
  process.exit(1);
}
// iOS asks before handing a custom-scheme link to the app. Tap "Open" through agent-device when it shows.
const ad = path.join(ROOT, 'node_modules/.bin/agent-device');
const session = ['--session', `wt-${state.slot}`, '--platform', 'ios', '--udid', state.udid];
const wait = sh(ad, ['alert', 'wait', '3000', ...session]);
if (wait.status === 0) sh(ad, ['press', 'label=Open', ...session]);
console.log(`opened ${url}`);
