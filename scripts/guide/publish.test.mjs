import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { copySite, pagesBase, pagesTarget, pushCommands, sameRepo } from './publish.mjs';

const CONFIG = { app: { slug: 'example-app' }, guides: { pagesRepo: '' } };

describe('pagesTarget', () => {
  it('refuses to run while no Pages repository is set', () => {
    expect(() => pagesTarget(CONFIG, {}, '/home/me')).toThrow(/No GitHub Pages repository/);
    expect(() => pagesTarget({}, { GUIDES_PAGES_REPO: ' ' }, '/home/me')).toThrow(/No GitHub Pages repository/);
  });

  it('reads the repository from the config or the environment, and clones it under the machine-wide home', () => {
    const set = { ...CONFIG, guides: { pagesRepo: 'acme/app-guides' } };
    expect(pagesTarget(set, {}, '/home/me')).toEqual({
      repo: 'acme/app-guides',
      url: 'https://github.com/acme/app-guides.git',
      dir: '/home/me/.example-app/guides-pages',
    });
    expect(pagesTarget(set, { GUIDES_PAGES_REPO: 'git@github.com:other/site.git', GUIDES_PAGES_DIR: '/tmp/x' }, '/home/me')).toEqual({
      repo: 'git@github.com:other/site.git',
      url: 'git@github.com:other/site.git',
      dir: '/tmp/x',
    });
  });

  it('knows a clone of the same repository by any of its URLs', () => {
    expect(sameRepo('git@github.com:Acme/app-guides.git', 'https://github.com/acme/app-guides.git')).toBe(true);
    expect(sameRepo('https://github.com/acme/app-guides', 'https://github.com/acme/other.git')).toBe(false);
  });
});

describe('pagesBase', () => {
  const at = (url) => ({ url });
  it('serves a project site under its repository name, and a custom domain or a user site at the root', () => {
    expect(pagesBase(at('https://github.com/acme/app-guides.git'), { env: {} })).toBe('/app-guides/');
    expect(pagesBase(at('git@github.com:acme/app-guides.git'), { env: {} })).toBe('/app-guides/');
    expect(pagesBase(at('https://github.com/acme/app-guides.git'), { env: {}, cname: true })).toBe('/');
    expect(pagesBase(at('https://github.com/acme/acme.github.io.git'), { env: {} })).toBe('/');
  });

  it('takes GUIDES_BASE or guides.base over the guess', () => {
    const target = at('https://github.com/acme/app-guides.git');
    expect(pagesBase(target, { env: { GUIDES_BASE: 'help' }, cname: true })).toBe('/help/');
    expect(pagesBase(target, { env: {}, config: { guides: { base: '/' } } })).toBe('/');
    expect(pagesBase(target, { env: {}, config: { guides: { base: '/a/b' } } })).toBe('/a/b/');
  });
});

describe('copySite', () => {
  const tmp = () => mkdtempSync(path.join(os.tmpdir(), 'guide-publish-'));
  const write = (file, body = 'x') => {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, body);
  };

  it('replaces the clone with the site, keeps git and the custom domain, and adds .nojekyll', () => {
    const out = tmp();
    write(path.join(out, 'index.html'), 'new');
    write(path.join(out, 'users/browse-items/step-01.png'));
    write(path.join(out, '_astro/site.css'));
    const clone = tmp();
    write(path.join(clone, '.git/HEAD'), 'ref: refs/heads/main');
    write(path.join(clone, 'CNAME'), 'guides.example.com');
    write(path.join(clone, 'index.html'), 'old');
    write(path.join(clone, 'old/gone/index.html'));

    copySite(out, clone);
    expect(readdirSync(clone).sort()).toEqual(['.git', '.nojekyll', 'CNAME', '_astro', 'index.html', 'users']);
    expect(readFileSync(path.join(clone, 'index.html'), 'utf8')).toBe('new');
    expect(readFileSync(path.join(clone, 'CNAME'), 'utf8')).toBe('guides.example.com');
    expect(existsSync(path.join(clone, 'users/browse-items/step-01.png'))).toBe(true);
    expect(existsSync(path.join(clone, '_astro/site.css'))).toBe(true);
  });

  it('refuses an unbuilt site or a folder that is not a clone', () => {
    const out = tmp();
    expect(() => copySite(out, tmp())).toThrow(/no index.html/);
    write(path.join(out, 'index.html'));
    expect(() => copySite(out, tmp())).toThrow(/not a git clone/);
  });
});

it('prints push commands, never runs them', () => {
  expect(pushCommands('/home/me/.example-app/guides-pages', 'abc1234', 'Example App')).toEqual([
    'git -C "/home/me/.example-app/guides-pages" add -A',
    'git -C "/home/me/.example-app/guides-pages" commit -m "Guides from Example App abc1234"',
    'git -C "/home/me/.example-app/guides-pages" push origin HEAD:main',
  ]);
});
