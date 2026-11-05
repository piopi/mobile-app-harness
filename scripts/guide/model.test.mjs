import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import YAML from 'yaml';
import { absolutize, covered, findGuide, flowYaml, GuideError, loadGuides, parseGuide, referencedFiles, segmentsFor, shotName, sortGuides, staleCovers } from './model.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const GUIDES = path.join(ROOT, 'apps/mobile/.maestro/guides');
const FILE = '/repo/apps/mobile/.maestro/guides/admins/review-drafts.yaml';

const guide = (over = {}) =>
  YAML.stringify({
    title: 'Reviewing drafts',
    audience: 'admins',
    scenario: 'many-items',
    covers: ['apps/mobile/src/app/(tabs)/items/index.tsx'],
    setup: [{ runFlow: '../_admin.yaml' }],
    steps: [
      { caption: 'Tap Drafts.', do: [{ tapOn: { id: 'filter-drafts' } }] },
      { caption: 'The list shows only drafts.', clip: true, do: [{ tapOn: { id: 'filter-all' } }] },
      { caption: 'Open a draft to read it.', alt: 'A draft item', do: [] },
    ],
    ...over,
  });

const problemsOf = (text, file = FILE) => {
  try {
    parseGuide(text, file);
  } catch (e) {
    expect(e).toBeInstanceOf(GuideError);
    return e.problems;
  }
  throw new Error('expected a GuideError');
};

describe('parseGuide', () => {
  it('reads a guide, with its defaults', () => {
    const g = parseGuide(guide(), FILE);
    expect(g).toMatchObject({
      slug: 'review-drafts',
      title: 'Reviewing drafts',
      audience: 'admins',
      scenarios: ['many-items'],
      copy: 'placeholder',
      order: 100,
      summary: null,
      dir: path.dirname(FILE),
    });
    expect(g.steps.map((s) => s.clip)).toEqual([false, true, false]);
    // The alt text is the caption unless the step gives its own.
    expect(g.steps[0].alt).toBe('Tap Drafts.');
    expect(g.steps[2].alt).toBe('A draft item');
  });

  it('takes a list of scenarios, applied in order', () => {
    expect(parseGuide(guide({ scenario: ['empty-items', 'many-items'] }), FILE).scenarios).toEqual(['empty-items', 'many-items']);
  });

  it('lists every problem at once', () => {
    const problems = problemsOf(guide({ title: '', audience: 'coaches', scenario: undefined, extra: 1, steps: [{ caption: '', clip: 'yes', when: 1 }] }));
    expect(problems).toEqual(
      expect.arrayContaining([
        expect.stringContaining('unknown key "extra"'),
        'title: required text',
        expect.stringContaining('audience: one of users, admins'),
        expect.stringContaining('scenario:'),
        expect.stringContaining('steps[1]: unknown key "when"'),
        expect.stringContaining('steps[1].caption: required text'),
        'steps[1].clip: true or false',
      ]),
    );
  });

  it('wants the audience to match the folder, and a kebab-case file name', () => {
    expect(problemsOf(guide({ audience: 'users' }))).toEqual([expect.stringContaining('the file is in admins/')]);
    expect(problemsOf(guide(), '/x/admins/Review_Drafts.yaml')).toEqual([expect.stringContaining('must be kebab-case')]);
  });

  it('refuses a guide with no steps, and YAML that is not a guide', () => {
    expect(problemsOf(guide({ steps: [] }))).toEqual(['steps: at least one step']);
    expect(problemsOf('- just\n- a list\n')).toEqual([expect.stringContaining('a guide is a mapping')]);
    expect(problemsOf('title: [unclosed\n')[0]).toMatch(/^not valid YAML/);
  });

  it('takes an optional app path to open', () => {
    expect(parseGuide(guide(), FILE).open).toBeNull();
    expect(parseGuide(guide({ open: 'me/dev' }), FILE).open).toBe('me/dev');
    expect(problemsOf(guide({ open: 'exampleapp://items' }))).toEqual([expect.stringMatching(/^open: the app screen/)]);
  });

  it('wants covers: repo paths or globs', () => {
    expect(parseGuide(guide(), FILE).covers).toEqual(['apps/mobile/src/app/(tabs)/items/index.tsx']);
    expect(problemsOf(guide({ covers: undefined }))).toEqual([expect.stringMatching(/^covers: the repo paths/)]);
    expect(problemsOf(guide({ covers: [] }))).toEqual([expect.stringMatching(/^covers: the repo paths/)]);
    expect(problemsOf(guide({ covers: ['/abs/x.tsx', '../x.tsx'] }))).toEqual([
      'covers: "/abs/x.tsx" must be relative to the repo root',
      'covers: "../x.tsx" must be relative to the repo root',
    ]);
  });

  it('checks copy and order', () => {
    expect(problemsOf(guide({ copy: 'final', order: 1.5 }))).toEqual(['copy: one of placeholder, approved', 'order: a whole number (lower comes first)']);
  });
});

describe('flows', () => {
  const g = parseGuide(guide(), FILE);

  it('makes every file a command names absolute, at any depth', () => {
    const out = absolutize(
      [
        { runFlow: '../_admin.yaml' },
        { runFlow: { file: '../../subflows/sign-in-as.yaml', env: { EMAIL_JSON: 'x' } } },
        { runScript: '../../scripts/mailpit-code.js' },
        { repeat: { times: 2, commands: [{ runFlow: { when: { visible: 'x' }, commands: [{ runScript: { file: 'a.js' } }] } }] } },
        { runFlow: '/abs/flow.yaml' },
        'back',
      ],
      '/repo/g/admins',
    );
    expect(out[0].runFlow).toBe('/repo/g/_admin.yaml');
    expect(out[1].runFlow).toEqual({ file: '/repo/subflows/sign-in-as.yaml', env: { EMAIL_JSON: 'x' } });
    expect(out[2].runScript).toBe('/repo/scripts/mailpit-code.js');
    expect(out[3].repeat.commands[0].runFlow.commands[0].runScript.file).toBe('/repo/g/admins/a.js');
    expect(out[4].runFlow).toBe('/abs/flow.yaml');
    expect(out[5]).toBe('back');
  });

  it('splits a build into runs: shots share one, a clip step gets its own', () => {
    const segments = segmentsFor(g);
    expect(segments.map((s) => [s.kind, s.steps])).toEqual([
      ['shots', [0]],
      ['clip', [1]],
      ['shots', [2]],
    ]);
    // Setup runs first, then each step's commands, a settle and its screenshot.
    expect(segments[0].commands).toEqual([{ runFlow: '../_admin.yaml' }, { tapOn: { id: 'filter-drafts' } }, { waitForAnimationToEnd: { timeout: 3000 } }, { takeScreenshot: 'step-01' }]);
    expect(segments[1].commands.at(-1)).toEqual({ takeScreenshot: 'step-02' });
  });

  it('keeps setup with the first step when the first step is a clip', () => {
    const first = parseGuide(guide({ steps: [{ caption: 'A clip.', clip: true, do: [{ tapOn: 'x' }] }] }), FILE);
    expect(segmentsFor(first).map((s) => [s.kind, s.steps])).toEqual([
      ['shots', []],
      ['clip', [0]],
    ]);
  });

  it('checks a guide in one run with no screenshots', () => {
    const [check] = segmentsFor(g, 'check');
    expect(check.commands).toEqual([{ runFlow: '../_admin.yaml' }, { tapOn: { id: 'filter-drafts' } }, { tapOn: { id: 'filter-all' } }]);
  });

  it('writes a Maestro flow with absolute paths', () => {
    const text = flowYaml(g, segmentsFor(g)[0], 0);
    const [config, commands] = YAML.parseAllDocuments(text).map((d) => d.toJS());
    expect(config).toEqual({ appId: '$' + '{APP_ID}', name: 'guide admins/review-drafts #1 (shots)' });
    expect(commands[0]).toEqual({ runFlow: '/repo/apps/mobile/.maestro/guides/_admin.yaml' });
    expect(text).toMatch(/^# Generated by pnpm guide/);
  });

  it('names screenshots by step', () => {
    expect([shotName(0), shotName(9)]).toEqual(['step-01', 'step-10']);
  });

  it('lists the files a guide names', () => {
    expect(referencedFiles(g)).toEqual(['/repo/apps/mobile/.maestro/guides/_admin.yaml']);
  });
});

describe('covers', () => {
  it('matches a path itself or by glob, brackets in route names included', () => {
    expect(covered('apps/mobile/src/app/c/[token].tsx', 'apps/mobile/src/app/c/[token].tsx')).toBe(true);
    expect(covered('apps/mobile/src/features/items/parts.tsx', 'apps/mobile/src/features/items/**')).toBe(true);
    expect(covered('apps/mobile/src/features/items/parts.tsx', 'apps/mobile/src/features/items/*.ts')).toBe(false);
    expect(covered('apps/mobile/src/features/me/copy.ts', 'apps/mobile/src/features/items/**')).toBe(false);
  });

  it('lists the entries that match no file', () => {
    const g = parseGuide(guide({ covers: ['scripts/guide/model.mjs', 'scripts/guide/*.test.mjs', 'scripts/guide/gone.mjs', 'nowhere/**'] }), FILE);
    expect(staleCovers(g, ROOT)).toEqual(['scripts/guide/gone.mjs', 'nowhere/**']);
  });
});

describe('the committed guides', () => {
  // The static half of `pnpm guide check`, run in CI: every guide parses and every file it names exists.
  const { guides, errors } = loadGuides(GUIDES);

  it('parse', () => {
    expect(errors.map((e) => e.message)).toEqual([]);
    expect(guides.length).toBeGreaterThan(0);
  });

  it('name only files that exist', () => {
    const missing = guides.flatMap((g) => referencedFiles(g).filter((f) => !existsSync(f)).map((f) => `${g.slug}: ${f}`));
    expect(missing).toEqual([]);
  });

  it('cover only files that exist, under the paths that trigger the impact check', () => {
    expect(guides.flatMap((g) => staleCovers(g, ROOT).map((c) => `${g.slug}: ${c}`))).toEqual([]);
    const workflow = YAML.parse(readFileSync(path.join(ROOT, '.github/workflows/guide-impact.yml'), 'utf8'));
    const triggers = workflow.on.pull_request.paths;
    const outside = guides.flatMap((g) => g.covers.filter((c) => !triggers.some((t) => c.startsWith(t.replace(/\*\*$/, '')))).map((c) => `${g.slug}: ${c}`));
    expect(outside).toEqual([]);
  });

  it('are sorted by audience, then order', () => {
    expect(sortGuides(guides)).toEqual(guides);
    expect(findGuide(guides, guides[0].slug)).toBe(guides[0]);
    expect(findGuide(guides, `${guides[0].audience}/${guides[0].slug}`)).toBe(guides[0]);
  });
});
