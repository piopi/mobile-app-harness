// The harness scripts' own checks (vitest project "harness", part of `pnpm test:unit`).
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { encodeIcon, rgba } from './png.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

describe('png', () => {
  it('encodes a square RGBA PNG', () => {
    const png = encodeIcon({ size: 16, background: '#4f46e5', discColor: '#ffffff', disc: 0.5 });
    expect(png.subarray(1, 4).toString('ascii')).toBe('PNG');
    expect(png.readUInt32BE(16)).toBe(16);
    expect(png.readUInt32BE(20)).toBe(16);
  });
  it('reads #rrggbb and refuses anything else', () => {
    expect(rgba('#ff0000')).toEqual([255, 0, 0, 255]);
    expect(rgba(null)).toEqual([0, 0, 0, 0]);
    expect(() => rgba('red')).toThrow();
  });
});

describe('harness:apply', () => {
  it('is up to date: harness.config.json is applied to the repo', () => {
    const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts/harness/apply.mjs'), '--check'], { cwd: ROOT, encoding: 'utf8' });
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
  });
});
