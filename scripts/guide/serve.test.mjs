import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, it } from 'vitest';
import { siteFile } from './serve.mjs';

const out = mkdtempSync(path.join(os.tmpdir(), 'guide-serve-'));
for (const f of ['index.html', '404.html', 'users/index.html', 'pagefind/pagefind.js']) {
  mkdirSync(path.dirname(path.join(out, f)), { recursive: true });
  writeFileSync(path.join(out, f), f);
}

it('serves the site at a root, redirecting folders to their trailing slash', () => {
  expect(siteFile(out, '/', '/')).toEqual({ file: path.join(out, 'index.html') });
  expect(siteFile(out, '/', '/users')).toEqual({ redirect: '/users/' });
  expect(siteFile(out, '/', '/users/')).toEqual({ file: path.join(out, 'users/index.html') });
  expect(siteFile(out, '/', '/pagefind/pagefind.js')).toEqual({ file: path.join(out, 'pagefind/pagefind.js') });
  expect(siteFile(out, '/', '/nope/')).toEqual({ notFound: path.join(out, '404.html') });
});

it('serves a Pages project build under its base path, and nothing outside the site', () => {
  const base = '/app-guides/';
  expect(siteFile(out, base, '/')).toEqual({ redirect: base });
  expect(siteFile(out, base, '/app-guides')).toEqual({ redirect: base });
  expect(siteFile(out, base, '/app-guides/users/')).toEqual({ file: path.join(out, 'users/index.html') });
  expect(siteFile(out, base, '/users/')).toEqual({ notFound: path.join(out, '404.html') });
  expect(siteFile(out, '/', '/../../etc/passwd')).toEqual({ notFound: path.join(out, '404.html') });
  expect(siteFile(out, '/', '/%E0%A4%A')).toEqual({ notFound: path.join(out, '404.html') });
});
