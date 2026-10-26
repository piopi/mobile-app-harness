#!/usr/bin/env node
// Belt and braces for the ESLint rule: grep app code for one-off styling that slipped through
// (eslint-disable comments, hex colours, arbitrary Tailwind values). packages/ui is the only place for these.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib/env.mjs';

const SCAN = ['apps/mobile/src'];
const SKIP = /(\.test\.tsx?$|\.d\.ts$|global\.css$)/;
const RULES = [
  { re: /eslint-disable[^\n]*no-restricted-(syntax|imports)/, why: 'disables the no-one-off-styles rule' },
  { re: /#[0-9a-fA-F]{3,8}\b(?![^\n]*@allow-color)/, why: 'hard-coded colour (use a token from packages/ui/src/theme.css)' },
  { re: /\b[a-z-]+-\[[^\]]+\]/, why: 'arbitrary Tailwind value (add a token or variant in packages/ui)' },
];

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) yield* files(p);
    else if (/\.(ts|tsx)$/.test(name) && !SKIP.test(name)) yield p;
  }
}

let problems = 0;
for (const dir of SCAN) {
  for (const file of files(path.join(ROOT, dir))) {
    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((line, i) => {
        for (const rule of RULES) {
          if (rule.re.test(line)) {
            problems++;
            console.error(`${path.relative(ROOT, file)}:${i + 1}  ${rule.why}\n    ${line.trim()}`);
          }
        }
      });
  }
}
if (problems) {
  console.error(`\n${problems} one-off style problem(s). Styling lives in packages/ui (see the design-system skill).`);
  process.exit(1);
}
console.log('one-off styles: clean');
