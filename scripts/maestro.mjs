#!/usr/bin/env node
// Run the Maestro flows against this worktree's slot: `pnpm e2e [--android] [flow.yaml]`.
// Needs `pnpm wt up` first (Metro + device), and Maestro on PATH or in ~/.maestro/bin.
// A flow that starts from known data says so on a line `# scenario: <name>` (`base` = the base seed): the
// database is reset to it before that flow runs. Flows run one at a time, in file-name order. Flows read
// ${APP_ID}, ${SCHEME}, ${METRO_PORT}, ${WT_SLOT} and ${MAILPIT_URL}, so they never hard-code the app's identity.
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { APP, maestroBin, maestroEnv, readEnv, readSlotState, ROOT } from './lib/env.mjs';

const state = readSlotState();
const android = process.argv.includes('--android');
const device = android ? state.serial : state.udid;
if (!device) {
  console.error(`no ${android ? 'Android emulator' : 'iOS simulator'} for this slot: run \`pnpm wt up${android ? ' --android' : ''}\``);
  process.exit(1);
}
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const flowDir = path.join(ROOT, 'apps/mobile/.maestro');
const flows = args.length ? args : readdirSync(flowDir).filter((f) => f.endsWith('.yaml')).sort().map((f) => path.join(flowDir, f));
let failed = 0;
for (const flow of flows) {
  const scenario = readFileSync(flow, 'utf8').match(/^# scenario: *([\w-]+)/m)?.[1];
  if (scenario) {
    const seeded = spawnSync(process.execPath, [path.join(ROOT, 'scripts/seed.mjs'), scenario], { stdio: 'inherit' });
    if (seeded.status !== 0) process.exit(seeded.status ?? 1);
  }
  const r = spawnSync(
    maestroBin(),
    ['--device', device, 'test', ...maestroEnv(state, android ? { APP_ID: APP.androidPackage } : {}), '--test-output-dir', path.join(ROOT, '.maestro-out'), flow],
    { stdio: 'inherit', env: { ...process.env, ...readEnv(), MAESTRO_CLI_NO_ANALYTICS: '1', MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED: 'true' } },
  );
  if (r.status !== 0) failed++;
}
process.exit(failed ? 1 : 0);
